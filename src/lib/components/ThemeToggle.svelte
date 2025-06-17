<script lang="ts">
  import { themeStore, themeActions } from '$lib/stores/theme';
  import ThemeSettings from '$lib/components/ThemeSettings.svelte';

  const $theme = $derived($themeStore);
  let showThemeSettings = $state(false);

  function quickToggle() {
    // Quick toggle between light/dark, open settings on third click
    if ($theme.mode === 'light') {
      themeActions.setMode('dark');
    } else if ($theme.mode === 'dark') {
      themeActions.setMode('auto');
    } else {
      showThemeSettings = true;
    }
  }
</script>

<div class="relative">
  <button
    onclick={quickToggle}
    oncontextmenu={(e) => {
      e.preventDefault();
      showThemeSettings = true;
    }}
    class="p-2 rounded-full hover:bg-accent transition-colors dark:text-highlight"
    aria-label="Theme settings"
    title="Left click: cycle themes | Right click: settings"
  >
    {#if $theme.mode === 'dark'}
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    {:else if $theme.mode === 'light'}
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    {:else}
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    {/if}
  </button>

  <!-- Quick color preview -->
  <div 
    class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-bg-base"
    style="background-color: var(--purple)"
    title="Current accent: {$theme.accentColor}"
  ></div>
</div>

<ThemeSettings bind:open={showThemeSettings} />
