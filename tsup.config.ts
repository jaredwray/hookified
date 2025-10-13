import {defineConfig} from 'tsup';

export default defineConfig([
	{
		entry: ['src/index.ts'], // Your entry point
		format: ['cjs', 'esm'], // CommonJS and ESM for Node.js
		dts: true, // Generate TypeScript declaration files
		outDir: 'dist/node', // Output directory for Node.js builds
		splitting: false, // Do not split code (especially useful for libraries)
		clean: true, // Clean output directory before each build
	},
	{
		entry: ['src/index.ts'],
		format: ['esm', 'iife'], // ESM and IIFE (for browsers)
		target: 'es2020', // Target modern browsers
		outDir: 'dist/browser', // Output directory for browser builds
		sourcemap: true, // Generate source maps
		dts: false, // No need for TypeScript declaration in browser build
		clean: true, // Clean output directory before each build
	},
]);
