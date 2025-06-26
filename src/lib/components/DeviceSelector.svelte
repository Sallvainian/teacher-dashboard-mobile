<!--
@ai-context Device Selector Component - Audio/Video device selection
@ai-dependencies None
@ai-sideEffects Enumerates available media devices
@ai-exports Device selection UI component
-->

<script lang="ts">
	import { onMount } from 'svelte';
	
	const { 
		type,
		currentDeviceId = '',
		onchange
	}: {
		type: 'audioinput' | 'audiooutput' | 'videoinput';
		currentDeviceId?: string;
		onchange?: (deviceId: string) => void;
	} = $props();
	
	let devices = $state<MediaDeviceInfo[]>([]);
	let selectedDeviceId = $state(currentDeviceId);
	let isLoading = $state(true);
	let hasPermission = $state(true);
	
	// Get label for device type
	function getDeviceTypeLabel() {
		switch (type) {
			case 'audioinput':
				return 'Microphone';
			case 'audiooutput':
				return 'Speakers';
			case 'videoinput':
				return 'Camera';
		}
	}
	
	// Get icon for device type
	function getDeviceIcon() {
		switch (type) {
			case 'audioinput':
				return `<div class="text-white/80"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
					<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
					<line x1="12" y1="19" x2="12" y2="23"></line>
					<line x1="8" y1="23" x2="16" y2="23"></line>
				</svg></div>`;
			case 'audiooutput':
				return `<div class="text-white/80"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
					<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
				</svg></div>`;
			case 'videoinput':
				return `<div class="text-white/80"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="23 7 16 12 23 17 23 7"></polygon>
					<rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
				</svg></div>`;
			default:
				return '';
		}
	}
	
	// Enumerate devices
	async function loadDevices() {
		try {
			isLoading = true;
			
			// First check if we have permission by trying to get a stream
			// This is necessary because enumerateDevices() doesn't return labels without permission
			if (type === 'audioinput' || type === 'videoinput') {
				try {
					const constraints = type === 'audioinput' 
						? { audio: true, video: false }
						: { audio: false, video: true };
					const stream = await navigator.mediaDevices.getUserMedia(constraints);
					// Immediately stop the stream
					stream.getTracks().forEach(track => track.stop());
					hasPermission = true;
				} catch (error) {
					// Permission denied
					hasPermission = false;
				}
			}
			
			// Now enumerate devices
			const allDevices = await navigator.mediaDevices.enumerateDevices();
			devices = allDevices.filter(device => device.kind === type);
			
			// If we don't have labels, it means we don't have permission
			if (devices.length > 0 && !devices[0].label && type !== 'audiooutput') {
				hasPermission = false;
			}
			
			// If current device is not in the list, select the first one
			if (currentDeviceId && !devices.find(d => d.deviceId === currentDeviceId)) {
				selectedDeviceId = devices[0]?.deviceId || '';
			}
		} catch (error) {
				// Error enumerating devices
			devices = [];
		} finally {
			isLoading = false;
		}
	}
	
	// Handle device selection change
	function handleDeviceChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedDeviceId = select.value;
		onchange?.(selectedDeviceId);
	}
	
	// Listen for device plug/unplug
	function handleDeviceListChange() {
		loadDevices();
	}
	
	onMount(() => {
		loadDevices();
		
		// Listen for device changes (plug/unplug)
		navigator.mediaDevices.addEventListener('devicechange', handleDeviceListChange);
		
		return () => {
			navigator.mediaDevices.removeEventListener('devicechange', handleDeviceListChange);
		};
	});
	
	// Update selected device when prop changes
	$effect(() => {
		if (currentDeviceId !== selectedDeviceId) {
			selectedDeviceId = currentDeviceId;
		}
	});
</script>

<div class="flex items-center gap-3 w-full">
	{#if type === 'audioinput'}
		<div class="text-white/80"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
			<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
			<line x1="12" y1="19" x2="12" y2="23"></line>
			<line x1="8" y1="23" x2="16" y2="23"></line>
		</svg></div>
	{:else if type === 'audiooutput'}
		<div class="text-white/80"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
			<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
		</svg></div>
	{:else}
		<div class="text-white/80"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
			<circle cx="12" cy="13" r="4"></circle>
		</svg></div>
	{/if}
	
	{#if isLoading}
		<div class="text-sm text-white/60">Loading devices...</div>
	{:else if !hasPermission && type !== 'audiooutput'}
		<div class="text-sm text-yellow-400">Grant permission to see {getDeviceTypeLabel().toLowerCase()} options</div>
	{:else if devices.length === 0}
		<div class="text-sm text-white/60">No {getDeviceTypeLabel().toLowerCase()} found</div>
	{:else}
		<select 
			class="bg-white/10 text-white border border-white/20 rounded px-3 py-1 text-sm focus:outline-none focus:border-white/40 w-full min-w-0 flex-1"
			value={selectedDeviceId}
			onchange={handleDeviceChange}
		>
			{#each devices as device (device.deviceId)}
				<option value={device.deviceId} class="bg-gray-800">
					{device.label || `${getDeviceTypeLabel()} ${devices.indexOf(device) + 1}`}
				</option>
			{/each}
		</select>
	{/if}
</div>

<style>
	select {
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 1em;
		padding-right: 2rem;
		appearance: none;
	}
	
	select option {
		background-color: #1f2937;
		color: white;
	}
</style>