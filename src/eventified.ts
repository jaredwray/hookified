// biome-ignore-all lint/suspicious/noExplicitAny: this is for event emitter compatibility
import type {
	EventEmitterOptions,
	EventListener,
	IEventEmitter,
	Logger,
} from "./types.js";

export type { EventEmitterOptions, EventListener, IEventEmitter };

const ERROR_EVENT = "error";

export class Eventified implements IEventEmitter {
	private readonly _eventListeners: Map<
		string | symbol,
		EventListener | EventListener[]
	>;
	private _maxListeners: number;
	private _eventLogger?: Logger;
	private _throwOnEmitError = false;
	private _throwOnEmptyListeners = true;

	constructor(options?: EventEmitterOptions) {
		this._eventListeners = new Map<
			string | symbol,
			EventListener | EventListener[]
		>();
		this._maxListeners = 0; // Default is 0 (unlimited)

		this._eventLogger = options?.eventLogger;

		if (options?.throwOnEmitError !== undefined) {
			this._throwOnEmitError = options.throwOnEmitError;
		}

		if (options?.throwOnEmptyListeners !== undefined) {
			this._throwOnEmptyListeners = options.throwOnEmptyListeners;
		}
	}

	/**
	 * Gets the event logger
	 * @returns {Logger}
	 */
	public get eventLogger(): Logger | undefined {
		return this._eventLogger;
	}

	/**
	 * Sets the event logger
	 * @param {Logger} eventLogger
	 */
	public set eventLogger(eventLogger: Logger | undefined) {
		this._eventLogger = eventLogger;
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
			let count = 0;
			for (const entry of this._eventListeners.values()) {
				count += typeof entry === "function" ? 1 : entry.length;
			}

			return count;
		}

		const entry = this._eventListeners.get(eventName);
		if (entry === undefined) {
			return 0;
		}

		return typeof entry === "function" ? 1 : entry.length;
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

		const entry = this._eventListeners.get(event);
		if (entry === undefined) {
			return [];
		}

		return typeof entry === "function" ? [entry] : entry;
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
		const existing = this._eventListeners.get(eventName);

		if (existing === undefined) {
			this._eventListeners.set(eventName, listener);
		} else if (typeof existing === "function") {
			this._eventListeners.set(eventName, [listener, existing]);
		} else {
			existing.unshift(listener);
		}

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
		const existing = this._eventListeners.get(event);

		if (existing === undefined) {
			this._eventListeners.set(event, listener);
			return this;
		}

		if (typeof existing === "function") {
			const arr = [existing, listener];
			this._eventListeners.set(event, arr);
			if (this._maxListeners > 0 && arr.length > this._maxListeners) {
				console.warn(
					`MaxListenersExceededWarning: Possible event memory leak detected. ${arr.length} ${event as string} listeners added. Use setMaxListeners() to increase limit.`,
				);
			}
		} else {
			existing.push(listener);
			if (this._maxListeners > 0 && existing.length > this._maxListeners) {
				console.warn(
					`MaxListenersExceededWarning: Possible event memory leak detected. ${existing.length} ${event as string} listeners added. Use setMaxListeners() to increase limit.`,
				);
			}
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
		const entry = this._eventListeners.get(event);
		if (entry === undefined) {
			return this;
		}

		if (typeof entry === "function") {
			if (entry === listener) {
				this._eventListeners.delete(event);
			}

			return this;
		}

		const index = entry.indexOf(listener);
		if (index !== -1) {
			if (entry.length === 2) {
				this._eventListeners.set(event, entry[1 - index]);
				/* v8 ignore start -- @preserve: single-element arrays are stored as functions */
			} else if (entry.length === 1) {
				this._eventListeners.delete(event);
				/* v8 ignore stop */
			} else {
				entry.splice(index, 1);
			}
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
		const entry = this._eventListeners.get(event);
		const argumentLegth = arguments_.length;

		if (entry !== undefined) {
			if (typeof entry === "function") {
				if (argumentLegth === 1) {
					entry(arguments_[0]);
				} else {
					entry(...arguments_);
				}
			} else {
				const snapshot = [...entry];
				for (let i = 0; i < snapshot.length; i++) {
					if (argumentLegth === 1) {
						snapshot[i](arguments_[0]);
					} else {
						snapshot[i](...arguments_);
					}
				}
			}

			result = true;
		}

		// send it to the logger
		if (this._eventLogger) {
			this.sendToEventLogger(event, arguments_);
		}

		if (event === ERROR_EVENT && !result) {
			const error =
				arguments_[0] instanceof Error
					? arguments_[0]
					: new Error(`${arguments_[0]}`);

			if (this._throwOnEmitError || this._throwOnEmptyListeners) {
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
	public listeners(event: string | symbol): EventListener[] {
		const entry = this._eventListeners.get(event);
		if (entry === undefined) {
			return [];
		}

		return typeof entry === "function" ? [entry] : entry;
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
		this._maxListeners = n < 0 ? 0 : n;
	}

	/**
	 * Gets all listeners
	 * @returns {EventListener[]} An array of listeners
	 */
	public getAllListeners(): EventListener[] {
		const result: EventListener[] = [];
		for (const entry of this._eventListeners.values()) {
			if (typeof entry === "function") {
				result.push(entry);
			} else {
				for (let i = 0; i < entry.length; i++) {
					result.push(entry[i]);
				}
			}
		}

		return result;
	}

	/**
	 * Sends a log message using the configured logger based on the event name
	 * @param {string | symbol} eventName - The event name that determines the log level
	 * @param {unknown} data - The data to log
	 */
	private sendToEventLogger(eventName: string | symbol, data: any): void {
		/* v8 ignore next 3 -- @preserve: guarded by caller */
		if (!this._eventLogger) {
			return;
		}

		let message: string;
		/* v8 ignore next -- @preserve */
		if (typeof data === "string") {
			message = data;
		} else if (
			Array.isArray(data) &&
			data.length > 0 &&
			data[0] instanceof Error
		) {
			message = data[0].message;
			/* v8 ignore next -- @preserve */
		} else if (data instanceof Error) {
			message = data.message;
		} else if (
			Array.isArray(data) &&
			data.length > 0 &&
			typeof data[0]?.message === "string"
		) {
			message = data[0].message;
		} else {
			message = JSON.stringify(data);
		}

		switch (eventName) {
			case "error": {
				this._eventLogger.error?.(message, { event: eventName, data });
				break;
			}

			case "warn": {
				this._eventLogger.warn?.(message, { event: eventName, data });
				break;
			}

			case "trace": {
				this._eventLogger.trace?.(message, { event: eventName, data });
				break;
			}

			case "debug": {
				this._eventLogger.debug?.(message, { event: eventName, data });
				break;
			}

			case "fatal": {
				this._eventLogger.fatal?.(message, { event: eventName, data });
				break;
			}

			default: {
				this._eventLogger.info?.(message, { event: eventName, data });
				break;
			}
		}
	}
}
