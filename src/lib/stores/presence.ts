/**
 * @ai-context PRESENCE_STORE - Real-time user presence tracking with Supabase Realtime
 * @ai-dependencies supabase, notifications store, auth store
 * @ai-sideEffects Manages Supabase Realtime channel, updates presence tracking, shows toast notifications
 * @ai-exports presenceStore, onlineUsers, joinPresence, leavePresence
 */
import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { showInfoToast } from '$lib/stores/notifications';
import { authStore } from '$lib/stores/auth';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import type { UnknownError } from '$lib/types/ai-enforcement';

export interface OnlineUser {
	user_id: string;
	full_name: string;
	email: string;
	avatar_url?: string;
	role: 'teacher' | 'student';
	online_at: string;
	current_page?: string;
	status_text?: string;
}

interface PresencePayload {
	user_id: string;
	full_name: string;
	email: string;
	avatar_url?: string;
	role: 'teacher' | 'student';
	online_at: string;
	current_page?: string;
	status_text?: string;
}

// Stores
export const onlineUsers = writable<OnlineUser[]>([]);
export const isPresenceConnected = writable(false);
export const presenceError = writable<string | null>(null);

// Emoji reactions store
export interface EmojiReaction {
	id: string;
	emoji: string;
	fromUser: string;
	timestamp: number;
}

export const emojiReactions = writable<EmojiReaction[]>([]);

// Derived stores
export const onlineCount = derived(onlineUsers, ($users) => $users.length);
export const onlineTeachers = derived(onlineUsers, ($users) => 
	$users.filter(user => user.role === 'teacher')
);
export const onlineStudents = derived(onlineUsers, ($users) => 
	$users.filter(user => user.role === 'student')
);

// Private variables
let presenceChannel: RealtimeChannel | null = null;
let currentUserId: string | null = null;
let lastPagePath: string | null = null;

// Track recent notifications to prevent spam
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 30000; // 30 seconds cooldown

/**
 * Get user-friendly status text based on current page
 */
function getStatusFromPage(pathname: string): string {
	if (pathname === '/') return 'On Dashboard';
	if (pathname === '/dashboard') return 'On Dashboard';
	if (pathname === '/gradebook') return 'Grading Students';
	if (pathname === '/classes') return 'Managing Classes';
	if (pathname.includes('/seating-chart')) return 'Viewing Seating Chart';
	if (pathname === '/files') return 'Browsing Files';
	if (pathname === '/messaging') return 'Messaging';
	if (pathname === '/jeopardy') return 'Creating Games';
	if (pathname.startsWith('/jeopardy/play')) return 'Playing Jeopardy';
	if (pathname === '/snake') return 'Playing Snake';
	if (pathname === '/settings') return 'In Settings';
	if (pathname.startsWith('/student')) return 'Student View';
	if (pathname.includes('/chat')) return 'Chatting';
	if (pathname.includes('/game')) return 'Gaming';
	
	// Fallback for unknown pages
	const segments = pathname.split('/').filter(Boolean);
	if (segments.length > 0) {
		const page = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
		return `On ${page}`;
	}
	
	return 'Online';
}

/**
 * Check if we should show a notification for this user
 */
function shouldShowNotification(userId: string, eventType: 'join' | 'leave'): boolean {
	const now = Date.now();
	const key = `${userId}-${eventType}`;
	const lastNotification = recentNotifications.get(key);
	
	if (lastNotification && (now - lastNotification) < NOTIFICATION_COOLDOWN) {
		return false; // Still in cooldown period
	}
	
	// Update the last notification time
	recentNotifications.set(key, now);
	
	// Clean up old entries to prevent memory leaks
	for (const [entryKey, timestamp] of recentNotifications.entries()) {
		if (now - timestamp > NOTIFICATION_COOLDOWN) {
			recentNotifications.delete(entryKey);
		}
	}
	
	return true;
}

/**
 * Initialize presence tracking for the current user
 */
