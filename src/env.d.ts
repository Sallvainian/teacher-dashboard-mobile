// Svelte 5 runes global declarations
declare global {
  // Svelte 5 runes - these are global in Svelte 5
  function $state<T>(initial?: T): T;
  function $derived<T>(fn: () => T): T;
  function $effect(fn: () => void | (() => void)): void;
  function $effect_pre(fn: () => void | (() => void)): void;
  function $effect_tracking(): boolean;
  function $props<T = Record<string, unknown>>(): T;
  function $bindable<T>(value?: T): T;
  function $inspect<T>(...values: T[]): T extends unknown[] ? T : [T];
}

declare module '$env/static/public' {
	export const PUBLIC_SUPABASE_URL: string;
	export const PUBLIC_SUPABASE_ANON_KEY: string;
	export const PUBLIC_ANTHROPIC_API_KEY: string;
	export const PUBLIC_GIPHY_API_KEY: string;
	export const VITE_MEM0_API_KEY: string;
}

export {};
