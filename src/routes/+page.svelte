<script lang="ts">
	import { goto } from '$app/navigation';
	import { isAuthenticated, isInitialized } from '$lib/stores/auth/index';

	// Redirect based on authentication status using $effect
	$effect(() => {
		if ($isInitialized) {
			if ($isAuthenticated) {
				goto('/dashboard');
			} else {
				goto('/auth/login');
			}
		}
	});
</script>

<div class="flex items-center justify-center h-screen">
	<div class="text-center">
		<h1 class="text-2xl font-bold text-highlight mb-4">Teacher Dashboard</h1>
		<p class="text-muted mb-6">Loading...</p>
		<div
			class="w-12 h-12 border-4 border-purple border-t-highlight rounded-full animate-spin mx-auto"
		></div>
		<a href="/auth/login" class="text-purple hover:text-highlight mt-6 inline-block"
			>Click here if you are not redirected</a
		>
	</div>
</div>
