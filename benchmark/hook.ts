import {Bench} from 'tinybench';
import {tinybenchPrinter} from '@monstermann/tinybench-pretty-printer';
import {createHooks} from 'hookable';
import {Hookified} from '../src/index.js';
import pkg from '../package.json' assert { type: 'json' };

const bench = new Bench({name: 'hook', iterations: 10_000});

const hookified = new Hookified();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const genericHookifiedHandler = () => {};
hookified.onHook('event', genericHookifiedHandler);

const hookable = createHooks();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const genericHookableHandler = () => {};
hookable.hook('event', genericHookableHandler);

bench.add(`Hookable ${pkg.devDependencies.hookable}`, async () => {
	await hookable.callHook('event', 'test');
});

bench.add(`Hookified ${pkg.version}`, async () => {
	await hookified.hook('event', 'test');
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log('');
