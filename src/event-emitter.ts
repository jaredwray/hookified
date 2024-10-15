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
