import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { imagetools } from 'vite-imagetools';
import Icons from 'unplugin-icons/vite';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	plugins: [
		// PWA Support - Offline functionality for educational environments
		// TODO: Fix service worker configuration - disabled for now

		// Image Optimization - Generate WebP/AVIF formats automatically
		imagetools({
			defaultDirectives: (url) => {
				if (url.searchParams.has('enhanced')) {
					return new URLSearchParams({
						format: 'avif;webp;jpg',
						quality: '80',
						as: 'picture'
					});
				}
				return new URLSearchParams();
			}
		}),

		// Icon Management - Access thousands of icons as components
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			scale: 1.2,
			defaultStyle: 'vertical-align: middle;'
		}),

		// Development Quality Tools - Run checks in worker threads
		// DISABLED: MCP tools spawning multiple processes
		// checker({
		// 	typescript: true,
		// 	eslint: {
		// 		lintCommand: 'eslint "./src/**/*.{ts,svelte}" --max-warnings 0'
		// 	},
		// 	overlay: {
		// 		initialIsOpen: false,
		// 		position: 'tl'
		// 	}
		// }),

		sveltekit(),

		// Asset Compression - Gzip/Brotli for better loading times
		compression({
			algorithm: 'gzip',
			ext: '.gz'
		}),
		compression({
			algorithm: 'brotliCompress',
			ext: '.br'
		}),

		// Bundle Analysis - Visualize bundle sizes
		visualizer({
			filename: 'dist/stats.html',
			open: false,
			gzipSize: true,
			brotliSize: true
		})
	],

	define: {
		global: {},
		__BUILD_TIME__: JSON.stringify(new Date().toISOString())
	},

	server: {
		port: 5173,
		host: 'localhost',
		// Fixed HMR WebSocket connection issues
		hmr: {
			host: 'localhost',
			protocol: 'ws',
			overlay: true
		},
		// Windows-specific file watching optimizations
		watch: {
			usePolling: false,
			ignored: ['**/node_modules/**', '**/.git/**']
		},
		// Handle CORS for development
		cors: true
	},

	optimizeDeps: {
		// Exclude problematic Windows native binaries from optimization
		exclude: ['@rollup/rollup-win32-x64-msvc'],
		// Include dependencies that benefit from pre-bundling
		include: [
			'@supabase/supabase-js',
			'date-fns',
			'uuid',
			'zod'
		]
	},

	build: {
		sourcemap: true,
		target: 'esnext',
		// Windows-specific build optimizations
		rollupOptions: {
			output: {
				// Split large dependencies into separate chunks
				manualChunks: {
					supabase: ['@supabase/supabase-js', '@supabase/ssr'],
					utilities: ['date-fns', 'uuid', 'zod'],
				}
			}
		},
		// Build optimizations for production
		chunkSizeWarningLimit: 1000,
		reportCompressedSize: false
	},

	// CSS Processing optimizations
	css: {
		preprocessorOptions: {
			scss: {
				// Add SCSS optimizations if using SCSS
			}
		}
	},

	// Test configuration for Vitest
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			reporter: ['text', 'html', 'json'],
			exclude: [
				'node_modules/',
				'src/app.html',
				'**/*.d.ts',
				'**/*.config.*'
			]
		}
	}
});