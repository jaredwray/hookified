import { bench } from 'vitest';
import { createHooks } from 'hookable'
import { Hookified } from '../src/index.js';
import pkg from '../package.json' assert { type: 'json' };

const iterations = 1000;


const hookified = new Hookified();
const genericHookifiedHandler = () => {};
hookified.onHook('event', genericHookifiedHandler);

const hookable = createHooks();
const genericHookableHandler = () => {};
hookable.hook('event', genericHookableHandler);


bench(`Hookable ${pkg.devDependencies.hookable}`, () => {
  
	hookable.callHook('event', 'test');

}, { iterations });

bench(`Hookified ${pkg.version}`, () => {
  
	hookified.hook('event', 'test');

}, { iterations });