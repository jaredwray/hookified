import { Eventified } from "./eventified.js";
import type { HookFn, HookifiedOptions, IHook } from "./types.js";

export type { HookFn, HookifiedOptions, IHook };

export class Hookified extends Eventified {
	private readonly _hooks: Map<string, IHook[]>;
	private _throwOnHookError = false;
	private _enforceBeforeAfter = false;
	private _deprecatedHooks: Map<string, string>;
	private _allowDeprecated = true;
	private _useHookClone = true;

	constructor(options?: HookifiedOptions) {
		super({
			eventLogger: options?.eventLogger,
			throwOnEmitError: options?.throwOnEmitError,
			throwOnEmptyListeners: options?.throwOnEmptyListeners,
		});
		this._hooks = new Map();
		this._deprecatedHooks = options?.deprecatedHooks
			? new Map(options.deprecatedHooks)
			: new Map();

		if (options?.throwOnHookError !== undefined) {
			this._throwOnHookError = options.throwOnHookError;
		}

		if (options?.enforceBeforeAfter !== undefined) {
			this._enforceBeforeAfter = options.enforceBeforeAfter;
		}

		if (options?.allowDeprecated !== undefined) {
			this._allowDeprecated = options.allowDeprecated;
		}

		if (options?.useHookClone !== undefined) {
			this._useHookClone = options.useHookClone;
		}
	}

