import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

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

		test("should have all expected exports", async () => {
			const exports = await import("hookified");
			expect(exports).toHaveProperty("Hookified");
			expect(exports).toHaveProperty("Eventified");
		});

		test("should create and use Hookified instance", async () => {
			const { Hookified } = await import("hookified");
			const hookified = new Hookified();

			expect(hookified).toBeInstanceOf(Hookified);
			expect(typeof hookified.onHook).toBe("function");
			expect(typeof hookified.hook).toBe("function");

			// Test basic hook functionality
			let called = false;
			hookified.onHook("test", () => {
				called = true;
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
			hookified.onHook("test", () => {
				called = true;
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
			const iifePath = join(rootDir, "dist/browser/index.global.js");
			expect(existsSync(iifePath)).toBe(true);

			const content = readFileSync(iifePath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});

		test("should have browser source maps", () => {
			const esmMapPath = join(rootDir, "dist/browser/index.js.map");
			const iifeMapPath = join(rootDir, "dist/browser/index.global.js.map");

			expect(existsSync(esmMapPath)).toBe(true);
			expect(existsSync(iifeMapPath)).toBe(true);
		});
	});

	describe("TypeScript Definition Files", () => {
		test("should have ESM type definitions", () => {
			const dtsPath = join(rootDir, "dist/node/index.d.ts");
			expect(existsSync(dtsPath)).toBe(true);

			const content = readFileSync(dtsPath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});

		test("should have CommonJS type definitions", () => {
			const dctsPath = join(rootDir, "dist/node/index.d.cts");
			expect(existsSync(dctsPath)).toBe(true);

			const content = readFileSync(dctsPath, "utf-8");
			expect(content).toContain("Hookified");
			expect(content).toContain("Eventified");
		});

		test("should export Hook type", () => {
			const dtsPath = join(rootDir, "dist/node/index.d.ts");
			const content = readFileSync(dtsPath, "utf-8");
			expect(content).toContain("Hook");
		});

		test("should export HookEntry type", () => {
			const dtsPath = join(rootDir, "dist/node/index.d.ts");
			const content = readFileSync(dtsPath, "utf-8");
			expect(content).toContain("HookEntry");
		});

		test("should export HookifiedOptions type", () => {
			const dtsPath = join(rootDir, "dist/node/index.d.ts");
			const content = readFileSync(dtsPath, "utf-8");
			expect(content).toContain("HookifiedOptions");
		});
	});

	describe("Node.js Build Files", () => {
		test("should have Node.js ESM bundle", () => {
			const esmPath = join(rootDir, "dist/node/index.js");
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
