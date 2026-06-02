import EventEmitter from "node:events";
import process from "node:process";
import { tinybenchPrinter } from "@monstermann/tinybench-pretty-printer";
import Emittery from "emittery";
import { EventEmitter as EventEmitter3 } from "eventemitter3";
import { Bench } from "tinybench";
import pkg from "../package.json";
import { Hookified } from "../src/index.js";

import { cleanVersion } from "./utils.js";

// Benchmarks the multi-listener emit path. Unlike `emit.ts` (a single
// listener, which uses the fast scalar path), emitting to two or more
// listeners iterates the listener array. Hookified copies that array before
// iterating so listeners removed or added during the emit cannot corrupt the
// in-flight loop, matching Node's EventEmitter. These benchmarks track the
// cost of that path across a few listener counts.
const LISTENER_COUNTS = [2, 4, 8];

const emitteryVersion = cleanVersion(pkg.devDependencies.emittery);
const emitter3Version = cleanVersion(pkg.devDependencies.eventemitter3);

for (const count of LISTENER_COUNTS) {
	const bench = new Bench({
		name: `emit (${count} listeners)`,
		iterations: 10_000,
	});

	const hookified = new Hookified();
	const eventEmitter = new EventEmitter();
	const emittery = new Emittery();
	const eventEmitter3 = new EventEmitter3();

	// Register `count` listeners on each emitter so every emit fans out fully
	eventEmitter.setMaxListeners(0);
	for (let i = 0; i < count; i++) {
		hookified.on("event", (_data: string) => {});
		eventEmitter.on("event", (_data: string) => {});
		emittery.on("event", (_event: unknown) => {});
		eventEmitter3.on("event", (_data: string) => {});
	}

	bench.add(`EventEmitter (${count} listeners, ${process.version})`, () => {
		eventEmitter.emit("event", "test");
	});
	bench.add(`Emittery (${count} listeners, v${emitteryVersion})`, async () => {
		await emittery.emit("event", "test");
	});
	bench.add(`EventEmitter3 (${count} listeners, v${emitter3Version})`, () => {
		eventEmitter3.emit("event", "test");
	});
	bench.add(`Hookified (${count} listeners, v${pkg.version})`, () => {
		hookified.emit("event", "test");
	});

	await bench.run();

	console.log(tinybenchPrinter.toMarkdown(bench));
	console.log("");
}
