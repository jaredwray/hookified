import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = join(import.meta.dirname, "..");
const readmePath = join(rootDir, "README.md");

// Run benchmarks and capture output
console.log("Running hooks benchmark...");
const hooksOutput = execSync("pnpm benchmark:hooks", {
	cwd: rootDir,
	encoding: "utf-8",
});

console.log("Running emit benchmark...");
const emitOutput = execSync("pnpm benchmark:emit", {
	cwd: rootDir,
	encoding: "utf-8",
});

// Extract markdown tables from benchmark output
function extractTable(output: string): string {
	const lines = output.split("\n");
	const tableLines: string[] = [];
	let inTable = false;

	for (const line of lines) {
		if (line.startsWith("|")) {
			inTable = true;
			tableLines.push(line);
		} else if (inTable && line.trim() === "") {
			break;
		}
	}

	return tableLines.join("\n");
}

const hooksTable = extractTable(hooksOutput);
const emitTable = extractTable(emitOutput);

// Read current README
const readme = readFileSync(readmePath, "utf-8");

// Build the new benchmarks section
const benchmarksSection = `# Benchmarks

We are doing very simple benchmarking to see how this compares to other libraries using \`tinybench\`. This is not a full benchmark but just a simple way to see how it performs. Our goal is to be as close or better than the other libraries including native (EventEmitter).

## Hooks

${hooksTable}

## Emits

This shows how on par \`hookified\` is to the native \`EventEmitter\` and popular \`eventemitter3\`. These are simple emitting benchmarks to see how it performs.

${emitTable}

_Note: the \`EventEmitter\` version is Nodejs versioning._

`;

// Replace the benchmarks section in README
const benchmarksStart = readme.indexOf("# Benchmarks");
const nextSectionMatch = readme.slice(benchmarksStart + 1).match(/\n# [A-Z]/);

if (benchmarksStart === -1 || !nextSectionMatch) {
	console.error("Could not find Benchmarks section in README.md");
	process.exit(1);
}

const nextSectionStart = benchmarksStart + 1 + (nextSectionMatch.index ?? 0) + 1;
const newReadme =
	readme.slice(0, benchmarksStart) +
	benchmarksSection +
	readme.slice(nextSectionStart);

writeFileSync(readmePath, newReadme);

console.log("README.md benchmarks section updated successfully!");
