<!--
	@ai-context MOBILE_APP_LAYOUT - Native mobile layout using Ionic components
	@ai-dependencies ionic-svelte, auth store, page store
	@ai-sideEffects Renders native mobile app structure
	@ai-exports MobileAppLayout with ion-app structure
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { navigating } from '$app/stores';
import MobileTabBar from './MobileTabBar.svelte';
import LoadingBounce from '$components/LoadingBounce.svelte';
import 'ionic-svelte/components/ion-app';
import 'ionic-svelte/components/ion-header';
import 'ionic-svelte/components/ion-toolbar';
import 'ionic-svelte/components/ion-title';
import 'ionic-svelte/components/ion-content';
import 'ionic-svelte/components/ion-tabs';
import 'ionic-svelte/components/ion-back-button';
import 'ionic-svelte/components/ion-buttons';
	
	// Get children snippet
	const { children }: { children?: import('svelte').Snippet } = $props();
	
	// Get page title based on route
	const pageTitle = $derived(() => {
		const pathname = $page.url.pathname;
		
		const titles: Record<string, string> = {
			'/dashboard': 'Dashboard',
			'/gradebook': 'Gradebook', 
			'/files': 'Files',
			'/messaging': 'Messages',
			'/classes': 'Classes',
			'/assignments': 'Assignments',
			'/calendar': 'Calendar',
			'/settings': 'Settings',
			'/student/games': 'Games',
			'/student/dashboard': 'Dashboard'
		};
		
		// Check for exact match first
		if (titles[pathname]) {
			return titles[pathname];
		}
		
		// Check for partial matches
		for (const [path, title] of Object.entries(titles)) {
			if (pathname.startsWith(path + '/')) {
				return title;
			}
		}
		
		return 'Teacher Dashboard';
	});
	
	// Check if we need back button (not on main tabs)
	const showBackButton = $derived(() => {
		const pathname = $page.url.pathname;
		const mainTabs = ['/dashboard', '/gradebook', '/files', '/messaging', '/student/games', '/settings'];
		return !mainTabs.includes(pathname);
	});
</script>

<ion-app>
	<!-- Header -->
	<ion-header>
		<ion-toolbar color="primary">
			{#if showBackButton}
				<ion-buttons>
					<ion-back-button default-href="/dashboard"></ion-back-button>
				</ion-buttons>
			{/if}
			<ion-title>{pageTitle}</ion-title>
		</ion-toolbar>
	</ion-header>
	
	<!-- Main Content -->
	<ion-content class="mobile-content">
		{#if $navigating}
			<div class="loading-overlay">
				<LoadingBounce />
			</div>
		{/if}
		{@render children?.()}
	</ion-content>
	
	<!-- Bottom Tab Navigation -->
	<MobileTabBar />
</ion-app>

<style>
	ion-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		
		--ion-color-primary: var(--purple);
		--ion-color-primary-rgb: var(--purple-rgb);
		--ion-color-primary-contrast: #ffffff;
		--ion-color-primary-contrast-rgb: 255, 255, 255;
		--ion-color-primary-shade: var(--purple-hover);
		--ion-color-primary-tint: var(--purple-light);
		
		--ion-background-color: var(--bg-base);
		--ion-text-color: var(--text-base);
		
		--ion-toolbar-background: var(--purple);
		--ion-toolbar-color: #ffffff;
	}
	
	ion-header {
		position: sticky;
		top: 0;
		z-index: 100;
	}
	
	.mobile-content {
		flex: 1;
		overflow-y: auto;
		--background: var(--bg-base);
		--color: var(--text-base);
		--padding-start: 16px;
		--padding-end: 16px;
		--padding-top: 16px;
		--padding-bottom: 80px; /* Account for bottom tabs */
	}
	
	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(var(--bg-base-rgb), 0.8);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
</style>