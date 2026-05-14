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
 * Campfire uses Tailwind through the official Vite plugin. CSS is injected into
 * the JavaScript bundle because Mattermost loads webapp/dist/main.js from the
 * plugin manifest.
 *
 * @type {import('vite').UserConfig}
 */
const config = defineConfig({
	plugins: [react(), tailwindcss(), cssInjectedByJsPlugin()],
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
