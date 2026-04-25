import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		dts: true,
		outDir: "dist/node",
		platform: "node",
		clean: true,
	},
	{
		entry: ["src/index.ts"],
		format: ["esm", "iife"],
		target: "es2020",
		outDir: "dist/browser",
		platform: "browser",
		sourcemap: true,
		dts: false,
		clean: true,
		outputOptions: (options, format) => {
			if (format === "iife") {
				return {
					...options,
					entryFileNames: "index.global.js",
					chunkFileNames: "[name]-[hash].global.js",
				};
			}
			return options;
		},
	},
]);
