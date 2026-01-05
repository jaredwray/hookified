// biome-ignore-all lint/suspicious/noExplicitAny: this is a test file
// biome-ignore-all lint/suspicious/noImplicitAnyLet: this is a test file
import pino from "pino";
import { describe, expect, test, vi } from "vitest";
import { type HookEntry, Hookified } from "../src/index.js";

describe("Hookified", () => {
	test("initialization", () => {
		const hookified = new Hookified();
		expect(hookified.hooks).toEqual(new Map());
	});

	test("onHook", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook("event", handler);
		hookified.onHook("event2", handler2);
		expect(hookified.getHooks("event")).toEqual([handler]);
		expect(hookified.getHooks("event2")).toEqual([handler2]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("addHook", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.addHook("event", handler);
		hookified.addHook("event2", handler2);
		expect(hookified.getHooks("event")).toEqual([handler]);
		expect(hookified.getHooks("event2")).toEqual([handler2]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("onHooks", async () => {
		const hookified = new Hookified();
		const eventName = "event-on-hooks";

		const handler1 = () => {};

		const handler2 = () => {};
		const hooks: HookEntry[] = [];
		hooks.push(
			{ event: eventName, handler: handler1 },
			{ event: eventName, handler: handler2 },
		);
		hookified.onHooks(hooks);
		expect(hookified.getHooks(eventName)).toEqual([handler1, handler2]);
		expect(hookified.hooks.size).toBe(1);
		// Add another hook
		const eventName2 = "event-on-hooks2";

		const handler3 = () => {};
		hookified.onHook(eventName2, handler3);
		expect(hookified.getHooks(eventName2)).toEqual([handler3]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("onHookOnce will remove hook after execution", async () => {
		const hookified = new Hookified();

		const handler = () => {};
		hookified.onceHook("event", handler);
		expect(hookified.getHooks("event")?.length).toEqual(1);
		await hookified.hook("event");
		expect(hookified.getHooks("event")?.length).toEqual(0);
	});

	test("onHook with Clear", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook("event", handler);
		hookified.onHook("event2", handler2);
		expect(hookified.getHooks("event")).toEqual([handler]);
		expect(hookified.getHooks("event2")).toEqual([handler2]);
		hookified.clearHooks();
		expect(hookified.hooks.size).toBe(0);
	});

	test("onHook multiple handlers", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook("event", handler);
		hookified.onHook("event", handler2);
		expect(hookified.hooks.get("event")).toEqual([handler, handler2]);
		expect(hookified.hooks.size).toBe(1);
	});

	test("removeHook", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook("event", handler);
		hookified.onHook("event", handler2);
		hookified.removeHook("event", handler);
		expect(hookified.getHooks("event")).toEqual([handler2]);
		expect(hookified.hooks.size).toBe(1);
	});

	test("removeHooks", async () => {
		const hookified = new Hookified();
		const eventName = "event-remove-hooks";

		const handler1 = () => {};

		const handler2 = () => {};
		hookified.onHook(eventName, handler1);
		hookified.onHook(eventName, handler2);
		const hooks = [{ event: eventName, handler: handler2 }];
		hookified.removeHooks(hooks);
		expect(hookified.getHooks(eventName)).toEqual([handler1]);
		expect(hookified.hooks.size).toBe(1);
	});

	test("execute hook and manipulate data", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };
		let handlerData: any;

		const handler = (data: any) => {
			data.key = "modified";

			handlerData = data;
		};

		hookified.onHook("event", handler);
		await hookified.hook("event", data);
		expect(handlerData.key).toBe("modified");
	});

	test("execute hook with HookEntryand manipulate data", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };
		let handlerData: any;

		const handler = (data: any) => {
			data.key = "modified";

			handlerData = data;
		};

		hookified.onHookEntry({ event: "event", handler });
		await hookified.hook("event", data);
		expect(handlerData.key).toBe("modified");
	});

	test("execute callHook and manipulate data", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };
		let handlerData: any;

		const handler = (data: any) => {
			data.key = "modified";

			handlerData = data;
		};

		hookified.onHook("event", handler);
		await hookified.callHook("event", data);
		expect(handlerData.key).toBe("modified");
	});

	test("execute hook and manipulate multiple data items", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };
		const data2 = { key: "value2" };
		const data3 = { key: "value3" };
		const handlerData: Array<{ key: string }> = [];

		const handler = (
			data: { key: string },
			data2: { key: string },
			data3: { key: string },
		) => {
			data.key = "modified";
			data2.key = "foo";
			data3.key = "bar";

			handlerData.push(data, data2, data3);
		};

		hookified.onHook("event", handler);
		await hookified.hook("event", data, data2, data3);
		expect(handlerData[0].key).toBe("modified");
		expect(handlerData[1].key).toBe("foo");
		expect(handlerData[2].key).toBe("bar");
	});

	test("hook with error emitted", async () => {
		const hookified = new Hookified();
		let errorMessage;
		hookified.on("error", (error: Error) => {
			errorMessage = error.message;
			expect(error.message).toBe("event: error");
		});

		const data = { key: "value" };

		const handler = () => {
			throw new Error("error");
		};

		hookified.onHook("event", handler);
		await hookified.hook("event", data);
		expect(errorMessage).toBe("event: error");
	});

	test("hook with sync function", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };

		const handler = (data: any) => {
			data.key = "modified";
		};

		hookified.onHook("event", handler);
		await hookified.hook("event", data);
		expect(data.key).toBe("modified");
	});

	test("prepends hook to the beginning of the array", async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push("modified2");
		};

		const handler2 = () => {
			handlerData.push("modified1");
		};

		hookified.onHook("event", handler);
		hookified.prependHook("event", handler2);
		await hookified.hook("event");
		expect(handlerData[0]).toBe("modified1");
		expect(handlerData[1]).toBe("modified2");
	});

	test("prepends hook and creates new array", async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push("modified1");
		};

		hookified.prependHook("event", handler);
		await hookified.hook("event");
		expect(handlerData[0]).toBe("modified1");
	});

	test("prepends a hook and removes it", async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push("modified1");
		};

		hookified.prependOnceHook("event20", handler);
		await hookified.hook("event20");
		expect(hookified.hooks.get("event20")?.length).toBe(0);
	});

	test("should set throwErrorOnHook to true", async () => {
		const hookified = new Hookified({ throwHookErrors: true });
		expect(hookified.throwHookErrors).toBe(true);
		hookified.throwHookErrors = false;
		expect(hookified.throwHookErrors).toBe(false);
	});

	test("should throw error when throwErrorOnHook is true", async () => {
		const hookified = new Hookified({ throwHookErrors: true });
		const data = { key: "value" };
		let errorMessage;

		const handler = () => {
			throw new Error("error: this handler throws stuff");
		};

		hookified.onHook("event", handler);

		try {
			await hookified.hook("event", data);
		} catch (error) {
			errorMessage = (error as Error).message;
		}

		expect(errorMessage).toBe("event: error: this handler throws stuff");
	});

	describe("throwOnHookError", () => {
		test("should be false by default", () => {
			const hookified = new Hookified();
			expect(hookified.throwOnHookError).toBe(false);
		});

		test("should be configurable via options", () => {
			const hookified = new Hookified({ throwOnHookError: true });
			expect(hookified.throwOnHookError).toBe(true);
		});

		test("should be settable via property", () => {
			const hookified = new Hookified();
			expect(hookified.throwOnHookError).toBe(false);
			hookified.throwOnHookError = true;
			expect(hookified.throwOnHookError).toBe(true);
			hookified.throwOnHookError = false;
			expect(hookified.throwOnHookError).toBe(false);
		});

		test("should throw error when throwOnHookError is true", async () => {
			const hookified = new Hookified({ throwOnHookError: true });
			const data = { key: "value" };
			let errorMessage;

			const handler = () => {
				throw new Error("error: this handler throws stuff");
			};

			hookified.onHook("event", handler);

			try {
				await hookified.hook("event", data);
			} catch (error) {
				errorMessage = (error as Error).message;
			}

			expect(errorMessage).toBe("event: error: this handler throws stuff");
		});

		test("should emit error event when throwOnHookError is false", async () => {
			const hookified = new Hookified({ throwOnHookError: false });
			const data = { key: "value" };
			let errorMessage;

			hookified.on("error", (error: Error) => {
				errorMessage = error.message;
			});

			const handler = () => {
				throw new Error("error: hook error occurred");
			};

			hookified.onHook("event", handler);
			await hookified.hook("event", data);

			expect(errorMessage).toBe("event: error: hook error occurred");
		});

		test("should allow dynamically changing throwOnHookError setting", async () => {
			const hookified = new Hookified({ throwOnHookError: false });
			const data = { key: "value" };

			const handler = () => {
				throw new Error("error: test error");
			};

			hookified.onHook("event", handler);

			// Should not throw when false
			let errorMessage;
			hookified.on("error", (error: Error) => {
				errorMessage = error.message;
			});

			await hookified.hook("event", data);
			expect(errorMessage).toBe("event: error: test error");

			// Change to true - should now throw
			hookified.throwOnHookError = true;

			let thrownError;
			try {
				await hookified.hook("event", data);
			} catch (error) {
				thrownError = (error as Error).message;
			}

			expect(thrownError).toBe("event: error: test error");
		});

		test("should work with logger when throwOnHookError is true", async () => {
			const logger = pino();
			let loggerErrorMessage;
			logger.error = (object: unknown, ...arguments_: unknown[]) => {
				const message = typeof object === "string" ? object : arguments_[0];
				loggerErrorMessage = message as string;
			};

			const hookified = new Hookified({ logger, throwOnHookError: true });
			const data = { key: "value" };
			let errorMessage;

			const handler = () => {
				throw new Error("error: this handler throws stuff");
			};

			hookified.onHook("event", handler);

			try {
				await hookified.hook("event", data);
			} catch (error) {
				errorMessage = (error as Error).message;
			}

			expect(errorMessage).toBe("event: error: this handler throws stuff");
			expect(loggerErrorMessage).toBe(
				"event: error: this handler throws stuff",
			);
		});
	});

	describe("throwOnEmitError", () => {
		test("should be configurable via options", () => {
			const hookified = new Hookified({ throwOnEmitError: true });
			expect(hookified.throwOnEmitError).toBe(true);
		});

		test("should be settable via property", () => {
			const hookified = new Hookified();
			expect(hookified.throwOnEmitError).toBe(false);
			hookified.throwOnEmitError = true;
			expect(hookified.throwOnEmitError).toBe(true);
			hookified.throwOnEmitError = false;
			expect(hookified.throwOnEmitError).toBe(false);
		});

		test("should throw error when emitting 'error' event with no listeners and throwOnEmitError is true", () => {
			const hookified = new Hookified({ throwOnEmitError: true });

			expect(() => {
				hookified.emit("error", new Error("test error"));
			}).toThrow("test error");
		});

		test("should not throw error when emitting 'error' event with listeners", () => {
			const hookified = new Hookified({ throwOnEmitError: true });
			let errorCaught: Error | undefined;

			hookified.on("error", (error: Error) => {
				errorCaught = error;
			});

			expect(() => {
				hookified.emit("error", new Error("test error"));
			}).not.toThrow();

			expect(errorCaught?.message).toBe("test error");
		});

		test("should not throw error when throwOnEmitError is false", () => {
			const hookified = new Hookified({ throwOnEmitError: false });

			expect(() => {
				hookified.emit("error", new Error("test error"));
			}).not.toThrow();
		});
	});

	describe("logger", () => {
		test("should set logger", async () => {
			const hookified = new Hookified();
			const logger = pino();
			hookified.logger = logger;
			expect(hookified.logger).toBe(logger);
		});

		test("should set logger to undefined", async () => {
			const hookified = new Hookified();
			hookified.logger = undefined;
			expect(hookified.logger).toBe(undefined);
		});

		test("should log error", async () => {
			const logger = pino();
			let loggerErrorMessage;
			logger.error = (object: unknown, ...arguments_: unknown[]) => {
				const message = typeof object === "string" ? object : arguments_[0];
				expect(message).toBe("event: error: this handler throws stuff");
				loggerErrorMessage = message as string;
			};

			const hookified = new Hookified({ logger, throwHookErrors: true });
			const data = { key: "value" };
			let errorMessage;

			const handler = () => {
				throw new Error("error: this handler throws stuff");
			};

			hookified.onHook("event", handler);

			try {
				await hookified.hook("event", data);
			} catch (error) {
				errorMessage = (error as Error).message;
			}

			expect(errorMessage).toBe("event: error: this handler throws stuff");
			expect(loggerErrorMessage).toBe(
				"event: error: this handler throws stuff",
			);
		});
	});

	describe("beforeHook", () => {
		test("should call before:event hooks", async () => {
			const hookified = new Hookified();
			const handlerData: string[] = [];

			const handler = () => {
				handlerData.push("before");
			};

			hookified.onHook("before:test", handler);
			await hookified.beforeHook("test");
			expect(handlerData).toEqual(["before"]);
		});

		test("should pass arguments to before hooks", async () => {
			const hookified = new Hookified();
			let capturedData;
			let capturedCount;

			const handler = (data: any, count: number) => {
				capturedData = data;
				capturedCount = count;
			};

			const data = { key: "value" };
			hookified.onHook("before:process", handler);
			await hookified.beforeHook("process", data, { key: "42" });
			expect(capturedData).toEqual({ key: "value" });
			expect(capturedCount).toEqual({ key: "42" });
		});

		test("should call multiple before hooks in order", async () => {
			const hookified = new Hookified();
			const handlerData: string[] = [];

			const handler1 = () => {
				handlerData.push("first");
			};

			const handler2 = () => {
				handlerData.push("second");
			};

			hookified.onHook("before:action", handler1);
			hookified.onHook("before:action", handler2);
			await hookified.beforeHook("action");
			expect(handlerData).toEqual(["first", "second"]);
		});

		test("should handle errors in before hooks", async () => {
			const hookified = new Hookified();
			let errorMessage;

			hookified.on("error", (error: Error) => {
				errorMessage = error.message;
			});

			const handler = () => {
				throw new Error("before hook error");
			};

			hookified.onHook("before:task", handler);
			await hookified.beforeHook("task");
			expect(errorMessage).toBe("before:task: before hook error");
		});
	});

	describe("afterHook", () => {
		test("should call after:event hooks", async () => {
			const hookified = new Hookified();
			const handlerData: string[] = [];

			const handler = () => {
				handlerData.push("after");
			};

			hookified.onHook("after:test", handler);
			await hookified.afterHook("test");
			expect(handlerData).toEqual(["after"]);
		});

		test("should pass arguments to after hooks", async () => {
			const hookified = new Hookified();
			let capturedData;
			let capturedMessage;

			const handler = (data: any, message: string) => {
				capturedData = data;
				capturedMessage = message;
			};

			const data = { status: "complete" };
			hookified.onHook("after:process", handler);
			await hookified.afterHook("process", data, { status: "success" });
			expect(capturedData).toEqual({ status: "complete" });
			expect(capturedMessage).toEqual({ status: "success" });
		});

		test("should call multiple after hooks in order", async () => {
			const hookified = new Hookified();
			const handlerData: string[] = [];

			const handler1 = () => {
				handlerData.push("cleanup1");
			};

			const handler2 = () => {
				handlerData.push("cleanup2");
			};

			hookified.onHook("after:action", handler1);
			hookified.onHook("after:action", handler2);
			await hookified.afterHook("action");
			expect(handlerData).toEqual(["cleanup1", "cleanup2"]);
		});

		test("should handle errors in after hooks", async () => {
			const hookified = new Hookified();
			let errorMessage;

			hookified.on("error", (error: Error) => {
				errorMessage = error.message;
			});

			const handler = () => {
				throw new Error("after hook error");
			};

			hookified.onHook("after:task", handler);
			await hookified.afterHook("task");
			expect(errorMessage).toBe("after:task: after hook error");
		});
	});

	describe("beforeHook and afterHook integration", () => {
		test("should work with before and after hooks together", async () => {
			const hookified = new Hookified();
			const executionOrder: string[] = [];

			const beforeHandler = () => {
				executionOrder.push("before");
			};

			const mainHandler = () => {
				executionOrder.push("main");
			};

			const afterHandler = () => {
				executionOrder.push("after");
			};

			hookified.onHook("before:operation", beforeHandler);
			hookified.onHook("operation", mainHandler);
			hookified.onHook("after:operation", afterHandler);

			await hookified.beforeHook("operation");
			await hookified.hook("operation");
			await hookified.afterHook("operation");

			expect(executionOrder).toEqual(["before", "main", "after"]);
		});

		test("should maintain data integrity across before and after hooks", async () => {
			const hookified = new Hookified();
			const data = { value: 0 };

			const beforeHandler = (data: any) => {
				data.value = 10;
			};

			const afterHandler = (data: any) => {
				data.value = data.value * 2;
			};

			hookified.onHook("before:transform", beforeHandler);
			hookified.onHook("after:transform", afterHandler);

			await hookified.beforeHook("transform", data);
			expect(data.value).toBe(10);

			await hookified.afterHook("transform", data);
			expect(data.value).toBe(20);
		});
	});

	describe("enforceBeforeAfter", () => {
		test("should be false by default", () => {
			const hookified = new Hookified();
			expect(hookified.enforceBeforeAfter).toBe(false);
		});

		test("should be configurable via options", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			expect(hookified.enforceBeforeAfter).toBe(true);
		});

		test("should be settable via property", () => {
			const hookified = new Hookified();
			hookified.enforceBeforeAfter = true;
			expect(hookified.enforceBeforeAfter).toBe(true);
		});

		test("should allow any hook name when enforceBeforeAfter is false", () => {
			const hookified = new Hookified({ enforceBeforeAfter: false });
			const handler = () => {};

			expect(() => hookified.onHook("customEvent", handler)).not.toThrow();
			expect(() => hookified.onHook("randomName", handler)).not.toThrow();
			expect(() => hookified.onHook("test", handler)).not.toThrow();
		});

		test("should allow hooks starting with 'before' when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.onHook("beforeTest", handler)).not.toThrow();
			expect(() => hookified.onHook("before:test", handler)).not.toThrow();
			expect(() => hookified.onHook("beforeSomething", handler)).not.toThrow();
		});

		test("should allow hooks starting with 'after' when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.onHook("afterTest", handler)).not.toThrow();
			expect(() => hookified.onHook("after:test", handler)).not.toThrow();
			expect(() => hookified.onHook("afterSomething", handler)).not.toThrow();
		});

		test("should throw error for invalid hook names when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.onHook("customEvent", handler)).toThrow(
				'Hook event "customEvent" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
			expect(() => hookified.onHook("test", handler)).toThrow(
				'Hook event "test" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
			expect(() => hookified.onHook("randomName", handler)).toThrow(
				'Hook event "randomName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in addHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.addHook("beforeTest", handler)).not.toThrow();
			expect(() => hookified.addHook("afterTest", handler)).not.toThrow();
			expect(() => hookified.addHook("invalidName", handler)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in prependHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.prependHook("beforeTest", handler)).not.toThrow();
			expect(() => hookified.prependHook("afterTest", handler)).not.toThrow();
			expect(() => hookified.prependHook("invalidName", handler)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in onceHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.onceHook("beforeTest", handler)).not.toThrow();
			expect(() => hookified.onceHook("afterTest", handler)).not.toThrow();
			expect(() => hookified.onceHook("invalidName", handler)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in prependOnceHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.prependOnceHook("beforeTest", handler),
			).not.toThrow();
			expect(() =>
				hookified.prependOnceHook("afterTest", handler),
			).not.toThrow();
			expect(() => hookified.prependOnceHook("invalidName", handler)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in hook", async () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });

			await expect(hookified.hook("beforeTest")).resolves.not.toThrow();
			await expect(hookified.hook("afterTest")).resolves.not.toThrow();
			await expect(hookified.hook("invalidName")).rejects.toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in callHook", async () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });

			await expect(hookified.callHook("beforeTest")).resolves.not.toThrow();
			await expect(hookified.callHook("afterTest")).resolves.not.toThrow();
			await expect(hookified.callHook("invalidName")).rejects.toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in getHooks", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });

			expect(() => hookified.getHooks("beforeTest")).not.toThrow();
			expect(() => hookified.getHooks("afterTest")).not.toThrow();
			expect(() => hookified.getHooks("invalidName")).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in removeHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.removeHook("beforeTest", handler)).not.toThrow();
			expect(() => hookified.removeHook("afterTest", handler)).not.toThrow();
			expect(() => hookified.removeHook("invalidName", handler)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in onHookEntry", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.onHookEntry({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHookEntry({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHookEntry({ event: "invalidName", handler }),
			).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in onHooks", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			const validHooks = [
				{ event: "beforeTest", handler },
				{ event: "afterTest", handler },
			];

			const invalidHooks = [
				{ event: "beforeTest", handler },
				{ event: "invalidName", handler },
			];

			expect(() => hookified.onHooks(validHooks)).not.toThrow();
			expect(() => hookified.onHooks(invalidHooks)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in removeHooks", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			const validHooks = [
				{ event: "beforeTest", handler },
				{ event: "afterTest", handler },
			];

			const invalidHooks = [
				{ event: "beforeTest", handler },
				{ event: "invalidName", handler },
			];

			expect(() => hookified.removeHooks(validHooks)).not.toThrow();
			expect(() => hookified.removeHooks(invalidHooks)).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should work with beforeHook and afterHook methods regardless of enforceBeforeAfter", async () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handlerData: string[] = [];

			const beforeHandler = () => {
				handlerData.push("before");
			};

			const afterHandler = () => {
				handlerData.push("after");
			};

			hookified.onHook("before:test", beforeHandler);
			hookified.onHook("after:test", afterHandler);

			await hookified.beforeHook("test");
			await hookified.afterHook("test");

			expect(handlerData).toEqual(["before", "after"]);
		});

		test("should allow dynamically changing enforceBeforeAfter setting", () => {
			const hookified = new Hookified({ enforceBeforeAfter: false });
			const handler = () => {};

			// Should work when false
			expect(() => hookified.onHook("customEvent", handler)).not.toThrow();

			// Change to true
			hookified.enforceBeforeAfter = true;

			// Should now throw
			expect(() => hookified.onHook("anotherCustomEvent", handler)).toThrow(
				'Hook event "anotherCustomEvent" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);

			// Should work with valid names
			expect(() => hookified.onHook("beforeSomething", handler)).not.toThrow();
			expect(() => hookified.onHook("afterSomething", handler)).not.toThrow();
		});
	});

	describe("deprecatedHooks", () => {
		test("should be empty Map by default", () => {
			const hookified = new Hookified();
			expect(hookified.deprecatedHooks).toEqual(new Map());
		});

		test("should be configurable via options", () => {
			const deprecatedHooks = new Map([
				["oldHook", "Use newHook instead"],
				["legacyHook", "This hook will be removed in v2.0"],
			]);
			const hookified = new Hookified({ deprecatedHooks });
			expect(hookified.deprecatedHooks).toEqual(deprecatedHooks);
		});

		test("should be settable via property", () => {
			const hookified = new Hookified();
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			hookified.deprecatedHooks = deprecatedHooks;
			expect(hookified.deprecatedHooks).toEqual(deprecatedHooks);
		});

		test("should emit warn event when deprecated hook is used in onHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should emit warn event without custom message", () => {
			const deprecatedHooks = new Map([["oldHook", ""]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated',
			});
		});

		test("should log deprecation warning to logger if available", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const logger = {
				trace: vi.fn(),
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				fatal: vi.fn(),
			};
			const hookified = new Hookified({ deprecatedHooks, logger });
			const handler = () => {};

			hookified.onHook("oldHook", handler);

			expect(logger.warn).toHaveBeenCalledWith(
				'Hook "oldHook" is deprecated: Use newHook instead',
				{
					event: "warn",
					data: [
						{
							hook: "oldHook",
							message: 'Hook "oldHook" is deprecated: Use newHook instead',
						},
					],
				},
			);
		});

		test("should check for deprecated hooks in addHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.addHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in prependHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.prependHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in onceHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onceHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in prependOnceHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.prependOnceHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in hook", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			await hookified.hook("oldHook");

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in callHook", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			await hookified.callHook("oldHook");

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in getHooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.getHooks("oldHook");

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in removeHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.removeHook("oldHook", handler);

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in onHookEntry", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHookEntry({ event: "oldHook", handler });

			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in onHooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			const warnEvents: any[] = [];
			hookified.on("warn", (event) => {
				warnEvents.push(event);
			});

			hookified.onHooks([
				{ event: "validHook", handler },
				{ event: "oldHook", handler },
			]);

			expect(warnEvents).toHaveLength(1);
			expect(warnEvents[0]).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should check for deprecated hooks in removeHooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			const warnEvents: any[] = [];
			hookified.on("warn", (event) => {
				warnEvents.push(event);
			});

			hookified.removeHooks([
				{ event: "validHook", handler },
				{ event: "oldHook", handler },
			]);

			expect(warnEvents).toHaveLength(1);
			expect(warnEvents[0]).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should not emit deprecation warning for non-deprecated hooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook("validHook", handler);

			expect(warnEvent).toBeUndefined();
		});

		test("should work with both enforceBeforeAfter and deprecatedHooks", () => {
			const deprecatedHooks = new Map([
				["beforeOldHook", "Use beforeNewHook instead"],
			]);
			const hookified = new Hookified({
				enforceBeforeAfter: true,
				deprecatedHooks,
			});
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			// Should work - valid name and deprecated
			hookified.onHook("beforeOldHook", handler);
			expect(warnEvent).toEqual({
				hook: "beforeOldHook",
				message:
					'Hook "beforeOldHook" is deprecated: Use beforeNewHook instead',
			});

			// Should throw - invalid name for enforceBeforeAfter
			expect(() => hookified.onHook("invalidHook", handler)).toThrow(
				'Hook event "invalidHook" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should allow dynamically adding deprecated hooks", () => {
			const hookified = new Hookified();
			const handler = () => {};

			// Initially no deprecation
			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook("someHook", handler);
			expect(warnEvent).toBeUndefined();

			// Add deprecation
			hookified.deprecatedHooks.set("someHook", "This hook is now deprecated");

			hookified.onHook("someHook", handler);
			expect(warnEvent).toEqual({
				hook: "someHook",
				message: 'Hook "someHook" is deprecated: This hook is now deprecated',
			});
		});

		test("should handle logger.warn not being available", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const logger = {
				trace: vi.fn(),
				debug: vi.fn(),
				info: vi.fn(),
				warn: undefined as unknown as () => void,
				error: vi.fn(),
				fatal: vi.fn(),
			};
			const hookified = new Hookified({ deprecatedHooks, logger });
			const handler = () => {};

			// Should not throw even without logger.warn
			expect(() => hookified.onHook("oldHook", handler)).not.toThrow();
		});
	});

	describe("allowDeprecated", () => {
		test("should be true by default", () => {
			const hookified = new Hookified();
			expect(hookified.allowDeprecated).toBe(true);
		});

		test("should be configurable via options", () => {
			const hookified = new Hookified({ allowDeprecated: false });
			expect(hookified.allowDeprecated).toBe(false);
		});

		test("should be settable via property", () => {
			const hookified = new Hookified();
			hookified.allowDeprecated = false;
			expect(hookified.allowDeprecated).toBe(false);
		});

		test("should allow deprecated hook registration when allowDeprecated is true", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};

			hookified.onHook("oldHook", handler);

			expect(hookified.getHooks("oldHook")).toEqual([handler]);
		});

		test("should prevent deprecated hook registration when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook("oldHook", handler);

			// Hook should not be registered
			expect(hookified.getHooks("oldHook")).toBeUndefined();
			// But warning should still be emitted
			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should prevent deprecated hook registration in addHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.addHook("oldHook", handler);

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in prependHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.prependHook("oldHook", handler);

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in onceHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.onceHook("oldHook", handler);

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in prependOnceHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.prependOnceHook("oldHook", handler);

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in onHookEntry when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.onHookEntry({ event: "oldHook", handler });

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in onHooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.onHooks([
				{ event: "validHook", handler },
				{ event: "oldHook", handler },
			]);

			expect(hookified.getHooks("validHook")).toEqual([handler]);
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook execution when allowDeprecated is false", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = vi.fn();

			// First register the hook when allowed
			hookified.onHook("oldHook", handler);
			expect(hookified.getHooks("oldHook")).toEqual([handler]);

			// Then set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Hook should not execute
			await hookified.hook("oldHook");
			expect(handler).not.toHaveBeenCalled();
		});

		test("should prevent deprecated hook execution in callHook when allowDeprecated is false", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = vi.fn();

			// First register the hook when allowed
			hookified.onHook("oldHook", handler);

			// Then set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Hook should not execute
			await hookified.callHook("oldHook");
			expect(handler).not.toHaveBeenCalled();
		});

		test("should return undefined from getHooks for deprecated hooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent removeHook for deprecated hooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};

			// Register hook first
			hookified.onHook("oldHook", handler);
			expect(hookified.getHooks("oldHook")).toEqual([handler]);

			// Set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Should not be able to remove the hook
			hookified.removeHook("oldHook", handler);
			// Since getHooks also respects allowDeprecated, it returns undefined
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent removeHooks for deprecated hooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};

			// Register hook first
			hookified.onHook("oldHook", handler);

			// Set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Should not be able to remove the hook
			hookified.removeHooks([{ event: "oldHook", handler }]);
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should still emit warnings for deprecated hooks even when allowDeprecated is false", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			// Try to register (should fail but emit warning)
			hookified.onHook("oldHook", handler);
			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});

			// Reset warning
			warnEvent = undefined;

			// Try to execute (should fail but emit warning)
			await hookified.hook("oldHook");
			expect(warnEvent).toEqual({
				hook: "oldHook",
				message: 'Hook "oldHook" is deprecated: Use newHook instead',
			});
		});

		test("should work with logger when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const logger = {
				trace: vi.fn(),
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				fatal: vi.fn(),
			};
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
				logger,
			});
			const handler = () => {};

			hookified.onHook("oldHook", handler);

			expect(logger.warn).toHaveBeenCalledWith(
				'Hook "oldHook" is deprecated: Use newHook instead',
				{
					event: "warn",
					data: [
						{
							hook: "oldHook",
							message: 'Hook "oldHook" is deprecated: Use newHook instead',
						},
					],
				},
			);
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should allow non-deprecated hooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.onHook("validHook", handler);

			expect(hookified.getHooks("validHook")).toEqual([handler]);
		});

		test("should work with enforceBeforeAfter and allowDeprecated together", () => {
			const deprecatedHooks = new Map([
				["beforeOldHook", "Use beforeNewHook instead"],
			]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
				enforceBeforeAfter: true,
			});
			const handler = () => {};

			// Should not register (deprecated + not allowed)
			hookified.onHook("beforeOldHook", handler);
			expect(hookified.getHooks("beforeOldHook")).toBeUndefined();

			// Should throw (doesn't start with before/after)
			expect(() => hookified.onHook("invalidHook", handler)).toThrow(
				'Hook event "invalidHook" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);

			// Should work (valid name + not deprecated)
			hookified.onHook("beforeValidHook", handler);
			expect(hookified.getHooks("beforeValidHook")).toEqual([handler]);
		});

		test("should allow dynamically changing allowDeprecated setting", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = vi.fn();

			// Should work when true
			hookified.onHook("oldHook", handler);
			expect(hookified.getHooks("oldHook")).toEqual([handler]);

			await hookified.hook("oldHook");
			expect(handler).toHaveBeenCalledTimes(1);

			// Change to false
			hookified.allowDeprecated = false;

			// Should not execute
			await hookified.hook("oldHook");
			expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again

			// Should not return hooks
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});
	});

	describe("hookSync", () => {
		test("should execute synchronous handlers", () => {
			const hookified = new Hookified();
			const data = { key: "value" };

			const handler = (data: any) => {
				data.key = "modified";
			};

			hookified.onHook("event", handler);
			hookified.hookSync("event", data);
			expect(data.key).toBe("modified");
		});

		test("should skip async handlers silently", () => {
			const hookified = new Hookified();
			const executionOrder: string[] = [];

			const syncHandler = () => {
				executionOrder.push("sync");
			};

			const asyncHandler = async () => {
				executionOrder.push("async");
			};

			hookified.onHook("event", syncHandler);
			hookified.onHook("event", asyncHandler);
			hookified.onHook("event", syncHandler);

			hookified.hookSync("event");

			// Only sync handlers should execute
			expect(executionOrder).toEqual(["sync", "sync"]);
		});

		test("should execute handlers in order", () => {
			const hookified = new Hookified();
			const executionOrder: number[] = [];

			hookified.onHook("event", () => executionOrder.push(1));
			hookified.onHook("event", () => executionOrder.push(2));
			hookified.onHook("event", () => executionOrder.push(3));

			hookified.hookSync("event");

			expect(executionOrder).toEqual([1, 2, 3]);
		});

		test("should emit error event on handler error", () => {
			const hookified = new Hookified();
			let errorMessage: string | undefined;

			hookified.on("error", (error: Error) => {
				errorMessage = error.message;
			});

			const handler = () => {
				throw new Error("sync error");
			};

			hookified.onHook("event", handler);
			hookified.hookSync("event");

			expect(errorMessage).toBe("event: sync error");
		});

		test("should throw error when throwOnHookError is true", () => {
			const hookified = new Hookified({ throwOnHookError: true });

			const handler = () => {
				throw new Error("sync error");
			};

			hookified.onHook("event", handler);

			expect(() => hookified.hookSync("event")).toThrow("event: sync error");
		});

		test("should validate hook name when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });

			expect(() => hookified.hookSync("invalidName")).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should respect deprecated hooks setting", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = vi.fn();

			hookified.onHook("oldHook", handler);
			hookified.hookSync("oldHook");

			expect(handler).not.toHaveBeenCalled();
		});

		test("should pass multiple arguments to handlers", () => {
			const hookified = new Hookified();
			const data1 = { key: "value1" };
			const data2 = { key: "value2" };
			let capturedArgs: any[] = [];

			const handler = (...args: any[]) => {
				capturedArgs = args;
			};

			hookified.onHook("event", handler);
			hookified.hookSync("event", data1, data2);

			expect(capturedArgs).toEqual([data1, data2]);
		});

		test("should handle no handlers gracefully", () => {
			const hookified = new Hookified();

			// Should not throw
			expect(() => hookified.hookSync("nonexistent")).not.toThrow();
		});

		test("should detect async function correctly", () => {
			const hookified = new Hookified();
			const results: string[] = [];

			// Regular function - should execute
			hookified.onHook("event", () => {
				results.push("regular");
			});

			// Arrow function - should execute
			hookified.onHook("event", () => {
				results.push("arrow");
			});

			// Async function - should skip
			hookified.onHook("event", async () => {
				results.push("async-regular");
			});

			// Async arrow function - should skip
			hookified.onHook("event", async () => {
				results.push("async-arrow");
			});

			hookified.hookSync("event");

			expect(results).toEqual(["regular", "arrow"]);
		});

		test("should handle function that returns Promise synchronously", () => {
			const hookified = new Hookified();
			const results: string[] = [];

			// This is a sync function that returns a Promise
			// hookSync will call it, but won't await the Promise
			const promiseReturningHandler = () => {
				results.push("sync-part");
				return Promise.resolve().then(() => results.push("async-part"));
			};

			hookified.onHook("event", promiseReturningHandler);
			hookified.hookSync("event");

			// Only the sync part executes immediately
			expect(results).toEqual(["sync-part"]);
		});
	});
});
