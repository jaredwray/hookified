import {type Logger} from 'logger.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type IEventEmitter = {
	/**
	 * Registers a listener for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event to listen for.
	 * @param listener - A callback function that will be invoked when the event is emitted.
	 * @returns The current instance of EventEmitter for method chaining.
	 *
	 * @example
	 * emitter.on('data', (message) => {
	 *   console.log(message);
	 * });
	 */
	on(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;

	/**
	 * Alias for `on`. Registers a listener for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event to listen for.
	 * @param listener - A callback function that will be invoked when the event is emitted.
	 * @returns The current instance of EventEmitter for method chaining.
	 */
	addListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;

	/**
	 * Registers a one-time listener for the specified event. The listener is removed after it is called once.
	 *
	 * @param eventName - The name (or symbol) of the event to listen for.
	 * @param listener - A callback function that will be invoked once when the event is emitted.
	 * @returns The current instance of EventEmitter for method chaining.
	 *
	 * @example
	 * emitter.once('close', () => {
	 *   console.log('The connection was closed.');
	 * });
	 */
	once(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;

	/**
	 * Removes a previously registered listener for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event to stop listening for.
	 * @param listener - The specific callback function to remove.
	 * @returns The current instance of EventEmitter for method chaining.
	 *
	 * @example
	 * emitter.off('data', myListener);
	 */
	off(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;

	/**
	 * Alias for `off`. Removes a previously registered listener for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event to stop listening for.
	 * @param listener - The specific callback function to remove.
	 * @returns The current instance of EventEmitter for method chaining.
	 */
	removeListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;

	/**
	 * Emits the specified event, invoking all registered listeners with the provided arguments.
	 *
	 * @param eventName - The name (or symbol) of the event to emit.
	 * @param args - Arguments passed to each listener.
	 * @returns `true` if the event had listeners, `false` otherwise.
	 *
	 * @example
	 * emitter.emit('data', 'Hello World');
	 */
	emit(eventName: string | symbol, ...arguments_: any[]): boolean;

	/**
	 * Returns the number of listeners registered for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event.
	 * @returns The number of registered listeners.
	 *
	 * @example
	 * const count = emitter.listenerCount('data');
	 * console.log(count); // e.g., 2
	 */
	listenerCount(eventName: string | symbol): number;

	/**
	 * Removes all listeners for the specified event. If no event is specified, it removes all listeners for all events.
	 *
	 * @param eventName - (Optional) The name (or symbol) of the event.
	 * @returns The current instance of EventEmitter for method chaining.
	 *
	 * @example
	 * emitter.removeAllListeners('data');
	 */
	removeAllListeners(eventName?: string | symbol): IEventEmitter;

	/**
	 * Returns an array of event names for which listeners have been registered.
	 *
	 * @returns An array of event names (or symbols).
	 *
	 * @example
	 * const events = emitter.eventNames();
	 * console.log(events); // e.g., ['data', 'close']
	 */
	eventNames(): Array<string | symbol>;

	/**
	 * Returns an array of listeners registered for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event.
	 * @returns An array of listener functions.
	 *
	 * @example
	 * const listeners = emitter.listeners('data');
	 * console.log(listeners.length); // e.g., 2
	 */
	listeners(eventName: string | symbol): Array<(...arguments_: any[]) => void>;

	/**
	 * Returns an array of raw listeners for the specified event. This includes listeners wrapped by internal mechanisms (e.g., once-only listeners).
	 *
	 * @param eventName - The name (or symbol) of the event.
	 * @returns An array of raw listener functions.
	 *
	 * @example
	 * const rawListeners = emitter.rawListeners('data');
	 */
	rawListeners(eventName: string | symbol): Array<(...arguments_: any[]) => void>;

	/**
	 * Adds a listener to the beginning of the listeners array for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event to listen for.
	 * @param listener - A callback function that will be invoked when the event is emitted.
	 * @returns The current instance of EventEmitter for method chaining.
	 *
	 * @example
	 * emitter.prependListener('data', (message) => {
	 *   console.log('This will run first.');
	 * });
	 */
	prependListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;

	/**
	 * Adds a one-time listener to the beginning of the listeners array for the specified event.
	 *
	 * @param eventName - The name (or symbol) of the event to listen for.
	 * @param listener - A callback function that will be invoked once when the event is emitted.
	 * @returns The current instance of EventEmitter for method chaining.
	 *
	 * @example
	 * emitter.prependOnceListener('data', (message) => {
	 *   console.log('This will run first and only once.');
	 * });
	 */
	prependOnceListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
};

export type EventListener = (...arguments_: any[]) => void;

export type EventEmitterOptions = {
	/**
	 * Logger instance for logging errors.
	 */
	logger?: Logger;
	/**
	 * Whether to throw an error when emit 'error' and there are no listeners. Default is false and only emits an error event.
	 */
	throwOnEmitError?: boolean;
};

export class Eventified implements IEventEmitter {
	private readonly _eventListeners: Map<string | symbol, EventListener[]>;
	private _maxListeners: number;
	private _logger?: Logger;
	private _throwOnEmitError = false;

	constructor(options?: EventEmitterOptions) {
		this._eventListeners = new Map<string | symbol, EventListener[]>();
		this._maxListeners = 100; // Default maximum number of listeners

		this._logger = options?.logger;

		if (options?.throwOnEmitError !== undefined) {
			this._throwOnEmitError = options.throwOnEmitError;
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
	 * Adds a handler function for a specific event that will run only once
	 * @param {string | symbol} eventName
	 * @param {EventListener} listener
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public once(eventName: string | symbol, listener: EventListener): IEventEmitter {
		const onceListener: EventListener = (...arguments_: any[]) => {
			this.off(eventName as string, onceListener);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
		if (!eventName) {
			return this.getAllListeners().length;
		}

		const listeners = this._eventListeners.get(eventName as string);
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
		if (!event) {
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
	public prependListener(eventName: string | symbol, listener: EventListener): IEventEmitter {
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
	public prependOnceListener(eventName: string | symbol, listener: EventListener): IEventEmitter {
		const onceListener: EventListener = (...arguments_: any[]) => {
			this.off(eventName as string, onceListener);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
	public addListener(event: string | symbol, listener: EventListener): IEventEmitter {
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
				console.warn(`MaxListenersExceededWarning: Possible event memory leak detected. ${listeners.length + 1} ${event as string} listeners added. Use setMaxListeners() to increase limit.`);
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
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				listener(...arguments_);
				result = true;
			}
		}

		if (event === 'error') {
			const error = arguments_[0] instanceof Error ? arguments_[0] : new Error(`Uncaught, "error" event. ${arguments_[0]}`);

			if (this._throwOnEmitError && !result) {
				throw error;
			}
		}

		return result;
	}

	/**
	 * Gets all listeners for a specific event. If no event is provided, it returns all listeners
	 * @param {string} [event] (Optional) The event name
	 * @returns {EventListener[]} An array of listeners
	 */
	public listeners(event: string): EventListener[] {
		return this._eventListeners.get(event) ?? [];
	}

	/**
	 * Removes all listeners for a specific event. If no event is provided, it removes all listeners
	 * @param {string} [event] (Optional) The event name
	 * @returns {IEventEmitter} returns the instance of the class for chaining
	 */
	public removeAllListeners(event?: string): IEventEmitter {
		if (event) {
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
		let result = new Array<EventListener>();
		for (const listeners of this._eventListeners.values()) {
			result = [...result, ...listeners];
		}

		return result;
	}
}
