import EventEmitter from 'node:events';
import process from 'node:process';
import {Bench} from 'tinybench';
import {tinybenchPrinter} from '@monstermann/tinybench-pretty-printer';
import Emittery from 'emittery';
import {EventEmitter as EventEmitter3} from 'eventemitter3';
import {cleanVersion} from './utils.js';
import {Hookified} from '../src/index.js';
import pkg from '../package.json' assert {type: 'json'};

const bench = new Bench({name: 'emit', iterations: 10_000});

const hookified = new Hookified();
const hookifiedVersion = cleanVersion(pkg.version);
// eslint-disable-next-line unicorn/prefer-event-target
const eventEmitter = new EventEmitter();
const emittery = new Emittery();
const emitteryVersion = cleanVersion(pkg.devDependencies.emittery);
const eventEmitter3 = new EventEmitter3();
const emitter3Version = cleanVersion(pkg.devDependencies.eventemitter3);

bench.add(`EventEmitter ${process.version}`, async () => {
	eventEmitter.emit('event', 'test');
});
bench.add(`Emittery ${emitteryVersion}`, async () => {
	await emittery.emit('event', 'test');
});
bench.add(`EventEmitter3 ${emitter3Version}`, async () => {
	eventEmitter3.emit('event', 'test');
});
bench.add(`Hookified ${pkg.version}`, async () => {
	hookified.emit('event', 'test');
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log('');
