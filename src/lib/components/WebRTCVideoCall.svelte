<!--
@ai-context WebRTC Video Call Component - Free P2P video calling interface
@ai-dependencies webrtcService, currentCall store, authStore
@ai-sideEffects Displays video streams, controls call state
@ai-exports Video call UI component
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { currentCall, webrtcService } from '$lib/services/webrtcService';
	import { authStore } from '$lib/stores/auth/index';
	import { get } from 'svelte/store';
	import { showErrorToast } from '$lib/stores/notifications';
	import DeviceSelector from './DeviceSelector.svelte';

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
	let isFullScreen = $state(false);
	let isAudioOnly = $state(false);
	let callDuration = $state(0);
	let callTimer: number | null = null;
	let showSettings = $state(false);
	let currentAudioDevice = $state('');
	let currentVideoDevice = $state('');
	let currentAudioOutput = $state('');

	// Subscribe to call state
	const unsubscribe = currentCall.subscribe((call) => {
		isCallActive = !!call?.isActive;
		localStream = call?.localStream || null;
		remoteStream = call?.remoteStream || null;
		isAudioOnly = call?.isAudioOnly || false;
		currentAudioDevice = call?.currentAudioDevice || '';
		currentVideoDevice = call?.currentVideoDevice || '';
		currentAudioOutput = call?.currentAudioOutput || '';
		
		// If there's a local stream but no video tracks, consider it audio only
		if (localStream && localStream.getVideoTracks().length === 0) {
			isVideoOff = true;
		}
		
		// Update video elements when streams change
		if (localVideoElement && localStream) {
			localVideoElement.srcObject = localStream;
		}
		if (remoteVideoElement && remoteStream) {
			remoteVideoElement.srcObject = remoteStream;
		}
	});

	// Format call duration as MM:SS
	function formatDuration(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Start call timer
	function startCallTimer() {
		callDuration = 0;
		callTimer = window.setInterval(() => {
			callDuration++;
		}, 1000);
	}

	onMount(() => {
		// Start call timer when component mounts
		startCallTimer();
		
		// Add fullscreen change event listener
		document.addEventListener('fullscreenchange', handleFullscreenChange);
	});

	onDestroy(() => {
		unsubscribe();
		
		// Clear call timer
		if (callTimer) {
			clearInterval(callTimer);
		}
		
		// Remove fullscreen change event listener
		document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
	
	function toggleFullScreen() {
		if (!document.fullscreenElement) {
			// Enter fullscreen
			const container = document.querySelector('.video-call-container');
			if (container && container.requestFullscreen) {
				container.requestFullscreen().catch(err => {
					showErrorToast(`Error attempting to enable fullscreen: ${err.message}`);
				});
			}
		} else {
			// Exit fullscreen
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}
	
	function handleFullscreenChange() {
		isFullScreen = !!document.fullscreenElement;
	}
	
	// Swap camera positions (picture-in-picture)
	function swapCameras() {
		const temp = localVideoElement.srcObject;
		localVideoElement.srcObject = remoteVideoElement.srcObject;
		remoteVideoElement.srcObject = temp;
	}
	
	// Handle audio device change
	async function handleAudioDeviceChange(deviceId: string) {
		await webrtcService.switchAudioDevice(deviceId);
	}
	
	// Handle video device change
	async function handleVideoDeviceChange(deviceId: string) {
		await webrtcService.switchVideoDevice(deviceId);
	}
	
	// Handle audio output change
	async function handleAudioOutputChange(deviceId: string) {
		await webrtcService.setAudioOutput(deviceId, remoteVideoElement);
	}
	
	// Toggle settings panel
	function toggleSettings() {
		showSettings = !showSettings;
	}
</script>

<div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 video-call-container">
	<div class="relative w-full h-full max-w-4xl mx-auto flex flex-col">
		<!-- Header -->
		<div class="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
			<div class="flex items-center">
				<h3 class="text-lg font-semibold text-white">Video Call</h3>
				{#if callDuration > 0}
					<span class="ml-4 text-white/80 text-sm">{formatDuration(callDuration)}</span>
				{/if}
			</div>
			<button
				onclick={endCall}
				class="p-2 hover:bg-red-500/20 rounded-full transition-colors"
				aria-label="End call"
			>
				<svg class="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18"></path>
					<path d="M6 6l12 12"></path>
				</svg>
			</button>
		</div>

		<!-- Video Area -->
		<div class="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
			<!-- Remote Video (main) -->
			<video
				bind:this={remoteVideoElement}
				autoplay
				class="w-full h-full object-cover"
				muted={false}
				playsinline
			></video>

			<!-- Local Video (picture-in-picture) -->
			<div class="absolute bottom-4 right-4 w-1/4 max-w-[200px] aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/20 shadow-lg cursor-move">
				<video
					bind:this={localVideoElement}
					autoplay
					muted={true}
					class="w-full h-full object-cover"
					playsinline
				></video>
				
				<!-- No camera indicator -->
				{#if isVideoOff || !localStream?.getVideoTracks().length || !localStream?.getVideoTracks()[0]?.enabled}
					<div class="absolute inset-0 flex items-center justify-center bg-black/80">
						<div class="text-center">
							<svg class="w-8 h-8 mx-auto mb-2 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
								<line x1="1" y1="1" x2="23" y2="23"></line>
							</svg>
							<p class="text-xs text-white/60">Camera off</p>
						</div>
					</div>
				{/if}
				
				<!-- No camera indicator -->
				{#if isVideoOff || !localStream?.getVideoTracks().length || !localStream?.getVideoTracks()[0]?.enabled}
					<div class="absolute inset-0 flex items-center justify-center bg-black/80">
						<div class="text-center">
							<svg class="w-8 h-8 mx-auto mb-2 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
								<line x1="1" y1="1" x2="23" y2="23"></line>
							</svg>
							<p class="text-xs text-white/60">Camera off</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- No remote video message -->
			{#if !remoteStream || !remoteStream.getVideoTracks().length || !remoteStream.getVideoTracks()[0]?.enabled}
				<div class="absolute inset-0 flex items-center justify-center bg-black/60">
					<div class="text-center text-white">
						<div class="w-20 h-20 bg-purple/30 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple/50">
							<svg class="w-10 h-10 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
								<circle cx="9" cy="7" r="4"></circle>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
							</svg>
						</div>
						<p class="text-lg">Waiting for other participant's video...</p>
						{#if isAudioOnly}
							<p class="text-sm mt-2 bg-black/40 py-2 px-4 rounded-full inline-block">Audio-only call</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Controls -->
		<div class="flex justify-center items-center gap-4 p-6 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-10">
			<!-- Mute Button -->
			<button
				onclick={toggleMute}
				class={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
				aria-label={isMuted ? 'Unmute' : 'Mute'}
				title={isMuted ? 'Unmute' : 'Mute'}
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
				class={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
				aria-label={isVideoOff ? 'Turn video on' : 'Turn video off'}
				title={isVideoOff ? 'Turn video on' : 'Turn video off'}
				disabled={!localStream?.getVideoTracks().length}
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
				class="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
				aria-label="End call"
				title="End call"
			>
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
				</svg>
			</button>

			<!-- Settings Button -->
			<button
				onclick={toggleSettings}
				class={`p-4 rounded-full transition-colors ${showSettings ? 'bg-purple text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
				aria-label="Settings"
				title="Settings"
			>
				<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
					<circle cx="12" cy="12" r="3"></circle>
				</svg>
			</button>
		</div>

		<!-- Settings Panel -->
		{#if showSettings}
			<div class="absolute bottom-28 left-4 right-4 mx-auto max-w-lg bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg p-4 space-y-4 z-20 shadow-xl">
				<div class="flex justify-between items-center mb-3">
					<h3 class="text-white font-semibold">Device Settings</h3>
					<button 
						onclick={toggleSettings}
						class="text-white/60 hover:text-white transition-colors"
						aria-label="Close settings"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				
				<!-- Microphone Selection -->
				<DeviceSelector 
					type="audioinput" 
					currentDeviceId={currentAudioDevice}
					onchange={handleAudioDeviceChange}
				/>
				
				<!-- Camera Selection -->
				{#if !isAudioOnly}
					<DeviceSelector 
						type="videoinput" 
						currentDeviceId={currentVideoDevice}
						onchange={handleVideoDeviceChange}
					/>
				{/if}
				
				<!-- Speaker Selection -->
				<DeviceSelector 
					type="audiooutput" 
					currentDeviceId={currentAudioOutput}
					onchange={handleAudioOutputChange}
				/>
			</div>
		{/if}

		<!-- Call Status -->
		<div class="px-6 pb-4 absolute bottom-16 left-0 right-0 flex justify-center z-10">
			<div class="text-center text-sm px-4 py-1 bg-black/40 text-white/80 rounded-full">
				{#if isCallActive && remoteStream}
					<p>{formatDuration(callDuration)}</p>
				{:else if isCallActive}
					<p class="text-yellow-300">⏱️ Connecting...</p>
				{:else}
					<p class="text-red-300">Call ended</p>
				{/if}
			</div>
		</div>
	</div>
</div>
<style lang="postcss">
	/* Ensure videos fill their containers properly */
	video {
		object-fit: cover;
		background-color: #000;
	}
	
	/* Smooth transitions for UI elements */
	button {
		transition: all 0.2s ease;
	}
	
	/* Ensure the component takes up the full screen */
	.video-call-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
		background-color: rgba(0, 0, 0, 0.9);
	}
</style>