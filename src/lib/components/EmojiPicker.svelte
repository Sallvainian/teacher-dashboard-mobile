<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	const dispatch = createEventDispatcher<{
		select: string;
		close: void;
	}>();

	// Emoji categories
	const emojiCategories = {
		recent: {
			name: 'Recent',
			icon: '🕒',
			emojis: ['👍', '❤️', '😂', '🎉', '👏', '🔥', '😍', '💯']
		},
		smileys: {
			name: 'Smileys',
			icon: '😀',
			emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳']
		},
		people: {
			name: 'People',
			icon: '👥',
			emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤞', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤝', '🙏', '✍️', '💅', '🤳', '💪']
		},
		nature: {
			name: 'Nature',
			icon: '🌿',
			emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗']
		},
		food: {
			name: 'Food',
			icon: '🍎',
			emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠']
		},
		activities: {
			name: 'Activities',
			icon: '⚽',
			emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌']
		},
		travel: {
			name: 'Travel',
			icon: '🚗',
			emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅']
		},
		objects: {
			name: 'Objects',
			icon: '💡',
			emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭']
		},
		symbols: {
			name: 'Symbols',
			icon: '❤️',
			emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈']
		}
	};

	let activeCategory = $state('recent');
	let searchQuery = $state('');

	// Get current emojis
	function getCurrentEmojis() {
		if (searchQuery.trim()) {
			const allEmojis = Object.values(emojiCategories).flatMap(cat => cat.emojis);
			return allEmojis.filter(emoji => 
				emoji.includes(searchQuery.toLowerCase())
			);
		}
		
		if (activeCategory === 'recent') return emojiCategories.recent.emojis;
		if (activeCategory === 'smileys') return emojiCategories.smileys.emojis;
		if (activeCategory === 'people') return emojiCategories.people.emojis;
		if (activeCategory === 'nature') return emojiCategories.nature.emojis;
		if (activeCategory === 'food') return emojiCategories.food.emojis;
		if (activeCategory === 'activities') return emojiCategories.activities.emojis;
		if (activeCategory === 'travel') return emojiCategories.travel.emojis;
		if (activeCategory === 'objects') return emojiCategories.objects.emojis;
		if (activeCategory === 'symbols') return emojiCategories.symbols.emojis;
		
		return emojiCategories.recent.emojis;
	}

	function selectEmoji(emoji: string) {
		// Add to recent emojis
		const recentEmojis = emojiCategories.recent.emojis;
		if (!recentEmojis.includes(emoji)) {
			recentEmojis.unshift(emoji);
			if (recentEmojis.length > 8) {
				recentEmojis.pop();
			}
		}
		
		dispatch('select', emoji);
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			dispatch('close');
		}
	}

	function setCategory(category: string) {
		console.log('Setting category to:', category);
		activeCategory = category;
		searchQuery = '';
	}
</script>

<!-- Backdrop -->
<div 
	class="fixed inset-0 z-40 bg-black/20" 
	transition:fade={{ duration: 200 }}
	onclick={handleBackdropClick}
	onkeydown={(e) => e.key === 'Escape' && dispatch('close')}
	role="button"
	tabindex="-1"
></div>

<!-- Emoji picker -->
<div 
	class="absolute z-50 bg-card border border-border rounded-lg shadow-lg w-80 h-96"
	transition:scale={{ duration: 200, easing: quintOut }}
	role="dialog"
	aria-label="Select an emoji reaction"
>
	<!-- Header with close button -->
	<div class="flex items-center justify-between p-3 border-b border-border">
		<h3 class="text-sm font-medium text-highlight">Select Emoji</h3>
		<button
			onclick={() => dispatch('close')}
			class="text-muted hover:text-highlight transition-colors"
			aria-label="Close emoji picker"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"></line>
				<line x1="6" y1="6" x2="18" y2="18"></line>
			</svg>
		</button>
	</div>

	<!-- Search bar -->
	<div class="p-3 border-b border-border">
		<div class="relative">
			<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
			</svg>
			<input
				type="text"
				placeholder="Search emojis"
				bind:value={searchQuery}
				class="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple"
			/>
		</div>
	</div>

	<!-- Category tabs -->
	<div class="flex overflow-x-auto p-2 border-b border-border bg-surface/50">
		{#each Object.entries(emojiCategories) as [key, category]}
			<button
				onclick={() => setCategory(key)}
				class="flex-shrink-0 p-2 mx-1 rounded-lg transition-colors {activeCategory === key ? 'bg-purple text-white' : 'hover:bg-surface'}"
				title={category.name}
				aria-label={category.name}
			>
				<span class="text-lg">{category.icon}</span>
			</button>
		{/each}
	</div>

	<!-- Emoji grid -->
	<div class="flex-1 overflow-y-auto p-3">
		<div class="grid grid-cols-8 gap-2">
			{#each getCurrentEmojis() as emoji}
				<button
					class="w-8 h-8 text-lg hover:bg-surface rounded transition-colors flex items-center justify-center"
					onclick={() => selectEmoji(emoji)}
					title="Send {emoji}"
					aria-label="Send {emoji} reaction"
				>
					{emoji}
				</button>
			{/each}
		</div>
		
		{#if getCurrentEmojis().length === 0}
			<div class="text-center py-8 text-muted">
				<p class="text-sm">No emojis found</p>
				{#if searchQuery}
					<p class="text-xs mt-1">Try a different search term</p>
				{/if}
			</div>
		{/if}
	</div>
</div>