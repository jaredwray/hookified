import type {
	HookFn,
	IWaterfallHook,
	WaterfallHookFn,
	WaterfallHookResult,
} from "../types.js";

/**
 * A WaterfallHook chains multiple hook functions sequentially,
 * where each hook receives a context with the previous result,
 * initial arguments, and accumulated results. After all hooks
 * have executed, the final handler receives the transformed result.
 * Implements IHook for compatibility with Hookified.onHook().
 */
export class WaterfallHook implements IWaterfallHook {
	public id?: string;
	public event: string;
	public handler: HookFn;
	public hooks: WaterfallHookFn[];

	private readonly _finalHandler: WaterfallHookFn;

	/**
	 * Creates a new WaterfallHook instance
	 * @param {string} event - The event name for the hook
	 * @param {WaterfallHookFn} finalHandler - The final handler function that receives the transformed result
	 * @param {string} [id] - Optional unique identifier for the hook
	 */
	constructor(event: string, finalHandler: WaterfallHookFn, id?: string) {
		this.id = id;
		this.event = event;
		this.hooks = [];
		this._finalHandler = finalHandler;

		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		this.handler = async (...arguments_: any[]) => {
			// biome-ignore lint/suspicious/noExplicitAny: waterfall result type varies through the chain
			const initialArgs: any =
				arguments_.length === 1 ? arguments_[0] : arguments_;
			const results: WaterfallHookResult[] = [];

			for (const hook of this.hooks) {
				const result = await hook({ initialArgs, results: [...results] });
				results.push({ hook, result });
			}

			await this._finalHandler({ initialArgs, results: [...results] });
		};
	}

	/**
	 * Adds a hook function to the end of the waterfall chain
	 * @param {WaterfallHookFn} hook - The hook function to add
	 */
	public addHook(hook: WaterfallHookFn): void {
		this.hooks.push(hook);
	}

	/**
	 * Removes a specific hook function from the waterfall chain
	 * @param {WaterfallHookFn} hook - The hook function to remove
	 * @returns {boolean} true if the hook was found and removed
	 */
	public removeHook(hook: WaterfallHookFn): boolean {
		const index = this.hooks.indexOf(hook);
		if (index !== -1) {
			this.hooks.splice(index, 1);
			return true;
		}

		return false;
	}
}
