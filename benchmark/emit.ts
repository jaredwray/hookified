import EventEmitter from "node:events";
import process from "node:process";
import { tinybenchPrinter } from "@monstermann/tinybench-pretty-printer";
import Emittery from "emittery";
import { EventEmitter as EventEmitter3 } from "eventemitter3";
import { Bench } from "tinybench";
import pkg from "../package.json";
import { Hookified } from "../src/index.js";

import { cleanVersion } from "./utils.js";

const bench = new Bench({ name: "emit", iterations: 10_000 });

const hookified = new Hookified();
const eventEmitter = new EventEmitter();
const emittery = new Emittery();
const emitteryVersion = cleanVersion(pkg.devDependencies.emittery);
const eventEmitter3 = new EventEmitter3();
const emitter3Version = cleanVersion(pkg.devDependencies.eventemitter3);

bench.add(`EventEmitter (${process.version})`, async () => {
	eventEmitter.emit("event", "test");
});
bench.add(`Emittery (v${emitteryVersion})`, async () => {
	await emittery.emit("event", "test");
});
bench.add(`EventEmitter3 (v${emitter3Version})`, async () => {
	eventEmitter3.emit("event", "test");
});
bench.add(`Hookified (v${pkg.version})`, async () => {
	hookified.emit("event", "test");
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log("");
