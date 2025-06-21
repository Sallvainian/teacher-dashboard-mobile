<script lang="ts">
	import { deviceInfo } from '$lib/stores/device';
	import MobileChatBubbles from '../mobile/MobileChatBubbles.svelte';
	// Import existing desktop chat component when available
	// import DesktopChatPanel from '../desktop/DesktopChatPanel.svelte';
	
	// For now, we'll use a placeholder for desktop chat
	import { chatStore } from '$lib/stores';
</script>

{#if $deviceInfo.isMobile}
	<MobileChatBubbles />
{:else}
	<!-- Desktop chat interface - using existing layout for now -->
	<div class="flex flex-col h-full">
		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			{#each $chatStore.messages as message}
				<div class="flex {message.isUser ? 'justify-end' : 'justify-start'}">
					<div 
						class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg {message.isUser 
							? 'bg-blue-500 text-white' 
							: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}"
					>
						{message.content}
					</div>
				</div>
			{/each}
		</div>
		<div class="border-t p-4">
			<div class="flex space-x-2">
				<input 
					type="text" 
					placeholder="Type a message..."
					class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
					Send
				</button>
			</div>
		</div>
	</div>
{/if}