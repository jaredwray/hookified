import type {
	HookFn,
	IParallelHook,
	ParallelHookFinalFn,
	ParallelHookFn,
	ParallelHookResult,
} from "../types.js";

/**
 * A ParallelHook fans a single invocation out to many registered hook
 * functions concurrently via Promise.allSettled, then calls a final
 * handler with the aggregated results — including failures. Each hook
 * receives only the original arguments; hooks do not see each other's
 * results.
 *
 * Implements IHook for compatibility with Hookified.onHook(); the final
 * handler is called regardless of whether the parallel hook is invoked
 * directly or through Hookified.hook().
 */
export class ParallelHook implements IParallelHook {
	public id?: string;
	public event: string;
	public handler: HookFn;
	public hooks: ParallelHookFn[];

	private readonly _finalHandler: ParallelHookFinalFn;

	/**
	 * Creates a new ParallelHook instance
	 * @param {string} event - The event name for the hook
	 * @param {ParallelHookFinalFn} finalHandler - Called once with `{ initialArgs, results }` after all parallel hooks settle
	 * @param {string} [id] - Optional unique identifier for the hook
	 */
	constructor(event: string, finalHandler: ParallelHookFinalFn, id?: string) {
		this.id = id;
		this.event = event;
		this.hooks = [];
		this._finalHandler = finalHandler;

		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		this.handler = async (...arguments_: any[]) => {
			// biome-ignore lint/suspicious/noExplicitAny: parallel result type varies per hook
			const initialArgs: any =
				arguments_.length === 1 ? arguments_[0] : arguments_;

			const settled = await Promise.allSettled(
				this.hooks.map((hook) =>
					Promise.resolve().then(() => hook({ initialArgs })),
				),
			);

			const results: ParallelHookResult[] = this.hooks.map((hook, index) => {
				const outcome = settled[index];
				if (outcome.status === "fulfilled") {
					return { hook, status: "fulfilled", result: outcome.value };
				}
				return { hook, status: "rejected", reason: outcome.reason };
			});

			await this._finalHandler({ initialArgs, results });
		};
	}

	/**
	 * Adds a hook function to the parallel set
	 * @param {ParallelHookFn} hook - The hook function to add
	 */
	public addHook(hook: ParallelHookFn): void {
		this.hooks.push(hook);
	}

	/**
	 * Removes a specific hook function from the parallel set
	 * @param {ParallelHookFn} hook - The hook function to remove
	 * @returns {boolean} true if the hook was found and removed
	 */
	public removeHook(hook: ParallelHookFn): boolean {
		const index = this.hooks.indexOf(hook);
		if (index !== -1) {
			this.hooks.splice(index, 1);
			return true;
		}

		return false;
	}
}
