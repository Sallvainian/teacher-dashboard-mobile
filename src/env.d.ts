// Svelte 5 runes global declarations
declare global {
  // Svelte 5 runes - these are global in Svelte 5
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $state<T>(initial?: T): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $derived<T>(fn: () => T): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $effect(fn: () => void | (() => void)): void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $effect_pre(fn: () => void | (() => void)): void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $effect_tracking(): boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $props<T = Record<string, unknown>>(): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $bindable<T>(value?: T): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function $inspect<T>(...values: T[]): T extends unknown[] ? T : [T];
}

// Environment variable type declarations for SvelteKit
declare module '$env/static/public' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export const PUBLIC_SUPABASE_URL: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export const PUBLIC_SUPABASE_ANON_KEY: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export const PUBLIC_GIPHY_API_KEY: string;
}

declare module '$env/dynamic/public' {
  export const env: {
    PUBLIC_SUPABASE_URL?: string;
    PUBLIC_SUPABASE_ANON_KEY?: string;
    PUBLIC_GIPHY_API_KEY?: string;
  };
}

declare module '$env/static/private' {
  // Add any private environment variables here if needed
}

declare module '$env/dynamic/private' {
  export const env: Record<string, string | undefined>;
}

export {};
