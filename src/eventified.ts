// biome-ignore-all lint/suspicious/noExplicitAny: this is for event emitter compatibility
import type {
	EventEmitterOptions,
	EventListener,
	IEventEmitter,
	Logger,
} from "./types.js";

export type { EventEmitterOptions, EventListener, IEventEmitter };

export class Eventified implements IEventEmitter {
	private readonly _eventListeners: Map<string | symbol, EventListener[]>;
	private _maxListeners: number;
	private _logger?: Logger;
	private _throwOnEmitError = false;
	private _throwOnEmptyListeners = false;
	private _errorEvent = "error";

	constructor(options?: EventEmitterOptions) {
		this._eventListeners = new Map<string | symbol, EventListener[]>();
		this._maxListeners = 100; // Default maximum number of listeners

		this._logger = options?.logger;

		if (options?.throwOnEmitError !== undefined) {
			this._throwOnEmitError = options.throwOnEmitError;
		}

		if (options?.throwOnEmptyListeners !== undefined) {
			this._throwOnEmptyListeners = options.throwOnEmptyListeners;
		}
	}

	/**
	 * Gets the logger
	 * @returns {Logger}
	 */
	public get logger(): Logger | undefined {
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
	 * Gets whether an error should be thrown when an emit throws an error. Default is false and only emits an error event.
	 * @returns {boolean}
	 */
	public get throwOnEmitError(): boolean {
		return this._throwOnEmitError;
	}

	/**
	 * Sets whether an error should be thrown when an emit throws an error. Default is false and only emits an error event.
	 * @param {boolean} value
	 */
	public set throwOnEmitError(value: boolean) {
		this._throwOnEmitError = value;
	}

	/**
	 * Gets whether an error should be thrown when emitting 'error' event with no listeners. Default is false.
	 * @returns {boolean}
	 */
	public get throwOnEmptyListeners(): boolean {
		return this._throwOnEmptyListeners;
	}

	/**
	 * Sets whether an error should be thrown when emitting 'error' event with no listeners. Default is false.
	 * @param {boolean} value
	 */
	public set throwOnEmptyListeners(value: boolean) {
		this._throwOnEmptyListeners = value;
	}

	/**
	 * Adds a handler function for a specific event that will run only once
	 * @param {string | symbol} eventName
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public once(
		eventName: string | symbol,
		listener: EventListener,
	): IEventEmitter {
		const onceListener: EventListener = (...arguments_: any[]) => {
			this.off(eventName as string, onceListener);
			listener(...arguments_);
		};

		this.on(eventName as string, onceListener);
		return this;
	}

	/**
	 * Gets the number of listeners for a specific event. If no event is provided, it returns the total number of listeners
	 * @param {string} eventName The event name. Not required
	 * @returns {number} The number of listeners
	 */
	public listenerCount(eventName?: string | symbol): number {
		if (eventName === undefined) {
			return this.getAllListeners().length;
		}

		const listeners = this._eventListeners.get(eventName);
		return listeners ? listeners.length : 0;
	}

	/**
	 * Gets an array of event names
	 * @returns {Array<string | symbol>} An array of event names
	 */
	public eventNames(): Array<string | symbol> {
		return [...this._eventListeners.keys()];
	}

	/**
	 * Gets an array of listeners for a specific event. If no event is provided, it returns all listeners
	 * @param {string} [event] (Optional) The event name
	 * @returns {EventListener[]} An array of listeners
	 */
	public rawListeners(event?: string | symbol): EventListener[] {
		if (event === undefined) {
			return this.getAllListeners();
		}

		return this._eventListeners.get(event) ?? [];
	}

	/**
	 * Prepends a listener to the beginning of the listeners array for the specified event
	 * @param {string | symbol} eventName
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public prependListener(
		eventName: string | symbol,
		listener: EventListener,
	): IEventEmitter {
		const listeners = this._eventListeners.get(eventName) ?? [];
		listeners.unshift(listener);
		this._eventListeners.set(eventName, listeners);
		return this;
	}

	/**
	 * Prepends a one-time listener to the beginning of the listeners array for the specified event
	 * @param {string | symbol} eventName
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public prependOnceListener(
		eventName: string | symbol,
		listener: EventListener,
	): IEventEmitter {
		const onceListener: EventListener = (...arguments_: any[]) => {
			this.off(eventName as string, onceListener);
			listener(...arguments_);
		};

		this.prependListener(eventName as string, onceListener);
		return this;
	}

	/**
	 * Gets the maximum number of listeners that can be added for a single event
	 * @returns {number} The maximum number of listeners
	 */
	public maxListeners(): number {
		return this._maxListeners;
	}

	/**
	 * Adds a listener for a specific event. It is an alias for the on() method
	 * @param {string | symbol} event
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public addListener(
		event: string | symbol,
		listener: EventListener,
	): IEventEmitter {
		this.on(event, listener);
		return this;
	}

	/**
	 * Adds a listener for a specific event
	 * @param {string | symbol} event
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public on(event: string | symbol, listener: EventListener): IEventEmitter {
		if (!this._eventListeners.has(event)) {
			this._eventListeners.set(event, []);
		}

		const listeners = this._eventListeners.get(event);

		if (listeners) {
			if (listeners.length >= this._maxListeners) {
				console.warn(
					`MaxListenersExceededWarning: Possible event memory leak detected. ${listeners.length + 1} ${event as string} listeners added. Use setMaxListeners() to increase limit.`,
				);
			}

			listeners.push(listener);
		}

		return this;
	}

	/**
	 * Removes a listener for a specific event. It is an alias for the off() method
	 * @param {string | symbol} event
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public removeListener(event: string, listener: EventListener): IEventEmitter {
		this.off(event, listener);
		return this;
	}

	/**
	 * Removes a listener for a specific event
	 * @param {string | symbol} event
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public off(event: string | symbol, listener: EventListener): IEventEmitter {
		const listeners = this._eventListeners.get(event) ?? [];
		const index = listeners.indexOf(listener);
		if (index !== -1) {
			listeners.splice(index, 1);
		}

		if (listeners.length === 0) {
			this._eventListeners.delete(event);
		}

		return this;
	}

	/**
	 * Calls all listeners for a specific event
	 * @param {string | symbol} event
	 * @param arguments_ The arguments to pass to the listeners
	 * @returns {boolean} Returns true if the event had listeners, false otherwise
	 */
	public emit(event: string | symbol, ...arguments_: any[]): boolean {
		let result = false;
		const listeners = this._eventListeners.get(event);

		if (listeners && listeners.length > 0) {
			for (const listener of listeners) {
				listener(...arguments_);
				result = true;
			}
		}

		if (event === this._errorEvent) {
			const error =
				arguments_[0] instanceof Error
					? arguments_[0]
					: new Error(`${arguments_[0]}`);

			if (this._throwOnEmitError && !result) {
				throw error;
			} else {
				if (
					this.listeners(this._errorEvent).length === 0 &&
					this._throwOnEmptyListeners === true
				) {
					throw error;
				}
			}
		}

		return result;
	}

	/**
	 * Gets all listeners for a specific event. If no event is provided, it returns all listeners
	 * @param {string} [event] (Optional) The event name
	 * @returns {EventListener[]} An array of listeners
	 */
	public listeners(event: string | symbol): EventListener[] {
		return this._eventListeners.get(event) ?? [];
	}

	/**
	 * Removes all listeners for a specific event. If no event is provided, it removes all listeners
	 * @param {string} [event] (Optional) The event name
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public removeAllListeners(event?: string | symbol): IEventEmitter {
		if (event !== undefined) {
			this._eventListeners.delete(event);
		} else {
			this._eventListeners.clear();
		}

		return this;
	}

	/**
	 * Sets the maximum number of listeners that can be added for a single event
	 * @param {number} n The maximum number of listeners
	 * @returns {void}
	 */
	public setMaxListeners(n: number): void {
		this._maxListeners = n;
		for (const listeners of this._eventListeners.values()) {
			if (listeners.length > n) {
				listeners.splice(n);
			}
		}
	}

	/**
	 * Gets all listeners
	 * @returns {EventListener[]} An array of listeners
	 */
	public getAllListeners(): EventListener[] {
		let result: EventListener[] = [];
		for (const listeners of this._eventListeners.values()) {
			result = [...result, ...listeners];
		}

		return result;
	}
}
