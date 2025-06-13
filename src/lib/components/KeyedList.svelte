<script lang="ts">
  /**
   * KeyedList component for optimized list rendering
   * 
   * This component ensures that each item in a list has a unique key,
   * which helps Svelte's diffing algorithm efficiently update the DOM
   * when the list changes.
   */
  import { dev } from '$app/environment';

  // The array of items to render
  let { items = [], getKey = (_: unknown, index: number) => index, className = '', itemClassName = '', tag = 'div', itemTag = tag === 'ul' || tag === 'ol' ? 'li' : 'div', children }: {
    items?: unknown[];
    getKey?: (item: unknown, index: number) => string | number;
    className?: string;
    itemClassName?: string;
    tag?: 'ul' | 'ol' | 'div';
    itemTag?: 'li' | 'div';
    children?: import('svelte').Snippet<[{ item: unknown, index: number }]>;
  } = $props();

  // Check for duplicate keys in development mode
  $effect(() => {
    if (dev) {
      const currentKeys = items.map(getKey);
      const keySet = new Set(currentKeys);
      if (keySet.size !== currentKeys.length) {
        console.warn('KeyedList: Duplicate keys detected. Each item should have a unique key.');
      }
    }
  });
</script>

{#if tag === 'ul'}
  <ul class={className}>
    {#each items as item, index (getKey(item, index))}
      <li class={itemClassName}>
        {@render children?.({item, index})}
      </li>
    {/each}
  </ul>
{:else if tag === 'ol'}
  <ol class={className}>
    {#each items as item, index (getKey(item, index))}
      <li class={itemClassName}>
        {@render children?.({item, index})}
      </li>
    {/each}
  </ol>
{:else}
  <div class={className}>
    {#each items as item, index (getKey(item, index))}
      {#if itemTag === 'li'}
        <li class={itemClassName}>
          {@render children?.({item, index})}
        </li>
      {:else}
        <div class={itemClassName}>
          {@render children?.({item, index})}
        </div>
      {/if}
    {/each}
  </div>
{/if}
