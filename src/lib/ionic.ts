/**
 * @ai-context IONIC_SETUP - Ionic framework initialization and platform detection
 * @ai-dependencies ionic-svelte, Capacitor
 * @ai-sideEffects Initializes Ionic components globally
 * @ai-exports setupIonic, isPlatform, isMobile
 */

import { setupIonicBase } from 'ionic-svelte';
import { Capacitor } from '@capacitor/core';

/**
 * Initialize Ionic framework
 */
export function setupIonic() {
	setupIonicBase();
	console.log('Ionic setup complete');
}

/**
 * Check if running on specific platform
 */
export function isPlatform(platform: string): boolean {
	if (typeof window === 'undefined') return false;
	
	switch (platform) {
		case 'ios':
			return Capacitor.getPlatform() === 'ios';
		case 'android':
			return Capacitor.getPlatform() === 'android';
		case 'mobile':
			return Capacitor.isNativePlatform();
		case 'web':
			return Capacitor.getPlatform() === 'web';
		default:
			return false;
	}
}

/**
 * Check if running on mobile device (iOS or Android)
 */
export function isMobile(): boolean {
	return isPlatform('mobile');
}

/**
 * Get current platform
 */
export function getCurrentPlatform(): string {
	return Capacitor.getPlatform();
}