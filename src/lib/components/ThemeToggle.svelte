<script lang="ts">
  import { onMount } from 'svelte';

  let isDarkMode = $state(false);
  let isClient = $state(false);

  onMount(() => {
    isClient = true;
    
    // Check localStorage for user preference
    const storedTheme = localStorage.getItem('theme');
    
    if (storedTheme) {
      isDarkMode = storedTheme === 'dark';
    } else {
      // If no stored preference, use OS preference
      isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    applyTheme(isDarkMode);
    
    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only apply if user hasn't explicitly chosen a theme
      if (!localStorage.getItem('theme')) {
        isDarkMode = e.matches;
        applyTheme(isDarkMode);
      }
    });
  });

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    applyTheme(isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }

  function applyTheme(dark: boolean) {
    if (!isClient) return;
    
    // Apply for Tailwind
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Apply for DaisyUI
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
</script>

<button
  onclick={toggleTheme}
  class="p-2 rounded-full hover:bg-accent transition-colors dark:text-highlight"
  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDarkMode}
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  {/if}
</button>
