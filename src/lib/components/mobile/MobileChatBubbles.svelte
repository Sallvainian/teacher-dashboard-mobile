<script lang="ts">
	import { chatStore } from '$lib/stores';
	import { onMount } from 'svelte';
	
	let messageInput = '';
	let messagesContainer: HTMLElement;
	
	function sendMessage() {
		if (messageInput.trim()) {
			chatStore.sendMessage(messageInput.trim());
			messageInput = '';
			scrollToBottom();
		}
	}
	
	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 50);
	}
	
	onMount(() => {
		scrollToBottom();
	});
	
	$: if ($chatStore.messages) {
		scrollToBottom();
	}
</script>

<div class="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
	<!-- Chat Header -->
	<div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
	</div>
	
	<!-- Messages Container -->
	<div 
		bind:this={messagesContainer}
		class="flex-1 overflow-y-auto p-4 space-y-3"
	>
		{#each $chatStore.messages as message, i}
			<div class="flex {message.isUser ? 'justify-end' : 'justify-start'}">
				<div class="flex flex-col max-w-[80%]">
					{#if !message.isUser}
						<span class="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
							{message.sender || 'System'}
						</span>
					{/if}
					<div 
						class="px-4 py-3 rounded-2xl {message.isUser 
							? 'bg-blue-500 text-white rounded-br-md' 
							: 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-600'}"
					>
						<p class="text-sm leading-relaxed">{message.content}</p>
						<div class="flex justify-end mt-1">
							<span class="text-xs opacity-70">
								{new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
							</span>
						</div>
					</div>
				</div>
			</div>
		{/each}
		
		{#if $chatStore.isTyping}
			<div class="flex justify-start">
				<div class="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 dark:border-gray-600">
					<div class="flex space-x-1">
						<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
						<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
						<div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
					</div>
				</div>
			</div>
		{/if}
	</div>
	
	<!-- Message Input -->
	<div class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 safe-area-bottom">
		<div class="flex space-x-3 items-end">
			<div class="flex-1">
				<textarea
					bind:value={messageInput}
					placeholder="Type a message..."
					rows="1"
					class="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
					on:keydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							sendMessage();
						}
					}}
				></textarea>
			</div>
			<button
				on:click={sendMessage}
				disabled={!messageInput.trim()}
				class="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
	
	textarea {
		field-sizing: content;
		max-height: 120px;
	}
</style>