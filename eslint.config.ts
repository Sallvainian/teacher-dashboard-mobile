import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import stylistic from '@stylistic/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		// Add explicit ignores for built directories
		ignores: [
			'dist/**',
			'.svelte-kit/**',
			'build/**',
			'coverage/**',
			'node_modules/**',
			'**/*.min.js'
		]
	},
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// Basic working rules
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-empty-object-type': 'off',

			// SECURITY: Catch real security issues
			'no-eval': 'error', // Prevents code injection
			'no-implied-eval': 'error', // Prevents setTimeout/setInterval with strings
			'no-new-func': 'error', // Prevents Function constructor
			'no-script-url': 'error', // Prevents javascript: URLs

			// MEMORY LEAKS: Critical for SPA apps
			'no-global-assign': 'error', // Prevents overwriting global objects
			'no-extend-native': 'error', // Prevents extending native prototypes

			// TYPE SAFETY: Upgrade from warn to error for critical issues
			'@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
			'@typescript-eslint/no-non-null-assertion': 'warn', // Your codebase has many !
			'@typescript-eslint/prefer-as-const': 'error', // Better type inference

			// ASYNC/AWAIT: Prevents common async bugs
			'no-return-await': 'error', // Performance issue
			'prefer-promise-reject-errors': 'error', // Better error handling
			'no-throw-literal': 'error', // Throw Error objects, not strings

			// DOM SAFETY: Critical for web apps
			'no-alert': 'warn', // Use proper UI instead of alert()
			'no-console': 'warn', // Remove debug statements

			// RELIABILITY: Catch subtle bugs
			'eqeqeq': ['error', 'always'], // Use === instead of ==
			'array-callback-return': 'error', // Return values in map/filter
			'no-unused-expressions': 'error', // Catch typos like x == 5 instead of x = 5

			// TIMER/SUBSCRIPTION LEAKS: Critical for SPA memory management
			'no-self-assign': 'error', // Catches assignment mistakes

			// PROMISE HANDLING: Prevents unhandled promise rejections
			'no-async-promise-executor': 'error', // Async functions in Promise constructor
			'no-promise-executor-return': 'error', // Return in Promise executor

			// SVELTE-SPECIFIC: Additional safety
			'prefer-const': 'error', // Use const when variables aren't reassigned
			'no-var': 'error' // Use let/const instead of var
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			// Keep only basic Svelte rules
			'svelte/require-each-key': 'error',
			'svelte/no-unused-svelte-ignore': 'warn',
			'svelte/valid-compile': 'error'
		}
	}
);
