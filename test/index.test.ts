// biome-ignore-all lint/suspicious/noExplicitAny: this is a test file
// biome-ignore-all lint/suspicious/noImplicitAnyLet: this is a test file
import pino from "pino";
import { describe, expect, test, vi } from "vitest";
import { Hook, Hookified, type IHook } from "../src/index.js";

describe("Hookified", () => {
	test("initialization", () => {
		const hookified = new Hookified();
		expect(hookified.hooks).toEqual(new Map());
	});

	test("onHook", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook({ event: "event", handler });
		hookified.onHook({ event: "event2", handler: handler2 });
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler },
		]);
		expect(hookified.getHooks("event2")).toMatchObject([
			{ event: "event2", handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("onHook with event and handler arguments", async () => {
		const hookified = new Hookified();

		const handler = () => {};
		const handler2 = () => {};
		const result = hookified.onHook("event", handler);
		hookified.onHook("event2", handler2);
		expect(result).toBeDefined();
		expect(result?.event).toBe("event");
		expect(result?.handler).toBe(handler);
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler },
		]);
		expect(hookified.getHooks("event2")).toMatchObject([
			{ event: "event2", handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("onHook with event and handler executes hook correctly", async () => {
		const hookified = new Hookified();
		const values: string[] = [];
		hookified.onHook("test-event", async (val: string) => {
			values.push(val);
		});
		await hookified.hook("test-event", "hello");
		expect(values).toEqual(["hello"]);
	});

	test("onHook with (event, non-function) throws TypeError", () => {
		const hookified = new Hookified();
		expect(() => {
			// @ts-expect-error testing runtime validation
			hookified.onHook("event", { position: "Top" });
		}).toThrow(TypeError);
		expect(() => {
			// @ts-expect-error testing runtime validation
			hookified.onHook("event", "not-a-function");
		}).toThrow("the second argument must be a function");
	});

	test("onHooks with array of IHook", async () => {
		const hookified = new Hookified();
		const handler = () => {};
		const handler2 = () => {};
		hookified.onHooks([
			{ event: "event", handler },
			{ event: "event2", handler: handler2 },
		]);
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler },
		]);
		expect(hookified.getHooks("event2")).toMatchObject([
			{ event: "event2", handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("addHook", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.addHook("event", handler);
		hookified.addHook("event2", handler2);
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler },
		]);
		expect(hookified.getHooks("event2")).toMatchObject([
			{ event: "event2", handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("onHooks", async () => {
		const hookified = new Hookified();
		const eventName = "event-on-hooks";

		const handler1 = () => {};

		const handler2 = () => {};
		const hooks: IHook[] = [];
		hooks.push(
			{ event: eventName, handler: handler1 },
			{ event: eventName, handler: handler2 },
		);
		hookified.onHooks(hooks);
		expect(hookified.getHooks(eventName)).toMatchObject([
			{ event: eventName, handler: handler1 },
			{ event: eventName, handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(1);
		// Add another hook
		const eventName2 = "event-on-hooks2";

		const handler3 = () => {};
		hookified.onHook({ event: eventName2, handler: handler3 });
		expect(hookified.getHooks(eventName2)).toMatchObject([
			{ event: eventName2, handler: handler3 },
		]);
		expect(hookified.hooks.size).toBe(2);
	});

	test("onHookOnce will remove hook after execution", async () => {
		const hookified = new Hookified();

		const handler = () => {};
		hookified.onceHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(1);
		await hookified.hook("event");
		expect(hookified.getHooks("event")).toBeUndefined();
	});

	test("removeHook removes a once hook when called with the original handler", async () => {
		const hookified = new Hookified();

		let called = 0;
		const handler = () => {
			called++;
		};
		hookified.onceHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(1);

		// Remove using the original handler reference before it fires
		const removed = hookified.removeHook({ event: "event", handler });
		expect(removed).toBeDefined();
		expect(hookified.getHooks("event")).toBeUndefined();

		await hookified.hook("event");
		expect(called).toBe(0);
	});

	test("removeHook removes a prependOnceHook when called with the original handler", async () => {
		const hookified = new Hookified();

		let called = 0;
		const handler = () => {
			called++;
		};
		hookified.prependOnceHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(1);

		const removed = hookified.removeHook({ event: "event", handler });
		expect(removed).toBeDefined();
		expect(hookified.getHooks("event")).toBeUndefined();

		await hookified.hook("event");
		expect(called).toBe(0);
	});

	test("removeHook leaves other hooks intact when removing a once hook by original handler", async () => {
		const hookified = new Hookified();

		const other = () => {};
		const handler = () => {};
		hookified.onHook({ event: "event", handler: other });
		hookified.onceHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(2);

		hookified.removeHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(1);
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler: other },
		]);
	});

	test("removeHook prefers the exact handler over an identical earlier once wrapper", async () => {
		const hookified = new Hookified();

		let onceFired = 0;
		const handler = () => {
			onceFired++;
		};

		// Same handler registered as a once hook first, then as a normal hook
		hookified.onceHook({ event: "event", handler });
		hookified.onHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(2);

		// removeHook must remove the exact onHook entry, leaving the once wrapper intact
		hookified.removeHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(1);

		// The surviving hook is the once wrapper: firing runs it once then removes it
		await hookified.hook("event");
		expect(onceFired).toBe(1);
		expect(hookified.getHooks("event")).toBeUndefined();
	});

	test("removeHook with undefined handler does not remove a normal hook", () => {
		const hookified = new Hookified();

		const handler = () => {};
		hookified.onHook({ event: "event", handler });
		expect(hookified.getHooks("event")?.length).toEqual(1);

		// A normal hook has no _originalHandler; an undefined handler must not match it
		const removed = hookified.removeHook({
			event: "event",
			handler: undefined as unknown as () => void,
		});
		expect(removed).toBeUndefined();
		expect(hookified.getHooks("event")?.length).toEqual(1);
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler },
		]);
	});

	test("onHook with Clear", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook({ event: "event", handler });
		hookified.onHook({ event: "event2", handler: handler2 });
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler },
		]);
		expect(hookified.getHooks("event2")).toMatchObject([
			{ event: "event2", handler: handler2 },
		]);
		hookified.clearHooks();
		expect(hookified.hooks.size).toBe(0);
	});

	test("onHook multiple handlers", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook({ event: "event", handler });
		hookified.onHook({ event: "event", handler: handler2 });
		expect(hookified.hooks.get("event")).toMatchObject([
			{ event: "event", handler },
			{ event: "event", handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(1);
	});

	test("removeHook", async () => {
		const hookified = new Hookified();

		const handler = () => {};

		const handler2 = () => {};
		hookified.onHook({ event: "event", handler });
		hookified.onHook({ event: "event", handler: handler2 });
		const removed = hookified.removeHook({ event: "event", handler });
		expect(removed).toMatchObject({ event: "event", handler });
		expect(hookified.getHooks("event")).toMatchObject([
			{ event: "event", handler: handler2 },
		]);
		expect(hookified.hooks.size).toBe(1);
	});

	test("removeHook returns undefined when handler not found", () => {
		const hookified = new Hookified();
		const handler = () => {};
		const result = hookified.removeHook({ event: "event", handler });
		expect(result).toBeUndefined();
	});

	test("removeHooks", async () => {
		const hookified = new Hookified();
		const eventName = "event-remove-hooks";

		const handler1 = () => {};

		const handler2 = () => {};
		hookified.onHook({ event: eventName, handler: handler1 });
		hookified.onHook({ event: eventName, handler: handler2 });
		const hooks = [{ event: eventName, handler: handler2 }];
		const removed = hookified.removeHooks(hooks);
		expect(removed).toMatchObject([{ event: eventName, handler: handler2 }]);
		expect(hookified.getHooks(eventName)).toMatchObject([
			{ event: eventName, handler: handler1 },
		]);
		expect(hookified.hooks.size).toBe(1);
	});

	test("removeHooks returns empty array when no hooks found", () => {
		const hookified = new Hookified();
		const handler = () => {};
		const removed = hookified.removeHooks([{ event: "nope", handler }]);
		expect(removed).toEqual([]);
	});

	test("execute hook and manipulate data", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };
		let handlerData: any;

		const handler = (data: any) => {
			data.key = "modified";

			handlerData = data;
		};

		hookified.onHook({ event: "event", handler });
		await hookified.hook("event", data);
		expect(handlerData.key).toBe("modified");
	});

	test("execute hook with IHook and manipulate data", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };
		let handlerData: any;

		const handler = (data: any) => {
			data.key = "modified";

			handlerData = data;
		};

		hookified.onHook({ event: "event", handler });
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

		hookified.onHook({ event: "event", handler });
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

		hookified.onHook({ event: "event", handler });
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

		hookified.onHook({ event: "event", handler });
		await hookified.hook("event", data);
		expect(errorMessage).toBe("event: error");
	});

	test("hook with sync function", async () => {
		const hookified = new Hookified();
		const data = { key: "value" };

		const handler = (data: any) => {
			data.key = "modified";
		};

		hookified.onHook({ event: "event", handler });
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

		hookified.onHook({ event: "event", handler });
		hookified.prependHook({ event: "event", handler: handler2 });
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

		hookified.prependHook({ event: "event", handler });
		await hookified.hook("event");
		expect(handlerData[0]).toBe("modified1");
	});

	test("prepends a hook and removes it", async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push("modified1");
		};

		hookified.prependOnceHook({ event: "event20", handler });
		await hookified.hook("event20");
		expect(hookified.hooks.get("event20")).toBeUndefined();
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

			hookified.onHook({ event: "event", handler });

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

			hookified.onHook({ event: "event", handler });
			await hookified.hook("event", data);

			expect(errorMessage).toBe("event: error: hook error occurred");
		});

		test("should allow dynamically changing throwOnHookError setting", async () => {
			const hookified = new Hookified({ throwOnHookError: false });
			const data = { key: "value" };

			const handler = () => {
				throw new Error("error: test error");
			};

			hookified.onHook({ event: "event", handler });

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

			const hookified = new Hookified({
				eventLogger: logger,
				throwOnHookError: true,
				throwOnEmptyListeners: false,
			});
			const data = { key: "value" };
			let errorMessage;

			const handler = () => {
				throw new Error("error: this handler throws stuff");
			};

			hookified.onHook({ event: "event", handler });

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

		test("should throw error when emitting 'error' event with listeners", () => {
			const hookified = new Hookified({ throwOnEmitError: true });
			let errorCaught: Error | undefined;

			hookified.on("error", (error: Error) => {
				errorCaught = error;
			});

			expect(() => {
				hookified.emit("error", new Error("test error"));
			}).toThrow("test error");

			expect(errorCaught?.message).toBe("test error");
		});

		test("should throw hook errors even with error listeners", async () => {
			const hookified = new Hookified({ throwOnEmitError: true });
			let errorCaught: Error | undefined;

			hookified.on("error", (error: Error) => {
				errorCaught = error;
			});

			hookified.onHook({
				event: "event",
				handler: () => {
					throw new Error("handler error");
				},
			});

			await expect(hookified.hook("event")).rejects.toThrow(
				"event: handler error",
			);
			expect(errorCaught?.message).toBe("event: handler error");
		});

		test("should not throw error when throwOnEmitError is false", () => {
			const hookified = new Hookified({
				throwOnEmitError: false,
				throwOnEmptyListeners: false,
			});

			expect(() => {
				hookified.emit("error", new Error("test error"));
			}).not.toThrow();
		});
	});

	describe("eventLogger", () => {
		test("should set eventLogger", async () => {
			const hookified = new Hookified();
			const logger = pino();
			hookified.eventLogger = logger;
			expect(hookified.eventLogger).toBe(logger);
		});

		test("should set eventLogger to undefined", async () => {
			const hookified = new Hookified();
			hookified.eventLogger = undefined;
			expect(hookified.eventLogger).toBe(undefined);
		});

		test("should log error", async () => {
			const logger = pino();
			let loggerErrorMessage;
			logger.error = (object: unknown, ...arguments_: unknown[]) => {
				const message = typeof object === "string" ? object : arguments_[0];
				expect(message).toBe("event: error: this handler throws stuff");
				loggerErrorMessage = message as string;
			};

			const hookified = new Hookified({
				eventLogger: logger,
				throwOnHookError: true,
				throwOnEmptyListeners: false,
			});
			const data = { key: "value" };
			let errorMessage;

			const handler = () => {
				throw new Error("error: this handler throws stuff");
			};

			hookified.onHook({ event: "event", handler });

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

			hookified.onHook({ event: "before:test", handler });
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
			hookified.onHook({ event: "before:process", handler });
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

			hookified.onHook({ event: "before:action", handler: handler1 });
			hookified.onHook({ event: "before:action", handler: handler2 });
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

			hookified.onHook({ event: "before:task", handler });
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

			hookified.onHook({ event: "after:test", handler });
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
			hookified.onHook({ event: "after:process", handler });
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

			hookified.onHook({ event: "after:action", handler: handler1 });
			hookified.onHook({ event: "after:action", handler: handler2 });
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

			hookified.onHook({ event: "after:task", handler });
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

			hookified.onHook({ event: "before:operation", handler: beforeHandler });
			hookified.onHook({ event: "operation", handler: mainHandler });
			hookified.onHook({ event: "after:operation", handler: afterHandler });

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

			hookified.onHook({ event: "before:transform", handler: beforeHandler });
			hookified.onHook({ event: "after:transform", handler: afterHandler });

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

			expect(() =>
				hookified.onHook({ event: "customEvent", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "randomName", handler }),
			).not.toThrow();
			expect(() => hookified.onHook({ event: "test", handler })).not.toThrow();
		});

		test("should allow hooks starting with 'before' when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.onHook({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "before:test", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "beforeSomething", handler }),
			).not.toThrow();
		});

		test("should allow hooks starting with 'after' when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.onHook({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "after:test", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "afterSomething", handler }),
			).not.toThrow();
		});

		test("should throw error for invalid hook names when enforceBeforeAfter is true", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() => hookified.onHook({ event: "customEvent", handler })).toThrow(
				'Hook event "customEvent" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
			expect(() => hookified.onHook({ event: "test", handler })).toThrow(
				'Hook event "test" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
			expect(() => hookified.onHook({ event: "randomName", handler })).toThrow(
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

			expect(() =>
				hookified.prependHook({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.prependHook({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.prependHook({ event: "invalidName", handler }),
			).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in onceHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.onceHook({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onceHook({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onceHook({ event: "invalidName", handler }),
			).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in prependOnceHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.prependOnceHook({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.prependOnceHook({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.prependOnceHook({ event: "invalidName", handler }),
			).toThrow(
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

			expect(() =>
				hookified.removeHook({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.removeHook({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.removeHook({ event: "invalidName", handler }),
			).toThrow(
				'Hook event "invalidName" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);
		});

		test("should validate hook names in onHook with IHook", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			const handler = () => {};

			expect(() =>
				hookified.onHook({ event: "beforeTest", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "afterTest", handler }),
			).not.toThrow();
			expect(() => hookified.onHook({ event: "invalidName", handler })).toThrow(
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

			hookified.onHook({ event: "before:test", handler: beforeHandler });
			hookified.onHook({ event: "after:test", handler: afterHandler });

			await hookified.beforeHook("test");
			await hookified.afterHook("test");

			expect(handlerData).toEqual(["before", "after"]);
		});

		test("should allow dynamically changing enforceBeforeAfter setting", () => {
			const hookified = new Hookified({ enforceBeforeAfter: false });
			const handler = () => {};

			// Should work when false
			expect(() =>
				hookified.onHook({ event: "customEvent", handler }),
			).not.toThrow();

			// Change to true
			hookified.enforceBeforeAfter = true;

			// Should now throw
			expect(() =>
				hookified.onHook({ event: "anotherCustomEvent", handler }),
			).toThrow(
				'Hook event "anotherCustomEvent" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);

			// Should work with valid names
			expect(() =>
				hookified.onHook({ event: "beforeSomething", handler }),
			).not.toThrow();
			expect(() =>
				hookified.onHook({ event: "afterSomething", handler }),
			).not.toThrow();
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

			hookified.onHook({ event: "oldHook", handler });

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

			hookified.onHook({ event: "oldHook", handler });

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
			const hookified = new Hookified({ deprecatedHooks, eventLogger: logger });
			const handler = () => {};

			hookified.onHook({ event: "oldHook", handler });

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

			hookified.prependHook({ event: "oldHook", handler });

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

			hookified.onceHook({ event: "oldHook", handler });

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

			hookified.prependOnceHook({ event: "oldHook", handler });

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

		test("should not check for deprecated hooks in getHooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};
			hookified.onHook({ event: "oldHook", handler });

			hookified.allowDeprecated = false;

			// getHooks should still return hooks regardless of deprecation
			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);
		});

		test("should not check for deprecated hooks in removeHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};
			hookified.onHook({ event: "oldHook", handler });

			hookified.allowDeprecated = false;

			// removeHook should still work regardless of deprecation
			const removed = hookified.removeHook({ event: "oldHook", handler });
			expect(removed).toMatchObject({ event: "oldHook", handler });
		});

		test("should check for deprecated hooks in onHook with IHook", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook({ event: "oldHook", handler });

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

		test("should not check for deprecated hooks in removeHooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};
			hookified.onHook({ event: "oldHook", handler });

			hookified.allowDeprecated = false;

			// removeHooks should still work regardless of deprecation
			const removed = hookified.removeHooks([{ event: "oldHook", handler }]);
			expect(removed).toMatchObject([{ event: "oldHook", handler }]);
		});

		test("should not emit deprecation warning for non-deprecated hooks", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({ deprecatedHooks });
			const handler = () => {};

			let warnEvent;
			hookified.on("warn", (event) => {
				warnEvent = event;
			});

			hookified.onHook({ event: "validHook", handler });

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
			hookified.onHook({ event: "beforeOldHook", handler });
			expect(warnEvent).toEqual({
				hook: "beforeOldHook",
				message:
					'Hook "beforeOldHook" is deprecated: Use beforeNewHook instead',
			});

			// Should throw - invalid name for enforceBeforeAfter
			expect(() => hookified.onHook({ event: "invalidHook", handler })).toThrow(
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

			hookified.onHook({ event: "someHook", handler });
			expect(warnEvent).toBeUndefined();

			// Add deprecation
			hookified.deprecatedHooks.set("someHook", "This hook is now deprecated");

			hookified.onHook({ event: "someHook", handler });
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
			const hookified = new Hookified({ deprecatedHooks, eventLogger: logger });
			const handler = () => {};

			// Should not throw even without logger.warn
			expect(() =>
				hookified.onHook({ event: "oldHook", handler }),
			).not.toThrow();
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

			hookified.onHook({ event: "oldHook", handler });

			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);
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

			hookified.onHook({ event: "oldHook", handler });

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

			hookified.prependHook({ event: "oldHook", handler });

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in onceHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.onceHook({ event: "oldHook", handler });

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in prependOnceHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.prependOnceHook({ event: "oldHook", handler });

			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should prevent deprecated hook registration in onHook with IHook when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const handler = () => {};

			hookified.onHook({ event: "oldHook", handler });

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

			expect(hookified.getHooks("validHook")).toMatchObject([
				{ event: "validHook", handler },
			]);
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
			hookified.onHook({ event: "oldHook", handler });
			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);

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
			hookified.onHook({ event: "oldHook", handler });

			// Then set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Hook should not execute
			await hookified.callHook("oldHook");
			expect(handler).not.toHaveBeenCalled();
		});

		test("should return hooks from getHooks for deprecated hooks even when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};
			hookified.onHook({ event: "oldHook", handler });

			hookified.allowDeprecated = false;

			// getHooks should still return hooks regardless of deprecation
			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);
		});

		test("should allow removeHook for deprecated hooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};

			// Register hook first
			hookified.onHook({ event: "oldHook", handler });
			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);

			// Set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Should still be able to remove the hook
			const removed = hookified.removeHook({ event: "oldHook", handler });
			expect(removed).toMatchObject({ event: "oldHook", handler });
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("should allow removeHooks for deprecated hooks when allowDeprecated is false", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = () => {};

			// Register hook first
			hookified.onHook({ event: "oldHook", handler });

			// Set allowDeprecated to false
			hookified.allowDeprecated = false;

			// Should still be able to remove the hook
			const removed = hookified.removeHooks([{ event: "oldHook", handler }]);
			expect(removed).toMatchObject([{ event: "oldHook", handler }]);
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
			hookified.onHook({ event: "oldHook", handler });
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
				eventLogger: logger,
			});
			const handler = () => {};

			hookified.onHook({ event: "oldHook", handler });

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

			hookified.onHook({ event: "validHook", handler });

			expect(hookified.getHooks("validHook")).toMatchObject([
				{ event: "validHook", handler },
			]);
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
			hookified.onHook({ event: "beforeOldHook", handler });
			expect(hookified.getHooks("beforeOldHook")).toBeUndefined();

			// Should throw (doesn't start with before/after)
			expect(() => hookified.onHook({ event: "invalidHook", handler })).toThrow(
				'Hook event "invalidHook" must start with "before" or "after" when enforceBeforeAfter is enabled',
			);

			// Should work (valid name + not deprecated)
			hookified.onHook({ event: "beforeValidHook", handler });
			expect(hookified.getHooks("beforeValidHook")).toMatchObject([
				{ event: "beforeValidHook", handler },
			]);
		});

		test("should allow dynamically changing allowDeprecated setting", async () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: true,
			});
			const handler = vi.fn();

			// Should work when true
			hookified.onHook({ event: "oldHook", handler });
			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);

			await hookified.hook("oldHook");
			expect(handler).toHaveBeenCalledTimes(1);

			// Change to false
			hookified.allowDeprecated = false;

			// Should not execute
			await hookified.hook("oldHook");
			expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again

			// getHooks should still return hooks regardless of deprecation
			expect(hookified.getHooks("oldHook")).toMatchObject([
				{ event: "oldHook", handler },
			]);
		});
	});

	describe("hookSync", () => {
		test("should execute synchronous handlers", () => {
			const hookified = new Hookified();
			const data = { key: "value" };

			const handler = (data: any) => {
				data.key = "modified";
			};

			hookified.onHook({ event: "event", handler });
			hookified.hookSync("event", data);
			expect(data.key).toBe("modified");
		});

		test("should skip async handlers silently", () => {
			const hookified = new Hookified();
			const executionOrder: string[] = [];

			const syncHandler = () => {
				executionOrder.push("sync");
			};

			const asyncHandler = async (): Promise<void> => {
				executionOrder.push("async");
			};

			hookified.onHook({ event: "event", handler: syncHandler });
			hookified.onHook({ event: "event", handler: asyncHandler });
			hookified.onHook({ event: "event", handler: syncHandler });

			hookified.hookSync("event");

			// Only sync handlers should execute
			expect(executionOrder).toEqual(["sync", "sync"]);
		});

		test("should execute handlers in order", () => {
			const hookified = new Hookified();
			const executionOrder: number[] = [];

			hookified.onHook({
				event: "event",
				handler: () => {
					executionOrder.push(1);
				},
			});
			hookified.onHook({
				event: "event",
				handler: () => {
					executionOrder.push(2);
				},
			});
			hookified.onHook({
				event: "event",
				handler: () => {
					executionOrder.push(3);
				},
			});

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

			hookified.onHook({ event: "event", handler });
			hookified.hookSync("event");

			expect(errorMessage).toBe("event: sync error");
		});

		test("should throw error when throwOnHookError is true", () => {
			const hookified = new Hookified({
				throwOnHookError: true,
				throwOnEmptyListeners: false,
			});

			const handler = () => {
				throw new Error("sync error");
			};

			hookified.onHook({ event: "event", handler });

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

			hookified.onHook({ event: "oldHook", handler });
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

			hookified.onHook({ event: "event", handler });
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
			hookified.onHook({
				event: "event",
				handler: () => {
					results.push("regular");
				},
			});

			// Arrow function - should execute
			hookified.onHook({
				event: "event",
				handler: () => {
					results.push("arrow");
				},
			});

			// Async function - should skip
			hookified.onHook({
				event: "event",
				handler: async () => {
					results.push("async-regular");
				},
			});

			// Async arrow function - should skip
			hookified.onHook({
				event: "event",
				handler: async () => {
					results.push("async-arrow");
				},
			});

			hookified.hookSync("event");

			expect(results).toEqual(["regular", "arrow"]);
		});

		test("should handle function that returns Promise synchronously", () => {
			const hookified = new Hookified();
			const results: string[] = [];

			// This is a sync function that returns a Promise
			// hookSync will call it, but won't await the Promise
			const promiseReturningHandler = (): Promise<void> => {
				results.push("sync-part");
				return Promise.resolve().then(() => {
					results.push("async-part");
				});
			};

			hookified.onHook({ event: "event", handler: promiseReturningHandler });
			hookified.hookSync("event");

			// Only the sync part executes immediately
			expect(results).toEqual(["sync-part"]);
		});
	});

	describe("useHookClone", () => {
		test("should default to true", () => {
			const hookified = new Hookified();
			expect(hookified.useHookClone).toBe(true);
		});

		test("should clone hook objects by default in onHook", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook);
			const stored = hookified.getHooks("event");
			expect(stored).toMatchObject([{ event: "event", handler }]);
			expect(stored?.[0]).not.toBe(hook);
		});

		test("should clone hook objects by default in prependHook", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.prependHook(hook);
			const stored = hookified.getHooks("event");
			expect(stored).toMatchObject([{ event: "event", handler }]);
			expect(stored?.[0]).not.toBe(hook);
		});

		test("should store original reference when useHookClone is false in onHook", () => {
			const hookified = new Hookified({ useHookClone: false });
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook);
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).toBe(hook);
		});

		test("should store original reference when useHookClone is false in prependHook", () => {
			const hookified = new Hookified({ useHookClone: false });
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.prependHook(hook);
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).toBe(hook);
		});

		test("should accept useHookClone from constructor options", () => {
			const hookified = new Hookified({ useHookClone: false });
			expect(hookified.useHookClone).toBe(false);
		});

		test("should allow setting useHookClone at runtime", () => {
			const hookified = new Hookified();
			expect(hookified.useHookClone).toBe(true);
			hookified.useHookClone = false;
			expect(hookified.useHookClone).toBe(false);

			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook);
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).toBe(hook);
		});

		test("should store original reference when options.useHookClone is false overriding instance default true", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook, { useHookClone: false });
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).toBe(hook);
		});

		test("should clone hook when options.useHookClone is true overriding instance setting false", () => {
			const hookified = new Hookified({ useHookClone: false });
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook, { useHookClone: true });
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).not.toBe(hook);
			expect(stored?.[0]).toMatchObject({ event: "event", handler });
		});

		test("should fall back to instance useHookClone when options.useHookClone is undefined", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook, {});
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).not.toBe(hook);
		});

		test("should preserve backward compatibility when no options parameter is provided", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHook(hook);
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).not.toBe(hook);
		});

		test("should pass options through when onHooks is called with an array", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			const hook1 = { event: "event1", handler: handler1 };
			const hook2 = { event: "event2", handler: handler2 };
			hookified.onHooks([hook1, hook2], { useHookClone: false });
			const stored1 = hookified.getHooks("event1");
			const stored2 = hookified.getHooks("event2");
			expect(stored1?.[0]).toBe(hook1);
			expect(stored2?.[0]).toBe(hook2);
		});

		test("should clone array hooks when options.useHookClone is true overriding instance false", () => {
			const hookified = new Hookified({ useHookClone: false });
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.onHooks([hook], { useHookClone: true });
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).not.toBe(hook);
			expect(stored?.[0]).toMatchObject({ event: "event", handler });
		});
	});

	describe("position", () => {
		test("should append to end by default (no position)", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook({ event: "event", handler: handler2 });
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler1);
			expect(stored?.[1].handler).toBe(handler2);
		});

		test("should append to end with position: Bottom", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook(
				{ event: "event", handler: handler2 },
				{ position: "Bottom" },
			);
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler1);
			expect(stored?.[1].handler).toBe(handler2);
		});

		test("should insert at beginning with position: Top", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook(
				{ event: "event", handler: handler2 },
				{ position: "Top" },
			);
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler2);
			expect(stored?.[1].handler).toBe(handler1);
		});

		test("should insert at index 0 with position: 0", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook({ event: "event", handler: handler2 }, { position: 0 });
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler2);
			expect(stored?.[1].handler).toBe(handler1);
		});

		test("should insert at specific index with numeric position", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			const handler3 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook({ event: "event", handler: handler2 });
			hookified.onHook({ event: "event", handler: handler3 }, { position: 1 });
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler1);
			expect(stored?.[1].handler).toBe(handler3);
			expect(stored?.[2].handler).toBe(handler2);
		});

		test("should clamp to end when position exceeds array length", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook(
				{ event: "event", handler: handler2 },
				{ position: 100 },
			);
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler1);
			expect(stored?.[1].handler).toBe(handler2);
		});

		test("should clamp to 0 when position is negative", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event", handler: handler1 });
			hookified.onHook({ event: "event", handler: handler2 }, { position: -5 });
			const stored = hookified.getHooks("event");
			expect(stored?.[0].handler).toBe(handler2);
			expect(stored?.[1].handler).toBe(handler1);
		});
	});

	describe("hook id", () => {
		test("should auto-generate id when not provided", () => {
			const hookified = new Hookified();
			const result = hookified.onHook({ event: "event1", handler: () => {} });
			expect(result).toBeDefined();
			expect(typeof result?.id).toBe("string");
			expect(result?.id?.length).toBeGreaterThan(0);
		});

		test("should preserve user-provided id", () => {
			const hookified = new Hookified();
			const result = hookified.onHook({
				id: "my-id",
				event: "event1",
				handler: () => {},
			});
			expect(result?.id).toBe("my-id");
			const stored = hookified.getHooks("event1");
			expect(stored?.[0].id).toBe("my-id");
		});

		test("should replace hook when duplicate id is registered on same event", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ id: "dup-id", event: "event1", handler: handler1 });
			hookified.onHook({ id: "dup-id", event: "event1", handler: handler2 });
			const stored = hookified.getHooks("event1");
			expect(stored?.length).toBe(1);
			expect(stored?.[0].handler).toBe(handler2);
			expect(stored?.[0].id).toBe("dup-id");
		});

		test("should preserve position when replacing by duplicate id", () => {
			const hookified = new Hookified();
			const handlerA = () => {};
			const handlerB = () => {};
			const handlerC = () => {};
			const handlerB2 = () => {};
			hookified.onHook({ id: "a", event: "event1", handler: handlerA });
			hookified.onHook({ id: "b", event: "event1", handler: handlerB });
			hookified.onHook({ id: "c", event: "event1", handler: handlerC });
			// Replace B — should stay at index 1
			hookified.onHook({ id: "b", event: "event1", handler: handlerB2 });
			const stored = hookified.getHooks("event1");
			expect(stored?.length).toBe(3);
			expect(stored?.[0].handler).toBe(handlerA);
			expect(stored?.[1].handler).toBe(handlerB2);
			expect(stored?.[2].handler).toBe(handlerC);
		});

		test("should allow same id on different events", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ id: "same-id", event: "event1", handler: handler1 });
			hookified.onHook({ id: "same-id", event: "event2", handler: handler2 });
			expect(hookified.getHooks("event1")?.length).toBe(1);
			expect(hookified.getHooks("event2")?.length).toBe(1);
		});

		test("should generate unique ids for different hooks", () => {
			const hookified = new Hookified();
			const result1 = hookified.onHook({ event: "event1", handler: () => {} });
			const result2 = hookified.onHook({ event: "event1", handler: () => {} });
			expect(result1?.id).not.toBe(result2?.id);
		});

		test("should preserve id when useHookClone is true", () => {
			const hookified = new Hookified();
			const result = hookified.onHook(
				{ id: "clone-id", event: "event1", handler: () => {} },
				{ useHookClone: true },
			);
			expect(result?.id).toBe("clone-id");
		});

		test("should auto-generate id in prependHook", () => {
			const hookified = new Hookified();
			hookified.prependHook({ event: "event1", handler: () => {} });
			const stored = hookified.getHooks("event1");
			expect(typeof stored?.[0].id).toBe("string");
			expect(stored?.[0].id?.length).toBeGreaterThan(0);
		});

		test("should preserve id in onceHook", () => {
			const hookified = new Hookified();
			hookified.onceHook({ id: "once-id", event: "event1", handler: () => {} });
			const stored = hookified.getHooks("event1");
			expect(stored?.[0].id).toBe("once-id");
		});

		test("should replace hook in prependHook when duplicate id", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ id: "dup", event: "event1", handler: handler1 });
			hookified.prependHook({ id: "dup", event: "event1", handler: handler2 });
			const stored = hookified.getHooks("event1");
			expect(stored?.length).toBe(1);
			expect(stored?.[0].handler).toBe(handler2);
		});

		test("should preserve id in prependOnceHook", () => {
			const hookified = new Hookified();
			hookified.prependOnceHook({
				id: "prepend-once-id",
				event: "event1",
				handler: () => {},
			});
			const stored = hookified.getHooks("event1");
			expect(stored?.[0].id).toBe("prepend-once-id");
		});

		test("prependHook should return the stored hook", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const result = hookified.prependHook({ event: "event", handler });
			expect(result).toBeDefined();
			expect(result?.event).toBe("event");
			expect(result?.handler).toBe(handler);
			expect(typeof result?.id).toBe("string");
		});

		test("prependHook should return undefined when deprecated hook is blocked", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const result = hookified.prependHook({
				event: "oldHook",
				handler: () => {},
			});
			expect(result).toBeUndefined();
		});

		test("prependHook should accept useHookClone option to override instance setting", () => {
			const hookified = new Hookified(); // useHookClone defaults to true
			const handler = () => {};
			const hook = { event: "event", handler };
			hookified.prependHook(hook, { useHookClone: false });
			const stored = hookified.getHooks("event");
			expect(stored?.[0]).toBe(hook); // same reference, not cloned
		});

		test("prependOnceHook should return the stored hook", () => {
			const hookified = new Hookified();
			const handler = () => {};
			const result = hookified.prependOnceHook({ event: "event", handler });
			expect(result).toBeDefined();
			expect(result?.event).toBe("event");
			expect(typeof result?.id).toBe("string");
		});

		test("prependOnceHook should return undefined when deprecated hook is blocked", () => {
			const deprecatedHooks = new Map([["oldHook", "Use newHook instead"]]);
			const hookified = new Hookified({
				deprecatedHooks,
				allowDeprecated: false,
			});
			const result = hookified.prependOnceHook({
				event: "oldHook",
				handler: () => {},
			});
			expect(result).toBeUndefined();
		});

		test("Hook class should accept id parameter", () => {
			const handler = () => {};
			const hook = new Hook("event1", handler, "class-id");
			expect(hook.id).toBe("class-id");
			expect(hook.event).toBe("event1");
			expect(hook.handler).toBe(handler);
		});

		test("Hook class should have undefined id when not provided", () => {
			const hook = new Hook("event1", () => {});
			expect(hook.id).toBeUndefined();
		});
	});

	describe("getHook", () => {
		test("should find a hook by id across all events", () => {
			const hookified = new Hookified();
			const handler = () => {};
			hookified.onHook({ id: "find-me", event: "event1", handler });
			const found = hookified.getHook("find-me");
			expect(found).toBeDefined();
			expect(found?.id).toBe("find-me");
			expect(found?.handler).toBe(handler);
		});

		test("should find a hook across different events", () => {
			const hookified = new Hookified();
			const handler = () => {};
			hookified.onHook({ id: "other", event: "event1", handler: () => {} });
			hookified.onHook({ id: "target", event: "event2", handler });
			const found = hookified.getHook("target");
			expect(found).toBeDefined();
			expect(found?.handler).toBe(handler);
		});

		test("should return undefined for non-existent id", () => {
			const hookified = new Hookified();
			hookified.onHook({ event: "event1", handler: () => {} });
			expect(hookified.getHook("not-here")).toBeUndefined();
		});

		test("should return undefined when no hooks exist", () => {
			const hookified = new Hookified();
			expect(hookified.getHook("any-id")).toBeUndefined();
		});
	});

	describe("removeHookById", () => {
		test("should remove a hook by id", () => {
			const hookified = new Hookified();
			const handler = () => {};
			hookified.onHook({ id: "remove-me", event: "event1", handler });
			const removed = hookified.removeHookById("remove-me");
			expect(removed).toBeDefined();
			expect(!Array.isArray(removed) && removed?.id).toBe("remove-me");
			expect(!Array.isArray(removed) && removed?.handler).toBe(handler);
			expect(hookified.getHooks("event1")).toBeUndefined();
		});

		test("should find and remove hook across events", () => {
			const hookified = new Hookified();
			hookified.onHook({ id: "keep", event: "event1", handler: () => {} });
			hookified.onHook({ id: "remove", event: "event2", handler: () => {} });
			const removed = hookified.removeHookById("remove");
			expect(!Array.isArray(removed) && removed?.id).toBe("remove");
			expect(hookified.getHooks("event2")).toBeUndefined();
			expect(hookified.getHooks("event1")?.length).toBe(1);
		});

		test("should return undefined when id not found", () => {
			const hookified = new Hookified();
			hookified.onHook({ event: "event1", handler: () => {} });
			expect(hookified.removeHookById("not-here")).toBeUndefined();
		});

		test("should not remove other hooks on same event", () => {
			const hookified = new Hookified();
			hookified.onHook({ id: "keep", event: "event1", handler: () => {} });
			hookified.onHook({ id: "remove", event: "event1", handler: () => {} });
			hookified.removeHookById("remove");
			const stored = hookified.getHooks("event1");
			expect(stored?.length).toBe(1);
			expect(stored?.[0].id).toBe("keep");
		});

		test("should clean up event key when last hook removed", () => {
			const hookified = new Hookified();
			hookified.onHook({ id: "only", event: "event1", handler: () => {} });
			hookified.removeHookById("only");
			expect(hookified.hooks.has("event1")).toBe(false);
		});

		test("should remove multiple hooks by array of ids", () => {
			const hookified = new Hookified();
			hookified.onHook({ id: "a", event: "event1", handler: () => {} });
			hookified.onHook({ id: "b", event: "event1", handler: () => {} });
			hookified.onHook({ id: "c", event: "event2", handler: () => {} });
			const removed = hookified.removeHookById(["a", "c"]);
			expect(Array.isArray(removed)).toBe(true);
			const removedArray = removed as IHook[];
			expect(removedArray.length).toBe(2);
			expect(removedArray[0].id).toBe("a");
			expect(removedArray[1].id).toBe("c");
			expect(hookified.getHooks("event1")?.length).toBe(1);
			expect(hookified.getHooks("event2")).toBeUndefined();
		});

		test("should return only found hooks when some ids dont exist", () => {
			const hookified = new Hookified();
			hookified.onHook({ id: "exists", event: "event1", handler: () => {} });
			const removed = hookified.removeHookById(["exists", "nope"]);
			const removedArray = removed as IHook[];
			expect(removedArray.length).toBe(1);
			expect(removedArray[0].id).toBe("exists");
		});

		test("should return empty array when no ids found", () => {
			const hookified = new Hookified();
			hookified.onHook({ event: "event1", handler: () => {} });
			const removed = hookified.removeHookById(["nope1", "nope2"]);
			const removedArray = removed as IHook[];
			expect(removedArray.length).toBe(0);
		});
	});

	describe("removeEventHooks", () => {
		test("should remove all hooks for a specific event and return them", () => {
			const hookified = new Hookified();
			const handler1 = () => {};
			const handler2 = () => {};
			hookified.onHook({ event: "event1", handler: handler1 });
			hookified.onHook({ event: "event1", handler: handler2 });
			hookified.onHook({ event: "event2", handler: () => {} });

			const removed = hookified.removeEventHooks("event1");
			expect(removed.length).toBe(2);
			expect(removed[0].handler).toBe(handler1);
			expect(removed[1].handler).toBe(handler2);
			expect(hookified.hooks.has("event1")).toBe(false);
			expect(hookified.hooks.has("event2")).toBe(true);
		});

		test("should return empty array when event has no hooks", () => {
			const hookified = new Hookified();
			hookified.onHook({ event: "event1", handler: () => {} });

			const removed = hookified.removeEventHooks("nonexistent");
			expect(removed.length).toBe(0);
		});

		test("should validate hook name when enforceBeforeAfter is enabled", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			expect(() => hookified.removeEventHooks("invalid")).toThrow(
				'Hook event "invalid" must start with "before" or "after"',
			);
		});

		test("should delete the map entry after removing hooks for an event", () => {
			const hookified = new Hookified();
			hookified.onHook({ event: "event1", handler: () => {} });

			hookified.removeEventHooks("event1");
			expect(hookified.hooks.size).toBe(0);
			expect(hookified.hooks.get("event1")).toBeUndefined();
		});
	});

	describe("hook tags", () => {
		test("should store a copy of tags on the returned entry and getHooks", () => {
			const hookified = new Hookified();
			const tags = ["audit"];
			const hook: IHook = {
				event: "event",
				handler: () => {},
				tags,
			};
			const stored = hookified.onHook(hook);

			expect(stored?.tags).toEqual(["audit"]);
			expect(stored?.tags).not.toBe(tags);
			expect(hook.tags).toBe(tags);
			expect(hookified.getHooks("event")?.[0]?.tags).toEqual(["audit"]);
			expect(hookified.getHooks("event")?.[0]?.tags).not.toBe(tags);

			tags.push("extra");
			expect(stored?.tags).toEqual(["audit"]);
			expect(hookified.getHooksByTag("extra")).toEqual([]);
		});

		test("should replace tags with a de-duplicated copy when cloning is disabled", () => {
			const hookified = new Hookified({ useHookClone: false });
			const tags = ["b", "a", "b"];
			const hook: IHook = {
				event: "event",
				handler: () => {},
				tags,
			};

			const stored = hookified.onHook(hook, { useHookClone: false });

			expect(stored).toBe(hook);
			expect(hook.tags).not.toBe(tags);
			expect(hook.tags).toEqual(["b", "a"]);
			expect(tags).toEqual(["b", "a", "b"]);
		});

		test("should de-duplicate tags and preserve first-seen order", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				event: "event",
				handler: () => {},
				tags: ["b", "a", "b", "c", "a"],
			});

			expect(stored?.tags).toEqual(["b", "a", "c"]);
		});

		test("should keep case-sensitive tags without trimming", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				event: "event",
				handler: () => {},
				tags: ["Audit", "audit", " audit"],
			});

			expect(stored?.tags).toEqual(["Audit", "audit", " audit"]);
			expect(hookified.getHooksByTag("audit")).toHaveLength(1);
			expect(hookified.getHooksByTag("AUDIT")).toEqual([]);
			expect(hookified.getHooksByTag("audit ")).toEqual([]);
		});

		test("should leave tags undefined when none are provided", () => {
			const hookified = new Hookified();
			const objectForm = hookified.onHook({
				event: "event",
				handler: () => {},
			});
			const shorthand = hookified.onHook("event2", () => {});
			hookified.addHook("event3", () => {});

			expect(objectForm?.tags).toBeUndefined();
			expect(shorthand?.tags).toBeUndefined();
			expect(hookified.getHooks("event3")?.[0]?.tags).toBeUndefined();
			expect(hookified.getTaggedHooks().size).toBe(0);
		});

		test("should store an empty tag list and exclude the hook from lookups", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				event: "event",
				handler: () => {},
				tags: [],
			});

			expect(stored?.tags).toEqual([]);
			expect(hookified.getHooksByTag("anything")).toEqual([]);
			expect(hookified.getTaggedHooks().size).toBe(0);
		});

		test("should throw and register nothing for invalid tags", () => {
			const message = "Hook tags must be an array of non-empty strings";
			const invalidTags: unknown[] = ["audit", null, ["a", 1], ["a", ""]];

			for (const tags of invalidTags) {
				for (const useHookClone of [true, false]) {
					const hookified = new Hookified();
					const hook = {
						event: "event",
						handler: () => {},
					} as IHook;
					(hook as { tags: unknown }).tags = tags;

					expect(() => hookified.onHook(hook, { useHookClone })).toThrow(
						new TypeError(message),
					);
					expect(hookified.getHooks("event")).toBeUndefined();
					expect(hook.id).toBeUndefined();
				}
			}
		});

		test("should skip tag validation when a deprecated hook is blocked", () => {
			const hookified = new Hookified({
				deprecatedHooks: new Map([["oldHook", "Use newHook instead"]]),
				allowDeprecated: false,
			});
			const hook = {
				event: "oldHook",
				handler: () => {},
			} as IHook;
			(hook as { tags: unknown }).tags = "audit";

			expect(hookified.onHook(hook)).toBeUndefined();
			expect(hookified.getHooks("oldHook")).toBeUndefined();
		});

		test("onHooks should keep tags on each hook", () => {
			const hookified = new Hookified();
			hookified.onHooks([
				{ event: "event1", handler: () => {}, tags: ["a"] },
				{ event: "event2", handler: () => {}, tags: ["b", "b"] },
			]);

			expect(hookified.getHooks("event1")?.[0]?.tags).toEqual(["a"]);
			expect(hookified.getHooks("event2")?.[0]?.tags).toEqual(["b"]);
		});

		test("prependHook should keep tags and insert at the start", () => {
			const hookified = new Hookified();
			hookified.onHook({
				event: "event",
				handler: () => {},
				tags: ["later"],
			});
			const prepended = hookified.prependHook({
				event: "event",
				handler: () => {},
				tags: ["first"],
			});

			expect(prepended?.tags).toEqual(["first"]);
			expect(hookified.getHooks("event")?.[0]).toBe(prepended);
		});

		test("onceHook should keep tags until the hook runs", async () => {
			const hookified = new Hookified();
			hookified.onceHook({
				event: "event",
				handler: () => {},
				tags: ["once"],
			});

			expect(hookified.getHooks("event")?.[0]?.tags).toEqual(["once"]);
			expect(hookified.getHooksByTag("once")).toHaveLength(1);

			await hookified.hook("event");

			expect(hookified.getHooksByTag("once")).toEqual([]);
			expect(hookified.getTaggedHooks().has("once")).toBe(false);
		});

		test("prependOnceHook should return the stored hook with tags and remove them after running", async () => {
			const hookified = new Hookified();
			const result = hookified.prependOnceHook({
				event: "event",
				handler: () => {},
				tags: ["pre"],
			});

			expect(result?.tags).toEqual(["pre"]);
			expect(hookified.getHooks("event")?.[0]).toBe(result);

			await hookified.hook("event");

			expect(hookified.getHooksByTag("pre")).toEqual([]);
			expect(hookified.getTaggedHooks().has("pre")).toBe(false);
		});

		test("onceHook and prependOnceHook should reject invalid tags and store nothing", () => {
			const message = "Hook tags must be an array of non-empty strings";

			for (const register of [
				(hookified: Hookified, hook: IHook) => hookified.onceHook(hook),
				(hookified: Hookified, hook: IHook) => hookified.prependOnceHook(hook),
			]) {
				const hookified = new Hookified();
				const hook = {
					event: "event",
					handler: () => {},
				} as IHook;
				(hook as { tags: unknown }).tags = ["ok", ""];

				expect(() => register(hookified, hook)).toThrow(new TypeError(message));
				expect(hookified.getHooks("event")).toBeUndefined();
				expect(hookified.getHooksByTag("ok")).toEqual([]);
			}
		});

		test("onceHook should keep tags when cloning is disabled", () => {
			const hookified = new Hookified({ useHookClone: false });
			hookified.onceHook({
				event: "event",
				handler: () => {},
				tags: ["once"],
			});

			expect(hookified.getHooksByTag("once")[0]?.tags).toEqual(["once"]);
		});

		test("removeHook should drop a once hook from tag lookups", () => {
			const hookified = new Hookified();
			const handler = () => {};
			hookified.onceHook({ event: "event", handler, tags: ["once"] });

			hookified.removeHook({ event: "event", handler });

			expect(hookified.getHooksByTag("once")).toEqual([]);
		});

		test("replacing by id should replace tags instead of merging them", () => {
			const hookified = new Hookified();
			hookified.onHook({
				id: "same",
				event: "event",
				handler: () => {},
				tags: ["a"],
			});
			const replaced = hookified.onHook({
				id: "same",
				event: "event",
				handler: () => {},
				tags: ["b"],
			});

			expect(hookified.getHooks("event")).toEqual([replaced]);
			expect(hookified.getHooksByTag("a")).toEqual([]);
			expect(hookified.getHooksByTag("b")).toEqual([replaced]);
		});

		test("replacing by id without tags should clear previous tags", () => {
			const hookified = new Hookified();
			hookified.onHook({
				id: "same",
				event: "event",
				handler: () => {},
				tags: ["a"],
			});
			const replaced = hookified.onHook({
				id: "same",
				event: "event",
				handler: () => {},
			});

			expect(replaced?.tags).toBeUndefined();
			expect(hookified.getTaggedHooks().size).toBe(0);
		});
	});

	describe("getHooksByTag", () => {
		test("should return hooks across events in storage order", () => {
			const hookified = new Hookified();
			const first = hookified.onHook({
				id: "h1",
				event: "event1",
				handler: () => {},
				tags: ["a"],
			});
			const second = hookified.onHook({
				id: "h2",
				event: "event2",
				handler: () => {},
				tags: ["a"],
			});
			const third = hookified.onHook({
				id: "h3",
				event: "event1",
				handler: () => {},
				tags: ["a"],
			});

			expect(hookified.getHooksByTag("a")).toEqual([first, third, second]);
		});

		test("should return the same hook for each of its tags", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				id: "both",
				event: "event",
				handler: () => {},
				tags: ["a", "b"],
			});

			expect(hookified.getHooksByTag("a")[0]).toBe(stored);
			expect(hookified.getHooksByTag("b")[0]).toBe(stored);
		});

		test("should return an empty array when nothing matches", () => {
			const hookified = new Hookified();
			expect(hookified.getHooksByTag("missing")).toEqual([]);
			expect(hookified.getHooksByTag("missing")).not.toBeUndefined();

			hookified.onHook({ event: "event", handler: () => {} });
			expect(hookified.getHooksByTag("missing")).toEqual([]);
		});

		test("should not return hooks that have no tags", () => {
			const hookified = new Hookified();
			hookified.onHook({ id: "plain", event: "event", handler: () => {} });
			const tagged = hookified.onHook({
				id: "tagged",
				event: "event",
				handler: () => {},
				tags: ["a"],
			});

			expect(hookified.getHooksByTag("a")).toEqual([tagged]);
		});

		test("should return the union of an array of tags with each hook once", () => {
			const hookified = new Hookified();
			const both = hookified.onHook({
				id: "both",
				event: "event1",
				handler: () => {},
				tags: ["a", "b"],
			});
			const onlyB = hookified.onHook({
				id: "only-b",
				event: "event2",
				handler: () => {},
				tags: ["b"],
			});
			hookified.onHook({
				id: "only-c",
				event: "event2",
				handler: () => {},
				tags: ["c"],
			});

			expect(hookified.getHooksByTag(["a", "b"])).toEqual([both, onlyB]);
			expect(hookified.getHooksByTag(["a", "a"])).toEqual([both]);
			expect(hookified.getHooksByTag(["b", "a"])).toEqual([both, onlyB]);
			expect(hookified.getHooksByTag([])).toEqual([]);
		});

		test("should return a new array whose elements are the stored hooks", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				id: "h1",
				event: "event1",
				handler: () => {},
				tags: ["a"],
			});
			const first = hookified.getHooksByTag("a");
			first.pop();

			expect(hookified.getHooksByTag("a")).toEqual([stored]);
			expect(hookified.getHooks("event1")?.length).toBe(1);
			expect(hookified.getHooksByTag("a")[0]).toBe(hookified.getHook("h1"));
		});

		test("should return both hooks when the same id is used on different events", () => {
			const hookified = new Hookified();
			hookified.onHook({
				id: "same",
				event: "event1",
				handler: () => {},
				tags: ["a"],
			});
			hookified.onHook({
				id: "same",
				event: "event2",
				handler: () => {},
				tags: ["a"],
			});

			expect(hookified.getHooksByTag("a")).toHaveLength(2);
		});

		test("should follow prependHook and numeric position order", () => {
			const hookified = new Hookified();
			hookified.onHook({
				id: "first",
				event: "event",
				handler: () => {},
				tags: ["t"],
			});
			hookified.onHook({
				id: "second",
				event: "event",
				handler: () => {},
				tags: ["t"],
			});
			hookified.onHook(
				{
					id: "inserted",
					event: "event",
					handler: () => {},
					tags: ["t"],
				},
				{ position: 1 },
			);
			hookified.prependHook({
				id: "prepended",
				event: "event",
				handler: () => {},
				tags: ["t"],
			});

			expect(hookified.getHooksByTag("t").map((hook) => hook.id)).toEqual([
				"prepended",
				"first",
				"inserted",
				"second",
			]);
		});

		test("should drop hooks removed by removeHook and keep the narrow return shape", () => {
			const hookified = new Hookified();
			const handler = () => {};
			hookified.onHook({ event: "event", handler, tags: ["a"] });

			const removed = hookified.removeHook({ event: "event", handler });

			expect(removed?.tags).toBeUndefined();
			expect(hookified.getHooksByTag("a")).toEqual([]);
		});

		test("should drop hooks removed by removeHooks", () => {
			const hookified = new Hookified();
			const handler = () => {};
			hookified.onHook({ event: "event", handler, tags: ["a"] });

			hookified.removeHooks([{ event: "event", handler }]);

			expect(hookified.getHooksByTag("a")).toEqual([]);
		});

		test("should drop hooks removed by removeHookById and return their tags", () => {
			const hookified = new Hookified();
			hookified.onHook({
				id: "one",
				event: "event1",
				handler: () => {},
				tags: ["a"],
			});
			hookified.onHook({
				id: "two",
				event: "event2",
				handler: () => {},
				tags: ["a", "b"],
			});

			const removedOne = hookified.removeHookById("one");
			expect(!Array.isArray(removedOne) && removedOne?.tags).toEqual(["a"]);
			expect(hookified.getHooksByTag("a")).toHaveLength(1);

			const removed = hookified.removeHookById(["two"]);
			const removedArray = removed as IHook[];
			expect(removedArray[0]?.tags).toEqual(["a", "b"]);
			expect(hookified.getHooksByTag("a")).toEqual([]);
			expect(hookified.getHooksByTag("b")).toEqual([]);
		});

		test("should drop hooks removed by removeEventHooks and return their tags", () => {
			const hookified = new Hookified();
			hookified.onHook({
				event: "event",
				handler: () => {},
				tags: ["a"],
			});

			const removed = hookified.removeEventHooks("event");

			expect(removed[0]?.tags).toEqual(["a"]);
			expect(hookified.getHooksByTag("a")).toEqual([]);
		});

		test("should drop hooks removed by clearHooks", () => {
			const hookified = new Hookified();
			hookified.onHook({ event: "event", handler: () => {}, tags: ["a"] });

			hookified.clearHooks();

			expect(hookified.getHooksByTag("a")).toEqual([]);
		});

		test("should reflect edits to the stored tags array", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				id: "h",
				event: "event",
				handler: () => {},
				tags: ["a"],
			});

			stored?.tags?.push("b");
			expect(hookified.getHooksByTag("b")[0]).toBe(stored);

			if (stored) {
				stored.tags = ["c"];
			}
			expect(hookified.getHooksByTag("a")).toEqual([]);
			expect(hookified.getHooksByTag("c")[0]).toBe(stored);

			if (stored) {
				stored.tags = undefined;
			}
			expect(hookified.getHooksByTag("c")).toEqual([]);
		});

		test("should return deprecated hooks without emitting a warning", () => {
			const hookified = new Hookified({
				deprecatedHooks: new Map([["oldHook", "Use newHook instead"]]),
			});
			hookified.onHook({
				event: "oldHook",
				handler: () => {},
				tags: ["audit"],
			});
			hookified.allowDeprecated = false;
			const warn = vi.fn();
			hookified.on("warn", warn);

			expect(hookified.getHooksByTag("audit")).toHaveLength(1);
			expect(warn).not.toHaveBeenCalled();
		});

		test("should not validate the tag as an event name", () => {
			const hookified = new Hookified({ enforceBeforeAfter: true });
			hookified.onHook({
				event: "before:save",
				handler: () => {},
				tags: ["not-before-after"],
			});

			expect(() => hookified.getHooksByTag("not-before-after")).not.toThrow();
			expect(hookified.getHooksByTag("not-before-after")).toHaveLength(1);
		});
	});

	describe("getTaggedHooks", () => {
		test("should return an empty map when no hooks are tagged", () => {
			const hookified = new Hookified();
			expect(hookified.getTaggedHooks()).toEqual(new Map());

			hookified.onHook({ event: "event", handler: () => {} });
			expect(hookified.getTaggedHooks()).toEqual(new Map());
		});

		test("should map each tag to its hooks in storage order", () => {
			const hookified = new Hookified();
			const first = hookified.onHook({
				id: "h1",
				event: "event1",
				handler: () => {},
				tags: ["a", "b"],
			});
			hookified.onHook({ id: "h3", event: "event1", handler: () => {} });
			const second = hookified.onHook({
				id: "h2",
				event: "event2",
				handler: () => {},
				tags: ["b", "c"],
			});

			const tagged = hookified.getTaggedHooks();
			expect([...tagged.keys()]).toEqual(["a", "b", "c"]);
			expect(tagged.get("a")).toEqual([first]);
			expect(tagged.get("b")).toEqual([first, second]);
			expect(tagged.get("c")).toEqual([second]);
			expect(tagged.get("b")?.[0]).toBe(first);
			expect(tagged.get("b")?.[1]).toBe(second);
			expect(
				[...tagged.values()].every((hooks) =>
					hooks.every((hook) => hook.id !== "h3"),
				),
			).toBe(true);

			for (const key of tagged.keys()) {
				expect(tagged.get(key)).toEqual(hookified.getHooksByTag(key));
			}
		});

		test("should return a new map on every call", () => {
			const hookified = new Hookified();
			hookified.onHook({
				event: "event",
				handler: () => {},
				tags: ["a", "b"],
			});

			const tagged = hookified.getTaggedHooks();
			tagged.delete("a");
			tagged.get("b")?.splice(0, tagged.get("b")?.length ?? 0);

			const again = hookified.getTaggedHooks();
			expect(again.has("a")).toBe(true);
			expect(again.get("b")).toHaveLength(1);
		});

		test("should drop a tag key when its last hook is removed", () => {
			const hookified = new Hookified();
			hookified.onHook({
				id: "h1",
				event: "event",
				handler: () => {},
				tags: ["a", "b"],
			});
			hookified.onHook({
				id: "h2",
				event: "event",
				handler: () => {},
				tags: ["b"],
			});

			hookified.removeHookById("h1");
			const tagged = hookified.getTaggedHooks();

			expect(tagged.has("a")).toBe(false);
			expect(tagged.get("b")).toHaveLength(1);
			expect([...tagged.values()].every((hooks) => hooks.length > 0)).toBe(
				true,
			);

			hookified.clearHooks();
			expect(hookified.getTaggedHooks()).toEqual(new Map());
		});

		test("should list a hook once when stored tags contain duplicates", () => {
			const hookified = new Hookified();
			const stored = hookified.onHook({
				event: "event",
				handler: () => {},
				tags: ["a"],
			});
			stored?.tags?.push("a");

			const tagged = hookified.getTaggedHooks();
			expect(tagged.get("a")).toEqual([stored]);
		});
	});
});
