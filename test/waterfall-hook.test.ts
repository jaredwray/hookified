import { describe, expect, test } from "vitest";
import type { WaterfallHookContext } from "../src/index.js";
import { Hookified, WaterfallHook } from "../src/index.js";

describe("WaterfallHook", () => {
	test("should create a WaterfallHook with event and handler", () => {
		const handler = ({ results }: WaterfallHookContext) => results;
		const wh = new WaterfallHook("process", handler);
		expect(wh.event).toBe("process");
		expect(wh.hooks).toEqual([]);
		expect(wh.id).toBeUndefined();
	});

	test("should create a WaterfallHook with event, handler, and id", () => {
		const handler = ({ results }: WaterfallHookContext) => results;
		const wh = new WaterfallHook("process", handler, "my-id");
		expect(wh.event).toBe("process");
		expect(wh.id).toBe("my-id");
	});

	test("should add hooks to the waterfall chain", () => {
		const wh = new WaterfallHook("process", () => {});
		const hook1 = ({ initialArgs }: WaterfallHookContext) => initialArgs + 1;
		const hook2 = ({ results }: WaterfallHookContext) =>
			results[results.length - 1].result * 2;
		wh.addHook(hook1);
		wh.addHook(hook2);
		expect(wh.hooks).toHaveLength(2);
		expect(wh.hooks[0]).toBe(hook1);
		expect(wh.hooks[1]).toBe(hook2);
	});

	test("should remove a hook by reference", () => {
		const hook1 = ({ initialArgs }: WaterfallHookContext) => initialArgs + 1;
		const wh = new WaterfallHook("process", () => {});
		wh.addHook(hook1);
		expect(wh.removeHook(hook1)).toBe(true);
		expect(wh.hooks).toHaveLength(0);
	});

	test("should return false when removing a non-existent hook", () => {
		const wh = new WaterfallHook("process", () => {});
		expect(
			wh.removeHook(({ initialArgs }: WaterfallHookContext) => initialArgs),
		).toBe(false);
	});

	test("should call handler directly when no hooks are added", async () => {
		let received: unknown;
		const wh = new WaterfallHook(
			"process",
			({ initialArgs }: WaterfallHookContext) => {
				received = initialArgs;
			},
		);
		await wh.handler(42);
		expect(received).toBe(42);
	});

	test("should provide empty results to handler when no hooks", async () => {
		let receivedResults: unknown;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				receivedResults = results;
			},
		);
		await wh.handler(42);
		expect(receivedResults).toEqual([]);
	});

	test("should chain hooks sequentially with results array", async () => {
		let finalResults: unknown;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				finalResults = results;
			},
		);
		wh.addHook(({ initialArgs }: WaterfallHookContext) => initialArgs + 1); // 5 -> 6
		wh.addHook(
			({ results }: WaterfallHookContext) =>
				results[results.length - 1].result * 2,
		); // 6 -> 12

		await wh.handler(5);
		expect(finalResults).toMatchObject([{ result: 6 }, { result: 12 }]);
	});

	test("should include hook references in results", async () => {
		let finalResults: unknown[] = [];
		const hook1 = ({ initialArgs }: WaterfallHookContext) => initialArgs + 1;
		const hook2 = ({ results }: WaterfallHookContext) =>
			results[results.length - 1].result * 2;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				finalResults = results;
			},
		);
		wh.addHook(hook1);
		wh.addHook(hook2);

		await wh.handler(5);
		expect(finalResults[0].hook).toBe(hook1);
		expect(finalResults[1].hook).toBe(hook2);
	});

	test("should handle async hooks in the chain", async () => {
		let finalResults: unknown;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				finalResults = results;
			},
		);
		wh.addHook(
			async ({ initialArgs }: WaterfallHookContext) => `${initialArgs}-step1`,
		);
		wh.addHook(
			async ({ results }: WaterfallHookContext) =>
				`${results[results.length - 1].result}-step2`,
		);

		await wh.handler("input");
		expect(finalResults).toMatchObject([
			{ result: "input-step1" },
			{ result: "input-step1-step2" },
		]);
	});

	test("should handle mixed sync and async hooks", async () => {
		let finalResults: unknown;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				finalResults = results;
			},
		);
		wh.addHook(({ initialArgs }: WaterfallHookContext) => initialArgs + 1); // 10 -> 11
		wh.addHook(
			async ({ results }: WaterfallHookContext) =>
				results[results.length - 1].result * 3,
		); // 11 -> 33
		wh.addHook(
			({ results }: WaterfallHookContext) =>
				results[results.length - 1].result - 2,
		); // 33 -> 31

		await wh.handler(10);
		expect(finalResults).toMatchObject([
			{ result: 11 },
			{ result: 33 },
			{ result: 31 },
		]);
	});

	test("should transform objects through the waterfall chain", async () => {
		let finalResult: unknown;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				finalResult = results[results.length - 1].result;
			},
		);
		wh.addHook(({ initialArgs }: WaterfallHookContext) => {
			return { ...initialArgs, validated: true };
		});
		wh.addHook(({ results }: WaterfallHookContext) => {
			return { ...results[results.length - 1].result, processed: true };
		});

		await wh.handler({ name: "test" });
		expect(finalResult).toEqual({
			name: "test",
			validated: true,
			processed: true,
		});
	});

	test("should pass multiple arguments as an array for initialArgs", async () => {
		let received: unknown;
		const wh = new WaterfallHook(
			"process",
			({ initialArgs }: WaterfallHookContext) => {
				received = initialArgs;
			},
		);

		await wh.handler(1, 2, 3);
		expect(received).toEqual([1, 2, 3]);
	});

	test("should provide initialArgs to every hook", async () => {
		const receivedInitialArgs: unknown[] = [];
		const wh = new WaterfallHook(
			"process",
			({ initialArgs }: WaterfallHookContext) => {
				receivedInitialArgs.push(initialArgs);
			},
		);
		wh.addHook(({ initialArgs }: WaterfallHookContext) => {
			receivedInitialArgs.push(initialArgs);
			return initialArgs + 10;
		});
		wh.addHook(({ initialArgs }: WaterfallHookContext) => {
			receivedInitialArgs.push(initialArgs);
			return initialArgs + 20;
		});

		await wh.handler(5);
		expect(receivedInitialArgs).toEqual([5, 5, 5]);
	});

	test("should provide empty results array to the first hook", async () => {
		let firstHookResults: unknown[] = [];
		const wh = new WaterfallHook("process", () => {});
		wh.addHook(({ initialArgs, results }: WaterfallHookContext) => {
			firstHookResults = results;
			return initialArgs;
		});

		await wh.handler("data");
		expect(firstHookResults).toEqual([]);
	});

	test("should accumulate results from all hooks", async () => {
		let finalResults: unknown;
		const wh = new WaterfallHook(
			"process",
			({ results }: WaterfallHookContext) => {
				finalResults = results;
			},
		);
		wh.addHook(({ initialArgs }: WaterfallHookContext) => initialArgs + 1); // 0 -> 1
		wh.addHook(
			({ results }: WaterfallHookContext) =>
				results[results.length - 1].result * 10,
		); // 1 -> 10
		wh.addHook(
			({ results }: WaterfallHookContext) =>
				results[results.length - 1].result + 5,
		); // 10 -> 15

		await wh.handler(0);
		expect(finalResults).toMatchObject([
			{ result: 1 },
			{ result: 10 },
			{ result: 15 },
		]);
	});

	test("should integrate with Hookified via onHook", async () => {
		const hookified = new Hookified();
		let finalResult: unknown;
		const wh = new WaterfallHook(
			"save",
			({ results }: WaterfallHookContext) => {
				finalResult = results[results.length - 1].result;
			},
		);
		wh.addHook(({ initialArgs }: WaterfallHookContext) => {
			return { ...initialArgs, validated: true };
		});
		wh.addHook(({ results }: WaterfallHookContext) => {
			return { ...results[results.length - 1].result, timestamp: 12345 };
		});

		hookified.onHook(wh);
		await hookified.hook("save", { name: "test" });
		expect(finalResult).toEqual({
			name: "test",
			validated: true,
			timestamp: 12345,
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

		const wh = new WaterfallHook("process", () => {
			order.push("waterfall-done");
		});
		wh.addHook(({ initialArgs }: WaterfallHookContext) => {
			order.push("waterfall-step");
			return initialArgs;
		});

		hookified.onHook(wh);
		await hookified.hook("process", "data");
		expect(order).toEqual(["regular-hook", "waterfall-step", "waterfall-done"]);
	});

	test("should propagate errors from hooks", async () => {
		const wh = new WaterfallHook("process", () => {});
		wh.addHook(() => {
			throw new Error("hook error");
		});

		await expect(wh.handler("input")).rejects.toThrow("hook error");
	});

	test("should propagate errors from the final handler", async () => {
		const wh = new WaterfallHook("process", () => {
			throw new Error("handler error");
		});

		await expect(wh.handler("input")).rejects.toThrow("handler error");
	});
});
