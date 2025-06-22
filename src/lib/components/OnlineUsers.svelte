<script lang="ts">
	import { onlineUsers, onlineCount, isPresenceConnected, sendPoke, sendEmojiReaction } from '$lib/stores/presence';
	import { authStore } from '$lib/stores/auth';
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import type { OnlineUser } from '$lib/stores/presence';
	import EmojiPicker from './EmojiPicker.svelte';

	// Limit displayed users to prevent UI overflow
	const MAX_DISPLAYED_USERS = 6;
	
	let displayedUsers = $derived($onlineUsers.slice(0, MAX_DISPLAYED_USERS));
	let additionalCount = $derived(Math.max(0, $onlineCount - MAX_DISPLAYED_USERS));

	// Track which user's emoji picker is open
	let emojiPickerOpen = $state<string | null>(null);

	/**
	 * Get user initials for avatar fallback
	 */
	function getUserInitials(fullName: string): string {
		return fullName
			.split(' ')
			.map(name => name.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	/**
	 * Get relative time string
	 */
	function getRelativeTime(onlineAt: string): string {
		const now = new Date();
		const online = new Date(onlineAt);
		const diffMinutes = Math.floor((now.getTime() - online.getTime()) / (1000 * 60));
		
		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		
		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		
		return 'Today';
	}

	/**
	 * Get role badge color
	 */
	function getRoleBadgeColor(role: 'teacher' | 'student'): string {
		return role === 'teacher' ? 'bg-purple text-white' : 'bg-blue-500 text-white';
	}

	/**
	 * Handle poke action
	 */
	async function handlePoke(user: OnlineUser): Promise<void> {
		await sendPoke(user);
	}

	/**
	 * Handle emoji selection
	 */
	async function handleEmojiSelect(user: OnlineUser, emoji: string): Promise<void> {
		await sendEmojiReaction(user, emoji);
		emojiPickerOpen = null;
	}

	/**
	 * Toggle emoji picker for a user
	 */
	function toggleEmojiPicker(userId: string): void {
		emojiPickerOpen = emojiPickerOpen === userId ? null : userId;
	}

	/**
	 * Check if user is the current user (can't interact with themselves)
	 */
	function isCurrentUser(userId: string): boolean {
		return userId === $authStore.user?.id;
	}
</script>

<div class="bg-card border border-border rounded-lg p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-semibold text-highlight flex items-center gap-2">
			<div class="relative">
				<svg class="w-5 h-5 text-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
					<circle cx="9" cy="7" r="4"></circle>
					<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
					<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
				</svg>
				{#if $isPresenceConnected}
					<div 
						class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card"
						transition:fade
						title="Connected to presence"
					></div>
				{/if}
			</div>
			Online Users
		</h2>
		
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-highlight">{$onlineCount}</span>
			<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
		</div>
	</div>

	{#if !$isPresenceConnected}
		<div class="text-center py-4">
			<div class="text-muted text-sm">
				<svg class="w-6 h-6 mx-auto mb-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12a9 9 0 11-6.219-8.56"/>
				</svg>
				Connecting to presence...
			</div>
		</div>
	{:else if $onlineCount === 0}
		<div class="text-center py-6">
			<div class="text-muted">
				<svg class="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
					<circle cx="12" cy="7" r="4"></circle>
				</svg>
				<p class="text-sm">No users online</p>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			{#each displayedUsers as user (user.user_id)}
				<div 
					class="flex items-center gap-3 p-3 bg-surface/50 rounded-lg hover:bg-surface transition-all duration-200"
					transition:fly={{ y: 20, duration: 300 }}
					animate:flip={{ duration: 300 }}
				>
					<!-- Avatar -->
					<div class="relative flex-shrink-0">
						{#if user.avatar_url}
							<img 
								src={user.avatar_url} 
								alt={user.full_name}
								class="w-10 h-10 rounded-full object-cover"
							/>
						{:else}
							<div class="w-10 h-10 bg-gradient-to-br from-purple to-purple-hover rounded-full flex items-center justify-center">
								<span class="text-white text-sm font-medium">
									{getUserInitials(user.full_name)}
								</span>
							</div>
						{/if}
						
						<!-- Online indicator -->
						<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
					</div>

					<!-- User info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<span class="text-sm font-medium text-highlight truncate">
								{user.full_name}
							</span>
						</div>
						<div class="space-y-0.5">
							{#if user.status_text}
								<p class="text-xs text-purple truncate">
									{user.status_text}
								</p>
							{/if}
							<p class="text-xs text-muted truncate" title={user.email}>
								{getRelativeTime(user.online_at)}
							</p>
						</div>
					</div>

					<!-- Action buttons (hidden for current user) -->
					{#if !isCurrentUser(user.user_id)}
						<div class="flex gap-1">
							<!-- Emoji reaction button -->
							<div class="relative">
								<button
									onclick={() => toggleEmojiPicker(user.user_id)}
									class="flex-shrink-0 p-2 text-purple hover:text-purple-hover hover:bg-surface rounded-lg transition-colors"
									title="Send emoji reaction to {user.full_name}"
									aria-label="Send emoji reaction to {user.full_name}"
								>
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="10"/>
										<path d="M8 14s1.5 2 4 2 4-2 4-2"/>
										<line x1="9" y1="9" x2="9.01" y2="9"/>
										<line x1="15" y1="9" x2="15.01" y2="9"/>
									</svg>
								</button>
								
								<!-- Emoji picker -->
								{#if emojiPickerOpen === user.user_id}
									<div class="absolute bottom-full right-0 mb-2">
										<EmojiPicker
											on:select={(e) => handleEmojiSelect(user, e.detail)}
											on:close={() => emojiPickerOpen = null}
										/>
									</div>
								{/if}
							</div>

							<!-- Poke button -->
							<button
								onclick={() => handlePoke(user)}
								class="flex-shrink-0 p-2 text-purple hover:text-purple-hover hover:bg-surface rounded-lg transition-colors"
								title="Poke {user.full_name}"
								aria-label="Poke {user.full_name}"
							>
								<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 12l2 2 4-4"/>
									<path d="M21 12c0 1.2-.6 2.3-1.5 3L12 21.5 4.5 15c-.9-.7-1.5-1.8-1.5-3C3 9.5 5.5 7 8.5 7c1.3 0 2.5.6 3.5 1.5C13 7.6 14.2 7 15.5 7 18.5 7 21 9.5 21 12z"/>
								</svg>
							</button>
						</div>
					{:else}
						<!-- Show indicator for current user -->
						<div class="flex items-center">
							<span class="text-xs text-muted bg-surface px-2 py-1 rounded">You</span>
						</div>
					{/if}
				</div>
			{/each}

			{#if additionalCount > 0}
				<div 
					class="text-center py-2 text-sm text-muted border-t border-border"
					transition:fade
				>
					and {additionalCount} more online
				</div>
			{/if}
		</div>
	{/if}

	<!-- Connection status footer -->
	<div class="mt-4 pt-3 border-t border-border">
		<div class="flex items-center justify-between text-xs">
			<span class="text-muted">Real-time presence</span>
			<div class="flex items-center gap-1">
				<div class={`w-1.5 h-1.5 rounded-full ${$isPresenceConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
				<span class={$isPresenceConnected ? 'text-green-600' : 'text-red-600'}>
					{$isPresenceConnected ? 'Connected' : 'Disconnected'}
				</span>
			</div>
		</div>
	</div>
</div>