import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		dts: true,
		outDir: "dist/node",
		tsconfig: "tsconfig.build.json",
		outExtensions: ({ format }) => {
			if (format === "es") {
				return { js: ".js", dts: ".d.ts" };
			}
			return { js: ".cjs", dts: ".d.cts" };
		},
	},
	{
		entry: ["src/index.ts"],
		format: ["esm"],
		target: "es2020",
		outDir: "dist/browser",
		sourcemap: true,
		dts: false,
		platform: "browser",
	},
	{
		entry: ["src/index.ts"],
		format: ["iife"],
		target: "es2020",
		outDir: "dist/browser",
		sourcemap: true,
		dts: false,
		platform: "browser",
		globalName: "Hookified",
		outputOptions: {
			entryFileNames: "index.global.js",
		},
	},
]);
