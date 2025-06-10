<script lang="ts">
  /**
   * StaticContent component for optimizing SSR
   * 
   * This component renders content that doesn't need interactivity,
   * minimizing client-side JavaScript by marking it as static.
   */
  import { markStatic, isServer } from '$lib/utils/ssr';

  // Whether to render the content only on the server
  let { serverOnly = false, minimal = true, className = '', children }: {
    serverOnly?: boolean;
    minimal?: boolean;
    className?: string;
    children?: import('svelte').Snippet;
  } = $props();

  // Mark the component as static
  const { isStatic: _isStatic } = markStatic();

  // Determine if the component should render
  const shouldRender = !serverOnly || isServer();
</script>

{#if shouldRender}
  {#if minimal}
    <!-- Render with minimal client-side JavaScript -->
    <div class={className}>
      {@render children?.()}
    </div>
  {:else}
    <!-- Render with normal hydration -->
    <div class={className}>
      {@render children?.()}
    </div>
  {/if}
{/if}

<style>
  /* Add any component-specific styles here */
</style>
