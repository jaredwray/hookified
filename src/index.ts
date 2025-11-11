import { type EventEmitterOptions, Eventified } from "./eventified.js";

// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
export type Hook = (...arguments_: any[]) => Promise<void> | void;

export type HookEntry = {
	/**
	 * The event name for the hook
	 */
	event: string;
	/**
	 * The handler function for the hook
	 */
	handler: Hook;
};

export type HookifiedOptions = {
	/**
	 * Whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @deprecated - this will be deprecated in version 2. Please use throwOnHookError.
	 */
	throwHookErrors?: boolean;
	/**
	 * Whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 */
	throwOnHookError?: boolean;
	/**
	 * Whether to enforce that all hook names start with 'before' or 'after'. Default is false.
	 * @type {boolean}
	 * @default false
	 */
	enforceBeforeAfter?: boolean;
	/**
	 * Map of deprecated hook names to deprecation messages. When a deprecated hook is used, a warning will be emitted.
	 * @type {Map<string, string>}
	 * @default new Map()
	 */
	deprecatedHooks?: Map<string, string>;
	/**
	 * Whether to allow deprecated hooks to be registered and executed. Default is true.
	 * @type {boolean}
	 * @default true
	 */
	allowDeprecated?: boolean;
} & EventEmitterOptions;

export class Hookified extends Eventified {
	private readonly _hooks: Map<string, Hook[]>;
	private _throwOnHookError = false;
	private _enforceBeforeAfter = false;
	private _deprecatedHooks: Map<string, string>;
	private _allowDeprecated = true;

	constructor(options?: HookifiedOptions) {
		super({ logger: options?.logger });
		this._hooks = new Map();
		this._deprecatedHooks = options?.deprecatedHooks
			? new Map(options.deprecatedHooks)
			: new Map();

		if (options?.throwOnHookError !== undefined) {
			this._throwOnHookError = options.throwOnHookError;
		} else if (options?.throwHookErrors !== undefined) {
			this._throwOnHookError = options.throwHookErrors;
		}

		if (options?.enforceBeforeAfter !== undefined) {
			this._enforceBeforeAfter = options.enforceBeforeAfter;
		}

		if (options?.allowDeprecated !== undefined) {
			this._allowDeprecated = options.allowDeprecated;
		}
	}

	/**
	 * Gets all hooks
	 * @returns {Map<string, Hook[]>}
	 */
	public get hooks() {
		return this._hooks;
	}

	/**
	 * Gets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @returns {boolean}
	 * @deprecated - this will be deprecated in version 2. Please use throwOnHookError.
	 */
	public get throwHookErrors() {
		return this._throwOnHookError;
	}

	/**
	 * Sets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @param {boolean} value
	 * @deprecated - this will be deprecated in version 2. Please use throwOnHookError.
	 */
	public set throwHookErrors(value) {
		this._throwOnHookError = value;
	}

	/**
	 * Gets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @returns {boolean}
	 */
	public get throwOnHookError() {
		return this._throwOnHookError;
	}

	/**
	 * Sets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @param {boolean} value
	 */
	public set throwOnHookError(value) {
		this._throwOnHookError = value;
	}

	/**
	 * Gets whether to enforce that all hook names start with 'before' or 'after'. Default is false.
	 * @returns {boolean}
	 * @default false
	 */
	public get enforceBeforeAfter() {
		return this._enforceBeforeAfter;
	}

	/**
	 * Sets whether to enforce that all hook names start with 'before' or 'after'. Default is false.
	 * @param {boolean} value
	 */
	public set enforceBeforeAfter(value) {
		this._enforceBeforeAfter = value;
	}

	/**
	 * Gets the map of deprecated hook names to deprecation messages.
	 * @returns {Map<string, string>}
	 */
	public get deprecatedHooks() {
		return this._deprecatedHooks;
	}

	/**
	 * Sets the map of deprecated hook names to deprecation messages.
	 * @param {Map<string, string>} value
	 */
	public set deprecatedHooks(value) {
		this._deprecatedHooks = value;
	}

	/**
	 * Gets whether deprecated hooks are allowed to be registered and executed. Default is true.
	 * @returns {boolean}
	 */
	public get allowDeprecated() {
		return this._allowDeprecated;
	}

	/**
	 * Sets whether deprecated hooks are allowed to be registered and executed. Default is true.
	 * @param {boolean} value
	 */
	public set allowDeprecated(value) {
		this._allowDeprecated = value;
	}

	/**
	 * Validates hook event name if enforceBeforeAfter is enabled
	 * @param {string} event - The event name to validate
	 * @throws {Error} If enforceBeforeAfter is true and event doesn't start with 'before' or 'after'
	 */
	private validateHookName(event: string): void {
		if (this._enforceBeforeAfter) {
			const eventValue = event.trim().toLocaleLowerCase();
			if (!eventValue.startsWith("before") && !eventValue.startsWith("after")) {
				throw new Error(
					`Hook event "${event}" must start with "before" or "after" when enforceBeforeAfter is enabled`,
				);
			}
		}
	}

	/**
	 * Checks if a hook is deprecated and emits a warning if it is
	 * @param {string} event - The event name to check
	 * @returns {boolean} - Returns true if the hook should proceed, false if it should be blocked
	 */
	private checkDeprecatedHook(event: string): boolean {
		if (this._deprecatedHooks.has(event)) {
			const message = this._deprecatedHooks.get(event);
			const warningMessage = `Hook "${event}" is deprecated${message ? `: ${message}` : ""}`;

			// Emit deprecation warning event
			this.emit("warn", { hook: event, message: warningMessage });

			// Log to logger if available
			if (this.logger?.warn) {
				this.logger.warn(warningMessage);
			}

			// Return false if deprecated hooks are not allowed
			return this._allowDeprecated;
		}
		return true;
	}

