import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");

describe("Export Verification Tests", () => {
	describe("ESM Imports (Node.js)", () => {
		test("should import Hookified from main export", async () => {
			const { Hookified } = await import("hookified");
			expect(Hookified).toBeDefined();
			expect(typeof Hookified).toBe("function");
		});

		test("should import Eventified from main export", async () => {
			const { Eventified } = await import("hookified");
			expect(Eventified).toBeDefined();
			expect(typeof Eventified).toBe("function");
		});

		test("should import WaterfallHook from main export", async () => {
			const { WaterfallHook } = await import("hookified");
			expect(WaterfallHook).toBeDefined();
			expect(typeof WaterfallHook).toBe("function");
		});

		test("should have all expected exports", async () => {
			const exports = await import("hookified");
			expect(exports).toHaveProperty("Hookified");
			expect(exports).toHaveProperty("Eventified");
			expect(exports).toHaveProperty("WaterfallHook");
		});

		test("should create and use Hookified instance", async () => {
			const { Hookified } = await import("hookified");
			const hookified = new Hookified();

			expect(hookified).toBeInstanceOf(Hookified);
			expect(typeof hookified.onHook).toBe("function");
			expect(typeof hookified.hook).toBe("function");

			// Test basic hook functionality
			let called = false;
			hookified.onHook({
				event: "test",
				handler: () => {
					called = true;
				},
			});

			await hookified.hook("test");
			expect(called).toBe(true);
		});

		test("should create and use Eventified instance", async () => {
			const { Eventified } = await import("hookified");
			const eventified = new Eventified();

			expect(eventified).toBeInstanceOf(Eventified);
			expect(typeof eventified.on).toBe("function");
			expect(typeof eventified.emit).toBe("function");

			// Test basic event functionality
			let called = false;
			eventified.on("test", () => {
				called = true;
			});

			eventified.emit("test");
			expect(called).toBe(true);
		});
	});

	describe("Browser Subpath Export", () => {
		test("should import from hookified/browser subpath", async () => {
			const exports = await import("hookified/browser");
			expect(exports).toHaveProperty("Hookified");
			expect(exports).toHaveProperty("Eventified");
		});

		test("should create Hookified instance from browser export", async () => {
			const { Hookified } = await import("hookified/browser");
			const hookified = new Hookified();

			expect(hookified).toBeInstanceOf(Hookified);
			expect(typeof hookified.onHook).toBe("function");

			// Test basic functionality
			let called = false;
			hookified.onHook({
				event: "test",
				handler: () => {
					called = true;
				},
			});

			await hookified.hook("test");
			expect(called).toBe(true);
		});
	});

	describe("CommonJS Require (Node.js)", () => {
		test("should work with require() via separate CJS test file", () => {
			const cjsTestPath = join(__dirname, "helpers/cjs-test.cjs");
			expect(existsSync(cjsTestPath)).toBe(true);

			// Execute the CJS test file which uses require()
			const output = execSync(`node ${cjsTestPath}`, {
				cwd: rootDir,
				encoding: "utf-8",
			});

			// Verify the test passed
			expect(output).toContain("All CommonJS tests passed");
			expect(output).toContain("Hookified is defined and is a function");
			expect(output).toContain("Eventified is defined and is a function");
			expect(output).toContain("Can create Hookified instance");
			expect(output).toContain("Hookified basic functionality works");
			expect(output).toContain("Can create Eventified instance");
			expect(output).toContain("Eventified basic functionality works");
		});
	});

	describe("Browser Build Files", () => {
		test("should have browser ESM bundle", () => {
			const esmPath = join(rootDir, "dist/browser/index.js");
			expect(existsSync(esmPath)).toBe(true);

			const content = readFileSync(esmPath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});

		test("should have browser IIFE (global) bundle", () => {
			const iifePath = join(rootDir, "dist/browser/index.iife.js");
			expect(existsSync(iifePath)).toBe(true);

			const content = readFileSync(iifePath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});

		test("should have browser source maps", () => {
			const esmMapPath = join(rootDir, "dist/browser/index.js.map");
			const iifeMapPath = join(rootDir, "dist/browser/index.iife.js.map");

			expect(existsSync(esmMapPath)).toBe(true);
			expect(existsSync(iifeMapPath)).toBe(true);
		});
	});

	describe("TypeScript Definition Files", () => {
		let esmContent: string;
		let cjsContent: string;

		beforeAll(() => {
			const dtsPath = join(rootDir, "dist/node/index.d.mts");
			const dctsPath = join(rootDir, "dist/node/index.d.cts");
			esmContent = readFileSync(dtsPath, "utf-8");
			cjsContent = readFileSync(dctsPath, "utf-8");
		});

		test("should have ESM type definitions", () => {
			expect(existsSync(join(rootDir, "dist/node/index.d.mts"))).toBe(true);
			expect(esmContent).toContain("Hookified");
			expect(esmContent).toContain("Eventified");
		});

		test("should have CommonJS type definitions", () => {
			expect(existsSync(join(rootDir, "dist/node/index.d.cts"))).toBe(true);
			expect(cjsContent).toContain("Hookified");
			expect(cjsContent).toContain("Eventified");
		});

		test("should export HookFn type", () => {
			expect(esmContent).toContain("HookFn");
		});

		test("should export IHook interface", () => {
			expect(esmContent).toContain("IHook");
		});

		test("should export Hook class", () => {
			expect(esmContent).toContain("Hook");
		});

		test("should export WaterfallHook class", () => {
			expect(esmContent).toContain("WaterfallHook");
		});

		test("should export IWaterfallHook interface", () => {
			expect(esmContent).toContain("IWaterfallHook");
		});

		test("should export WaterfallHookFn type", () => {
			expect(esmContent).toContain("WaterfallHookFn");
		});

		test("should export HookifiedOptions type", () => {
			expect(esmContent).toContain("HookifiedOptions");
		});

		test("should export OnHookOptions type", () => {
			expect(esmContent).toContain("OnHookOptions");
		});
	});

	describe("Node.js Build Files", () => {
		test("should have Node.js ESM bundle", () => {
			const esmPath = join(rootDir, "dist/node/index.mjs");
			expect(existsSync(esmPath)).toBe(true);

			const content = readFileSync(esmPath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});

		test("should have Node.js CommonJS bundle", () => {
			const cjsPath = join(rootDir, "dist/node/index.cjs");
			expect(existsSync(cjsPath)).toBe(true);

			const content = readFileSync(cjsPath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});
	});
});
