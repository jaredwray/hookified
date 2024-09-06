import Emittery from 'emittery';

export type Hook = (...arguments_: any[]) => Promise<void> | void;

export class Hookified extends Emittery {
	_hooks: Map<string, Hook[]>;

	constructor() {
		super();
		this._hooks = new Map();
	}

	// Adds a handler function for a specific event
	onHook(event: string, handler: Hook) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			eventHandlers.push(handler);
		} else {
			this._hooks.set(event, [handler]);
		}
	}

	// Removes a specific handler function for a specific event
	removeHook(event: string, handler: Hook) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			const index = eventHandlers.indexOf(handler);
			if (index !== -1) {
				eventHandlers.splice(index, 1);
			}
		}
	}

	// Triggers all handlers for a specific event with provided data
	async hook(event: string, ...data: any[]) {
		const eventHandlers = this._hooks.get(event);
		if (eventHandlers) {
			for (const handler of eventHandlers) {
				try {
					// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-unsafe-argument
					await handler(...data);
				} catch (error) {
					// eslint-disable-next-line no-await-in-loop
					await this.emit('error', new Error(`Error in hook handler for event "${event}": ${(error as Error).message}`));
				}
			}
		}
	}

	// Provides read-only access to the current handlers
	get hooks() {
		// Creating a new map to prevent external modifications to the original map
		return this._hooks;
	}

	getHooks(event: string) {
		return this._hooks.get(event);
	}

	clearHooks() {
		this._hooks.clear();
	}
}
