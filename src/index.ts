import {Eventified} from './eventified.js';

export type Hook = (...arguments_: any[]) => Promise<void> | void;

export type HookifiedOptions = {
	throwHookErrors?: boolean;
};

export class Hookified extends Eventified {
	_hooks: Map<string, Hook[]>;
	_throwHookErrors = false;

	constructor(options?: HookifiedOptions) {
		super();
		this._hooks = new Map();

		if (options?.throwHookErrors !== undefined) {
			this._throwHookErrors = options.throwHookErrors;
		}
	}

	/**
	 * Gets all hooks
	 * @returns {Map<string, Hook[]>}
	 */
	get hooks() {
		return this._hooks;
	}

	/**
	 * Gets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @returns {boolean}
	 */
	get throwHookErrors() {
		return this._throwHookErrors;
	}

	/**
	 * Sets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
	 * @param {boolean} value
	 */
	set throwHookErrors(value) {
		this._throwHookErrors = value;
	}

	/**
	 * Adds a handler function for a specific event
	 * @param {string} event
	 * @param {Hook} handler - this can be async or sync
	 * @returns {void}
	 */
	onHook(event: string, handler: Hook) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			eventHandlers.push(handler);
		} else {
			this._hooks.set(event, [handler]);
		}
	}

	/**
	 * Adds a handler function for a specific event that runs before all other handlers
	 * @param {string} event
	 * @param {Hook} handler - this can be async or sync
	 * @returns {void}
	 */
	prependHook(event: string, handler: Hook) {
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
	prependOnceHook(event: string, handler: Hook) {
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
	onceHook(event: string, handler: Hook) {
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
	removeHook(event: string, handler: Hook) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			const index = eventHandlers.indexOf(handler);
			if (index !== -1) {
				eventHandlers.splice(index, 1);
			}
		}
	}

	/**
	 * Calls all handlers for a specific event
	 * @param {string} event
	 * @param {T[]} arguments_
	 * @returns {Promise<void>}
	 */
	async hook<T>(event: string, ...arguments_: T[]) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			for (const handler of eventHandlers) {
				try {
					// eslint-disable-next-line no-await-in-loop
					await handler(...arguments_);
				} catch (error) {
					const message = `${event}: ${(error as Error).message}`;
					this.emit('error', new Error(message));
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
	getHooks(event: string) {
		return this._hooks.get(event);
	}

	/**
	 * Removes all hooks
	 * @returns {void}
	 */
	clearHooks() {
		this._hooks.clear();
	}
}

export {Eventified, type EventListener} from './eventified.js';
