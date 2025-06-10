<script lang="ts">
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth';

	// Props
	let { sidebarCollapsed = $bindable(false) } = $props();

	// All navigation items
	const allNavItems = [
		{
			href: '/dashboard',
			title: 'Dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
			roles: ['teacher', 'student']
		},
		{
			href: '/files',
			title: 'Files',
			icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
			roles: ['teacher', 'student']
		},
		{
			href: '/classes',
			title: 'Classes',
			icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
			roles: ['teacher']
		},
		{
			href: '/gradebook',
			title: 'Gradebook',
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
			roles: ['teacher']
		},
		{
			href: '/calendar',
			title: 'Calendar',
			icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
			roles: ['teacher', 'student']
		},
		{
			href: '/chat',
			title: 'Chat',
			icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
			roles: ['teacher', 'student']
		}
	];

	// Filter navigation items based on user role
	let navItems = $derived(
		allNavItems.filter(item => {
			const userRole = $authStore.role;
			return !userRole || item.roles.includes(userRole);
		})
	);

	function isActivePath(path: string): boolean {
		return $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
	}
</script>

<aside
	class="hidden md:block bg-card border-r border-border min-h-screen transition-[width] duration-150 relative"
	style="width: {sidebarCollapsed ? '3.5rem' : '16rem'};"
>
	<!-- Shoplit-style logo at top -->
	<div class="p-6 border-b border-border">
		{#if !sidebarCollapsed}
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 bg-purple rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
					</svg>
				</div>
				<span class="text-lg font-bold text-highlight">Teacher Dashboard</span>
			</div>
		{:else}
			<div class="flex justify-center">
				<div class="w-8 h-8 bg-purple rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
					</svg>
				</div>
			</div>
		{/if}
	</div>

	<!-- Toggle button -->
	<button
		onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
		class="absolute -right-3 top-6 z-10 w-6 h-6 bg-card border border-border text-muted rounded-md transition-colors hover:text-highlight"
	>
		{sidebarCollapsed ? '→' : '←'}
	</button>

	<!-- Navigation sections like Shoplit -->
	<div class="py-6">
		{#if !sidebarCollapsed}
			<div class="px-6 mb-2">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-muted">Education</h3>
			</div>
		{/if}

		<div class="space-y-1 px-3">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="flex items-center py-3 px-3 text-sm font-medium rounded-lg transition-all duration-200"
					class:justify-center={sidebarCollapsed}
					class:text-highlight={isActivePath(item.href)}
					class:text-text-hover={!isActivePath(item.href)}
					class:bg-accent={isActivePath(item.href)}
					class:hover:bg-accent={!isActivePath(item.href)}
					class:hover:text-highlight={!isActivePath(item.href)}
					class:border-l-4={isActivePath(item.href)}
					class:border-purple={isActivePath(item.href)}
					class:ml-1={isActivePath(item.href)}
				>
					<svg
						class="w-5 h-5 flex-shrink-0"
						class:mr-3={!sidebarCollapsed}
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
					</svg>
					{#if !sidebarCollapsed}
						<span>{item.title}</span>
					{/if}
				</a>
			{/each}
		</div>

		{#if !sidebarCollapsed}
			<!-- System section like Shoplit -->
			<div class="px-6 mt-8 mb-2">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-muted">System</h3>
			</div>
			<div class="space-y-1 px-3">
				<a href="/settings" class="flex items-center py-3 px-3 text-sm font-medium rounded-lg transition-all duration-200 text-text-hover hover:bg-accent hover:text-highlight">
					<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<span>Settings</span>
				</a>
			</div>
		{/if}
	</div>
</aside>
