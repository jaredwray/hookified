import { type IEventEmitter } from './event-emitter.js';

export type EventListener = (...arguments_: any[]) => void;

export class Eventified implements IEventEmitter {
	_eventListeners: Map<string, EventListener[]>;
	_maxListeners: number;

	constructor() {
		this._eventListeners = new Map();
		this._maxListeners = 100; // Default maximum number of listeners
	}

	public maxListeners(): number {
		return this._maxListeners;
	}

	// Add an event listener
	public addListener(event: string, listener: EventListener): IEventEmitter {
		this.on(event, listener);
		return this;
	}

	public on(event: string, listener: EventListener): IEventEmitter {
		if (!this._eventListeners.has(event)) {
			this._eventListeners.set(event, []);
		}

		const listeners = this._eventListeners.get(event);

		if (listeners) {
			if (listeners.length >= this._maxListeners) {
				console.warn(`MaxListenersExceededWarning: Possible event memory leak detected. ${listeners.length + 1} ${event} listeners added. Use setMaxListeners() to increase limit.`);
			}

			listeners.push(listener);
		}
	}

	// Remove an event listener
	public removeListener(event: string, listener: EventListener): IEventEmitter {
		this.off(event, listener);
		return this;
	}

	public off(event: string, listener: EventListener): IEventEmitter {
		const listeners = this._eventListeners.get(event) ?? [];
		const index = listeners.indexOf(listener);
		if (index > -1) {
			listeners.splice(index, 1);
		}

		if (listeners.length === 0) {
			this._eventListeners.delete(event);
		}

		return this;
	}

	// Emit an event
	public emit(event: string, ...arguments_: any[]): boolean {
		const listeners = this._eventListeners.get(event);

		if (listeners && listeners.length > 0) {
			for (const listener of listeners) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				listener(...arguments_);
			}
		}

		return true;
	}

	// Get all listeners for a specific event
	public listeners(event: string): EventListener[] {
		return this._eventListeners.get(event) ?? [];
	}

	// Remove all listeners for a specific event
	public removeAllListeners(event?: string): IEventEmitter {
		if (event) {
			this._eventListeners.delete(event);
		} else {
			this._eventListeners.clear();
		}

		return this;
	}

	// Set the maximum number of listeners for a single event
	public setMaxListeners(n: number): void {
		this._maxListeners = n;
		for (const listeners of this._eventListeners.values()) {
			if (listeners.length > n) {
				listeners.splice(n);
			}
		}
	}
}
