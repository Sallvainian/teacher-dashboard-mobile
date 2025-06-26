import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	// Remove runes setting - let Svelte auto-detect
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base: '',
			relative: true
		},
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$services: 'src/lib/services',
			$utils: 'src/lib/utils',
			$types: 'src/lib/types'
		}
	},
	compilerOptions: {
		runes: true, // Enable Svelte 5 runes ($state, $derived, etc.)
		immutable: true, // Enable immutable compilation for better performance
		dev: process.env.NODE_ENV !== 'production'
	}
};

export default config;
