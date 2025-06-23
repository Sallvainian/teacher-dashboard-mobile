<!--
@ai-context WebRTC Video Call Component - Free P2P video calling interface
@ai-dependencies webrtcService, currentCall store, authStore
@ai-sideEffects Displays video streams, controls call state
@ai-exports Video call UI component
-->

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { currentCall, webrtcService } from '$lib/services/webrtcService';
	import { authStore } from '$lib/stores/auth/index';
	import { get } from 'svelte/store';

	let { 
		onClose
	}: {
		onClose?: () => void;
	} = $props();

	let localVideoElement: HTMLVideoElement;
	let remoteVideoElement: HTMLVideoElement;
	let isCallActive = $state(false);
	let localStream = $state<MediaStream | null>(null);
	let remoteStream = $state<MediaStream | null>(null);
	let isMuted = $state(false);
	let isVideoOff = $state(false);

	// Subscribe to call state
	const unsubscribe = currentCall.subscribe((call) => {
		isCallActive = !!call?.isActive;
		localStream = call?.localStream || null;
		remoteStream = call?.remoteStream || null;
		
		// Update video elements when streams change
		if (localVideoElement && localStream) {
			localVideoElement.srcObject = localStream;
		}
		if (remoteVideoElement && remoteStream) {
			remoteVideoElement.srcObject = remoteStream;
		}
	});

	async function endCall() {
		await webrtcService.endCall();
		onClose?.();
	}

	function toggleMute() {
		if (localStream) {
			const audioTracks = localStream.getAudioTracks();
			audioTracks.forEach(track => {
				track.enabled = !track.enabled;
			});
			isMuted = !audioTracks[0]?.enabled;
		}
	}

	function toggleVideo() {
		if (localStream) {
			const videoTracks = localStream.getVideoTracks();
			videoTracks.forEach(track => {
				track.enabled = !track.enabled;
			});
			isVideoOff = !videoTracks[0]?.enabled;
		}
	}

	onDestroy(() => {
		unsubscribe();
	});
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
	<div class="bg-card rounded-lg shadow-lg max-w-4xl w-full mx-4 overflow-hidden">
		<!-- Header -->
		<div class="flex justify-between items-center p-4 border-b border-border">
			<h3 class="text-lg font-semibold text-highlight">Video Call</h3>
			<button
				onclick={endCall}
				class="p-2 hover:bg-surface rounded-full transition-colors"
				aria-label="End call"
			>
				<svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18"></path>
					<path d="M6 6l12 12"></path>
				</svg>
			</button>
		</div>

		<!-- Video Area -->
		<div class="relative bg-gray-900 aspect-video">
			<!-- Remote Video (main) -->
			<video
				bind:this={remoteVideoElement}
				autoplay
				class="w-full h-full object-cover"
				muted={false}
			></video>

			<!-- Local Video (picture-in-picture) -->
			<div class="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border border-border">
				<video
					bind:this={localVideoElement}
					autoplay
					muted={true}
					class="w-full h-full object-cover"
				></video>
			</div>

			<!-- No remote video message -->
			{#if !remoteStream}
				<div class="absolute inset-0 flex items-center justify-center">
					<div class="text-center text-white">
						<div class="w-16 h-16 bg-purple rounded-full flex items-center justify-center mx-auto mb-4">
							<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
								<circle cx="9" cy="7" r="4"></circle>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
							</svg>
						</div>
						<p class="text-lg">Waiting for other participant...</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Controls -->
		<div class="flex justify-center items-center gap-4 p-6 bg-surface">
			<!-- Mute Button -->
			<button
				onclick={toggleMute}
				class={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
				aria-label={isMuted ? 'Unmute' : 'Mute'}
			>
				{#if isMuted}
					<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="1" y1="1" x2="23" y2="23"></line>
						<path d="M9 9v3a3 3 0 0 0 5.12 2.12l1.88-1.88"></path>
						<path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
						<line x1="12" y1="2" x2="12" y2="6"></line>
						<line x1="12" y1="18" x2="12" y2="22"></line>
					</svg>
				{:else}
					<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
						<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
						<line x1="12" y1="19" x2="12" y2="23"></line>
						<line x1="8" y1="23" x2="16" y2="23"></line>
					</svg>
				{/if}
			</button>

			<!-- Video Toggle Button -->
			<button
				onclick={toggleVideo}
				class={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
				aria-label={isVideoOff ? 'Turn video on' : 'Turn video off'}
			>
				{#if isVideoOff}
					<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
						<line x1="1" y1="1" x2="23" y2="23"></line>
					</svg>
				{:else}
					<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="23 7 16 12 23 17 23 7"></polygon>
						<rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
					</svg>
				{/if}
			</button>

			<!-- End Call Button -->
			<button
				onclick={endCall}
				class="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
				aria-label="End call"
			>
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
				</svg>
			</button>
		</div>

		<!-- Call Status -->
		<div class="px-6 pb-4">
			<div class="text-center">
				{#if isCallActive && remoteStream}
					<p class="text-sm text-green-500">🟢 Connected</p>
				{:else if isCallActive}
					<p class="text-sm text-yellow-500">🟡 Connecting...</p>
				{:else}
					<p class="text-sm text-text-base">Call ended</p>
				{/if}
			</div>
		</div>
	</div>
</div>