	/**
	 * Adds a handler function for a specific event
	 * @param {string} event
	 * @param {Hook} handler - this can be async or sync
	 * @returns {void}
	 */
	public onHook(event: string, handler: Hook) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			eventHandlers.push(handler);
		} else {
			this._hooks.set(event, [handler]);
		}
	}

	/**
	 * Adds a handler function for a specific event that runs before all other handlers
	 * @param {HookEntry} hookEntry
	 * @returns {void}
	 */
	public onHookEntry(hookEntry: HookEntry) {
		this.onHook(hookEntry.event, hookEntry.handler);
	}

	/**
	 * Alias for onHook. This is provided for compatibility with other libraries that use the `addHook` method.
	 * @param {string} event
	 * @param {Hook} handler - this can be async or sync
	 * @returns {void}
	 */
	public addHook(event: string, handler: Hook) {
		// Alias for onHook
		this.onHook(event, handler);
	}

	/**
	 * Adds a handler function for a specific event
	 * @param {Array<HookEntry>} hooks
	 * @returns {void}
	 */
	public onHooks(hooks: HookEntry[]) {
		for (const hook of hooks) {
			this.onHook(hook.event, hook.handler);
		}
	}

	/**
	 * Adds a handler function for a specific event that runs before all other handlers
	 * @param {string} event
	 * @param {Hook} handler - this can be async or sync
	 * @returns {void}
	 */
	public prependHook(event: string, handler: Hook) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			eventHandlers.unshift(handler);
		} else {
			this._hooks.set(event, [handler]);
		}
	}

	/**
	 * Adds a handler that only executes once for a specific event before all other handlers
	 * @param event
	 * @param handler
	 */
	public prependOnceHook(event: string, handler: Hook) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		const hook = async (...arguments_: any[]) => {
			this.removeHook(event, hook);
			return handler(...arguments_);
		};

		this.prependHook(event, hook);
	}

	/**
	 * Adds a handler that only executes once for a specific event
	 * @param event
	 * @param handler
	 */
	public onceHook(event: string, handler: Hook) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		const hook = async (...arguments_: any[]) => {
			this.removeHook(event, hook);
			return handler(...arguments_);
		};

		this.onHook(event, hook);
	}

	/**
	 * Removes a handler function for a specific event
	 * @param {string} event
	 * @param {Hook} handler
	 * @returns {void}
	 */
	public removeHook(event: string, handler: Hook) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return; // Skip removal if deprecated hooks are not allowed
		}
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			const index = eventHandlers.indexOf(handler);
			if (index !== -1) {
				eventHandlers.splice(index, 1);
			}
		}
	}

	/**
	 * Removes all handlers for a specific event
	 * @param {Array<HookEntry>} hooks
	 * @returns {void}
	 */
	public removeHooks(hooks: HookEntry[]) {
		for (const hook of hooks) {
			this.removeHook(hook.event, hook.handler);
		}
	}

	/**
	 * Calls all handlers for a specific event
	 * @param {string} event
	 * @param {T[]} arguments_
	 * @returns {Promise<void>}
	 */
	public async hook<T>(event: string, ...arguments_: T[]) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return; // Skip execution if deprecated hooks are not allowed
		}
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			for (const handler of eventHandlers) {
				try {
					await handler(...arguments_);
				} catch (error) {
					const message = `${event}: ${(error as Error).message}`;
					this.emit("error", new Error(message));
					if (this.logger) {
						this.logger.error(message);
					}

					if (this._throwOnHookError) {
						throw new Error(message);
					}
				}
			}
		}
	}

	/**
	 * Prepends the word `before` to your hook. Example is event is `test`, the before hook is `before:test`.
	 * @param {string} event - The event name
	 * @param {T[]} arguments_ - The arguments to pass to the hook
	 */
	public async beforeHook<T>(event: string, ...arguments_: T[]) {
		await this.hook(`before:${event}`, ...arguments_);
	}

	/**
	 * Prepends the word `after` to your hook. Example is event is `test`, the after hook is `after:test`.
	 * @param {string} event - The event name
	 * @param {T[]} arguments_ - The arguments to pass to the hook
	 */
	public async afterHook<T>(event: string, ...arguments_: T[]) {
		await this.hook(`after:${event}`, ...arguments_);
	}

	/**
	 * Calls all handlers for a specific event. This is an alias for `hook` and is provided for
	 * compatibility with other libraries that use the `callHook` method.
	 * @param {string} event
	 * @param {T[]} arguments_
	 * @returns {Promise<void>}
	 */
	public async callHook<T>(event: string, ...arguments_: T[]) {
		await this.hook(event, ...arguments_);
	}

	/**
	 * Gets all hooks for a specific event
	 * @param {string} event
	 * @returns {Hook[]}
	 */
	public getHooks(event: string) {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return undefined; // Return undefined if deprecated hooks are not allowed
		}
		return this._hooks.get(event);
	}

	/**
	 * Removes all hooks
	 * @returns {void}
	 */
	public clearHooks() {
		this._hooks.clear();
	}
}

export { Eventified, type EventListener } from "./eventified.js";
export type { Logger } from "./logger.js";
