<script lang="ts">
	import { deviceInfo } from '$lib/stores/device';
	import MobileBottomTabs from '../mobile/MobileBottomTabs.svelte';
	import AppSidebar from '../AppLayout/AppSidebar.svelte';
</script>

{#if $deviceInfo.isMobile}
	<MobileBottomTabs />
{:else}
	<AppSidebar />
{/if}