export async function joinPresence(): Promise<void> {
	try {
		const authState = get(authStore);
		console.log('🔍 joinPresence called, authState:', { 
			hasUser: !!authState.user, 
			hasProfile: !!authState.profile,
			userId: authState.user?.id 
		});
		
		if (!authState.user || !authState.profile) {
			console.warn('Cannot join presence: user not authenticated');
			presenceError.set('User not authenticated');
			isPresenceConnected.set(false);
			return;
		}

		// Leave any existing channel first
		await leavePresence();

		currentUserId = authState.user.id;
		console.log('🔄 Creating presence channel for user:', currentUserId);
		
		// Create presence channel
		presenceChannel = supabase.channel('online-presence', {
			config: {
				presence: {
					key: currentUserId
				}
			}
		});

		// Handle presence state changes
		presenceChannel
			.on('presence', { event: 'sync' }, () => {
				handlePresenceSync();
			})
			.on('presence', { event: 'join' }, ({ key, newPresences }) => {
				handlePresenceJoin(key, newPresences);
			})
			.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
				handlePresenceLeave(key, leftPresences);
			})
			.on('broadcast', { event: 'poke' }, ({ payload }) => {
				handlePokeReceived(payload);
			})
			.on('broadcast', { event: 'emoji-reaction' }, ({ payload }) => {
				handleEmojiReactionReceived(payload);
			});

		// Subscribe to the channel
		console.log('📡 Subscribing to presence channel...');
		const status = await presenceChannel.subscribe(async (status) => {
			console.log('📡 Channel status:', status);
			
			if (status === 'SUBSCRIBED') {
				isPresenceConnected.set(true);
				presenceError.set(null);
				
				// Track current user's presence
				const currentPage = typeof window !== 'undefined' ? window.location.pathname : '/';
				const presencePayload: PresencePayload = {
					user_id: authState.user!.id,
					full_name: authState.profile!.full_name,
					email: authState.profile!.email,
					avatar_url: authState.profile!.avatar_url || undefined,
					role: authState.profile!.role as 'teacher' | 'student',
					online_at: new Date().toISOString(),
					current_page: currentPage,
					status_text: getStatusFromPage(currentPage)
				};

				console.log('👤 Tracking presence with payload:', presencePayload);
				await presenceChannel?.track(presencePayload);
				console.log('✅ Joined presence channel successfully');
			} else if (status === 'CHANNEL_ERROR') {
				isPresenceConnected.set(false);
				presenceError.set('Failed to connect to presence channel');
				console.error('❌ Presence channel error');
			} else if (status === 'TIMED_OUT') {
				isPresenceConnected.set(false);
				presenceError.set('Connection timed out');
				console.error('⏰ Presence channel timed out');
			} else if (status === 'CLOSED') {
				isPresenceConnected.set(false);
				presenceError.set('Connection closed');
				console.error('🔒 Presence channel closed');
			}
		});

	} catch (error: UnknownError) {
		console.error('Error joining presence:', error);
		presenceError.set(error instanceof Error ? error.message : 'Unknown presence error');
		isPresenceConnected.set(false);
	}
}

/**
 * Leave presence tracking and clean up
 */
export async function leavePresence(): Promise<void> {
	try {
		if (presenceChannel) {
			await presenceChannel.untrack();
			await presenceChannel.unsubscribe();
			presenceChannel = null;
		}
		
		isPresenceConnected.set(false);
		currentUserId = null;
		lastPagePath = null; // Reset page tracking
		console.log('✅ Left presence channel');
	} catch (error: UnknownError) {
		console.error('Error leaving presence:', error);
	}
}

/**
 * Handle presence sync - update full online users list
 */
