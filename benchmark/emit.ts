import EventEmitter from 'node:events';
import {Bench} from 'tinybench';
import {tinybenchPrinter} from '@monstermann/tinybench-pretty-printer';
import Emittery from 'emittery';
import {EventEmitter as EventEmitter3} from 'eventemitter3';
import {Hookified} from '../src/index.js';

const bench = new Bench({name: 'emit', iterations: 10_000});

const hookified = new Hookified();
// eslint-disable-next-line unicorn/prefer-event-target
const eventEmitter = new EventEmitter();
const emittery = new Emittery();
const eventEmitter3 = new EventEmitter3();

bench.add('EventEmitter', async () => {
	eventEmitter.emit('event', 'test');
});
bench.add('Emittery', async () => {
	await emittery.emit('event', 'test');
});
bench.add('EventEmitter3', async () => {
	eventEmitter3.emit('event', 'test');
});
bench.add('Hookified', async () => {
	hookified.emit('event', 'test');
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log('');
