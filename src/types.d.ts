// Extend global window interface
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

// Svelte module declarations
declare module '*.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType;
  export default component;
}

export {};