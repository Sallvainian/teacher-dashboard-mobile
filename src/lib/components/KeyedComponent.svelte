<script lang="ts">
  /**
   * KeyedComponent for optimized component rendering
   * 
   * This component wraps its content in a {#key} block, which forces
   * Svelte to completely destroy and recreate the component when the key changes.
   * This is useful for components that depend on specific props and need to be
   * completely re-rendered when those props change.
   */

  // The key that determines when to re-render the component
  let { key, className = '', tag = 'div', children }: {
    key: string | number | boolean | object | null | undefined;
    className?: string;
    tag?: 'div' | 'section' | 'article' | 'span' | 'none';
    children?: import('svelte').Snippet;
  } = $props();
</script>

{#key key}
  {#if tag === 'none'}
    {@render children?.()}
  {:else if tag === 'section'}
    <section class={className}>
      {@render children?.()}
    </section>
  {:else if tag === 'article'}
    <article class={className}>
      {@render children?.()}
    </article>
  {:else if tag === 'span'}
    <span class={className}>
      {@render children?.()}
    </span>
  {:else}
    <div class={className}>
      {@render children?.()}
    </div>
  {/if}
{/key}
