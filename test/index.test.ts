import {describe, test, expect} from 'vitest';
import pino from 'pino';
import {Hookified, type HookEntry} from '../src/index.js';

describe('Hookified', () => {
	test('initialization', () => {
		const hookified = new Hookified();
		expect(hookified.hooks).toEqual(new Map());
	});

	test('onHook', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		hookified.onHook('event', handler);
		hookified.onHook('event2', handler2);
		expect(hookified.getHooks('event')).toEqual([handler]);
		expect(hookified.getHooks('event2')).toEqual([handler2]);
		expect(hookified.hooks.size).toBe(2);
	});

	test('onHooks', async () => {
		const hookified = new Hookified();
		const eventName = 'event-on-hooks';
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler1 = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		const hooks = new Array<HookEntry>();
		hooks.push({event: eventName, handler: handler1}, {event: eventName, handler: handler2});
		hookified.onHooks(hooks);
		expect(hookified.getHooks(eventName)).toEqual([handler1, handler2]);
		expect(hookified.hooks.size).toBe(1);
		// Add another hook
		const eventName2 = 'event-on-hooks2';
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler3 = () => {};
		hookified.onHook(eventName2, handler3);
		expect(hookified.getHooks(eventName2)).toEqual([handler3]);
		expect(hookified.hooks.size).toBe(2);
	});

	test('onHookOnce will remove hook after execution', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		hookified.onceHook('event', handler);
		expect(hookified.getHooks('event')?.length).toEqual(1);
		await hookified.hook('event');
		expect(hookified.getHooks('event')?.length).toEqual(0);
	});

	test('onHook with Clear', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		hookified.onHook('event', handler);
		hookified.onHook('event2', handler2);
		expect(hookified.getHooks('event')).toEqual([handler]);
		expect(hookified.getHooks('event2')).toEqual([handler2]);
		hookified.clearHooks();
		expect(hookified.hooks.size).toBe(0);
	});

	test('onHook multiple handlers', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		hookified.onHook('event', handler);
		hookified.onHook('event', handler2);
		expect(hookified.hooks.get('event')).toEqual([handler, handler2]);
		expect(hookified.hooks.size).toBe(1);
	});

	test('removeHook', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		hookified.onHook('event', handler);
		hookified.onHook('event', handler2);
		hookified.removeHook('event', handler);
		expect(hookified.getHooks('event')).toEqual([handler2]);
		expect(hookified.hooks.size).toBe(1);
	});

	test('removeHooks', async () => {
		const hookified = new Hookified();
		const eventName = 'event-remove-hooks';
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler1 = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		hookified.onHook(eventName, handler1);
		hookified.onHook(eventName, handler2);
		const hooks = [
			{event: eventName, handler: handler2},
		];
		hookified.removeHooks(hooks);
		expect(hookified.getHooks(eventName)).toEqual([handler1]);
		expect(hookified.hooks.size).toBe(1);
	});

	test('execute hook and manipulate data', async () => {
		const hookified = new Hookified();
		const data = {key: 'value'};
		let handlerData;

		const handler = (data: any) => {
			data.key = 'modified';
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			handlerData = data;
		};

		hookified.onHook('event', handler);
		await hookified.hook('event', data);
		expect(handlerData.key).toBe('modified');
	});

	test('execute hook and manipulate multiple data items', async () => {
		const hookified = new Hookified();
		const data = {key: 'value'};
		const data2 = {key: 'value2'};
		const data3 = {key: 'value3'};
		const handlerData: Array<{key: string}> = [];

		const handler = (data: {key: string}, data2: {key: string}, data3: {key: string}) => {
			data.key = 'modified';
			data2.key = 'foo';
			data3.key = 'bar';

			handlerData.push(data, data2, data3);
		};

		hookified.onHook('event', handler);
		await hookified.hook('event', data, data2, data3);
		expect(handlerData[0].key).toBe('modified');
		expect(handlerData[1].key).toBe('foo');
		expect(handlerData[2].key).toBe('bar');
	});

	test('hook with error emitted', async () => {
		const hookified = new Hookified();
		let errorMessage;
		hookified.on('error', (error: Error) => {
			errorMessage = error.message;
			expect(error.message).toBe('event: error');
		});

		const data = {key: 'value'};

		const handler = () => {
			throw new Error('error');
		};

		hookified.onHook('event', handler);
		await hookified.hook('event', data);
		expect(errorMessage).toBe('event: error');
	});

	test('hook with sync function', async () => {
		const hookified = new Hookified();
		const data = {key: 'value'};

		const handler = (data: any) => {
			data.key = 'modified';
		};

		hookified.onHook('event', handler);
		await hookified.hook('event', data);
		expect(data.key).toBe('modified');
	});

	test('prepends hook to the beginning of the array', async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push('modified2');
		};

		const handler2 = () => {
			handlerData.push('modified1');
		};

		hookified.onHook('event', handler);
		hookified.prependHook('event', handler2);
		await hookified.hook('event');
		expect(handlerData[0]).toBe('modified1');
		expect(handlerData[1]).toBe('modified2');
	});

	test('prepends hook and creates new array', async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push('modified1');
		};

		hookified.prependHook('event', handler);
		await hookified.hook('event');
		expect(handlerData[0]).toBe('modified1');
	});

	test('prepends a hook and removes it', async () => {
		const hookified = new Hookified();
		const handlerData: string[] = [];

		const handler = () => {
			handlerData.push('modified1');
		};

		hookified.prependOnceHook('event20', handler);
		await hookified.hook('event20');
		expect(hookified.hooks.get('event20')?.length).toBe(0);
	});

	test('should set throwErrorOnHook to true', async () => {
		const hookified = new Hookified({throwHookErrors: true});
		expect(hookified.throwHookErrors).toBe(true);
		hookified.throwHookErrors = false;
		expect(hookified.throwHookErrors).toBe(false);
	});

	test('should throw error when throwErrorOnHook is true', async () => {
		const hookified = new Hookified({throwHookErrors: true});
		const data = {key: 'value'};
		let errorMessage;

		const handler = () => {
			throw new Error('error: this handler throws stuff');
		};

		hookified.onHook('event', handler);

		try {
			await hookified.hook('event', data);
		} catch (error) {
			errorMessage = (error as Error).message;
		}

		expect(errorMessage).toBe('event: error: this handler throws stuff');
	});

	describe('logger', () => {
		test('should set logger', async () => {
			const hookified = new Hookified();
			const logger = pino();
			hookified.logger = logger;
			expect(hookified.logger).toBe(logger);
		});

		test('should set logger to undefined', async () => {
			const hookified = new Hookified();
			hookified.logger = undefined;
			expect(hookified.logger).toBe(undefined);
		});

		test('should log error', async () => {
			const logger = pino();
			let loggerErrorMessage;
			logger.error = (object: unknown, ...arguments_: unknown[]) => {
				const message = typeof object === 'string' ? object : arguments_[0];
				expect(message).toBe('event: error: this handler throws stuff');
				loggerErrorMessage = message as string;
			};

			const hookified = new Hookified({logger, throwHookErrors: true});
			const data = {key: 'value'};
			let errorMessage;

			const handler = () => {
				throw new Error('error: this handler throws stuff');
			};

			hookified.onHook('event', handler);

			try {
				await hookified.hook('event', data);
			} catch (error) {
				errorMessage = (error as Error).message;
			}

			expect(errorMessage).toBe('event: error: this handler throws stuff');
			expect(loggerErrorMessage).toBe('event: error: this handler throws stuff');
		});
	});
});
