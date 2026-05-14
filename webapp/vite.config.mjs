import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite configuration for the Campfire Mattermost webapp bundle.
 *
 * Mattermost loads webapp/dist/main.js through plugin.json, so Campfire builds
 * a single browser-ready IIFE bundle and injects CSS through JavaScript.
 *
 * @type {import('vite').UserConfig}
 */
const config = defineConfig({
	plugins: [react(), cssInjectedByJsPlugin()],
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
	},
});

export default config;
