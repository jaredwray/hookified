import {Eventified} from './eventified.js';

export type Hook = (...arguments_: any[]) => Promise<void> | void;

export class Hookified extends Eventified {
	_hooks: Map<string, Hook[]>;

	constructor() {
		super();
		this._hooks = new Map();
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
					this.emit('error', new Error(`Error in hook handler for event "${event}": ${(error as Error).message}`));
				}
			}
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
