<script lang="ts">
	import { settingsStore } from '$lib/stores/settings';
	import { themeStore, themeActions, ACCENT_COLORS, type AccentColorKey } from '$lib/stores/theme';
	import ThemeSettings from '$lib/components/ThemeSettings.svelte';
	
	// Get reactive theme from store
	const theme = $derived($themeStore);
	
	let showThemeSettings = $state(false);
</script>

<div class="max-w-4xl mx-auto p-6">
	<h1 class="text-3xl font-bold text-highlight mb-8">Settings</h1>

	<!-- Theme Settings Section -->
	<div class="bg-dark-card border border-dark-border p-6 rounded-xl shadow-dark-card mb-8">
		<h2 class="text-xl font-semibold text-highlight mb-6">Theme & Appearance</h2>
		
		<div class="space-y-6">
			<!-- Current theme display -->
			<div class="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
				<div>
					<div class="font-medium text-text-hover mb-1">Current Theme</div>
					<div class="text-sm text-text-base">
						{theme.mode === 'auto' ? 'Auto (follows system)' : theme.mode === 'dark' ? 'Dark Mode' : 'Light Mode'} 
						• {ACCENT_COLORS[theme.accentColor].name}
					</div>
				</div>
				<div class="flex items-center gap-3">
					<!-- Accent color preview -->
					<div 
						class="w-8 h-8 rounded-full border-2 border-border shadow-sm"
						style="background-color: {ACCENT_COLORS[theme.accentColor].primary}"
						title="{ACCENT_COLORS[theme.accentColor].name} accent"
					></div>
					
					<!-- Theme mode icon -->
					<div class="text-2xl">
						{#if theme.mode === 'dark'}
							🌙
						{:else if theme.mode === 'light'}
							☀️
						{:else}
							⚡
						{/if}
					</div>
				</div>
			</div>
			
			<!-- Customize button -->
			<button
				onclick={() => showThemeSettings = true}
				class="w-full btn btn-secondary py-3 text-base font-medium"
			>
				🎨 Customize Theme & Colors
			</button>
			
			<!-- Theme description -->
			<p class="text-dark-muted text-sm leading-relaxed">
				Customize your dashboard appearance with different themes and accent colors. 
				Dark mode reduces eye strain in low-light environments and can help save battery on OLED displays.
			</p>
		</div>
	</div>


	<div class="bg-dark-card border border-dark-border p-6 rounded-xl shadow-dark-card mt-8">
		<h2 class="text-xl font-semibold text-highlight mb-4">About</h2>

		<p class="text-dark-muted mb-2">Teacher Dashboard v1.0.0</p>

		<p class="text-dark-muted mb-6">
			An all-in-one educational tool for teachers with gradebook, jeopardy, lesson planning, and
			classroom management features.
		</p>


	</div>
</div>

<!-- Theme Settings Modal -->
<ThemeSettings bind:open={showThemeSettings} />
