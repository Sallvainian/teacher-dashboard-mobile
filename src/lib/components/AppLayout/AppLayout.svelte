<script lang="ts">
	import { navigating, page } from '$app/stores';
	import { goto } from '$app/navigation';
	import LoadingBounce from '$components/LoadingBounce.svelte';
	import { isInitialized, isAuthenticated } from '$stores/auth';
	import { gradebookStore } from '$stores/gradebook';
	import { debounce } from '$utils/performanceOptimized';
	import { isHTMLElement } from '$lib/utils/domHelpers';
	import { initializeNotifications } from '$lib/stores/notifications';
	import AppHeader from './AppHeader.svelte';
	import AppSidebar from './AppSidebar.svelte';
	import ImportWizard from '$components/ImportWizard.svelte';

	// Get children prop
	let { children } = $props();

	// Define public routes that don't require authentication
	const PUBLIC_ROUTES = ['/auth/login', '/auth/signup', '/auth/reset-password'];
	
	// Check if current route is public
	let isPublicRoute = $derived(PUBLIC_ROUTES.includes($page.url.pathname));
	
	// Also treat root route as needing redirect handling
	let isRootRoute = $derived($page.url.pathname === '/');

	// Local state
	let sidebarCollapsed = $state(false);
	let userMenuOpen = $state(false);
	let classesDropdownOpen = $state(false);
	let showImportWizard = $state(false);

	// Debounced data loading to not block initial render
	const debouncedDataLoad = debounce(() => {
		gradebookStore.ensureDataLoaded().catch(console.error);
	}, 100);

	// Close dropdowns when clicking outside
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (isHTMLElement(event.target)) {
				if (userMenuOpen && !event.target.closest('.user-menu')) {
					userMenuOpen = false;
				}
				if (classesDropdownOpen && !event.target.closest('.classes-dropdown')) {
					classesDropdownOpen = false;
				}
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	// Load data after initial render
	$effect(() => {
		debouncedDataLoad();
	});

	// Initialize notifications when authenticated
	$effect(() => {
		if ($isAuthenticated) {
			initializeNotifications();
		}
	});

	// Handle authentication redirects
	$effect(() => {
		// Only redirect after auth is initialized to avoid redirect loops
		if ($isInitialized && !isRootRoute) {
			if (!$isAuthenticated && !isPublicRoute) {
				// Redirect to login if not authenticated and not on a public route
				goto('/auth/login');
			} else if ($isAuthenticated && isPublicRoute) {
				// Redirect to dashboard if authenticated and on a public route
				goto('/dashboard');
			}
		}
	});
</script>

<!-- Loading state while auth initializes -->
{#if !$isInitialized}
	<div class="min-h-screen bg-bg-base flex items-center justify-center">
		<div class="text-center">
			<LoadingBounce />
			<p class="text-muted mt-4">Initializing...</p>
		</div>
	</div>
{:else if isPublicRoute || isRootRoute}
	<!-- Public routes (auth pages) - simple layout without sidebar/header -->
	<div class="min-h-screen bg-bg-base text-text-base">
		{#if $navigating}
			<div
				class="absolute inset-0 bg-bg-base backdrop-blur-sm flex items-center justify-center z-50"
			>
				<LoadingBounce />
			</div>
		{/if}
		{@render children?.()}
	</div>
{:else if $isAuthenticated}
	<!-- Authenticated layout with full dashboard -->
	<div class="min-h-screen bg-bg-base text-text-base flex flex-col transition-colors">
		<!-- Header -->
		<AppHeader bind:userMenuOpen bind:classesDropdownOpen />

		<div class="flex flex-grow relative">
			<!-- Sidebar -->
			<AppSidebar bind:sidebarCollapsed />

			<!-- Main content -->
			<main class="flex-grow p-6 overflow-y-auto relative z-0">
				{#if $navigating}
					<div
						class="absolute inset-0 bg-bg-base backdrop-blur-sm flex items-center justify-center z-50"
					>
						<LoadingBounce />
					</div>
				{/if}
				{@render children?.()}
			</main>
		</div>

		<!-- Footer -->
		<footer
			class="bg-card backdrop-blur-sm text-center text-muted text-xs py-4 border-t border border-border/50 px-6"
		>
			Teacher Dashboard • {new Date().getFullYear()}
		</footer>
	</div>

	<!-- Import Wizard Modal -->
	{#if showImportWizard}
		<ImportWizard
			onClose={() => (showImportWizard = false)}
			onComplete={() => {
				showImportWizard = false;
				void gradebookStore.loadAllData();
			}}
		/>
	{/if}
{:else}
	<!-- Fallback - should not normally be reached due to redirects -->
	<div class="min-h-screen bg-bg-base flex items-center justify-center">
		<div class="text-center">
			<LoadingBounce />
			<p class="text-muted mt-4">Redirecting...</p>
		</div>
	</div>
{/if}
