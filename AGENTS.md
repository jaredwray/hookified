# Agent Guidelines for Hookified

Hookified is an event emitting and middleware hooks library for Node.js and the browser. It provides a simple replacement for EventEmitter with async/sync middleware hooks support.

## Project Overview

- **Purpose**: Provide event emitting and middleware hooks functionality for classes
- **Architecture**: TypeScript library with ESM/CJS support and browser builds
- **Key Features**: EventEmitter replacement, async/sync middleware hooks, before/after hooks, deprecation warnings, logger integration

## Development Commands

- Use `pnpm` instead of `npm` for all package management commands
- `pnpm build` - Build the TypeScript code for Node.js and browser
- `pnpm test` - Run linting (Biome) and tests with coverage
- `pnpm lint` - Run Biome linter with auto-fix
- `pnpm benchmark` - Run performance benchmarks (hooks and emit)
- `pnpm clean` - Remove dist, coverage, and site/dist directories

## Code Quality Requirements

- Always run `pnpm test` to verify tests pass before completing changes
- Maintain high code coverage - all new code must have corresponding tests
- Follow existing code patterns in the source files
- Use Biome for linting and formatting (configured in the project)

## Project Structure

- `src/index.ts` - Main Hookified class with hooks functionality
- `src/eventified.ts` - Base event emitter class (Eventified)
- `src/types.ts` - TypeScript type definitions
- `test/` - Vitest test files
- `benchmark/` - Performance benchmark scripts (hook.ts, emit.ts)
- `dist/node/` - Node.js build output (ESM and CJS)
- `dist/browser/` - Browser build output

## Key Concepts

### Hookified Class
The main class that extends Eventified and provides:
- Hook registration: `onHook()`, `addHook()`, `onHookEntry()`, `onHooks()`, `prependHook()`
- Hook execution: `hook()`, `callHook()`, `hookSync()`, `beforeHook()`, `afterHook()`
- Hook management: `getHooks()`, `removeHook()`, `removeHooks()`, `clearHooks()`
- Once hooks: `onceHook()`, `prependOnceHook()`

### Eventified Class
Base class providing EventEmitter-like functionality:
- Event registration: `on()`, `once()`, `prependListener()`, `prependOnceListener()`
- Event emission: `emit()`
- Event management: `off()`, `removeAllListeners()`, `listeners()`, `eventNames()`

### Configuration Options
- `throwOnHookError` - Throw errors in hooks instead of just emitting
- `throwOnEmitError` - Throw errors on emit
- `throwOnEmptyListeners` - Throw when emitting 'error' with no listeners
- `enforceBeforeAfter` - Require hook names to start with 'before' or 'after'
- `deprecatedHooks` - Map of deprecated hook names to warning messages
- `allowDeprecated` - Control whether deprecated hooks can execute
- `eventLogger` - Logger instance for error and event logging

## Key Considerations

- The library has zero dependencies
- Supports both Node.js (22.18+) and browsers via CDN
- Browser builds are available at `dist/browser/index.js` (ESM) and `dist/browser/index.global.js` (UMD)
- Hooks can be async or sync - use `hook()` for async execution, `hookSync()` for sync-only
- Logger integration supports Pino, Winston, Bunyan, or any compatible logger

## Safe Chain

Aikido Safe Chain shims examine each package that a package manager installs in this environment.
Never bypass the shims.

- Keep `~/.safe-chain/shims` first on `PATH`.
- Run `npm`, `npx`, `pnpm`, and `pnpx` only through the shims. Do not run a different copy by its
  full path.
- Do not install a package with `curl | sh` or with a package manager that has no shim.
- If Safe Chain blocks a package, stop. Do not use a different command, path, or package to get the
  same code. Tell the user the package name and the Safe Chain message.

## Simplified Technical English

Write in ASD-STE100 Simplified Technical English (STE). Get the current issue of the specification
free of charge from <https://www.asd-ste100.org>. STE applies to all text that you write for this
repository, its pull requests, and its issues. This text includes documentation, code comments,
commit messages, review replies, and changelog entries.

- Use approved STE words with their approved meanings. You can also use technical names and
  technical verbs. If you cannot confirm that a word is approved, use a short, common word with one
  meaning.
- Use one word for one meaning.
- Write an instruction in the imperative. Write one instruction in each sentence.
- Do not write more than 20 words in an instruction or 25 words in a descriptive sentence.
- Use the active voice.
- Use only the simple present, simple past, or simple future tense. Do not use the present perfect.
- Do not use the "-ing" form of a verb, except in a technical name.
- Do not write a noun cluster of more than three words.
- Do not omit articles, verbs, or subjects to make a sentence shorter.
- Write one topic in each paragraph. Do not write more than six sentences in a paragraph.
- Use a vertical list for steps, conditions, and other complex text.
- Do not change code, commands, identifiers, file paths, or quoted text to make them STE.
- Use STE for the text that you add or change. Do not rewrite other text only to make it STE.

## Test audit

Apply this gate to each test that a pull request adds, changes, or deletes. Apply it before you open
or update the pull request. This gate is the authoring gate of the `test-audit` skill in
`jaredwray/agentic`. If that skill is installed, use it.

Keep a new or changed test only if you can answer all four questions:

1. Which observable behavior, invariant, or contract does the test protect?
2. Which credible regression makes the test fail?
3. Why does the current coverage not find that regression? If a test or its table owns the
   contract, extend it. Do not add a near-duplicate test.
4. Does the test need an export, flag, or hook that no production caller uses? If yes, test at the
   real boundary.

- A regression test for a bug fix must fail on the code before the fix, for the intended reason.
- Do not keep a test that asserts nothing, restates the implementation, repeats the type checker,
  or only proves a mock.
- A coverage target does not lower this bar. Reach an uncovered line through its public entry
  point. If no caller can reach a branch, remove the branch. Do not add a test for it.
- Delete a test only when a different test proves its contract, or when the contract is gone. Do
  not delete a test because it fails.
- Record the gate in the verification list of the pull request body. List each test that you did
  not keep, rewrote, or deleted, and give the reason. For a deleted test, name the test that proves
  its contract, or show that the contract is gone.
- Do not audit tests that this pull request does not touch. Audit them in a separate pull request.

## Pull requests

The task does not stop when you open a pull request. Do these steps before you start a different
task:

1. Wait approximately 20 minutes for automated and human code reviews.
2. Read each new comment. Find each comment that has a finding, a question, or a change request.
3. Examine the code for each finding or change request. Decide if it is correct. Do not decide from
   who the reviewer is.
4. If it is correct, change the code. Run the same checks that CI runs. Push the change. On the
   thread, reply with what changed and the commit SHA.
5. If it is not correct, reply on the thread with the reason. Give the file and line. Do not
   resolve the thread. The reviewer closes it.
6. If a comment asks a question, answer it on the thread.
7. If CI fails, find the root cause and fix it. Do not skip or disable a test to make CI pass.
8. If you pushed a change or CI did not finish, do steps 1 to 7 again. Stop when CI passes and each
   finding, question, and change request has a reply.

Do not reply to a comment that needs no answer: your own replies, approvals, thanks, and bot status
notices. A reply to one of these comments starts the loop again.
