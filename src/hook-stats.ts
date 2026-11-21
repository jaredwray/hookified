import type {
	HookCallRank,
	HookDurationStats,
	HookEventStats,
	HookHandlerStats,
	HookRegistrationStats,
	HookStatsJSON,
	HookStatsTotals,
	IHook,
} from "./types.js";

const MAX_TRACKED_EVENTS = 1000;
const MAX_RANK_RESULTS = 20;

type DurationRecord = {
	count: number;
	sum: number;
	min: number;
	max: number;
	last: number;
};

export type HandlerRecord = {
	calls: number;
	errors: number;
	skipped: number;
	duration: DurationRecord;
};

export type EventRecord = {
	calls: number;
	errors: number;
	skipped: number;
	blocked: number;
	duration: DurationRecord;
	handlers: WeakMap<IHook, HandlerRecord>;
};

export type StatsState = {
	events: Map<string, EventRecord>;
	overflow: EventRecord | undefined;
	lastDuration: number;
	registered: number;
	replaced: number;
	removed: number;
	removeMisses: number;
};

export type DispatchContext = {
	state: StatsState;
	eventRecord: EventRecord;
	isOverflow: boolean;
};

function createDurationRecord(): DurationRecord {
	return {
		count: 0,
		sum: 0,
		min: 0,
		max: 0,
		last: 0,
	};
}

function createEmptyDurationStats(): HookDurationStats {
	return {
		count: 0,
		sum: 0,
		min: 0,
		max: 0,
		last: 0,
		mean: 0,
	};
}

function createHandlerRecord(): HandlerRecord {
	return {
		calls: 0,
		errors: 0,
		skipped: 0,
		duration: createDurationRecord(),
	};
}

function createEventRecord(): EventRecord {
	return {
		calls: 0,
		errors: 0,
		skipped: 0,
		blocked: 0,
		duration: createDurationRecord(),
		handlers: new WeakMap(),
	};
}

function createStatsState(): StatsState {
	return {
		events: new Map(),
		overflow: undefined,
		lastDuration: 0,
		registered: 0,
		replaced: 0,
		removed: 0,
		removeMisses: 0,
	};
}

