import {Eventified} from './eventified.js';
import {type Logger} from './logger.js';

export type Hook = (...arguments_: any[]) => Promise<void> | void;

export type HookEntry = {
	event: string;
	handler: Hook;
};

export type HookifiedOptions = {
	throwHookErrors?: boolean;
	logger?: Logger;
};

export class Hookified extends Eventified {
	_hooks: Map<string, Hook[]>;
	_throwHookErrors = false;

	constructor(options?: HookifiedOptions) {
		super({logger: options?.logger});
		this._hooks = new Map();

		if (options?.throwHookErrors !== undefined) {
			this._throwHookErrors = options.throwHookErrors;
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
	 */
	public get throwHookErrors() {
		return this._throwHookErrors;
	}

	/**
	 * Sets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @param {boolean} value
	 */
	public set throwHookErrors(value) {
		this._throwHookErrors = value;
	}

	/**
	 * Gets the logger
	 * @returns {Logger}
	 */
	public get logger(): Logger | undefined {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this._logger;
	}

	/**
	 * Sets the logger
	 * @param {Logger} logger
	 */
	public set logger(logger: Logger | undefined) {
		this._logger = logger;
	}

	/**
	 * Adds a handler function for a specific event
	 * @param {string} event
	 * @param {Hook} handler - this can be async or sync
	 * @returns {void}
	 */
	public onHook(event: string, handler: Hook) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			eventHandlers.push(handler);
		} else {
			this._hooks.set(event, [handler]);
		}
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
		const hook = async (...arguments_: any[]) => {
			this.removeHook(event, hook);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
		const hook = async (...arguments_: any[]) => {
			this.removeHook(event, hook);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			for (const handler of eventHandlers) {
				try {
					// eslint-disable-next-line no-await-in-loop
					await handler(...arguments_);
				} catch (error) {
					const message = `${event}: ${(error as Error).message}`;
					this.emit('error', new Error(message));
					if (this._logger) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call
						this._logger.error(message);
					}

					if (this._throwHookErrors) {
						throw new Error(message);
					}
				}
			}
		}
	}

	/**
	 * Gets all hooks for a specific event
	 * @param {string} event
	 * @returns {Hook[]}
	 */
	public getHooks(event: string) {
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

export {Eventified, type EventListener} from './eventified.js';
export {type Logger} from './logger.js';
