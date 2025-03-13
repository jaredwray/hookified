import {bench} from 'vitest';
import {createHooks} from 'hookable';
import {Hookified} from '../src/index.js';
import pkg from '../package.json' assert { type: 'json' };

const iterations = 1000;

const hookified = new Hookified();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const genericHookifiedHandler = () => {};
hookified.onHook('event', genericHookifiedHandler);

const hookable = createHooks();
// eslint-disable-next-line @typescript-eslint/no-empty-function
const genericHookableHandler = () => {};
hookable.hook('event', genericHookableHandler);

bench(`Hookable ${pkg.devDependencies.hookable}`, async () => {
	await hookable.callHook('event', 'test');
}, {iterations});

bench(`Hookified ${pkg.version}`, async () => {
	await hookified.hook('event', 'test');
}, {iterations});
