import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, 'src'),
			'@assets': path.resolve(import.meta.dirname, '../assets'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx}'],
		setupFiles: ['./src/test/setup.ts'],
	},
});
