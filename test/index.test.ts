import {describe, test, expect} from 'vitest';
import {Hookified} from '../src/index.js';

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
		await hookified.onHook('event', handler);
		await hookified.onHook('event2', handler2);
		expect(hookified.hooks.get('event')).toEqual([handler]);
		expect(hookified.hooks.get('event2')).toEqual([handler2]);
		expect(hookified.hooks.size).toBe(2);
	});

	test('onHook multiple handlers', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		await hookified.onHook('event', handler);
		await hookified.onHook('event', handler2);
		expect(hookified.hooks.get('event')).toEqual([handler, handler2]);
		expect(hookified.hooks.size).toBe(1);
	});

	test('removeHook', async () => {
		const hookified = new Hookified();
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler = () => {};
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const handler2 = () => {};
		await hookified.onHook('event', handler);
		await hookified.onHook('event', handler2);
		await hookified.removeHook('event', handler);
		expect(hookified.hooks.get('event')).toEqual([handler2]);
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

		await hookified.onHook('event', handler);
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

			console.log(handlerData);
		};

		await hookified.onHook('event', handler);
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
			expect(error.message).toBe('Error in hook handler for event "event": error');
		});

		const data = {key: 'value'};
		let handlerData;

		const handler = (data: any) => {
			throw new Error('error');
		};

		await hookified.onHook('event', handler);
		await hookified.hook('event', data);
		expect(errorMessage).toBe('Error in hook handler for event "event": error');
	});
});
