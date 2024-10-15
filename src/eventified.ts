import {type IEventEmitter} from './event-emitter.js';

export type EventListener = (...arguments_: any[]) => void;

export class Eventified implements IEventEmitter {
	_eventListeners: Map<string | symbol, EventListener[]>;
	_maxListeners: number;

	constructor() {
		this._eventListeners = new Map<string | symbol, EventListener[]>();
		this._maxListeners = 100; // Default maximum number of listeners
	}

	once(eventName: string | symbol, listener: EventListener): IEventEmitter {
		const onceListener: EventListener = (...arguments_: any[]) => {
			this.off(eventName as string, onceListener);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			listener(...arguments_);
		};

		this.on(eventName as string, onceListener);
		return this;
	}

	listenerCount(eventName?: string | symbol): number {
		if (!eventName) {
			return this.getAllListeners().length;
		}

		const listeners = this._eventListeners.get(eventName as string);
		return listeners ? listeners.length : 0;
	}

	eventNames(): Array<string | symbol> {
		return Array.from(this._eventListeners.keys());
	}

	rawListeners(eventName?: string | symbol): EventListener[] {
		if (!eventName) {
			return this.getAllListeners();
		}

		return this._eventListeners.get(eventName) ?? [];
	}

	prependListener(eventName: string | symbol, listener: EventListener): IEventEmitter {
		const listeners = this._eventListeners.get(eventName) ?? [];
		listeners.unshift(listener);
		this._eventListeners.set(eventName, listeners);
		return this;
	}

	prependOnceListener(eventName: string | symbol, listener: EventListener): IEventEmitter {
		const onceListener: EventListener = (...arguments_: any[]) => {
			this.off(eventName as string, onceListener);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			listener(...arguments_);
		};

		this.prependListener(eventName as string, onceListener);
		return this;
	}

	public maxListeners(): number {
		return this._maxListeners;
	}

	// Add an event listener
	public addListener(event: string | symbol, listener: EventListener): IEventEmitter {
		this.on(event, listener);
		return this;
	}

	public on(event: string | symbol, listener: EventListener): IEventEmitter {
		if (!this._eventListeners.has(event)) {
			this._eventListeners.set(event, []);
		}

		const listeners = this._eventListeners.get(event);

		if (listeners) {
			if (listeners.length >= this._maxListeners) {
				console.warn(`MaxListenersExceededWarning: Possible event memory leak detected. ${listeners.length + 1} ${event as string} listeners added. Use setMaxListeners() to increase limit.`);
			}

			listeners.push(listener);
		}

		return this;
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

	public getAllListeners(): EventListener[] {
		let result = new Array<EventListener>();
		for (const listeners of this._eventListeners.values()) {
			result = result.concat(listeners);
		}

		return result;
	}
}
