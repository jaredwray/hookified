import Emittery from 'emittery';

type HookHandler = (...arguments_: any[]) => Promise<void> | void;

export class Hookified extends Emittery {
	_hookHandlers: Map<string, HookHandler[]>;

	constructor() {
		super();
		this._hookHandlers = new Map();
	}

	// Adds a handler function for a specific event
	async onHook(event: string, handler: HookHandler) {
		const eventHandlers = this._hookHandlers.get(event);
		if (eventHandlers) {
			eventHandlers.push(handler);
		} else {
			this._hookHandlers.set(event, [handler]);
		}
	}

	// Removes a specific handler function for a specific event
	async removeHook(event: string, handler: HookHandler) {
		const eventHandlers = this._hookHandlers.get(event);
		if (eventHandlers) {
			const index = eventHandlers.indexOf(handler);
			if (index !== -1) {
				eventHandlers.splice(index, 1);
			}
		}
	}

	// Triggers all handlers for a specific event with provided data
	async hook(event: string, data: any) {
		const eventHandlers = this._hookHandlers.get(event);
		if (eventHandlers) {
			for (const handler of eventHandlers) {
				try {
					// eslint-disable-next-line no-await-in-loop
					await handler(data);
				} catch (error) {
					// eslint-disable-next-line no-await-in-loop
					await this.emit('error', new Error(`Error in hook handler for event "${event}": ${(error as Error).message}`));
				}
			}
		}
	}

	// Provides read-only access to the current handlers
	get hookHandlers() {
		// Creating a new map to prevent external modifications to the original map
		return new Map(this._hookHandlers);
	}
}
