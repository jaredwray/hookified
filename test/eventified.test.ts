/* eslint-disable @typescript-eslint/no-empty-function */
import {describe, test, expect} from 'vitest';
import {Eventified} from '../src/eventified.js';

describe('Eventified', () => {
	test('remove event listener', t => {
		const emitter = new Eventified();
		let dataReceived = 0;

		const listener = () => {
			dataReceived++;
		};

		emitter.on('test-event', listener);
		emitter.emit('test-event');
		emitter.off('test-event', listener);
		emitter.emit('test-event');

		t.expect(dataReceived).toBe(1);
	});

	test('get max listeners', t => {
		const emitter = new Eventified();
		t.expect(emitter.maxListeners()).toBe(100);
	});

	test('add event listener', t => {
		const emitter = new Eventified();
		emitter.addListener('test-event', () => {});
		t.expect(emitter.listeners('test-event').length).toBe(1);
	});

	test('remove event listener handler', t => {
		const emitter = new Eventified();
		let dataReceived;
		const listener: EventListener = data => {
			dataReceived = data;
		};

		emitter.addListener('test-event8', listener);
		t.expect(emitter.listeners('test-event8').length).toBe(1);
		emitter.removeListener('test-event8', listener);
		t.expect(emitter.listeners('test-event8').length).toBe(0);
		expect(dataReceived).toBeUndefined();
	});

	test('remove event listener handler when never existed', t => {
		const emitter = new Eventified();
		const listener = () => {};
		emitter.removeListener('test-event8', listener);
		t.expect(emitter.listeners('test-event8').length).toBe(0);
		emitter.on('test-event8', listener);
		emitter.removeListener('test-event8', () => {});
		t.expect(emitter.listeners('test-event8').length).toBe(1);
		emitter.removeListener('test-event8', listener);
		t.expect(emitter.listeners('test-event8').length).toBe(0);
	});

	test('remove all event listeners', t => {
		const emitter = new Eventified();
		let dataReceived = 0;

		const listener = () => {
			dataReceived++;
		};

		const listener1 = () => {
			dataReceived++;
		};

		emitter.on('test-event', listener);
		emitter.on('test-event', listener1);
		emitter.on('test-event2', listener);

		emitter.removeAllListeners();

		t.expect(emitter.listeners('test-event').length).toBe(0);
		t.expect(emitter.listeners('test-event2').length).toBe(0);
	});

	test('set max listeners and check warning', t => {
		const emitter = new Eventified();
		emitter.setMaxListeners(1);

		const listener = () => {};

		// Temporary override console.warn
		let capturedWarning = '';
		const originalWarn = console.warn;
		console.warn = message => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			capturedWarning = message;
		};

		emitter.on('test-event', listener);
		emitter.on('test-event', listener); // This should trigger the warning

		// Restore original console.warn
		console.warn = originalWarn;

		t.expect(capturedWarning).toMatch(/MaxListenersExceededWarning/);
	});

	test('set max listeners and verify truncate', t => {
		const emitter = new Eventified();

		const listener = () => {};

		emitter.on('test-event', listener);
		emitter.on('test-event', listener);
		emitter.on('test-event2', listener);

		t.expect(emitter.listeners('test-event').length).toBe(2);
		emitter.setMaxListeners(1);
		t.expect(emitter.listeners('test-event').length).toBe(1);
	});

	test('remove all listeners', t => {
		const emitter = new Eventified();
		const listener = () => {};

		emitter.on('test-event', listener);
		emitter.on('test-event', listener);
		emitter.removeAllListeners('test-event');

		t.expect(emitter.listeners('test-event')).toEqual([]);
	});

	test('listeners method', t => {
		const emitter = new Eventified();
		const listener = () => {};

		emitter.on('test-event', listener);

		t.expect(emitter.listeners('test-event')).toEqual([listener]);
	});
});
