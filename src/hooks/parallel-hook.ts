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
 * handler with the aggregated results — including failures — keyed by
 * the hook function reference for direct lookup. Each hook receives only
 * the original arguments; hooks do not see each other's results.
 *
 * Implements IHook for compatibility with Hookified.onHook(); the final
 * handler is called regardless of whether the parallel hook is invoked
 * directly or through Hookified.hook().
 *
 * Generics tighten the per-hook signature when every hook in the set
 * accepts the same `initialArgs` and returns the same result type.
 * Both default to `any` for backwards compatibility.
 *
 * @template TArgs - The shape of `initialArgs` passed to every hook
 * @template TResult - The result type each hook returns
 */
// biome-ignore lint/suspicious/noExplicitAny: defaults preserve untyped use
export class ParallelHook<TArgs = any, TResult = any>
	implements IParallelHook<TArgs, TResult>
{
	public id?: string;
	public event: string;
	public handler: HookFn;
	public hooks: ParallelHookFn<TArgs, TResult>[];

	private readonly _finalHandler: ParallelHookFinalFn<TArgs, TResult>;

	/**
	 * Creates a new ParallelHook instance
	 * @param {string} event - The event name for the hook
	 * @param {ParallelHookFinalFn<TArgs, TResult>} finalHandler - Called once with `{ initialArgs, results }` after all parallel hooks settle
	 * @param {string} [id] - Optional unique identifier for the hook
	 */
	constructor(
		event: string,
		finalHandler: ParallelHookFinalFn<TArgs, TResult>,
		id?: string,
	) {
		this.id = id;
		this.event = event;
		this.hooks = [];
		this._finalHandler = finalHandler;

		// biome-ignore lint/suspicious/noExplicitAny: this is for any parameter compatibility
		this.handler = async (...arguments_: any[]) => {
			const initialArgs: TArgs = (
				arguments_.length === 1 ? arguments_[0] : arguments_
			) as TArgs;

			// Snapshot hooks at invocation time so concurrent addHook/removeHook
			// calls during the awaited Promise.allSettled cannot desync the
			// settled-index → hook mapping below.
			const snapshot = [...this.hooks];

			const settled = await Promise.allSettled(
				snapshot.map((hook) =>
					Promise.resolve().then(() => hook({ initialArgs })),
				),
			);

			const results = new Map<
				ParallelHookFn<TArgs, TResult>,
				ParallelHookResult<TResult>
			>();
			snapshot.forEach((hook, index) => {
				const outcome = settled[index];
				results.set(
					hook,
					outcome.status === "fulfilled"
						? { status: "fulfilled", result: outcome.value }
						: { status: "rejected", reason: outcome.reason },
				);
			});

			await this._finalHandler({ initialArgs, results });
		};
	}

	/**
	 * Adds a hook function to the parallel set
	 * @param {ParallelHookFn<TArgs, TResult>} hook - The hook function to add
	 */
	public addHook(hook: ParallelHookFn<TArgs, TResult>): void {
		this.hooks.push(hook);
	}

	/**
	 * Removes a specific hook function from the parallel set
	 * @param {ParallelHookFn<TArgs, TResult>} hook - The hook function to remove
	 * @returns {boolean} true if the hook was found and removed
	 */
	public removeHook(hook: ParallelHookFn<TArgs, TResult>): boolean {
		const index = this.hooks.indexOf(hook);
		if (index !== -1) {
			this.hooks.splice(index, 1);
			return true;
		}

		return false;
	}
}
