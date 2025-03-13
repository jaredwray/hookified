import { bench } from 'vitest';
import EventEmitter from 'node:events';
import Emittery from 'emittery';
import { EventEmitter as EventEmitter3 } from 'eventemitter3';
import { Hookified } from '../src/index.js';

const hookified = new Hookified();
const eventEmitter = new EventEmitter();
const emittery = new Emittery();
const eventEmitter3 = new EventEmitter3();
const iterations = 1000;

bench('EventEmitter', () => {
  
	eventEmitter.emit('event', 'test');	

}, { iterations });

bench('Hookified', () => {
  
	hookified.emit('event', 'test');

}, { iterations });

bench('Emittery', () => {
  
	emittery.emit('event', 'test');	

}, { iterations });

bench('EventEmitter3', () => {
  
	eventEmitter3.emit('event', 'test');	

}, { iterations });