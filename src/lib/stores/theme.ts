/**
 * @ai-context THEME_STORE - Theme and color customization
 * @ai-dependencies localStorage, CSS custom properties
 * @ai-sideEffects Updates CSS variables, localStorage
 * @ai-exports Theme store with color presets
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Available accent color themes
export const ACCENT_COLORS = {
	blue: {
		name: 'Blue',
		primary: '#3b82f6',
		light: '#93c5fd',
		hover: '#2563eb',
		bg: 'rgba(59, 130, 246, 0.1)',
		glow: 'rgba(59, 130, 246, 0.2)'
	},
	purple: {
		name: 'Purple',
		primary: '#8b5cf6',
		light: '#c4b5fd',
		hover: '#7c3aed',
		bg: 'rgba(139, 92, 246, 0.1)',
		glow: 'rgba(139, 92, 246, 0.2)'
	},
	green: {
		name: 'Green',
		primary: '#10b981',
		light: '#6ee7b7',
		hover: '#059669',
		bg: 'rgba(16, 185, 129, 0.1)',
		glow: 'rgba(16, 185, 129, 0.2)'
	},
	orange: {
		name: 'Orange',
		primary: '#f97316',
		light: '#fdba74',
		hover: '#ea580c',
		bg: 'rgba(249, 115, 22, 0.1)',
		glow: 'rgba(249, 115, 22, 0.2)'
	},
	pink: {
		name: 'Pink',
		primary: '#ec4899',
		light: '#f9a8d4',
		hover: '#db2777',
		bg: 'rgba(236, 72, 153, 0.1)',
		glow: 'rgba(236, 72, 153, 0.2)'
	},
	teal: {
		name: 'Teal',
		primary: '#14b8a6',
		light: '#5eead4',
		hover: '#0d9488',
		bg: 'rgba(20, 184, 166, 0.1)',
		glow: 'rgba(20, 184, 166, 0.2)'
	},
	red: {
		name: 'Red',
		primary: '#ef4444',
		light: '#fca5a5',
		hover: '#dc2626',
		bg: 'rgba(239, 68, 68, 0.1)',
		glow: 'rgba(239, 68, 68, 0.2)'
	},
	indigo: {
		name: 'Indigo',
		primary: '#6366f1',
		light: '#a5b4fc',
		hover: '#4f46e5',
		bg: 'rgba(99, 102, 241, 0.1)',
		glow: 'rgba(99, 102, 241, 0.2)'
	}
} as const;

export type AccentColorKey = keyof typeof ACCENT_COLORS;

// Theme mode options
export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
	mode: ThemeMode;
	accentColor: AccentColorKey;
}

// Get initial theme from localStorage or defaults
function getInitialTheme(): ThemeState {
	if (!browser) {
		return { mode: 'auto', accentColor: 'blue' };
	}

	const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
	const savedAccent = localStorage.getItem('theme-accent') as AccentColorKey;

	return {
		mode: savedMode || 'auto',
		accentColor: savedAccent || 'blue'
	};
}

// Create the theme store
export const themeStore = writable<ThemeState>(getInitialTheme());

// Apply theme to document
function applyTheme(theme: ThemeState) {
	if (!browser) return;

	const root = document.documentElement;
	const colors = ACCENT_COLORS[theme.accentColor];

	// Apply accent colors to CSS variables
	root.style.setProperty('--purple', colors.primary);
	root.style.setProperty('--purple-light', colors.light);
	root.style.setProperty('--purple-hover', colors.hover);
	root.style.setProperty('--purple-bg', colors.bg);
	root.style.setProperty('--shadow-glow', `0 0 15px ${colors.glow}`);

	// Handle dark/light mode
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const shouldUseDark = theme.mode === 'dark' || (theme.mode === 'auto' && prefersDark);

	if (shouldUseDark) {
		root.classList.add('dark');
		root.setAttribute('data-theme', 'dark');
	} else {
		root.classList.remove('dark');
		root.setAttribute('data-theme', 'light');
	}

	// Save to localStorage
	localStorage.setItem('theme-mode', theme.mode);
	localStorage.setItem('theme-accent', theme.accentColor);
}

// Theme actions
export const themeActions = {
	setMode(mode: ThemeMode) {
		themeStore.update(theme => {
			const newTheme = { ...theme, mode };
			applyTheme(newTheme);
			return newTheme;
		});
	},

	setAccentColor(accentColor: AccentColorKey) {
		themeStore.update(theme => {
			const newTheme = { ...theme, accentColor };
			applyTheme(newTheme);
			return newTheme;
		});
	},

	toggleMode() {
		themeStore.update(theme => {
			const newMode: ThemeMode = 
				theme.mode === 'light' ? 'dark' : 
				theme.mode === 'dark' ? 'auto' : 'light';
			
			const newTheme = { ...theme, mode: newMode };
			applyTheme(newTheme);
			return newTheme;
		});
	}
};

// Initialize theme on store creation
if (browser) {
	// Apply initial theme
	const initialTheme = getInitialTheme();
	applyTheme(initialTheme);

	// Listen for system theme changes when in auto mode
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		themeStore.update(theme => {
			if (theme.mode === 'auto') {
				applyTheme(theme);
			}
			return theme;
		});
	});
}