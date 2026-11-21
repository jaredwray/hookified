import { afterEach, describe, expect, test, vi } from "vitest";
import {
	Hookified,
	HookStats,
	ParallelHook,
	WaterfallHook,
} from "../src/index.js";

function createClock(times: number[]) {
	let index = 0;
	return vi.spyOn(performance, "now").mockImplementation(() => {
		const value = times[index] ?? times[times.length - 1] ?? 0;
		index += 1;
		return value;
	});
}

async function collectUnhandledRejections(run: () => void): Promise<unknown[]> {
	const unhandled: unknown[] = [];
	const onUnhandled = (reason: unknown) => {
		unhandled.push(reason);
	};
	process.on("unhandledRejection", onUnhandled);
	try {
		run();
		await new Promise((resolve) => setTimeout(resolve, 0));
	} finally {
		process.off("unhandledRejection", onUnhandled);
	}
	return unhandled;
}

function countLiveHooks(hookified: Hookified): number {
	let total = 0;
	for (const handlers of hookified.hooks.values()) {
		total += handlers.length;
	}
	return total;
}

describe("HookStats", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("is off by default and does not call performance.now when disabled", async () => {
		const nowSpy = vi.spyOn(performance, "now");
		const hookified = new Hookified();

		expect(hookified.stats).toBeInstanceOf(HookStats);
		expect(hookified.stats.enabled).toBe(false);
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.errors).toBe(0);
		expect(hookified.stats.skipped).toBe(0);
		expect(hookified.stats.blocked).toBe(0);
		expect(hookified.stats.pending).toBe(0);
		expect(hookified.stats.duration).toEqual({
			count: 0,
			sum: 0,
			min: 0,
			max: 0,
			last: 0,
			mean: 0,
		});
		expect(hookified.stats.events).toEqual([]);
		expect(hookified.stats.overflow).toBeUndefined();
		expect(hookified.stats.registration).toEqual({
			registered: 0,
			replaced: 0,
			removed: 0,
			removeMisses: 0,
		});
		expect(hookified.stats.topCalls()).toEqual([]);
		expect(hookified.stats.longestCalls()).toEqual([]);
		expect("getStats" in hookified).toBe(false);
		expect("getStats" in hookified.stats).toBe(false);

		const handler = () => {};
		const stored = hookified.onHook({ id: "h1", event: "save", handler });
		await hookified.hook("save");
		hookified.hookSync("save");
		hookified.removeHook({ event: "save", handler });
		hookified.removeHook({ event: "save", handler });
		hookified.removeHookById(stored?.id ?? "h1");
		hookified.removeEventHooks("save");
		hookified.clearHooks();

		expect(nowSpy).not.toHaveBeenCalled();
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.events).toEqual([]);
		expect(hookified.stats.registration).toEqual({
			registered: 0,
			replaced: 0,
			removed: 0,
			removeMisses: 0,
		});
	});

	test("enableStats option and runtime enabled toggle work as expected", async () => {
		createClock([0, 2, 10, 13, 20, 25]);
		const enabledByOption = new Hookified({ enableStats: true });
		expect(enabledByOption.stats.enabled).toBe(true);

		const hookified = new Hookified();
		hookified.onHook({ id: "h1", event: "work", handler: () => {} });
		await hookified.hook("work");
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.events).toEqual([]);

		// Same value is a no-op
		hookified.stats.enabled = false;
		expect(hookified.stats.enabled).toBe(false);

		// Enable at runtime: only later calls count
		hookified.stats.enabled = true;
		hookified.stats.enabled = true;
		expect(hookified.stats.enabled).toBe(true);

		await hookified.hook("work");
		expect(hookified.stats.calls).toBe(1);
		expect(hookified.stats.duration.sum).toBe(2);

		// Disable: keeps collected data and stops counting
		hookified.stats.enabled = false;
		await hookified.hook("work");
		expect(hookified.stats.calls).toBe(1);
		expect(hookified.stats.duration.sum).toBe(2);
		expect(hookified.stats.topCalls()).toHaveLength(1);
		expect(hookified.stats.longestCalls()).toHaveLength(1);

		// Re-enable: resumes the same collector
		hookified.stats.enabled = true;
		await hookified.hook("work");
		expect(hookified.stats.calls).toBe(2);
		expect(hookified.stats.duration.sum).toBe(5);
	});

	test("counts single handler, multiple handlers, two events, and ignores empty dispatches", async () => {
		const nowSpy = createClock([0, 1, 2, 5, 10, 14]);
		const hookified = new Hookified({ enableStats: true });

		// Empty dispatch creates nothing and does not read the clock
		await hookified.hook("empty");
		hookified.hookSync("empty");
		// Empty array set directly in map also counts as no handlers
		hookified.hooks.set("empty-arr", []);
		await hookified.hook("empty-arr");
		hookified.hookSync("empty-arr");
		expect(nowSpy).not.toHaveBeenCalled();
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.events).toEqual([]);

		hookified.onHook({ id: "a1", event: "alpha", handler: () => {} });
		hookified.onHook({ id: "a2", event: "alpha", handler: () => {} });
		hookified.onHook({ id: "b1", event: "beta", handler: () => {} });

		await hookified.hook("alpha");
		await hookified.hook("beta");

		expect(hookified.stats.calls).toBe(2);
		expect(hookified.stats.duration).toEqual({
			count: 2,
			sum: 8,
			min: 4,
			max: 4,
			last: 4,
			mean: 4,
		});

		const events = hookified.stats.events;
		expect(events.map((e) => e.event)).toEqual(["alpha", "beta"]);
		expect(events[0].calls).toBe(1);
		expect(events[0].handlers).toBe(2);
		expect(events[0].duration.sum).toBe(4);
		expect(events[0].hooks.map((h) => [h.id, h.calls, h.duration.sum])).toEqual(
			[
				["a1", 1, 1],
				["a2", 1, 3],
			],
		);
		expect(events[1].calls).toBe(1);
		expect(events[1].handlers).toBe(1);
		expect(events[1].hooks.map((h) => [h.id, h.calls, h.duration.sum])).toEqual(
			[["b1", 1, 4]],
		);
	});

	test("beforeHook, afterHook, and callHook each count once under their event name", async () => {
		createClock([0, 1, 10, 12, 20, 23]);
		const hookified = new Hookified({ enableStats: true });

		hookified.onHook({ id: "b", event: "before:save", handler: () => {} });
		hookified.onHook({ id: "a", event: "after:save", handler: () => {} });
		hookified.onHook({ id: "c", event: "save", handler: () => {} });

		await hookified.beforeHook("save");
		await hookified.afterHook("save");
		await hookified.callHook("save");

		expect(hookified.stats.calls).toBe(3);
		expect(
			hookified.stats.events.map((event) => ({
				event: event.event,
				calls: event.calls,
				sum: event.duration.sum,
			})),
		).toEqual([
			{ event: "before:save", calls: 1, sum: 1 },
			{ event: "after:save", calls: 1, sum: 2 },
			{ event: "save", calls: 1, sum: 3 },
		]);
	});

	test("counts errors in hook() with listener, throwOnHookError, and no listener, and excludes error listener time", async () => {
		// 1. With error listener — clock advances during listener, must not enter duration
		let clockValue = 0;
		vi.spyOn(performance, "now").mockImplementation(() => clockValue);

		const withListener = new Hookified({ enableStats: true });
		const errors: string[] = [];
		withListener.on("error", (err: Error) => {
			errors.push(err.message);
			clockValue += 500;
		});
		withListener.onHook({
			id: "fail",
			event: "job",
			handler: () => {
				clockValue += 4;
				throw new Error("boom");
			},
		});
		withListener.onHook({
			id: "after",
			event: "job",
			handler: () => {
				clockValue += 6;
			},
		});

		await withListener.hook("job");
		expect(errors).toEqual(["job: boom"]);
		expect(withListener.stats.calls).toBe(1);
		expect(withListener.stats.errors).toBe(1);
		expect(withListener.stats.pending).toBe(0);
		expect(withListener.stats.duration.sum).toBe(10);
		expect(withListener.stats.events[0].hooks[0].errors).toBe(1);
		expect(withListener.stats.events[0].hooks[0].duration.sum).toBe(4);
		expect(withListener.stats.events[0].hooks[1].duration.sum).toBe(6);

		// 2. With throwOnHookError: true (and listener so emit does not throw first)
		vi.restoreAllMocks();
		createClock([10, 15]);
		const throwing = new Hookified({
			enableStats: true,
			throwOnHookError: true,
		});
		throwing.on("error", () => {});
		throwing.onHook({
			id: "h1",
			event: "job",
			handler: () => {
				throw new Error("fatal");
			},
		});
		throwing.onHook({ id: "h2", event: "job", handler: () => {} });

		await expect(throwing.hook("job")).rejects.toThrow("job: fatal");
		expect(throwing.stats.calls).toBe(1);
		expect(throwing.stats.errors).toBe(1);
		expect(throwing.stats.pending).toBe(0);
		expect(throwing.stats.duration.count).toBe(1);
		expect(throwing.stats.duration.sum).toBe(5);
		expect(throwing.stats.events[0].hooks[0].errors).toBe(1);
		expect(throwing.stats.events[0].hooks[1].calls).toBe(0);

		// 3. With no error listener (emit throws because throwOnEmptyListeners defaults to true)
		vi.restoreAllMocks();
		createClock([100, 107]);
		const noListener = new Hookified({ enableStats: true });
		noListener.onHook({
			id: "h1",
			event: "job",
			handler: () => {
				throw new Error("unhandled");
			},
		});

		await expect(noListener.hook("job")).rejects.toThrow("job: unhandled");
		expect(noListener.stats.calls).toBe(1);
		expect(noListener.stats.errors).toBe(1);
		expect(noListener.stats.pending).toBe(0);
		expect(noListener.stats.duration.count).toBe(1);
		expect(noListener.stats.duration.sum).toBe(7);
		expect(noListener.stats.events[0].hooks[0].errors).toBe(1);
		expect(noListener.stats.events[0].hooks[0].duration.sum).toBe(7);
	});

	test("tracks hookSync async skips, sync throws, resolved promises, and late rejections", async () => {
		// Async skip only: zero clock reads, event.calls 1, handler.calls 0, skipped 1
		const nowSpy = vi.spyOn(performance, "now");
		const skipOnly = new Hookified({ enableStats: true });
		skipOnly.onHook({
			id: "async-h",
			event: "sync-ev",
			handler: async () => {},
		});
		skipOnly.hookSync("sync-ev");

		expect(nowSpy).not.toHaveBeenCalled();
		expect(skipOnly.stats.calls).toBe(1);
		expect(skipOnly.stats.skipped).toBe(1);
		expect(skipOnly.stats.pending).toBe(0);
		expect(skipOnly.stats.duration.count).toBe(1);
		expect(skipOnly.stats.events[0].hooks[0]).toEqual({
			id: "async-h",
			calls: 0,
			errors: 0,
			skipped: 1,
			pending: 0,
			duration: { count: 0, sum: 0, min: 0, max: 0, last: 0, mean: 0 },
		});
		expect(skipOnly.stats.longestCalls()).toEqual([]);

		// Sync throw: with listener (listener time excluded), throwOnHookError, and no listener
		vi.restoreAllMocks();
		let now = 0;
		vi.spyOn(performance, "now").mockImplementation(() => now);
		const syncErr = new Hookified({ enableStats: true });
		const seenErrors: string[] = [];
		syncErr.on("error", (err: Error) => {
			seenErrors.push(err.message);
			now += 200;
		});
		syncErr.onHook({
			id: "bad",
			event: "ev",
			handler: () => {
				now += 3;
				throw new Error("sync boom");
			},
		});
		syncErr.onHook({
			id: "ok",
			event: "ev",
			handler: () => {
				now += 2;
			},
		});

		syncErr.hookSync("ev");
		expect(seenErrors).toEqual(["ev: sync boom"]);
		expect(syncErr.stats.errors).toBe(1);
		expect(syncErr.stats.duration.sum).toBe(5);
		expect(syncErr.stats.events[0].hooks[0].duration.sum).toBe(3);

		// Sync throw with throwOnHookError: true
		vi.restoreAllMocks();
		createClock([0, 4]);
		const syncThrow = new Hookified({
			enableStats: true,
			throwOnHookError: true,
			throwOnEmptyListeners: false,
		});
		syncThrow.onHook({
			id: "bad",
			event: "ev",
			handler: () => {
				throw new Error("sync rethrow");
			},
		});
		expect(() => syncThrow.hookSync("ev")).toThrow("ev: sync rethrow");
		expect(syncThrow.stats.errors).toBe(1);
		expect(syncThrow.stats.duration.sum).toBe(4);

		// Sync throw with no error listener (emit throws)
		vi.restoreAllMocks();
		createClock([0, 6]);
		const syncNoListener = new Hookified({ enableStats: true });
		syncNoListener.onHook({
			id: "bad",
			event: "ev",
			handler: () => {
				throw new Error("no listener");
			},
		});
		expect(() => syncNoListener.hookSync("ev")).toThrow("ev: no listener");
		expect(syncNoListener.stats.errors).toBe(1);
		expect(syncNoListener.stats.duration.sum).toBe(6);

		// Promise returning non-async handler: resolves and rejects late
		vi.restoreAllMocks();
		createClock([0, 1, 10, 12]);
		const promiseHooks = new Hookified({ enableStats: true });
		const lateMessages: string[] = [];
		promiseHooks.on("error", (err: Error) => {
			lateMessages.push(err.message);
			expect(promiseHooks.stats.errors).toBe(1);
		});
		promiseHooks.onHook({
			id: "resolves",
			event: "late",
			handler: () => Promise.resolve(),
		});
		promiseHooks.onHook({
			id: "rejects",
			event: "late",
			handler: () => Promise.reject(new Error("late boom")),
		});

		const unhandled = await collectUnhandledRejections(() => {
			promiseHooks.hookSync("late");
		});
		expect(unhandled).toEqual([]);
		expect(lateMessages).toEqual(["late: late boom"]);
		expect(promiseHooks.stats.calls).toBe(1);
		expect(promiseHooks.stats.errors).toBe(1);
		expect(promiseHooks.stats.duration.sum).toBe(3);
		expect(promiseHooks.stats.events[0].hooks[0].errors).toBe(0);
		expect(promiseHooks.stats.events[0].hooks[1].errors).toBe(1);

		// Late rejection after enabled = false still increments the same records
		vi.restoreAllMocks();
		createClock([0, 1]);
		let rejectPaused!: (reason?: unknown) => void;
		const paused = new Hookified({ enableStats: true });
		paused.on("error", () => {});
		paused.onHook({
			id: "delayed",
			event: "late",
			handler: () =>
				new Promise<void>((_resolve, reject) => {
					rejectPaused = reject;
				}),
		});

		paused.hookSync("late");
		paused.stats.enabled = false;
		const pausedUnhandled = await collectUnhandledRejections(() => {
			rejectPaused(new Error("after pause"));
		});
		expect(pausedUnhandled).toEqual([]);
		expect(paused.stats.errors).toBe(1);
		expect(paused.stats.events[0].hooks[0].errors).toBe(1);

		// Late rejection after resetStats() does not change new counters and throws nothing
		vi.restoreAllMocks();
		createClock([0, 1]);
		let rejectReset!: (reason?: unknown) => void;
		const resetCase = new Hookified({ enableStats: true });
		resetCase.on("error", () => {});
		resetCase.onHook({
			id: "delayed",
			event: "late",
			handler: () =>
				new Promise<void>((_resolve, reject) => {
					rejectReset = reject;
				}),
		});

		resetCase.hookSync("late");
		resetCase.stats.resetStats();
		const resetUnhandled = await collectUnhandledRejections(() => {
			rejectReset(new Error("after reset"));
		});
		expect(resetUnhandled).toEqual([]);
		expect(resetCase.stats.calls).toBe(0);
		expect(resetCase.stats.errors).toBe(0);
		expect(resetCase.stats.events).toEqual([]);
	});

	test("computes durations with 3-decimal rounding, floating point sum, and chronological last", async () => {
		// 0.1 + 0.2 sum must be 0.3, mean uses unrounded sum
		createClock([0, 0.1, 1, 1.2, 2, 2.0014]);
		const hookified = new Hookified({ enableStats: true });
		hookified.onHook({ id: "h", event: "precision", handler: () => {} });

		// Zero-count duration before any call
		expect(hookified.stats.duration).toEqual({
			count: 0,
			sum: 0,
			min: 0,
			max: 0,
			last: 0,
			mean: 0,
		});
		expect(hookified.stats.events[0].duration).toEqual({
			count: 0,
			sum: 0,
			min: 0,
			max: 0,
			last: 0,
			mean: 0,
		});

		await hookified.hook("precision");
		await hookified.hook("precision");
		expect(hookified.stats.duration).toEqual({
			count: 2,
			sum: 0.3,
			min: 0.1,
			max: 0.2,
			last: 0.2,
			mean: 0.15,
		});

		await hookified.hook("precision");
		// Unrounded sum is 0.3014, mean is 0.100466... -> 0.1
		expect(hookified.stats.duration).toEqual({
			count: 3,
			sum: 0.301,
			min: 0.001,
			max: 0.2,
			last: 0.001,
			mean: 0.1,
		});

		// Multi-event global min, max, and chronological last across overlapping dispatches
		vi.restoreAllMocks();
		let now = 0;
		vi.spyOn(performance, "now").mockImplementation(() => now);
		const multi = new Hookified({ enableStats: true });
		let resolveSlow!: () => void;
		multi.onHook({
			id: "slow",
			event: "e-slow",
			handler: () =>
				new Promise<void>((resolve) => {
					resolveSlow = resolve;
				}),
		});
		multi.onHook({
			id: "fast",
			event: "e-fast",
			handler: () => {
				now += 2;
			},
		});
		multi.onHook({
			id: "mid",
			event: "e-mid",
			handler: () => {
				now += 5;
			},
		});
		// Also register an untouched event to cover count === 0 in global duration loop
		multi.onHook({ id: "idle", event: "e-idle", handler: () => {} });

		// Start slow at t=0
		const slowPromise = multi.hook("e-slow");
		// Run mid (t=0..5 -> 5ms) then fast (t=5..7 -> 2ms)
		await multi.hook("e-mid");
		await multi.hook("e-fast");
		// Finish slow at t=20 -> 20ms (chronologically last completed)
		now = 20;
		resolveSlow();
		await slowPromise;

		expect(multi.stats.duration).toEqual({
			count: 3,
			sum: 27,
			min: 2,
			max: 20,
			last: 20,
			mean: 9,
		});
	});

	test("tracks pending while a handler awaits a deferred promise", async () => {
		createClock([0, 12, 20, 25]);
		const hookified = new Hookified({ enableStats: true });
		let resolveFirst!: () => void;
		hookified.onHook({
			id: "waiter",
			event: "async-op",
			handler: () =>
				new Promise<void>((resolve) => {
					resolveFirst = resolve;
				}),
		});

		const pendingCall = hookified.hook("async-op");

		expect(hookified.stats.pending).toBe(1);
		expect(hookified.stats.calls).toBe(1);
		expect(hookified.stats.events[0].pending).toBe(1);
		expect(hookified.stats.events[0].hooks[0].pending).toBe(1);
		expect(hookified.stats.longestCalls()).toEqual([]);

		resolveFirst();
		await pendingCall;

		expect(hookified.stats.pending).toBe(0);
		expect(hookified.stats.events[0].pending).toBe(0);
		expect(hookified.stats.events[0].hooks[0].pending).toBe(0);
		expect(hookified.stats.duration.last).toBe(12);

		// Reset while in-flight: new counters stay clean when old deferred finishes
		let resolveSecond!: () => void;
		hookified.onHook({
			id: "waiter",
			event: "async-op",
			handler: () =>
				new Promise<void>((resolve) => {
					resolveSecond = resolve;
				}),
		});
		const inFlight = hookified.hook("async-op");
		expect(hookified.stats.pending).toBe(1);
		hookified.stats.resetStats();
		expect(hookified.stats.pending).toBe(0);
		resolveSecond();
		await inFlight;
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.pending).toBe(0);
		expect(hookified.stats.duration.count).toBe(0);
	});

	test("tracks blocked dispatches for deprecated hooks and ignores blocked registrations", async () => {
		const nowSpy = vi.spyOn(performance, "now");
		const deprecatedHooks = new Map([["old", "use new"]]);
		const hookified = new Hookified({
			enableStats: true,
			deprecatedHooks,
			allowDeprecated: false,
		});
		const handler = vi.fn();

		expect(hookified.onHook({ event: "old", handler })).toBeUndefined();
		hookified.onceHook({ event: "old", handler });
		expect(hookified.stats.events).toEqual([]);
		expect(hookified.stats.blocked).toBe(0);
		expect(hookified.stats.registration.registered).toBe(0);

		await hookified.hook("old");
		hookified.hookSync("old");

		expect(handler).not.toHaveBeenCalled();
		expect(nowSpy).not.toHaveBeenCalled();
		expect(hookified.stats.blocked).toBe(2);
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.events).toEqual([
			{
				event: "old",
				handlers: 0,
				calls: 0,
				errors: 0,
				skipped: 0,
				blocked: 2,
				pending: 0,
				duration: { count: 0, sum: 0, min: 0, max: 0, last: 0, mean: 0 },
				hooks: [],
			},
		]);
	});

	test("tracks registration inserts, replaces, removals, misses, and once-hook self-removal", async () => {
		createClock([0, 1, 2, 3]);
		const hookified = new Hookified({ enableStats: true });
		const fnA = () => {};
		const fnB = () => {};
		const fnC = () => {};
		const fnD = () => {};
		const fnE = () => {};
		const fnF = () => {};

		// Bottom (default), Top, and numeric index inserts
		hookified.onHook({ id: "b", event: "ev", handler: fnB });
		hookified.onHook(
			{ id: "a", event: "ev", handler: fnA },
			{ position: "Top" },
		);
		hookified.onHook({ id: "mid", event: "ev", handler: fnC }, { position: 1 });
		expect(hookified.stats.events[0].hooks.map((h) => h.id)).toEqual([
			"a",
			"mid",
			"b",
		]);
		expect(hookified.stats.registration).toEqual({
			registered: 3,
			replaced: 0,
			removed: 0,
			removeMisses: 0,
		});

		// Replace by id (does not increment registered)
		hookified.onHook({ id: "mid", event: "ev", handler: fnD });
		expect(hookified.stats.registration).toEqual({
			registered: 3,
			replaced: 1,
			removed: 0,
			removeMisses: 0,
		});
		expect(
			hookified.stats.registration.registered -
				hookified.stats.registration.removed,
		).toBe(countLiveHooks(hookified));

		// removeHook hit and misses (wrong handler & missing event)
		expect(hookified.removeHook({ event: "ev", handler: fnA })).toBeDefined();
		expect(hookified.removeHook({ event: "ev", handler: fnA })).toBeUndefined();
		expect(
			hookified.removeHook({ event: "missing", handler: fnA }),
		).toBeUndefined();
		expect(hookified.stats.registration).toEqual({
			registered: 3,
			replaced: 1,
			removed: 1,
			removeMisses: 2,
		});

		// removeHooks delegates to removeHook (no double count)
		hookified.onHooks([
			{ id: "e1", event: "ev2", handler: fnE },
			{ id: "e2", event: "ev2", handler: fnF },
		]);
		const removedBatch = hookified.removeHooks([
			{ event: "ev2", handler: fnE },
			{ event: "ev2", handler: () => {} },
		]);
		expect(removedBatch).toHaveLength(1);
		expect(hookified.stats.registration).toEqual({
			registered: 5,
			replaced: 1,
			removed: 2,
			removeMisses: 3,
		});

		// removeHookById single hit, single miss, and array delegation
		expect(hookified.removeHookById("mid")).toBeDefined();
		expect(hookified.removeHookById("no-such-id")).toBeUndefined();
		const removedIds = hookified.removeHookById(["e2", "still-missing"]);
		expect(removedIds).toHaveLength(1);
		expect(hookified.stats.registration).toEqual({
			registered: 5,
			replaced: 1,
			removed: 4,
			removeMisses: 5,
		});

		// removeEventHooks hit and nonexistent (no miss counted)
		hookified.addHook("ev3", () => {});
		hookified.prependHook({ id: "top3", event: "ev3", handler: () => {} });
		expect(hookified.removeEventHooks("ev3")).toHaveLength(2);
		expect(hookified.removeEventHooks("never-registered")).toEqual([]);
		expect(hookified.stats.registration).toEqual({
			registered: 7,
			replaced: 1,
			removed: 6,
			removeMisses: 5,
		});

		// onceHook and prependOnceHook self-removal counts in removed
		hookified.onceHook({ id: "once1", event: "once-ev", handler: () => {} });
		hookified.prependOnceHook({
			id: "once0",
			event: "once-ev",
			handler: () => {},
		});
		await hookified.hook("once-ev");
		expect(hookified.stats.registration).toEqual({
			registered: 9,
			replaced: 1,
			removed: 8,
			removeMisses: 5,
		});
		expect(
			hookified.stats.registration.registered -
				hookified.stats.registration.removed,
		).toBe(countLiveHooks(hookified));

		// clearHooks counts remaining live hooks (1 hook "b" still on "ev")
		hookified.clearHooks();
		hookified.clearHooks();
		expect(hookified.stats.registration).toEqual({
			registered: 9,
			replaced: 1,
			removed: 9,
			removeMisses: 5,
		});
		expect(countLiveHooks(hookified)).toBe(0);
		expect(
			hookified.stats.registration.registered -
				hookified.stats.registration.removed,
		).toBe(0);
	});

	test("tracks per-hook rows across custom/generated ids, replace, removal, and direct map mutation", async () => {
		createClock([0, 4, 10, 12, 20, 23]);
		const hookified = new Hookified({
			enableStats: true,
			useHookClone: false,
		});

		const generated = hookified.onHook({ event: "e", handler: () => {} });
		const custom = { id: "custom", event: "e", handler: () => {} };
		hookified.onHook(custom);

		// Registered while enabled: rows exist before running
		expect(hookified.stats.events[0].hooks.map((h) => h.id)).toEqual([
			generated?.id,
			"custom",
		]);
		expect(hookified.stats.events[0].hooks.map((h) => h.calls)).toEqual([0, 0]);

		await hookified.hook("e");
		expect(hookified.stats.events[0].hooks[1].calls).toBe(1);
		expect(hookified.stats.events[0].hooks[1].duration.sum).toBe(2);

		// Same-id replace resets the handler row even with useHookClone: false
		hookified.onHook(custom);
		expect(hookified.stats.events[0].hooks[1].calls).toBe(0);
		expect(hookified.stats.events[0].hooks[1].duration.count).toBe(0);

		// Remove custom hook: leaves hooks and leaderboards while event totals stay
		hookified.removeHookById("custom");
		expect(hookified.stats.events[0].handlers).toBe(1);
		expect(hookified.stats.events[0].hooks.map((h) => h.id)).toEqual([
			generated?.id,
		]);
		expect(hookified.stats.events[0].calls).toBe(1);
		expect(hookified.stats.topCalls().map((r) => r.id)).toEqual([
			generated?.id,
		]);

		// Remove last hook: event totals remain with 0 handlers
		hookified.removeHookById(generated?.id ?? "");
		expect(hookified.stats.events[0].handlers).toBe(0);
		expect(hookified.stats.events[0].hooks).toEqual([]);
		expect(hookified.stats.events[0].calls).toBe(1);
		expect(hookified.stats.topCalls()).toEqual([]);
		expect(hookified.stats.longestCalls()).toEqual([]);

		// Direct mutation of hooks Map bypasses registration counters, reflects live map
		const regBefore = hookified.stats.registration;
		hookified.hooks.set("e", [{ event: "e", handler: () => {} }]);
		expect(hookified.stats.registration).toEqual(regBefore);
		expect(hookified.stats.events[0].handlers).toBe(1);
		expect(hookified.stats.events[0].hooks).toEqual([
			{
				calls: 0,
				errors: 0,
				skipped: 0,
				pending: 0,
				duration: { count: 0, sum: 0, min: 0, max: 0, last: 0, mean: 0 },
			},
		]);
		expect("id" in hookified.stats.events[0].hooks[0]).toBe(false);
		expect(hookified.stats.topCalls()).toHaveLength(1);
	});

	test("topCalls and longestCalls sort with tie-breakers, cap at 20, and clear on reset", async () => {
		let now = 0;
		vi.spyOn(performance, "now").mockImplementation(() => now);
		const hookified = new Hookified({ enableStats: true });

		// 25 live hooks across two events to verify cap of 20
		for (let i = 0; i < 25; i++) {
			const duration = i + 1;
			hookified.onHook({
				id: `h-${String(i).padStart(2, "0")}`,
				event: i % 2 === 0 ? "e-a" : "e-b",
				handler: () => {
					now += duration;
				},
			});
		}
		await hookified.hook("e-a");
		await hookified.hook("e-b");
		await hookified.hook("e-a");

		const top = hookified.stats.topCalls();
		expect(top).toHaveLength(20);
		expect(top[0].calls).toBe(2);
		expect(top[0].event).toBe("e-a");
		expect(top[0].id).toBe("h-00");
		expect(top[13].calls).toBe(1);
		expect(top[13].event).toBe("e-b");
		expect(top[13].id).toBe("h-01");

		const longest = hookified.stats.longestCalls();
		expect(longest).toHaveLength(20);
		expect(longest[0].id).toBe("h-24");
		expect(longest[0].duration.max).toBe(25);
		expect(longest[19].id).toBe("h-05");
		expect(longest[19].duration.max).toBe(6);

		// Tie-breaking: missing id sorts before present id, event asc, id asc
		hookified.stats.resetStats();
		hookified.clearHooks();
		expect(hookified.stats.topCalls()).toEqual([]);
		expect(hookified.stats.longestCalls()).toEqual([]);

		hookified.onHook({
			id: "z",
			event: "b-ev",
			handler: () => {
				now += 5;
			},
		});
		hookified.onHook({
			id: "b",
			event: "a-ev",
			handler: () => {
				now += 5;
			},
		});
		hookified.onHook({
			id: "a",
			event: "a-ev",
			handler: () => {
				now += 5;
			},
		});
		// Add hooks without id both before and after hooks with id via direct map mutation
		hookified.hooks.get("a-ev")?.unshift({
			event: "a-ev",
			handler: () => {
				now += 5;
			},
		});
		hookified.hooks.get("a-ev")?.push({
			event: "a-ev",
			handler: () => {
				now += 5;
			},
		});
		// Add an uncalled hook on c-ev to verify longestCalls excludes duration.count === 0
		hookified.onHook({ id: "never", event: "c-ev", handler: () => {} });

		await hookified.hook("a-ev");
		await hookified.hook("b-ev");

		expect(
			hookified.stats.topCalls().map((r) => [r.event, r.id, r.calls]),
		).toEqual([
			["a-ev", undefined, 1],
			["a-ev", undefined, 1],
			["a-ev", "a", 1],
			["a-ev", "b", 1],
			["b-ev", "z", 1],
			["c-ev", "never", 0],
		]);

		expect(
			hookified.stats
				.longestCalls()
				.map((r) => [r.event, r.id, r.duration.max]),
		).toEqual([
			["a-ev", undefined, 5],
			["a-ev", undefined, 5],
			["a-ev", "a", 5],
			["a-ev", "b", 5],
			["b-ev", "z", 5],
		]);
	});

	test("folds events after the 1000-event cap into overflow and keeps totals accurate", async () => {
		let now = 0;
		vi.spyOn(performance, "now").mockImplementation(() => now);
		const deprecatedHooks = new Map([["event-1002", "old overflow"]]);
		const hookified = new Hookified({
			enableStats: true,
			deprecatedHooks,
			allowDeprecated: false,
		});
		hookified.on("error", () => {});

		for (let i = 0; i < 1000; i++) {
			hookified.onHook({
				id: `id-${i}`,
				event: `event-${i}`,
				handler: () => {
					now += 10;
				},
			});
		}

		// Still at the 1000 cap: overflow is undefined even when reusing an existing event
		hookified.onHook({
			id: "id-999",
			event: "event-999",
			handler: () => {
				now += 10;
			},
		});
		await hookified.hook("event-0");
		expect(hookified.stats.events).toHaveLength(1000);
		expect(hookified.stats.overflow).toBeUndefined();

		// 1001st distinct event lands in overflow
		let resolveOverflow!: () => void;
		hookified.onHook({
			id: "overflow-ok",
			event: "event-1000",
			handler: () => {
				now += 2;
			},
		});
		hookified.onHook({
			id: "overflow-ok",
			event: "event-1000",
			handler: () => {
				now += 2;
			},
		});
		hookified.onHook({
			id: "overflow-err",
			event: "event-1000",
			handler: () => {
				now += 1;
				throw new Error("overflow async boom");
			},
		});
		await hookified.hook("event-1000");

		// Overflow hookSync: async skip, sync ok, sync throw, late rejection
		hookified.onHook({
			id: "overflow-async",
			event: "event-1001",
			handler: async () => {},
		});
		hookified.onHook({
			id: "overflow-sync-ok",
			event: "event-1001",
			handler: () => {
				now += 3;
			},
		});
		hookified.onHook({
			id: "overflow-sync-err",
			event: "event-1001",
			handler: () => {
				now += 1;
				throw new Error("overflow sync boom");
			},
		});
		hookified.onHook({
			id: "overflow-late",
			event: "event-1001",
			handler: () => {
				now += 1;
				return Promise.reject(new Error("overflow late boom"));
			},
		});
		const unhandled = await collectUnhandledRejections(() => {
			hookified.hookSync("event-1001");
		});
		expect(unhandled).toEqual([]);

		// Overflow blocked dispatch
		await hookified.hook("event-1002");

		// Overflow pending dispatch
		hookified.onHook({
			id: "overflow-wait",
			event: "event-1003",
			handler: () =>
				new Promise<void>((resolve) => {
					resolveOverflow = resolve;
				}),
		});
		const pendingOverflow = hookified.hook("event-1003");
		expect(hookified.stats.overflow?.pending).toBe(1);
		expect(hookified.stats.pending).toBe(1);

		now += 50;
		resolveOverflow();
		await pendingOverflow;

		expect(hookified.stats.events).toHaveLength(1000);
		expect(hookified.stats.overflow).toEqual({
			calls: 3,
			errors: 3,
			skipped: 1,
			blocked: 1,
			pending: 0,
			duration: {
				count: 3,
				sum: 58,
				min: 3,
				max: 50,
				last: 50,
				mean: 19.333,
			},
		});

		// Totals include named events plus overflow
		expect(hookified.stats.calls).toBe(4);
		expect(hookified.stats.errors).toBe(3);
		expect(hookified.stats.skipped).toBe(1);
		expect(hookified.stats.blocked).toBe(1);
		expect(hookified.stats.pending).toBe(0);
		expect(hookified.stats.duration).toEqual({
			count: 4,
			sum: 68,
			min: 3,
			max: 50,
			last: 50,
			mean: 17,
		});
		expect(hookified.stats.registration.registered).toBe(1007);
		expect(hookified.stats.registration.replaced).toBe(2);

		// Overflow hooks do not appear in topCalls or longestCalls
		const topEvents = new Set(hookified.stats.topCalls().map((r) => r.event));
		const longestEvents = new Set(
			hookified.stats.longestCalls().map((r) => r.event),
		);
		expect(topEvents.has("event-1000")).toBe(false);
		expect(topEvents.has("event-1001")).toBe(false);
		expect(topEvents.has("event-1003")).toBe(false);
		expect(longestEvents.has("event-1000")).toBe(false);
		expect(longestEvents.has("event-1003")).toBe(false);
	});

	test("resetStats works with data, with no data, and while paused", async () => {
		createClock([0, 5]);
		const hookified = new Hookified({ enableStats: true });

		// Reset with no data
		hookified.stats.resetStats();
		expect(hookified.stats.enabled).toBe(true);
		expect(hookified.stats.calls).toBe(0);

		hookified.onHook({ id: "h", event: "ev", handler: () => {} });
		await hookified.hook("ev");
		expect(hookified.stats.calls).toBe(1);

		// Reset while paused keeps enabled false
		hookified.stats.enabled = false;
		hookified.stats.resetStats();
		expect(hookified.stats.enabled).toBe(false);
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.events).toEqual([]);
		expect(hookified.stats.overflow).toBeUndefined();
		expect(hookified.stats.registration).toEqual({
			registered: 0,
			replaced: 0,
			removed: 0,
			removeMisses: 0,
		});
		expect(hookified.stats.topCalls()).toEqual([]);
		expect(hookified.stats.longestCalls()).toEqual([]);
	});

	test("returns fresh plain objects and serializes identically with JSON.stringify and toJSON", async () => {
		createClock([0, 3, 10, 12]);
		const hookified = new Hookified({ enableStats: true });
		hookified.onHook({ id: "h1", event: "ev", handler: () => {} });
		await hookified.hook("ev");

		const events1 = hookified.stats.events;
		events1[0].calls = 999;
		events1[0].hooks[0].calls = 999;
		events1.push({
			event: "fake",
			handlers: 0,
			calls: 1,
			errors: 0,
			skipped: 0,
			blocked: 0,
			pending: 0,
			duration: { count: 0, sum: 0, min: 0, max: 0, last: 0, mean: 0 },
			hooks: [],
		});

		const duration1 = hookified.stats.duration;
		duration1.sum = 999;

		const registration1 = hookified.stats.registration;
		registration1.registered = 999;

		expect(hookified.stats.events).toHaveLength(1);
		expect(hookified.stats.events[0].calls).toBe(1);
		expect(hookified.stats.events[0].hooks[0].calls).toBe(1);
		expect(hookified.stats.duration.sum).toBe(3);
		expect(hookified.stats.registration.registered).toBe(1);

		// JSON round-trip without overflow
		const jsonNoOverflow = hookified.stats.toJSON();
		expect("overflow" in jsonNoOverflow).toBe(false);
		expect(JSON.parse(JSON.stringify(hookified.stats))).toStrictEqual(
			jsonNoOverflow,
		);

		// Trigger overflow and verify overflow immutability + JSON round-trip with overflow
		for (let i = 0; i < 1000; i++) {
			hookified.onHook({ event: `ov-${i}`, handler: () => {} });
		}
		await hookified.hook("ov-999");

		const overflow1 = hookified.stats.overflow;
		expect(overflow1).toBeDefined();
		if (overflow1) {
			overflow1.calls = 999;
			overflow1.duration.sum = 999;
		}
		expect(hookified.stats.overflow?.calls).toBe(1);
		expect(hookified.stats.overflow?.duration.sum).toBe(2);

		const jsonWithOverflow = hookified.stats.toJSON();
		expect(jsonWithOverflow.overflow).toBeDefined();
		expect(JSON.parse(JSON.stringify(hookified.stats))).toStrictEqual(
			jsonWithOverflow,
		);
	});

	test("maintains behavior parity between stats off and stats on", async () => {
		const runScenario = async (enableStats: boolean) => {
			const h = new Hookified({ enableStats });
			const log: string[] = [];
			const errors: string[] = [];
			h.on("error", (err: Error) => errors.push(err.message));

			h.onHook({
				id: "first",
				event: "run",
				handler: () => {
					log.push("first");
				},
			});
			h.prependHook({
				id: "zero",
				event: "run",
				handler: () => {
					log.push("zero");
				},
			});
			h.onceHook({
				id: "once",
				event: "run",
				handler: () => {
					log.push("once");
				},
			});
			h.onHook({
				id: "err",
				event: "run",
				handler: () => {
					log.push("err");
					throw new Error("boom");
				},
			});
			h.onHook({
				id: "after-err",
				event: "run",
				handler: () => {
					log.push("after-err");
				},
			});

			await h.hook("run");
			await h.hook("run");

			h.onHook({
				id: "sync-fn",
				event: "sync",
				handler: () => {
					log.push("sync");
				},
			});
			h.onHook({
				id: "async-fn",
				event: "sync",
				handler: async () => {
					log.push("async");
				},
			});
			h.onHook({
				id: "late-rej",
				event: "sync",
				handler: () => Promise.reject(new Error("late")),
			});
			await collectUnhandledRejections(() => {
				h.hookSync("sync");
			});

			const throwInstance = new Hookified({
				enableStats,
				throwOnHookError: true,
			});
			throwInstance.on("error", () => {});
			throwInstance.onHook({
				event: "fail",
				handler: () => {
					throw new Error("stop");
				},
			});
			let thrownMessage = "";
			try {
				await throwInstance.hook("fail");
			} catch (err) {
				thrownMessage = (err as Error).message;
			}

			return { log, errors, thrownMessage };
		};

		const offResult = await runScenario(false);
		const onResult = await runScenario(true);
		expect(onResult).toEqual(offResult);
	});

	test("counts WaterfallHook and ParallelHook as one handler each and handles step failures correctly", async () => {
		createClock([0, 4, 10, 15, 20, 26]);
		const hookified = new Hookified({ enableStats: true });
		hookified.on("error", () => {});

		// WaterfallHook with a throwing step counts one hook error
		const wf = new WaterfallHook("wf", () => {}, "wf-id");
		wf.addHook(({ initialArgs }) => initialArgs + 1);
		wf.addHook(() => {
			throw new Error("step failed");
		});
		hookified.onHook(wf);

		// ParallelHook with a rejecting step settles internally and counts zero hook errors
		const ph = new ParallelHook("ph", () => {}, "ph-id");
		ph.addHook(async () => "ok");
		ph.addHook(async () => {
			throw new Error("branch failed");
		});
		hookified.onHook(ph);

		await hookified.hook("wf", 1);
		await hookified.hook("ph", 1);

		const wfEvent = hookified.stats.events.find((e) => e.event === "wf");
		expect(wfEvent?.handlers).toBe(1);
		expect(wfEvent?.hooks).toHaveLength(1);
		expect(wfEvent?.hooks[0].id).toBe("wf-id");
		expect(wfEvent?.calls).toBe(1);
		expect(wfEvent?.errors).toBe(1);
		expect(wfEvent?.hooks[0].errors).toBe(1);

		const phEvent = hookified.stats.events.find((e) => e.event === "ph");
		expect(phEvent?.handlers).toBe(1);
		expect(phEvent?.hooks).toHaveLength(1);
		expect(phEvent?.hooks[0].id).toBe("ph-id");
		expect(phEvent?.calls).toBe(1);
		expect(phEvent?.errors).toBe(0);
		expect(phEvent?.hooks[0].errors).toBe(0);
	});

	test("does not count Eventified.emit calls", () => {
		const nowSpy = vi.spyOn(performance, "now");
		const hookified = new Hookified({ enableStats: true });
		hookified.on("ping", () => {});
		hookified.emit("ping", "hello");

		expect(nowSpy).not.toHaveBeenCalled();
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.events).toEqual([]);
	});

	test("supports subclasses that overwrite _stats and define their own stats getter", async () => {
		const nowSpy = vi.spyOn(performance, "now");

		// Plain Hookified keeps stats getter on prototype (no own stats property)
		const plain = new Hookified({ enableStats: true });
		expect(Object.hasOwn(plain, "stats")).toBe(false);
		expect(
			typeof Object.getOwnPropertyDescriptor(Hookified.prototype, "stats")?.get,
		).toBe("function");
		plain.onHook({ id: "p", event: "ping", handler: () => {} });
		await plain.hook("ping");
		expect(plain.stats.calls).toBe(1);

		nowSpy.mockClear();

		class KeyvLike extends Hookified {
			private readonly _customStats = { enabled: true, hits: 0 };

			constructor() {
				super({ enableStats: true });
				// biome-ignore lint/suspicious/noExplicitAny: simulates subclass overwriting _stats
				(this as any)._stats = this._customStats;
			}

			// @ts-expect-error simulates subclass with incompatible stats getter
			public override get stats() {
				return this._customStats;
			}
		}

		const sub = new KeyvLike();
		expect(Object.hasOwn(sub, "stats")).toBe(false);
		expect(sub.stats).toEqual({ enabled: true, hits: 0 });

		const fn = () => {};
		sub.onHook({ id: "s1", event: "ev", handler: fn });
		await sub.hook("ev");
		sub.hookSync("ev");
		sub.removeHook({ event: "ev", handler: fn });
		sub.removeHook({ event: "ev", handler: fn });
		sub.removeHookById("s1");
		sub.removeEventHooks("ev");
		sub.clearHooks();

		expect(nowSpy).not.toHaveBeenCalled();
		expect(sub.stats).toEqual({ enabled: true, hits: 0 });
	});

	test("reads stats through a proxy of HookStats", async () => {
		const hookified = new Hookified({ enableStats: true });
		const view = new Proxy(hookified.stats, {});
		expect(view.calls).toBe(0);
		expect(view.enabled).toBe(true);

		hookified.onHook({ id: "p", event: "ev", handler: () => {} });
		await hookified.hook("ev");
		expect(view.calls).toBe(1);
		expect(JSON.parse(JSON.stringify(view)).calls).toBe(1);

		const wrapped = new Hookified({ enableStats: true });
		// biome-ignore lint/suspicious/noExplicitAny: proxy stands in for the stats field
		(wrapped as any)._stats = new Proxy(wrapped.stats, {});
		wrapped.onHook({ id: "q", event: "ev", handler: () => {} });
		await wrapped.hook("ev");
		wrapped.hookSync("ev");
		expect(wrapped.stats.calls).toBe(2);
		expect(wrapped.stats.events[0]?.hooks[0]?.id).toBe("q");
	});

	test("enforceBeforeAfter validation failures record nothing", async () => {
		const nowSpy = vi.spyOn(performance, "now");
		const hookified = new Hookified({
			enableStats: true,
			enforceBeforeAfter: true,
		});

		expect(() =>
			hookified.onHook({ event: "bad", handler: () => {} }),
		).toThrow();
		expect(() =>
			hookified.onceHook({ event: "bad", handler: () => {} }),
		).toThrow();
		await expect(hookified.hook("bad")).rejects.toThrow();
		expect(() => hookified.hookSync("bad")).toThrow();
		expect(() =>
			hookified.removeHook({ event: "bad", handler: () => {} }),
		).toThrow();
		expect(() => hookified.removeEventHooks("bad")).toThrow();

		expect(nowSpy).not.toHaveBeenCalled();
		expect(hookified.stats.calls).toBe(0);
		expect(hookified.stats.errors).toBe(0);
		expect(hookified.stats.blocked).toBe(0);
		expect(hookified.stats.events).toEqual([]);
		expect(hookified.stats.registration).toEqual({
			registered: 0,
			replaced: 0,
			removed: 0,
			removeMisses: 0,
		});
	});
});
