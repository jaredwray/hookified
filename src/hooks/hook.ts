import type { HookFn, IHook } from "../types.js";

/**
 * Concrete implementation of the IHook interface.
 * Provides a convenient class-based way to create hook entries.
 */
export class Hook implements IHook {
	public event: string;
	public handler: HookFn;

	/**
	 * Creates a new Hook instance
	 * @param {string} event - The event name for the hook
	 * @param {HookFn} handler - The handler function for the hook
	 */
	constructor(event: string, handler: HookFn) {
		this.event = event;
		this.handler = handler;
	}
}
