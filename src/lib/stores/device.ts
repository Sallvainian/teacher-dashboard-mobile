/**
 * @ai-context DEVICE_STORE - Device and platform detection for responsive UI
 * @ai-dependencies Capacitor, ionic-svelte
 * @ai-sideEffects Updates device state based on platform detection
 * @ai-exports device store with platform info
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { isPlatform, getCurrentPlatform } from '$lib/ionic';

interface DeviceState {
	platform: string;
	isIOS: boolean;
	isAndroid: boolean;
	isMobile: boolean;
	isWeb: boolean;
	isTablet: boolean;
}

function createDeviceStore() {
	// For mobile app, default to mobile state
	const initialState: DeviceState = {
		platform: 'android', // Will be updated on detection
		isIOS: false,
		isAndroid: true,
		isMobile: true, // Always true for mobile app
		isWeb: false,
		isTablet: false
	};

	const { subscribe, set, update } = writable<DeviceState>(initialState);

	function detectDevice() {
		if (!browser) return;

		try {
			const platform = getCurrentPlatform();
			const isIOS = isPlatform('ios');
			const isAndroid = isPlatform('android');
			const isMobile = isPlatform('mobile');
			const isWeb = isPlatform('web');
			
			// Log for debugging Android logcat
			console.log('[Device Store] Platform Detection:', {
				platform,
				isIOS,
				isAndroid,
				isMobile,
				isWeb,
				userAgent: navigator.userAgent
			});
			
			// Basic tablet detection (can be improved)
			const isTablet = browser && (
				window.innerWidth >= 768 && 
				window.innerWidth <= 1024 &&
				isMobile
			);

			set({
				platform,
				isIOS,
				isAndroid,
				isMobile,
				isWeb,
				isTablet
			});
		} catch (error) {
			console.error('[Device Store] Detection Error:', error);
			// Keep default state if detection fails
		}
	}

	// Initialize device detection
	if (browser) {
		// Delay detection to ensure Capacitor is ready
		setTimeout(() => {
			detectDevice();
		}, 100);
		
		// Re-detect on resize (for responsive testing)
		window.addEventListener('resize', detectDevice);
	}

	return {
		subscribe,
		detectDevice
	};
}

export const device = createDeviceStore();

// Derived stores for convenience
export const isMobile = derived(device, ($device) => $device.isMobile);
export const isIOS = derived(device, ($device) => $device.isIOS);
export const isAndroid = derived(device, ($device) => $device.isAndroid);
export const isWeb = derived(device, ($device) => $device.isWeb);
export const isTablet = derived(device, ($device) => $device.isTablet);