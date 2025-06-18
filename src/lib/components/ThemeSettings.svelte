
<script lang="ts">
	import { themeStore, themeActions, ACCENT_COLORS, type AccentColorKey, type ThemeMode } from '$lib/stores/theme';

	let { open = $bindable(false) } = $props();

	const theme = $derived($themeStore);

	const themeModes: { key: ThemeMode; label: string; icon: string }[] = [
		{ key: 'light', label: 'Light', icon: '☀️' },
		{ key: 'dark', label: 'Dark', icon: '🌙' },
		{ key: 'auto', label: 'Auto', icon: '⚡' }
	];
</script>

{#if open}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
		<div class="bg-card border border-border rounded-lg shadow-dropdown max-w-md w-full max-h-[80vh] overflow-y-auto">
			<!-- Header -->
			<div class="p-6 border-b border-border">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-highlight">Theme Settings</h2>
					<button
						onclick={() => open = false}
						class="p-2 text-text-base hover:text-text-hover rounded-lg hover:bg-surface transition-colors"
						aria-label="Close theme settings"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Theme Mode -->
				<div>
					<h3 class="text-sm font-medium text-highlight mb-3">Mode</h3>
					<div class="grid grid-cols-3 gap-2">
						{#each themeModes as mode}
							<button
								onclick={() => themeActions.setMode(mode.key)}
								class="p-3 text-sm font-medium rounded-lg border transition-all duration-200"
								class:bg-purple={theme.mode === mode.key}
								class:text-white={theme.mode === mode.key}
								class:border-purple={theme.mode === mode.key}
								class:bg-surface={theme.mode !== mode.key}
								class:text-text-base={theme.mode !== mode.key}
								class:border-border={theme.mode !== mode.key}
								class:hover:bg-accent={theme.mode !== mode.key}
							>
								<div class="flex flex-col items-center gap-1">
									<span class="text-lg">{mode.icon}</span>
									<span>{mode.label}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Accent Colors -->
				<div>
					<h3 class="text-sm font-medium text-highlight mb-3">Accent Color</h3>
					<div class="grid grid-cols-4 gap-3">
						{#each Object.entries(ACCENT_COLORS) as [key, color]}
							<button
								onclick={() => themeActions.setAccentColor(key as AccentColorKey)}
								class="relative group p-3 rounded-lg border-2 transition-all duration-200"
								class:border-gray-300={theme.accentColor !== key}
								class:border-gray-600={theme.accentColor !== key}
								style="border-color: {theme.accentColor === key ? color.primary : 'var(--border)'}"
								title={color.name}
							>
								<!-- Color circle -->
								<div
									class="w-8 h-8 mx-auto rounded-full shadow-sm"
									style="background-color: {color.primary}"
								></div>
								
								<!-- Color name -->
								<div class="text-xs text-center mt-2 text-text-base">{color.name}</div>
								
								<!-- Selected indicator -->
								{#if theme.accentColor === key}
									<div class="absolute top-1 right-1 w-3 h-3 rounded-full bg-white shadow-sm flex items-center justify-center">
						 				<svg class="w-2 h-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Preview -->
				<div>
					<h3 class="text-sm font-medium text-highlight mb-3">Preview</h3>
					<div class="p-4 bg-surface rounded-lg border border-border">
						<div class="space-y-3">
							<!-- Sample button -->
							<button class="btn btn-primary">
								Primary Button
							</button>
							
							<!-- Sample card -->
							<div class="bg-card border border-border rounded-lg p-3">
								<h4 class="font-medium text-highlight">Sample Card</h4>
								<p class="text-sm text-text-base mt-1">This shows how your theme looks</p>
								<div class="mt-2">
									<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-bg text-purple">
										Accent Color
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-border bg-surface">
				<button
					onclick={() => open = false}
					class="w-full btn btn-secondary"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}