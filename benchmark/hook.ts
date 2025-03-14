import {Bench} from 'tinybench';
import {tinybenchPrinter} from '@monstermann/tinybench-pretty-printer';
import {createHooks} from 'hookable';
import {Hookified} from '../src/index.js';
import pkg from '../package.json' assert { type: 'json' };
import {cleanVersion} from './utils.js';

const bench = new Bench({name: 'hook', iterations: 10_000});

const hookified = new Hookified();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const genericHookifiedHandler = () => {};
hookified.onHook('event', genericHookifiedHandler);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const hookifiedVersion = cleanVersion(pkg.version);

const hookable = createHooks();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const genericHookableHandler = () => {};
hookable.hook('event', genericHookableHandler);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const hookableVersion = cleanVersion(pkg.devDependencies.hookable);

bench.add(`Hookable (v${hookableVersion})`, async () => {
	await hookable.callHook('event', 'test');
});

bench.add(`Hookified (v${hookifiedVersion})`, async () => {
	await hookified.hook('event', 'test');
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log('');
