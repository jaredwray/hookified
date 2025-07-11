/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import EventEmitter from 'node:events';
import process from 'node:process';
import {Bench} from 'tinybench';
import {tinybenchPrinter} from '@monstermann/tinybench-pretty-printer';
import Emittery from 'emittery';
import {EventEmitter as EventEmitter3} from 'eventemitter3';
import {Hookified} from '../src/index.js';
import pkg from '../package.json' assert {type: 'json'};
import {cleanVersion} from './utils.js';

const bench = new Bench({name: 'emit', iterations: 10_000});

const hookified = new Hookified();
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const hookifiedVersion = cleanVersion(pkg.version);
// eslint-disable-next-line unicorn/prefer-event-target
const eventEmitter = new EventEmitter();
const emittery = new Emittery();
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const emitteryVersion = cleanVersion(pkg.devDependencies.emittery);
const eventEmitter3 = new EventEmitter3();
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const emitter3Version = cleanVersion(pkg.devDependencies.eventemitter3);

bench.add(`EventEmitter (${process.version})`, async () => {
	eventEmitter.emit('event', 'test');
});
bench.add(`Emittery (v${emitteryVersion})`, async () => {
	await emittery.emit('event', 'test');
});
bench.add(`EventEmitter3 (v${emitter3Version})`, async () => {
	eventEmitter3.emit('event', 'test');
});
bench.add(`Hookified (v${pkg.version})`, async () => {
	hookified.emit('event', 'test');
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log('');
