<script lang="ts">
	import '../app.css';
	import '../app.postcss';
	// Core imports
	import '@fontsource/inter/400.css';
	import '@fontsource/inter/500.css';
	import '@fontsource/inter/600.css';

	// Ionic setup
	import { onMount } from 'svelte';
	import { setupIonic } from '$lib/ionic';
	import { device } from '$lib/stores/device';
	import { Capacitor } from '@capacitor/core';

	// Main layout component
	import AppLayout from '$lib/components/AppLayout/AppLayout.svelte';
	import GlobalLoader from '$lib/components/GlobalLoader.svelte';
	import ConfirmationModalProvider from '$lib/components/ConfirmationModalProvider.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';

	// Get children prop for Svelte 5
	let { children } = $props();
	
	onMount(async () => {
		console.log('App mounted, initializing Ionic...');
		console.log('Capacitor platform:', Capacitor.getPlatform());
		console.log('Is native platform:', Capacitor.isNativePlatform());
		
		// Initialize Ionic
		setupIonic();
		console.log('Ionic initialized');
		
		// Initialize device detection
		device.detectDevice();
		console.log('Device detection initialized:', $device);
	});
	
</script>

<AppLayout>
	{@render children?.()}
</AppLayout>

<!-- Global loading overlay -->
<GlobalLoader />

<!-- Global confirmation modal -->
<ConfirmationModalProvider />

<!-- Toast notifications -->
<ToastContainer />