function handlePresenceSync(): void {
	if (!presenceChannel) return;

	const presenceState: RealtimePresenceState = presenceChannel.presenceState();
	const users: OnlineUser[] = [];

	for (const key in presenceState) {
		const presences = presenceState[key];
		// Take the most recent presence for each user
		if (presences && presences.length > 0) {
			const latestPresence = presences[presences.length - 1] as unknown as PresencePayload;
			// Validate that we have the expected data structure
			if (latestPresence && latestPresence.user_id && latestPresence.full_name) {
				users.push({
					user_id: latestPresence.user_id,
					full_name: latestPresence.full_name,
					email: latestPresence.email,
					avatar_url: latestPresence.avatar_url,
					role: latestPresence.role,
					online_at: latestPresence.online_at,
					current_page: latestPresence.current_page,
					status_text: latestPresence.status_text
				});
			}
		}
	}

	// Sort by online time (most recent first)
	users.sort((a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime());
	
	onlineUsers.set(users);
	console.log(`👥 ${users.length} users online`);
}

/**
 * Handle user joining presence
 */
function handlePresenceJoin(key: string, newPresences: any[]): void {
	if (newPresences && newPresences.length > 0) {
		const presence = newPresences[0] as unknown as PresencePayload;
		
		// Don't show toast for current user
		if (presence.user_id !== currentUserId) {
			// Only show notification if not in cooldown period
			if (shouldShowNotification(presence.user_id, 'join')) {
				showInfoToast(
					`${presence.full_name} came online`,
					'User Online',
					3000
				);
			}
		}
	}
}

/**
 * Handle user leaving presence
 */
function handlePresenceLeave(key: string, leftPresences: any[]): void {
	if (leftPresences && leftPresences.length > 0) {
		const presence = leftPresences[0] as unknown as PresencePayload;
		
		// Don't show toast for current user
		if (presence.user_id !== currentUserId) {
			// Only show notification if not in cooldown period
			if (shouldShowNotification(presence.user_id, 'leave')) {
				showInfoToast(
					`${presence.full_name} went offline`,
					'User Offline',
					3000
				);
			}
		}
	}
}

/**
 * Get current online status
 */
export function isUserOnline(userId: string): boolean {
	const users = get(onlineUsers);
	return users.some(user => user.user_id === userId);
}

/**
 * Update current user's page status
 */
export async function updatePageStatus(pathname: string): Promise<void> {
	// Don't update if we're not connected or if the path hasn't changed
	if (!presenceChannel || !currentUserId || pathname === lastPagePath) {
		return;
	}

	const authState = get(authStore);
	if (!authState.user || !authState.profile) {
		return;
	}

	try {
		lastPagePath = pathname;
		
		const presencePayload: PresencePayload = {
			user_id: authState.user.id,
			full_name: authState.profile.full_name,
			email: authState.profile.email,
			avatar_url: authState.profile.avatar_url || undefined,
			role: authState.profile.role as 'teacher' | 'student',
			online_at: new Date().toISOString(),
			current_page: pathname,
			status_text: getStatusFromPage(pathname)
		};

		await presenceChannel.track(presencePayload);
		console.log('📍 Updated page status:', getStatusFromPage(pathname));
	} catch (error) {
		console.error('Failed to update page status:', error);
		// Don't break presence connection on page status update errors
		lastPagePath = null; // Reset so we can try again
	}
}

/**
 * Send an emoji reaction to another user
 */
export async function sendEmojiReaction(targetUser: OnlineUser, emoji: string): Promise<void> {
	if (!presenceChannel || !currentUserId) {
		console.warn('Cannot send emoji reaction: not connected to presence');
		return;
	}

	const authState = get(authStore);
	if (!authState.profile) {
		console.warn('Cannot send emoji reaction: no user profile');
		return;
	}

	try {
		// Generate UUID with fallback for older browsers
		const generateUUID = () => {
			if (typeof crypto !== 'undefined' && crypto.randomUUID) {
				return crypto.randomUUID();
			}
			// Fallback UUID generator
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				const r = Math.random() * 16 | 0;
				const v = c === 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		};

		const reactionPayload = {
			id: generateUUID(),
			emoji,
			from_user_id: currentUserId,
			from_name: authState.profile.full_name,
			to_user_id: targetUser.user_id,
			to_name: targetUser.full_name,
			timestamp: Date.now()
		};

		await presenceChannel.send({
			type: 'broadcast',
			event: 'emoji-reaction',
			payload: reactionPayload
		});

		// Show confirmation to sender
		showInfoToast(
			`${emoji} Sent to ${targetUser.full_name}!`,
			'Reaction Sent',
			2000
		);

		console.log(`${emoji} Emoji reaction sent to:`, targetUser.full_name);
	} catch (error) {
		console.error('Failed to send emoji reaction:', error);
		showInfoToast(
			'Failed to send reaction',
			'Error',
			3000
		);
	}
}

/**
 * Send a poke to another user
 */
export async function sendPoke(targetUser: OnlineUser): Promise<void> {
	if (!presenceChannel || !currentUserId) {
		console.warn('Cannot send poke: not connected to presence');
		return;
	}

	const authState = get(authStore);
	if (!authState.profile) {
		console.warn('Cannot send poke: no user profile');
		return;
	}

	try {
		const pokePayload = {
			from_user_id: currentUserId,
			from_name: authState.profile.full_name,
			to_user_id: targetUser.user_id,
			to_name: targetUser.full_name,
			timestamp: new Date().toISOString()
		};

		await presenceChannel.send({
			type: 'broadcast',
			event: 'poke',
			payload: pokePayload
		});

		// Show confirmation to sender
		showInfoToast(
			`👋 You poked ${targetUser.full_name}!`,
			'Poke Sent',
			3000
		);

		console.log('👋 Poke sent to:', targetUser.full_name);
	} catch (error) {
		console.error('Failed to send poke:', error);
		showInfoToast(
			'Failed to send poke',
			'Error',
			3000
		);
	}
}

/**
 * Handle receiving a poke
 */
function handlePokeReceived(payload: any): void {
	// Only show notification if the poke is for the current user
	if (payload.to_user_id === currentUserId) {
		showInfoToast(
			`👋 ${payload.from_name} poked you!`,
			'You got poked!',
			5000
		);
		console.log('👋 Received poke from:', payload.from_name);
	}
}

/**
 * Handle receiving an emoji reaction
 */
function handleEmojiReactionReceived(payload: any): void {
	// Only show reaction if it's for the current user
	if (payload.to_user_id === currentUserId) {
		const reaction: EmojiReaction = {
			id: payload.id,
			emoji: payload.emoji,
			fromUser: payload.from_name,
			timestamp: payload.timestamp
		};

		// Add to reactions store for animation
		emojiReactions.update(reactions => [...reactions, reaction]);

		console.log(`${payload.emoji} Received emoji reaction from:`, payload.from_name);
	}
}

/**
 * Handle page unload - clean up presence
 */
if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', () => {
		// Fire and forget - browser will handle cleanup
		void leavePresence();
	});
}

// Auto-cleanup on visibility change (when user switches tabs)
if (typeof document !== 'undefined') {
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			// Don't fully leave, just let Supabase handle the timeout
			// This prevents flickering when switching tabs briefly
			console.log('👁️ Tab hidden - presence will timeout naturally');
		} else if (document.visibilityState === 'visible') {
			// Re-track presence if we have a channel but aren't tracking
			if (presenceChannel && currentUserId && get(isPresenceConnected)) {
				console.log('👁️ Tab visible - refreshing presence');
				// The channel should automatically re-establish presence
			}
		}
	});
}

export default {
	onlineUsers,
	onlineCount,
	onlineTeachers,
	onlineStudents,
	isPresenceConnected,
	presenceError,
	emojiReactions,
	joinPresence,
	leavePresence,
	isUserOnline,
	sendPoke,
	sendEmojiReaction,
	updatePageStatus
};