function roundMs(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function recordDuration(record: DurationRecord, elapsed: number): void {
	if (record.count === 0) {
		record.min = elapsed;
		record.max = elapsed;
	} else {
		if (elapsed < record.min) {
			record.min = elapsed;
		}
		if (elapsed > record.max) {
			record.max = elapsed;
		}
	}
	record.count += 1;
	record.sum += elapsed;
	record.last = elapsed;
}

function toDurationStats(record: DurationRecord): HookDurationStats {
	if (record.count === 0) {
		return createEmptyDurationStats();
	}

	return {
		count: record.count,
		sum: roundMs(record.sum),
		min: roundMs(record.min),
		max: roundMs(record.max),
		last: roundMs(record.last),
		mean: roundMs(record.sum / record.count),
	};
}

function getHandlerMetrics(record: HandlerRecord | undefined): {
	calls: number;
	errors: number;
	skipped: number;
	pending: number;
	duration: HookDurationStats;
} {
	if (!record) {
		return {
			calls: 0,
			errors: 0,
			skipped: 0,
			pending: 0,
			duration: createEmptyDurationStats(),
		};
	}

	return {
		calls: record.calls,
		errors: record.errors,
		skipped: record.skipped,
		pending: record.calls - record.duration.count,
		duration: toDurationStats(record.duration),
	};
}

function compareOptionalId(
	a: string | undefined,
	b: string | undefined,
): number {
	if (a === b) {
		return 0;
	}
	if (a === undefined) {
		return -1;
	}
	if (b === undefined) {
		return 1;
	}
	return a < b ? -1 : 1;
}

function compareRankTie(a: HookCallRank, b: HookCallRank): number {
	if (a.event !== b.event) {
		return a.event < b.event ? -1 : 1;
	}
	return compareOptionalId(a.id, b.id);
}

function recordLateError(
	eventRecord: EventRecord,
	handlerRecord: HandlerRecord | undefined,
): void {
	eventRecord.errors += 1;
	if (handlerRecord) {
		handlerRecord.errors += 1;
	}
}

class HookStatsRecorder {
	public state: StatsState;

	constructor() {
		this.state = createStatsState();
	}

	public reset(): void {
		this.state = createStatsState();
	}

	public recordRegister(event: string, entry: IHook, replaced: boolean): void {
		const { state, eventRecord, isOverflow } = this.getOrCreateEvent(event);
		if (replaced) {
			state.replaced += 1;
		} else {
			state.registered += 1;
		}
		if (!isOverflow) {
			eventRecord.handlers.set(entry, createHandlerRecord());
		}
	}

	public recordRemove(count: number): void {
		this.state.removed += count;
	}

	public recordRemoveMiss(): void {
		this.state.removeMisses += 1;
	}

	public recordBlocked(event: string): void {
		const { eventRecord } = this.getOrCreateEvent(event);
		eventRecord.blocked += 1;
	}

	public beginDispatch(event: string): DispatchContext {
		return this.getOrCreateEvent(event);
	}

	public startHandler(
		eventRecord: EventRecord,
		isOverflow: boolean,
		hook: IHook,
	): HandlerRecord | undefined {
		if (isOverflow) {
			return undefined;
		}
		const handlerRecord = this.getOrCreateHandler(eventRecord, hook);
		handlerRecord.calls += 1;
		return handlerRecord;
	}

	public recordHandlerSkip(
		eventRecord: EventRecord,
		isOverflow: boolean,
		hook: IHook,
	): void {
		eventRecord.skipped += 1;
		if (!isOverflow) {
			const handlerRecord = this.getOrCreateHandler(eventRecord, hook);
			handlerRecord.skipped += 1;
		}
	}

	public recordHandlerDuration(
		handlerRecord: HandlerRecord | undefined,
		elapsed: number,
	): void {
		if (handlerRecord) {
			recordDuration(handlerRecord.duration, elapsed);
		}
	}

	public recordHandlerError(
		eventRecord: EventRecord,
		handlerRecord: HandlerRecord | undefined,
		elapsed: number,
	): void {
		eventRecord.errors += 1;
		if (handlerRecord) {
			recordDuration(handlerRecord.duration, elapsed);
			handlerRecord.errors += 1;
		}
	}

	public endDispatch(
		state: StatsState,
		eventRecord: EventRecord,
		elapsed: number,
	): void {
		recordDuration(eventRecord.duration, elapsed);
		state.lastDuration = elapsed;
	}

	private getOrCreateEvent(event: string): DispatchContext {
		const state = this.state;
		const existing = state.events.get(event);
		if (existing) {
			return { state, eventRecord: existing, isOverflow: false };
		}

		if (state.events.size < MAX_TRACKED_EVENTS) {
			const eventRecord = createEventRecord();
			state.events.set(event, eventRecord);
			return { state, eventRecord, isOverflow: false };
		}

		if (!state.overflow) {
			state.overflow = createEventRecord();
		}
		return { state, eventRecord: state.overflow, isOverflow: true };
	}

	private getOrCreateHandler(
		eventRecord: EventRecord,
		hook: IHook,
	): HandlerRecord {
		let record = eventRecord.handlers.get(hook);
		if (!record) {
			record = createHandlerRecord();
			eventRecord.handlers.set(hook, record);
		}
		return record;
	}
}

/**
 * Collects optional dispatch, duration, error, and registration stats for Hookified.
 */
export class HookStats {
	private _enabled: boolean;
	private readonly _hooks: Map<string, IHook[]>;
	private readonly _recorder = new HookStatsRecorder();

	/**
	 * Creates a HookStats collector for a Hookified hooks map.
	 * @param {boolean} enabled - True to collect stats right away
	 * @param {Map<string, IHook[]>} hooks - The live hooks map from Hookified
	 */
	constructor(enabled: boolean, hooks: Map<string, IHook[]>) {
		this._enabled = enabled;
		this._hooks = hooks;
	}

	/**
	 * Gets whether hook stats collection is on.
	 * @returns {boolean}
	 */
	public get enabled(): boolean {
		return this._enabled;
	}

	/**
	 * Sets whether hook stats collection is on. False keeps current data, and true resumes the same collector.
	 * @param {boolean} value
	 */
	public set enabled(value: boolean) {
		if (this._enabled === value) {
			return;
		}
		this._enabled = value;
	}

	/**
	 * Gets total dispatch count across all tracked events and overflow.
	 * @returns {number}
	 */
	public get calls(): number {
		return this.sumField("calls");
	}

	/**
	 * Gets total error count across all tracked events and overflow.
	 * @returns {number}
	 */
	public get errors(): number {
		return this.sumField("errors");
	}

	/**
	 * Gets total count of async handlers that hookSync skips.
	 * @returns {number}
	 */
	public get skipped(): number {
		return this.sumField("skipped");
	}

	/**
	 * Gets total count of dispatches that deprecation rules block.
	 * @returns {number}
	 */
	public get blocked(): number {
		return this.sumField("blocked");
	}

	/**
	 * Gets count of active dispatches that do not have a duration sample yet.
	 * @returns {number}
	 */
	public get pending(): number {
		const { state } = this._recorder;
		let pending = 0;
		for (const eventRecord of state.events.values()) {
			pending += eventRecord.calls - eventRecord.duration.count;
		}
		if (state.overflow) {
			pending += state.overflow.calls - state.overflow.duration.count;
		}
		return pending;
	}

	/**
	 * Gets aggregated dispatch duration stats across all events and overflow.
	 * @returns {HookDurationStats}
	 */
	public get duration(): HookDurationStats {
		const { state } = this._recorder;
		let count = 0;
		let sum = 0;
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;

		const accumulate = (d: DurationRecord): void => {
			if (d.count === 0) {
				return;
			}
			count += d.count;
			sum += d.sum;
			if (d.min < min) {
				min = d.min;
			}
			if (d.max > max) {
				max = d.max;
			}
		};

		for (const eventRecord of state.events.values()) {
			accumulate(eventRecord.duration);
		}
		if (state.overflow) {
			accumulate(state.overflow.duration);
		}

		if (count === 0) {
			return createEmptyDurationStats();
		}

		return {
			count,
			sum: roundMs(sum),
			min: roundMs(min),
			max: roundMs(max),
			last: roundMs(state.lastDuration),
			mean: roundMs(sum / count),
		};
	}

	/**
	 * Gets per-event stats for all tracked events in insertion order.
	 * @returns {HookEventStats[]}
	 */
	public get events(): HookEventStats[] {
		const { state } = this._recorder;
		const result: HookEventStats[] = [];

		for (const [event, eventRecord] of state.events.entries()) {
			const liveHooks = this._hooks.get(event) ?? [];
			const hooks: HookHandlerStats[] = [];

			for (const hook of liveHooks) {
				const metrics = getHandlerMetrics(eventRecord.handlers.get(hook));
				hooks.push({
					...(hook.id !== undefined ? { id: hook.id } : {}),
					...metrics,
				});
			}

			result.push({
				event,
				handlers: liveHooks.length,
				calls: eventRecord.calls,
				errors: eventRecord.errors,
				skipped: eventRecord.skipped,
				blocked: eventRecord.blocked,
				pending: eventRecord.calls - eventRecord.duration.count,
				duration: toDurationStats(eventRecord.duration),
				hooks,
			});
		}

		return result;
	}

	/**
	 * Gets overflow totals for events after the first 1000 distinct event names, or undefined if none exist.
	 * @returns {HookStatsTotals | undefined}
	 */
	public get overflow(): HookStatsTotals | undefined {
		const { overflow } = this._recorder.state;
		if (!overflow) {
			return undefined;
		}

		return {
			calls: overflow.calls,
			errors: overflow.errors,
			skipped: overflow.skipped,
			blocked: overflow.blocked,
			pending: overflow.calls - overflow.duration.count,
			duration: toDurationStats(overflow.duration),
		};
	}

	/**
	 * Gets hook registration and removal counters.
	 * @returns {HookRegistrationStats}
	 */
	public get registration(): HookRegistrationStats {
		const { state } = this._recorder;
		return {
			registered: state.registered,
			replaced: state.replaced,
			removed: state.removed,
			removeMisses: state.removeMisses,
		};
	}

	/**
	 * Clears all collected stats and keeps the enabled setting unchanged.
	 * @returns {void}
	 */
	public resetStats(): void {
		this._recorder.reset();
	}

	/**
	 * Gets up to 20 live hooks sorted by call count from high to low, then by event and id from A to Z.
	 * @returns {HookCallRank[]}
	 */
	public topCalls(): HookCallRank[] {
		const rows = this.collectLiveHookRanks();
		rows.sort((a, b) => {
			if (b.calls !== a.calls) {
				return b.calls - a.calls;
			}
			return compareRankTie(a, b);
		});

		return rows.slice(0, MAX_RANK_RESULTS);
	}

	/**
	 * Gets up to 20 live hooks sorted by max duration from high to low, then by event and id from A to Z. Excludes hooks with 0 samples.
	 * @returns {HookCallRank[]}
	 */
	public longestCalls(): HookCallRank[] {
		const rows = this.collectLiveHookRanks().filter(
			(row) => row.duration.count > 0,
		);
		rows.sort((a, b) => {
			if (b.duration.max !== a.duration.max) {
				return b.duration.max - a.duration.max;
			}
			return compareRankTie(a, b);
		});

		return rows.slice(0, MAX_RANK_RESULTS);
	}

	/**
	 * Converts stats to a plain JSON object.
	 * @returns {HookStatsJSON}
	 */
	/**
	 * Records a stored hook registration. A same-id replace starts a new handler row.
	 * @param {string} event - The event name
	 * @param {IHook} entry - The stored hook
	 * @param {boolean} replaced - True when an existing id was replaced
	 * @returns {void}
	 */
	public recordRegister(event: string, entry: IHook, replaced: boolean): void {
		this._recorder.recordRegister(event, entry, replaced);
	}

	/**
	 * Adds to the removed-hook count.
	 * @param {number} count - How many hooks were removed
	 * @returns {void}
	 */
	public recordRemove(count: number): void {
		this._recorder.recordRemove(count);
	}

	/**
	 * Adds one removal that matched nothing.
	 * @returns {void}
	 */
	public recordRemoveMiss(): void {
		this._recorder.recordRemoveMiss();
	}

	/**
	 * Records a dispatch that deprecation rules blocked.
	 * @param {string} event - The event name
	 * @returns {void}
	 */
	public recordBlocked(event: string): void {
		this._recorder.recordBlocked(event);
	}

	/**
	 * Opens a dispatch record for an event that has handlers.
	 * @param {string} event - The event name
	 * @returns {DispatchContext}
	 */
	public beginDispatch(event: string): DispatchContext {
		return this._recorder.beginDispatch(event);
	}

	/**
	 * Marks a handler as started and returns its record. Overflow handlers have no row.
	 * @param {EventRecord} eventRecord - The event record for this dispatch
	 * @param {boolean} isOverflow - True when the event is past the name cap
	 * @param {IHook} hook - The handler that is about to run
	 * @returns {HandlerRecord | undefined}
	 */
	public startHandler(
		eventRecord: EventRecord,
		isOverflow: boolean,
		hook: IHook,
	): HandlerRecord | undefined {
		return this._recorder.startHandler(eventRecord, isOverflow, hook);
	}

	/**
	 * Counts an async handler that hookSync did not run.
	 * @param {EventRecord} eventRecord - The event or overflow record
	 * @param {boolean} isOverflow - True when the event is past the name cap
	 * @param {IHook} hook - The skipped handler
	 * @returns {void}
	 */
	public recordHandlerSkip(
		eventRecord: EventRecord,
		isOverflow: boolean,
		hook: IHook,
	): void {
		this._recorder.recordHandlerSkip(eventRecord, isOverflow, hook);
	}

	/**
	 * Adds a completed handler duration. Overflow handlers have no row.
	 * @param {HandlerRecord | undefined} handlerRecord - The handler row, if it has one
	 * @param {number} elapsed - Elapsed milliseconds
	 * @returns {void}
	 */
	public recordHandlerDuration(
		handlerRecord: HandlerRecord | undefined,
		elapsed: number,
	): void {
		this._recorder.recordHandlerDuration(handlerRecord, elapsed);
	}

	/**
	 * Counts a handler failure and stores its duration before the error event is emitted.
	 * @param {EventRecord} eventRecord - The event or overflow record
	 * @param {HandlerRecord | undefined} handlerRecord - The handler row, if it has one
	 * @param {number} elapsed - Elapsed milliseconds
	 * @returns {void}
	 */
	public recordHandlerError(
		eventRecord: EventRecord,
		handlerRecord: HandlerRecord | undefined,
		elapsed: number,
	): void {
		this._recorder.recordHandlerError(eventRecord, handlerRecord, elapsed);
	}

	/**
	 * Stores one dispatch duration sample. The sample is the sum of handler durations.
	 * @param {StatsState} state - The stats state captured for this dispatch
	 * @param {EventRecord} eventRecord - The event or overflow record
	 * @param {number} elapsed - Sum of handler durations in milliseconds
	 * @returns {void}
	 */
	public endDispatch(
		state: StatsState,
		eventRecord: EventRecord,
		elapsed: number,
	): void {
		this._recorder.endDispatch(state, eventRecord, elapsed);
	}

	/**
	 * Counts a hookSync rejection on the records captured when that call started.
	 * @param {EventRecord} eventRecord - The event or overflow record from that call
	 * @param {HandlerRecord | undefined} handlerRecord - The handler row from that call
	 * @returns {void}
	 */
	public recordLateError(
		eventRecord: EventRecord,
		handlerRecord: HandlerRecord | undefined,
	): void {
		recordLateError(eventRecord, handlerRecord);
	}

	/**
	 * Converts stats to a plain JSON object.
	 * @returns {HookStatsJSON}
	 */
	public toJSON(): HookStatsJSON {
		const overflow = this.overflow;
		return {
			enabled: this._enabled,
			calls: this.calls,
			errors: this.errors,
			skipped: this.skipped,
			blocked: this.blocked,
			pending: this.pending,
			duration: this.duration,
			events: this.events,
			...(overflow !== undefined ? { overflow } : {}),
			registration: this.registration,
		};
	}

	private sumField(field: "calls" | "errors" | "skipped" | "blocked"): number {
		const { state } = this._recorder;
		let total = 0;
		for (const eventRecord of state.events.values()) {
			total += eventRecord[field];
		}
		if (state.overflow) {
			total += state.overflow[field];
		}
		return total;
	}

	private collectLiveHookRanks(): HookCallRank[] {
		const { state } = this._recorder;
		const rows: HookCallRank[] = [];

		for (const [event, eventRecord] of state.events.entries()) {
			const liveHooks = this._hooks.get(event);
			if (!liveHooks) {
				continue;
			}

			for (const hook of liveHooks) {
				const metrics = getHandlerMetrics(eventRecord.handlers.get(hook));
				rows.push({
					event,
					...(hook.id !== undefined ? { id: hook.id } : {}),
					calls: metrics.calls,
					errors: metrics.errors,
					skipped: metrics.skipped,
					duration: metrics.duration,
				});
			}
		}

		return rows;
	}
}
