<script lang="ts">
	import { emojiReactions } from '$lib/stores/presence';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	// Remove reactions after animation completes
	function removeReaction(reactionId: string) {
		emojiReactions.update(reactions => 
			reactions.filter(r => r.id !== reactionId)
		);
	}
</script>

<!-- Emoji reactions overlay -->
<div class="fixed inset-0 pointer-events-none z-50">
	{#each $emojiReactions as reaction (reaction.id)}
		{@const randomX = Math.random() * 25 + 70}
		{@const randomY = Math.random() * 5}
		<div
			class="absolute select-none emoji-float"
			style="left: {randomX}%; bottom: {randomY}%; font-size: 4rem;"
			onanimationend={() => removeReaction(reaction.id)}
		>
			{reaction.emoji}
		</div>
	{/each}
</div>

<style>
	.emoji-float {
		animation: floatUp 6s ease-out forwards;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
	}

	@keyframes floatUp {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(-70vh) scale(0.8);
			opacity: 0;
		}
	}
</style>