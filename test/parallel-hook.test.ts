import { describe, expect, test } from "vitest";
import type {
	ParallelHookContext,
	ParallelHookFinalContext,
	ParallelHookFn,
	ParallelHookResult,
} from "../src/index.js";
import { Hookified, ParallelHook } from "../src/index.js";

describe("ParallelHook", () => {
	test("should create a ParallelHook with event and final handler", () => {
		const ph = new ParallelHook("process", () => {});
		expect(ph.event).toBe("process");
		expect(ph.hooks).toEqual([]);
		expect(ph.id).toBeUndefined();
	});

	test("should create a ParallelHook with event, final handler, and id", () => {
		const ph = new ParallelHook("process", () => {}, "my-id");
		expect(ph.event).toBe("process");
		expect(ph.id).toBe("my-id");
	});

	test("should add hooks to the parallel set", () => {
		const ph = new ParallelHook("process", () => {});
		const hook1 = ({ initialArgs }: ParallelHookContext) => initialArgs + 1;
		const hook2 = ({ initialArgs }: ParallelHookContext) => initialArgs * 2;
		ph.addHook(hook1);
		ph.addHook(hook2);
		expect(ph.hooks).toHaveLength(2);
		expect(ph.hooks[0]).toBe(hook1);
		expect(ph.hooks[1]).toBe(hook2);
	});

	test("should remove a hook by reference", () => {
		const hook1 = ({ initialArgs }: ParallelHookContext) => initialArgs + 1;
		const ph = new ParallelHook("process", () => {});
		ph.addHook(hook1);
		expect(ph.removeHook(hook1)).toBe(true);
		expect(ph.hooks).toHaveLength(0);
	});

	test("should return false when removing a non-existent hook", () => {
		const ph = new ParallelHook("process", () => {});
		expect(
			ph.removeHook(({ initialArgs }: ParallelHookContext) => initialArgs),
		).toBe(false);
	});

	test("should call final handler with empty Map when no hooks are registered", async () => {
		let received: ParallelHookFinalContext | undefined;
		const ph = new ParallelHook("process", (context) => {
			received = context;
		});
		await ph.handler(42);
		expect(received?.initialArgs).toBe(42);
		expect(received?.results).toBeInstanceOf(Map);
		expect(received?.results.size).toBe(0);
	});

	test("should pass a single argument as scalar initialArgs", async () => {
		const received: unknown[] = [];
		const ph = new ParallelHook("process", () => {});
		ph.addHook(({ initialArgs }: ParallelHookContext) => {
			received.push(initialArgs);
			return initialArgs;
		});

		await ph.handler(42);
		expect(received).toEqual([42]);
	});

	test("should pass multiple arguments as an array for initialArgs", async () => {
		let finalInitialArgs: unknown;
		const ph = new ParallelHook("process", ({ initialArgs }) => {
			finalInitialArgs = initialArgs;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs);

		await ph.handler(1, 2, 3);
		expect(finalInitialArgs).toEqual([1, 2, 3]);
	});

	test("should provide the same initialArgs to every hook and the final handler", async () => {
		const received: unknown[] = [];
		const ph = new ParallelHook("process", ({ initialArgs }) => {
			received.push(initialArgs);
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => {
			received.push(initialArgs);
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => {
			received.push(initialArgs);
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => {
			received.push(initialArgs);
		});

		await ph.handler(5);
		expect(received).toEqual([5, 5, 5, 5]);
	});

	test("should run hooks concurrently rather than sequentially", async () => {
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		const delay = 50;
		ph.addHook(
			() => new Promise((resolve) => setTimeout(() => resolve("a"), delay)),
		);
		ph.addHook(
			() => new Promise((resolve) => setTimeout(() => resolve("b"), delay)),
		);
		ph.addHook(
			() => new Promise((resolve) => setTimeout(() => resolve("c"), delay)),
		);

		const start = Date.now();
		await ph.handler("input");
		const elapsed = Date.now() - start;

		expect(elapsed).toBeLessThan(delay * 2);
		expect(finalResults?.size).toBe(3);
		expect(
			[...(finalResults?.values() ?? [])].every(
				(r) => r.status === "fulfilled",
			),
		).toBe(true);
	});

	test("should handle mixed sync and async hooks", async () => {
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs + 1);
		ph.addHook(async ({ initialArgs }: ParallelHookContext) => initialArgs * 3);
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs - 2);

		await ph.handler(10);
		expect(
			[...(finalResults?.values() ?? [])].map((r) =>
				r.status === "fulfilled" ? r.result : null,
			),
		).toEqual([11, 30, 8]);
	});

	test("should key results by the hook function reference for direct lookup", async () => {
		const hook1 = ({ initialArgs }: ParallelHookContext) => initialArgs + 1;
		const hook2 = ({ initialArgs }: ParallelHookContext) => initialArgs * 2;
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(hook1);
		ph.addHook(hook2);

		await ph.handler(5);
		expect(finalResults?.get(hook1)).toMatchObject({
			status: "fulfilled",
			result: 6,
		});
		expect(finalResults?.get(hook2)).toMatchObject({
			status: "fulfilled",
			result: 10,
		});
	});

	test("should iterate results in registration order", async () => {
		const hook1 = ({ initialArgs }: ParallelHookContext) => initialArgs;
		const hook2 = ({ initialArgs }: ParallelHookContext) => initialArgs * 2;
		const hook3 = ({ initialArgs }: ParallelHookContext) => initialArgs * 3;
		let keys: ParallelHookFn[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			keys = [...results.keys()];
		});
		ph.addHook(hook1);
		ph.addHook(hook2);
		ph.addHook(hook3);

		await ph.handler(7);
		expect(keys).toEqual([hook1, hook2, hook3]);
	});

	test("should mark each result as fulfilled with the returned value", async () => {
		const hook1 = ({ initialArgs }: ParallelHookContext) => initialArgs;
		const hook2 = async ({ initialArgs }: ParallelHookContext) =>
			initialArgs * 2;
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(hook1);
		ph.addHook(hook2);

		await ph.handler(7);
		expect(finalResults?.get(hook1)).toEqual({
			status: "fulfilled",
			result: 7,
		});
		expect(finalResults?.get(hook2)).toEqual({
			status: "fulfilled",
			result: 14,
		});
	});

	test("should collect rejections without rejecting handler()", async () => {
		const error = new Error("boom");
		const hookOk1 = ({ initialArgs }: ParallelHookContext) => initialArgs;
		const hookFail = async () => {
			throw error;
		};
		const hookOk2 = ({ initialArgs }: ParallelHookContext) => initialArgs * 2;
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(hookOk1);
		ph.addHook(hookFail);
		ph.addHook(hookOk2);

		await ph.handler(3);
		expect(finalResults?.size).toBe(3);
		expect(finalResults?.get(hookOk1)).toEqual({
			status: "fulfilled",
			result: 3,
		});
		expect(finalResults?.get(hookFail)).toEqual({
			status: "rejected",
			reason: error,
		});
		expect(finalResults?.get(hookOk2)).toEqual({
			status: "fulfilled",
			result: 6,
		});
	});

	test("should capture synchronous throws as rejections", async () => {
		const error = new Error("sync boom");
		const failingHook = () => {
			throw error;
		};
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(failingHook);

		await ph.handler("input");
		expect(finalResults?.size).toBe(1);
		expect(finalResults?.get(failingHook)).toEqual({
			status: "rejected",
			reason: error,
		});
	});

	test("should still call final handler when every hook rejects", async () => {
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(async () => {
			throw new Error("a");
		});
		ph.addHook(async () => {
			throw new Error("b");
		});

		await ph.handler();
		expect(finalResults?.size).toBe(2);
		expect(
			[...(finalResults?.values() ?? [])].every((r) => r.status === "rejected"),
		).toBe(true);
	});

	test("should snapshot hooks at invocation so in-flight runs survive concurrent removeHook", async () => {
		const slowHook = () =>
			new Promise<string>((resolve) =>
				setTimeout(() => resolve("slow-done"), 25),
			);
		const fastHook = () => "fast-done";
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(slowHook);
		ph.addHook(fastHook);

		const inFlight = ph.handler();
		// Mutate the registration set while hooks are still running.
		ph.removeHook(slowHook);
		ph.addHook(() => "added-after");

		await inFlight;

		// The final handler still sees both originally-registered hooks, and
		// only those — the post-invocation addHook is excluded.
		expect(finalResults?.size).toBe(2);
		expect(finalResults?.get(slowHook)).toEqual({
			status: "fulfilled",
			result: "slow-done",
		});
		expect(finalResults?.get(fastHook)).toEqual({
			status: "fulfilled",
			result: "fast-done",
		});
	});

	test("should propagate errors from the final handler", async () => {
		const ph = new ParallelHook("process", () => {
			throw new Error("final handler error");
		});
		ph.addHook(() => 1);

		await expect(ph.handler("input")).rejects.toThrow("final handler error");
	});

	test("should integrate with Hookified via onHook (final handler still fires)", async () => {
		const hookified = new Hookified();
		const calls: string[] = [];
		const hookA = ({ initialArgs }: ParallelHookContext) => {
			calls.push(`a:${initialArgs}`);
			return `a:${initialArgs}`;
		};
		const hookB = async ({ initialArgs }: ParallelHookContext) => {
			calls.push(`b:${initialArgs}`);
			return `b:${initialArgs}`;
		};
		let finalResults: Map<ParallelHookFn, ParallelHookResult> | undefined;
		const ph = new ParallelHook("notify", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(hookA);
		ph.addHook(hookB);

		hookified.onHook(ph);
		await hookified.hook("notify", "ping");
		expect(calls.sort()).toEqual(["a:ping", "b:ping"]);
		expect(finalResults?.get(hookA)).toMatchObject({
			status: "fulfilled",
			result: "a:ping",
		});
		expect(finalResults?.get(hookB)).toMatchObject({
			status: "fulfilled",
			result: "b:ping",
		});
	});

	test("should integrate with Hookified alongside regular hooks", async () => {
		const hookified = new Hookified();
		const order: string[] = [];

		hookified.onHook({
			event: "process",
			handler: () => {
				order.push("regular-hook");
			},
		});

		const ph = new ParallelHook("process", () => {
			order.push("parallel-final");
		});
		ph.addHook(() => {
			order.push("parallel-hook-a");
		});
		ph.addHook(() => {
			order.push("parallel-hook-b");
		});

		hookified.onHook(ph);
		await hookified.hook("process", "data");

		expect(order[0]).toBe("regular-hook");
		expect(order.slice(1, 3).sort()).toEqual([
			"parallel-hook-a",
			"parallel-hook-b",
		]);
		expect(order[3]).toBe("parallel-final");
	});

	test("should expose a discriminated ParallelHookResult type", async () => {
		const okHook = () => 1;
		const failHook = () => {
			throw new Error("nope");
		};
		let labels: string[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			labels = [...results.values()].map((r) =>
				r.status === "fulfilled"
					? `ok:${r.result}`
					: `err:${(r.reason as Error).message}`,
			);
		});
		ph.addHook(okHook);
		ph.addHook(failHook);

		await ph.handler();
		expect(labels).toEqual(["ok:1", "err:nope"]);
	});
});
