/* eslint-disable @typescript-eslint/no-unsafe-call */
import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/*.test.ts'],
		coverage: {
			reporter: ['text', 'json', 'lcov'],
			exclude: [
				'site/**',
				'benchmark/**',
				'vitest.config.ts',
				'dist/**',
				'test/**',
				'tsup.config.ts',
				'src/logger.ts',
			],
		},
	},
});
