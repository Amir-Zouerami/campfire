import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite configuration for the Campfire Mattermost webapp bundle.
 *
 * Mattermost renders plugin components with the host webapp's React. The plugin
 * bundle must not include its own React copy, otherwise hooks crash with a null
 * dispatcher: "Cannot read properties of null (reading 'useState')".
 */
const config = defineConfig({
	plugins: [
		react({
			jsxRuntime: 'classic',
		}),
		tailwindcss(),
		cssInjectedByJsPlugin(),
	],
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		'process.env': '{}',
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		target: 'es2022',
		sourcemap: false,
		minify: true,
		lib: {
			entry: path.resolve(currentDirectory, 'src/index.tsx'),
			name: 'CampfireWebapp',
			formats: ['iife'],
			fileName: () => 'main.js',
		},
		rollupOptions: {
			external: ['react', 'react-dom', 'react-redux', 'redux'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
					'react-redux': 'ReactRedux',
					redux: 'Redux',
				},
				intro: [
					'var process = globalThis.process || { env: { NODE_ENV: "production" } };',
					'var React = globalThis.React;',
				].join('\n'),
			},
		},
	},
});

export default config;
