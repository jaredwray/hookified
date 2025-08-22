import { tinybenchPrinter } from "@monstermann/tinybench-pretty-printer";
import { createHooks } from "hookable";
import { Bench } from "tinybench";
import pkg from "../package.json";
import { Hookified } from "../src/index.js";

import { cleanVersion } from "./utils.js";

const bench = new Bench({ name: "hook", iterations: 10_000 });

const hookified = new Hookified();

const genericHookifiedHandler = () => {};
hookified.onHook("event", genericHookifiedHandler);
const hookifiedVersion = cleanVersion(pkg.version);

const hookable = createHooks();

const genericHookableHandler = () => {};
hookable.hook("event", genericHookableHandler);
const hookableVersion = cleanVersion(pkg.devDependencies.hookable);

bench.add(`Hookable (v${hookableVersion})`, async () => {
	await hookable.callHook("event", "test");
});

bench.add(`Hookified (v${hookifiedVersion})`, async () => {
	await hookified.hook("event", "test");
});

await bench.run();

const cli = tinybenchPrinter.toMarkdown(bench);
console.log(cli);
console.log("");
