import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/*.test.ts'],
		coverage: {
			exclude: [
				'site/**',
				'benchmark/**',
				'vitest.config.ts',
				'dist/**',
				'test/**',
				'src/event-emitter.ts',
				'tsup.config.ts',
				'src/logger.ts',
			],
		},
	},
});
