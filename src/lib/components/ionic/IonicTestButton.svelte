<!--
	@ai-context IONIC_TEST_BUTTON - Test component to verify Ionic integration
	@ai-dependencies ionic-svelte, device store
	@ai-sideEffects None
	@ai-exports IonicTestButton component
-->

<script lang="ts">
	import 'ionic-svelte/components/ion-button';
	import { device } from '$lib/stores/device';
	import type { Snippet } from 'svelte';
	
	const { onclick, children } = $props<{
		onclick?: () => void;
		children?: Snippet;
	}>();
</script>

{#if $device.isMobile}
	<!-- Use Ionic button on mobile -->
	<ion-button fill="solid" role="button" tabindex="0" onclick={onclick} onkeydown={(e) => e.key === 'Enter' && onclick?.()}>
		{@render children?.()}
	</ion-button>
{:else}
	<!-- Use regular button on desktop -->
	<button class="btn btn-primary" onclick={onclick}>
		{@render children?.()}
	</button>
{/if}