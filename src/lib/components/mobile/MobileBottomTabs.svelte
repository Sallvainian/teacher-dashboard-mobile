<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	
	const tabs = [
		{ path: '/dashboard', icon: '🏠', label: 'Dashboard' },
		{ path: '/chat', icon: '💬', label: 'Chat' },
		{ path: '/gradebook', icon: '📊', label: 'Grades' },
		{ path: '/files', icon: '📁', label: 'Files' },
		{ path: '/settings', icon: '⚙️', label: 'Settings' }
	];
	
	function isActive(path: string) {
		return $page.url.pathname.startsWith(path);
	}
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
	<div class="flex justify-around items-center py-2">
		{#each tabs as tab}
			<button
				class="flex flex-col items-center p-2 min-w-0 flex-1 transition-colors"
				class:text-blue-600={isActive(tab.path)}
				class:dark:text-blue-400={isActive(tab.path)}
				class:text-gray-600={!isActive(tab.path)}
				class:dark:text-gray-400={!isActive(tab.path)}
				on:click={() => goto(tab.path)}
			>
				<span class="text-lg mb-1">{tab.icon}</span>
				<span class="text-xs font-medium leading-none">{tab.label}</span>
			</button>
		{/each}
	</div>
</nav>

<style>
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>