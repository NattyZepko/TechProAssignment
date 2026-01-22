import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@deck.gl/mapbox-layer': fileURLToPath(
				new URL(
					'./node_modules/@deck.gl/mapbox/dist/mapbox-layer.js',
					import.meta.url,
				),
			),
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.js'],
	},
});
