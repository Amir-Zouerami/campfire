import path from 'node:path';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

/**
 * Vite configuration for the Campfire Mattermost webapp bundle.
 *
 * Mattermost renders plugin components with the host webapp's React 19. The
 * bundle must never ship its own React copy, otherwise hooks crash with a null
 * dispatcher, so `react` and `react-dom` are externalized to the host globals.
 * React Compiler runs through Babel and emits `react/compiler-runtime` calls,
 * which resolve against the same host React instance.
 */
export default defineConfig({
	plugins: [
		react({ jsxRuntime: 'classic' }),
		babel({ presets: [reactCompilerPreset()] }),
		tailwindcss(),
		cssInjectedByJsPlugin(),
	],
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, 'src'),
			'@assets': path.resolve(import.meta.dirname, '../assets'),
			'react/compiler-runtime': path.resolve(import.meta.dirname, 'src/shared/runtime/react-compiler-runtime.ts'),
			// CommonJS shims call require('react'), which does not exist in a browser IIFE.
			'use-sync-external-store/shim/with-selector': path.resolve(import.meta.dirname, 'src/shared/runtime/use-sync-external-store-with-selector.ts'),
			'use-sync-external-store/shim': path.resolve(import.meta.dirname, 'src/shared/runtime/use-sync-external-store-shim.ts'),
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		'process.env': '{}',
	},
	build: {
		// Mattermost does not serve arbitrary plugin-root assets to injected CSS, so
		// fonts are inlined into the single JavaScript bundle.
		assetsInlineLimit: 4 * 1024 * 1024,
		outDir: 'dist',
		emptyOutDir: true,
		target: 'es2022',
		sourcemap: false,
		minify: true,
		lib: {
			entry: path.resolve(import.meta.dirname, 'src/index.tsx'),
			name: 'CampfireWebapp',
			formats: ['iife'],
			fileName: () => 'main.js',
		},
		rolldownOptions: {
			external: ['react', 'react-dom'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
				},
				intro: [
					'var process = globalThis.process || { env: { NODE_ENV: "production" } };',
					'var React = globalThis.React;',
				].join('\n'),
			},
		},
	},
});
