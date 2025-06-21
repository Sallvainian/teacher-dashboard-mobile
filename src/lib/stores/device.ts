import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';

export const isMobile = writable(false);
export const isTablet = writable(false);
export const platform = writable<'web' | 'ios' | 'android'>('web');

export const isNative = derived(platform, ($platform) => $platform !== 'web');

export const deviceInfo = derived(
	[isMobile, isTablet, platform, isNative],
	([$isMobile, $isTablet, $platform, $isNative]) => ({
		isMobile: $isMobile,
		isTablet: $isTablet,
		isDesktop: !$isMobile && !$isTablet,
		platform: $platform,
		isNative: $isNative,
		isWeb: $platform === 'web'
	})
);

function detectDevice() {
	if (!browser) return;

	// Detect platform using Capacitor
	const capacitorPlatform = Capacitor.getPlatform();
	if (capacitorPlatform === 'ios') {
		platform.set('ios');
	} else if (capacitorPlatform === 'android') {
		platform.set('android');
	} else {
		platform.set('web');
	}

	// Detect device type using user agent and screen size
	const userAgent = navigator.userAgent.toLowerCase();
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;

	// Mobile detection
	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
	const isMobileScreen = screenWidth <= 768;
	const isMobileDevice = isMobileUA || isMobileScreen;

	// Tablet detection
	const isTabletUA = /ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP)))/i.test(userAgent);
	const isTabletScreen = screenWidth > 768 && screenWidth <= 1024;
	const isTabletDevice = isTabletUA || (isMobileUA && isTabletScreen);

	isMobile.set(isMobileDevice && !isTabletDevice);
	isTablet.set(isTabletDevice);
}

// Initialize device detection
if (browser) {
	detectDevice();
	
	// Re-detect on window resize (for responsive testing)
	window.addEventListener('resize', detectDevice);
	
	// Re-detect on orientation change
	window.addEventListener('orientationchange', () => {
		setTimeout(detectDevice, 100);
	});
}