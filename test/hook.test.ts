import { describe, expect, test } from "vitest";
import { Hook, Hookified } from "../src/index.js";

describe("Hook", () => {
	test("should create a Hook with event and handler", () => {
		const handler = () => {};
		const hook = new Hook("beforeSave", handler);
		expect(hook.event).toBe("beforeSave");
		expect(hook.handler).toBe(handler);
	});

	test("should work with an async handler", () => {
		const handler = async () => {};
		const hook = new Hook("afterSave", handler);
		expect(hook.event).toBe("afterSave");
		expect(hook.handler).toBe(handler);
	});

	test("should satisfy IHook interface for onHookEntry", async () => {
		const hookified = new Hookified();
		let called = false;
		const hook = new Hook("test", () => {
			called = true;
		});
		hookified.onHookEntry(hook);
		await hookified.hook("test");
		expect(called).toBe(true);
	});

	test("should satisfy IHook interface for onHooks", async () => {
		const hookified = new Hookified();
		const results: string[] = [];
		const hooks = [
			new Hook("test", () => {
				results.push("first");
			}),
			new Hook("test", () => {
				results.push("second");
			}),
		];
		hookified.onHooks(hooks);
		await hookified.hook("test");
		expect(results).toEqual(["first", "second"]);
	});

	test("should satisfy IHook interface for removeHooks", async () => {
		const hookified = new Hookified();
		let called = false;
		const hook = new Hook("test", () => {
			called = true;
		});
		hookified.onHookEntry(hook);
		hookified.removeHooks([hook]);
		await hookified.hook("test");
		expect(called).toBe(false);
	});

	test("should work with handler that receives arguments", async () => {
		const hookified = new Hookified();
		const data = { value: 0 };
		const hook = new Hook("test", (d: { value: number }) => {
			d.value = 42;
		});
		hookified.onHookEntry(hook);
		await hookified.hook("test", data);
		expect(data.value).toBe(42);
	});
});
