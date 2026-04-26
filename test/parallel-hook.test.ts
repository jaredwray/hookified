import { describe, expect, test } from "vitest";
import type {
	ParallelHookContext,
	ParallelHookFinalContext,
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

	test("should call final handler with empty results when no hooks are registered", async () => {
		let received: ParallelHookFinalContext | undefined;
		const ph = new ParallelHook("process", (context) => {
			received = context;
		});
		await ph.handler(42);
		expect(received).toEqual({ initialArgs: 42, results: [] });
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
		let finalResults: ParallelHookResult[] = [];
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
		expect(finalResults).toHaveLength(3);
		expect(finalResults.every((r) => r.status === "fulfilled")).toBe(true);
	});

	test("should handle mixed sync and async hooks", async () => {
		let finalResults: ParallelHookResult[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs + 1);
		ph.addHook(async ({ initialArgs }: ParallelHookContext) => initialArgs * 3);
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs - 2);

		await ph.handler(10);
		expect(
			finalResults.map((r) => (r.status === "fulfilled" ? r.result : null)),
		).toEqual([11, 30, 8]);
	});

	test("should include hook references in results", async () => {
		const hook1 = ({ initialArgs }: ParallelHookContext) => initialArgs + 1;
		const hook2 = ({ initialArgs }: ParallelHookContext) => initialArgs * 2;
		let finalResults: ParallelHookResult[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(hook1);
		ph.addHook(hook2);

		await ph.handler(5);
		expect(finalResults[0].hook).toBe(hook1);
		expect(finalResults[1].hook).toBe(hook2);
	});

	test("should mark each result as fulfilled with the returned value", async () => {
		let finalResults: ParallelHookResult[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs);
		ph.addHook(async ({ initialArgs }: ParallelHookContext) => initialArgs * 2);

		await ph.handler(7);
		expect(finalResults).toMatchObject([
			{ status: "fulfilled", result: 7 },
			{ status: "fulfilled", result: 14 },
		]);
	});

	test("should collect rejections without rejecting handler()", async () => {
		const error = new Error("boom");
		let finalResults: ParallelHookResult[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs);
		ph.addHook(async () => {
			throw error;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => initialArgs * 2);

		await ph.handler(3);
		expect(finalResults).toHaveLength(3);
		expect(finalResults[0]).toMatchObject({ status: "fulfilled", result: 3 });
		expect(finalResults[1]).toMatchObject({
			status: "rejected",
			reason: error,
		});
		expect(finalResults[2]).toMatchObject({ status: "fulfilled", result: 6 });
	});

	test("should capture synchronous throws as rejections", async () => {
		const error = new Error("sync boom");
		let finalResults: ParallelHookResult[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(() => {
			throw error;
		});

		await ph.handler("input");
		expect(finalResults).toHaveLength(1);
		expect(finalResults[0]).toMatchObject({
			status: "rejected",
			reason: error,
		});
	});

	test("should still call final handler when every hook rejects", async () => {
		let finalResults: ParallelHookResult[] = [];
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
		expect(finalResults).toHaveLength(2);
		expect(finalResults.every((r) => r.status === "rejected")).toBe(true);
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
		let finalResults: ParallelHookResult[] = [];
		const ph = new ParallelHook("notify", ({ results }) => {
			finalResults = results;
		});
		ph.addHook(({ initialArgs }: ParallelHookContext) => {
			calls.push(`a:${initialArgs}`);
			return `a:${initialArgs}`;
		});
		ph.addHook(async ({ initialArgs }: ParallelHookContext) => {
			calls.push(`b:${initialArgs}`);
			return `b:${initialArgs}`;
		});

		hookified.onHook(ph);
		await hookified.hook("notify", "ping");
		expect(calls.sort()).toEqual(["a:ping", "b:ping"]);
		expect(finalResults).toMatchObject([
			{ status: "fulfilled", result: "a:ping" },
			{ status: "fulfilled", result: "b:ping" },
		]);
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
		let labels: string[] = [];
		const ph = new ParallelHook("process", ({ results }) => {
			labels = results.map((r) =>
				r.status === "fulfilled" ? `ok:${r.result}` : `err:${r.reason.message}`,
			);
		});
		ph.addHook(() => 1);
		ph.addHook(() => {
			throw new Error("nope");
		});

		await ph.handler();
		expect(labels).toEqual(["ok:1", "err:nope"]);
	});
});
