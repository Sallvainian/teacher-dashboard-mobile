<script lang="ts">
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth/index';
	
	// Props
	let { open = $bindable(false) } = $props();
	
	// Navigation items
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
			href: '/messaging',
			title: 'Messages',
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
	
	function handleNavClick() {
		open = false;
	}
</script>

<!-- Mobile menu overlay -->
{#if open}
	<div class="fixed inset-0 z-40 md:hidden">
		<!-- Backdrop -->
		<button
			class="fixed inset-0 bg-black bg-opacity-50"
			onclick={() => open = false}
			aria-label="Close menu"
		></button>
		
		<!-- Menu panel -->
		<nav class="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-bottom">
			<div class="px-4 py-2">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-highlight">Menu</h2>
					<button
						onclick={() => open = false}
						class="p-2 rounded-lg hover:bg-accent text-muted"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
				
				<div class="grid grid-cols-3 gap-3 pb-4">
					{#each navItems as item (item.href)}
						<a
							href={item.href}
							onclick={handleNavClick}
							class="flex flex-col items-center p-4 rounded-lg transition-all"
							class:bg-purple={isActivePath(item.href)}
							class:text-white={isActivePath(item.href)}
							class:bg-surface={!isActivePath(item.href)}
							class:text-text-hover={!isActivePath(item.href)}
						>
							<svg
								class="w-6 h-6 mb-2"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
							</svg>
							<span class="text-xs font-medium">{item.title}</span>
						</a>
					{/each}
				</div>
				
				<div class="border-t border-separator pt-3">
					<a
						href="/settings"
						onclick={handleNavClick}
						class="flex items-center p-3 rounded-lg hover:bg-accent text-text-hover"
					>
						<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span class="text-sm">Settings</span>
					</a>
				</div>
			</div>
		</nav>
	</div>
{/if}

<style>
	/* Safe area for iPhone notch/home bar */
	.safe-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>