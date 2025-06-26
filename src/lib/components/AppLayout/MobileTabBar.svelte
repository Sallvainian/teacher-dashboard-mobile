<!--
	@ai-context MOBILE_TAB_BAR - Native mobile bottom tab navigation using Ionic
	@ai-dependencies ionic-svelte, auth store, page store
	@ai-sideEffects Navigation between app sections
	@ai-exports MobileTabBar component with bottom tabs
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth/index';
	import 'ionic-svelte';
	
	// Define main navigation tabs based on user role
	const tabItems = $derived(() => {
		const userRole = $authStore.role;
		
		if (userRole === 'teacher') {
			return [
				{
					tab: 'dashboard',
					href: '/dashboard',
					title: 'Dashboard',
					icon: 'home-outline'
				},
				{
					tab: 'gradebook', 
				href: '/gradebook',
				title: 'Gradebook',
				icon: 'library-outline'
				},
				{
					tab: 'files',
				href: '/files', 
				title: 'Files',
				icon: 'folder-outline'
				},
				{
					tab: 'messages',
				href: '/messaging',
				title: 'Messages', 
				icon: 'chatbubbles-outline'
				},
				{
					tab: 'more',
				href: '/settings',
				title: 'More',
				icon: 'ellipsis-horizontal-outline'
				}
			];
		} else {
			// Student navigation
			return [
				{
					tab: 'dashboard',
					href: '/dashboard', 
					title: 'Dashboard',
					icon: 'home-outline'
				},
				{
					tab: 'files',
				href: '/files',
				title: 'Files', 
				icon: 'folder-outline'
				},
				{
					tab: 'messages',
				href: '/messaging',
				title: 'Messages',
				icon: 'chatbubbles-outline'
				},
				{
					tab: 'games',
					href: '/student/games',
					title: 'Games',
					icon: 'game-controller-outline'
				},
				{
					tab: 'more',
				href: '/settings', 
				title: 'More',
				icon: 'ellipsis-horizontal-outline'
				}
			];
		}
	});
	
	// Get current active tab based on route
	const selectedTab = $derived(() => {
		const pathname = $page.url.pathname;
		
		// Find matching tab
		const matchingTab = tabItems.find(tab => {
			if (tab.href === pathname) return true;
			if (pathname.startsWith(tab.href + '/')) return true;
			return false;
		});
		
		return matchingTab?.tab || 'dashboard';
	});
</script>

<ion-tab-bar class="mobile-tab-bar">
	{#each tabItems as item (item.tab)}
		<ion-tab-button 
			tab={item.tab}
			href={item.href}
			class={selectedTab === item.tab ? 'tab-selected' : ''}
		>
			<ion-icon name={item.icon}></ion-icon>
			<ion-label>{item.title}</ion-label>
		</ion-tab-button>
	{/each}
</ion-tab-bar>

<style>
	.mobile-tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		--background: var(--bg-card);
		--color: var(--text-muted);
		--color-selected: var(--purple);
		border-top: 1px solid var(--border);
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--bg-card);
		backdrop-filter: blur(8px);
	}

	ion-tab-button {
		--color: var(--text-muted);
		--color-selected: var(--purple);
		--ripple-color: var(--purple-bg);
	}

	ion-tab-button.tab-selected {
		--color: var(--purple);
	}
</style>