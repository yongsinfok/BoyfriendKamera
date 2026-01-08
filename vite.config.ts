import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		// Vite PWA plugin will be added via SvelteKit hooks
	],
	server: {
		port: 5173,
		host: true
	},
	// For PWA build
	build: {
		target: 'esnext'
	}
});