	/**
	 * Gets all hooks
	 * @returns {Map<string, IHook[]>}
	 */
	public get hooks() {
		return this._hooks;
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
	 * Gets whether hook objects are cloned before storing. Default is true.
	 * @returns {boolean}
	 */
	public get useHookClone() {
		return this._useHookClone;
	}

	/**
	 * Sets whether hook objects are cloned before storing. Default is true.
	 * When false, the original IHook reference is stored directly.
	 * @param {boolean} value
	 */
	public set useHookClone(value) {
		this._useHookClone = value;
	}

	/**
	 * Adds a handler function for a specific event. Accepts a single hook or an array of hooks.
	 * If you prefer the legacy `(event, handler)` signature, use {@link addHook} instead.
	 * @param {IHook | IHook[]} hook - the hook or array of hooks containing event name and handler
	 * @returns {void}
	 */
	public onHook(hook: IHook | IHook[]) {
		if (Array.isArray(hook)) {
			for (const h of hook) {
				this.onHook(h);
			}

			return;
		}

		this.validateHookName(hook.event);
		if (!this.checkDeprecatedHook(hook.event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}

		const entry: IHook = this._useHookClone
			? { event: hook.event, handler: hook.handler }
			: hook;
		const eventHandlers = this._hooks.get(hook.event);
		if (eventHandlers) {
			eventHandlers.push(entry);
		} else {
			this._hooks.set(hook.event, [entry]);
		}
	}

	/**
	 * Alias for onHook. This is provided for compatibility with other libraries that use the `addHook` method.
	 * @param {string} event - the event name
	 * @param {HookFn} handler - the handler function
	 * @returns {void}
	 */
	public addHook(event: string, handler: HookFn) {
		this.onHook({ event, handler });
	}

	/**
	 * Adds a handler function for a specific event
	 * @param {Array<IHook>} hooks
	 * @returns {void}
	 */
	public onHooks(hooks: IHook[]) {
		for (const hook of hooks) {
			this.onHook(hook);
		}
	}

	/**
	 * Adds a handler function for a specific event that runs before all other handlers
	 * @param {IHook} hook - the hook containing event name and handler
	 * @returns {void}
	 */
	public prependHook(hook: IHook) {
		this.validateHookName(hook.event);
		if (!this.checkDeprecatedHook(hook.event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		const entry: IHook = this._useHookClone
			? { event: hook.event, handler: hook.handler }
			: hook;
		const eventHandlers = this._hooks.get(hook.event);
		if (eventHandlers) {
			eventHandlers.unshift(entry);
		} else {
			this._hooks.set(hook.event, [entry]);
		}
	}

	/**
	 * Adds a handler that only executes once for a specific event before all other handlers
	 * @param {IHook} hook - the hook containing event name and handler
	 */
	public prependOnceHook(hook: IHook) {
		this.validateHookName(hook.event);
		if (!this.checkDeprecatedHook(hook.event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		const wrappedHandler = async (...arguments_: any[]) => {
			this.removeHook(hook.event, wrappedHandler);
			return hook.handler(...arguments_);
		};

		this.prependHook({ event: hook.event, handler: wrappedHandler });
	}

	/**
	 * Adds a handler that only executes once for a specific event
	 * @param {IHook} hook - the hook containing event name and handler
	 */
	public onceHook(hook: IHook) {
		this.validateHookName(hook.event);
		if (!this.checkDeprecatedHook(hook.event)) {
			return; // Skip registration if deprecated hooks are not allowed
		}
		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		const wrappedHandler = async (...arguments_: any[]) => {
			this.removeHook(hook.event, wrappedHandler);
			return hook.handler(...arguments_);
		};

		this.onHook({ event: hook.event, handler: wrappedHandler });
	}

	/**
	 * Removes a handler function for a specific event
	 * @param {string} event
	 * @param {HookFn} handler
	 * @returns {IHook | undefined} the removed hook, or undefined if not found
	 */
	public removeHook(event: string, handler: HookFn): IHook | undefined {
		this.validateHookName(event);
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			const index = eventHandlers.findIndex((h) => h.handler === handler);
			if (index !== -1) {
				eventHandlers.splice(index, 1);
				if (eventHandlers.length === 0) {
					this._hooks.delete(event);
				}

				return { event, handler };
			}
		}

		return undefined;
	}

	/**
	 * Removes multiple hook handlers
	 * @param {Array<IHook>} hooks
	 * @returns {IHook[]} the hooks that were successfully removed
	 */
	public removeHooks(hooks: IHook[]): IHook[] {
		const removed: IHook[] = [];
		for (const hook of hooks) {
			const result = this.removeHook(hook.event, hook.handler);
			if (result) {
				removed.push(result);
			}
		}

		return removed;
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
			for (const hook of eventHandlers) {
				try {
					await hook.handler(...arguments_);
				} catch (error) {
					const message = `${event}: ${(error as Error).message}`;
					this.emit("error", new Error(message));

					if (this._throwOnHookError) {
						throw new Error(message);
					}
				}
			}
		}
	}

	/**
	 * Calls all synchronous handlers for a specific event.
	 * Async handlers (declared with `async` keyword) are silently skipped.
	 *
	 * Note: The `hook` method is preferred as it executes both sync and async functions.
	 * Use `hookSync` only when you specifically need synchronous execution.
	 * @param {string} event
	 * @param {T[]} arguments_
	 * @returns {void}
	 */
	public hookSync<T>(event: string, ...arguments_: T[]): void {
		this.validateHookName(event);
		if (!this.checkDeprecatedHook(event)) {
			return;
		}

		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			for (const hook of eventHandlers) {
				// Skip async functions silently
				if (hook.handler.constructor.name === "AsyncFunction") {
					continue;
				}

				try {
					hook.handler(...arguments_);
				} catch (error) {
					const message = `${event}: ${(error as Error).message}`;
					this.emit("error", new Error(message));

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
	 * @returns {IHook[]}
	 */
	public getHooks(event: string) {
		this.validateHookName(event);
		return this._hooks.get(event);
	}

	/**
	 * Removes all hooks
	 * @returns {void}
	 */
	public clearHooks() {
		this._hooks.clear();
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

			// Return false if deprecated hooks are not allowed
			return this._allowDeprecated;
		}
		return true;
	}
}

export { Eventified } from "./eventified.js";
export { Hook } from "./hooks/hook.js";
export type {
	EventEmitterOptions,
	EventListener,
	IEventEmitter,
	Logger,
} from "./types.js";
