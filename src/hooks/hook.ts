import type { HookFn, IHook } from "../types.js";

/**
 * Concrete implementation of the IHook interface.
 * Provides a convenient class-based way to create hook entries.
 */
export class Hook implements IHook {
	public id?: string;
	public event: string;
	public tags?: string[];
	public handler: HookFn;

	/**
	 * Creates a new Hook instance
	 * @param {string} event - The event name for the hook
	 * @param {HookFn} handler - The handler function for the hook
	 * @param {string} [id] - Optional unique identifier for the hook
	 * @param {string[]} [tags] - Optional tags used to group and look up the hook
	 */
	constructor(event: string, handler: HookFn, id?: string, tags?: string[]) {
		this.id = id;
		this.event = event;
		this.tags = tags;
		this.handler = handler;
	}
}
