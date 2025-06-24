/**
 * @ai-context WebRTC Video Service - Free peer-to-peer video calling
 * @ai-dependencies supabase for signaling, stores for state management
 * @ai-sideEffects Creates WebRTC connections, accesses user media
 * @ai-exports webrtcService for video calling functionality
 */

import { supabase } from '$lib/supabaseClient';
import { writable, get } from 'svelte/store';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { showErrorToast, showInfoToast } from '$lib/stores/notifications';
import type { UnknownError } from '$lib/types/ai-enforcement';

export interface VideoCall {
	id: string;
	participants: string[];
	isActive: boolean;
	localStream?: MediaStream;
	remoteStream?: MediaStream;
	isAudioOnly?: boolean;
}

// Store for current video call state
export const currentCall = writable<VideoCall | null>(null);
export const localVideo = writable<HTMLVideoElement | null>(null);
export const remoteVideo = writable<HTMLVideoElement | null>(null);
export const incomingCall = writable<{ isIncoming: boolean; callData: SignalData | null }>({ 
	isIncoming: false, 
	callData: null 
});

interface SignalData {
	type: 'offer' | 'answer' | 'ice-candidate' | 'end-call';
	data: any;
	from: string;
	to: string;
	callId: string;
}

class WebRTCService {
	private peerConnection: RTCPeerConnection | null = null;
	private localStream: MediaStream | null = null;
	private signalChannel: RealtimeChannel | null = null;
	private currentCallId: string | null = null;
	
	// Free STUN servers for NAT traversal (multiple providers for reliability)
	private readonly iceServers = [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:stun1.l.google.com:19302' },
		{ urls: 'stun:stun2.l.google.com:19302' },
		{ urls: 'stun:stun3.l.google.com:19302' },
		{ urls: 'stun:stun4.l.google.com:19302' },
		// Mozilla STUN servers as backup
		{ urls: 'stun:stun.mozilla.org:3478' },
		// Other free STUN servers
		{ urls: 'stun:stun.nextcloud.com:443' },
		{ urls: 'stun:stun.sipgate.net:3478' }
	];

	constructor() {
		this.initializeSignaling();
	}

	private async initializeSignaling() {
		// Clean up existing channel first
		if (this.signalChannel) {
			console.log('📡 Cleaning up existing signaling channel');
			await this.signalChannel.unsubscribe();
			this.signalChannel = null;
		}
		
		try {
			// Create a SHARED signaling channel for WebRTC (same name for all users)
			this.signalChannel = supabase.channel('webrtc-signaling-shared', {
				config: {
					presence: {
						key: ''
					}
				}
			});
			
			// Only subscribe if not already subscribed
			if (this.signalChannel.state !== 'subscribed') {
				this.signalChannel
					.on('broadcast', { event: 'signal' }, (payload) => {
						console.log('📡 Received signal:', payload.payload);
						this.handleSignal(payload.payload as SignalData);
					})
					.subscribe((status) => {
						console.log('📡 Signaling channel status:', status);
						if (status === 'SUBSCRIBED') {
							console.log('✅ WebRTC signaling ready on shared channel');
						} else if (status === 'CHANNEL_ERROR') {
							console.error('❌ Signaling channel error');
							this.signalChannel = null;
							// Retry initialization after a delay
							setTimeout(() => this.initializeSignaling(), 3000);
						}
					});
			} else {
				console.log('📡 Channel already subscribed');
			}
		} catch (error) {
			console.error('❌ Failed to initialize signaling:', error);
			this.signalChannel = null;
		}
	}

	async startCall(otherUserId: string, callId: string): Promise<boolean> {
		try {
			this.currentCallId = callId;
			
			// Check for secure context and mediaDevices availability
			if (!window.isSecureContext) {
				showErrorToast('Video calls require a secure connection (HTTPS). Please access the site via HTTPS.');
				throw new Error('Video calls require a secure connection (HTTPS). Please access the site via HTTPS.');
			}
			
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				showErrorToast('Your browser does not support camera and microphone access. Please use a modern browser.');
				throw new Error('Your browser does not support camera and microphone access. Please use a modern browser.');
			}

			// Check available devices first
			const devices = await navigator.mediaDevices.enumerateDevices();
			let hasCamera = devices.some(device => device.kind === 'videoinput');
			let hasMicrophone = devices.some(device => device.kind === 'audioinput');
			
			console.log('📱 Available devices:', { hasCamera, hasMicrophone });
			
			if (!hasMicrophone) {
				// No audio devices at all - show a warning but don't block the call
				showErrorToast('No camera or microphone devices found. Please connect audio/video devices and try again.');
				hasMicrophone = false;
				showInfoToast('This will be a silent call. You won\'t be heard.', 'Audio Unavailable', 8000);
			}
			
			// Get user media - gracefully handle missing devices
			try {
				const constraints: MediaStreamConstraints = {
					video: hasCamera ? { facingMode: 'user' } : false,
					audio: hasMicrophone
				};
				
				try {
					// Try to get media with the requested constraints
					this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
				} catch (mediaError: UnknownError) {
					// If that fails and we requested video, try again with just audio
					if (hasCamera) {
						console.log('📱 Failed to get video, trying audio only');
						try {
							this.localStream = await navigator.mediaDevices.getUserMedia({ audio: hasMicrophone, video: false });
							// We got audio-only even though camera exists
							showInfoToast('Your camera is unavailable or in use by another application. Proceeding with audio only.', 'Video Unavailable', 8000);
							hasCamera = false;
						} catch (audioOnlyError: UnknownError) {
							// Both video and audio failed, try one last time with just audio
							if (hasMicrophone) {
								try {
									this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
								} catch (finalError: UnknownError) {
									throw finalError;
								}
							} else {
								// Nothing worked - create an empty stream as a last resort
								this.localStream = new MediaStream();
								showInfoToast('No audio or video available. Others won\'t be able to see or hear you.', 'Limited Call', 8000);
							}
						}
					} else {
						// We were already trying audio-only, so re-throw
						throw mediaError;
					}
				}
				
				// Check what we actually got
				const hasVideoTrack = this.localStream?.getVideoTracks().length > 0;
				const hasAudioTrack = this.localStream?.getAudioTracks().length > 0;
				
				if (hasVideoTrack && hasAudioTrack) {
					console.log('✅ Got camera and microphone access');
				} else if (hasVideoTrack) {
					console.log('✅ Got camera access only');
					showInfoToast('No microphone detected. Others won\'t be able to hear you.', 'Audio Unavailable', 8000);
				} else if (hasAudioTrack) {
					console.log('✅ Got microphone access only');
					showInfoToast('No camera detected. This will be an audio-only call.', 'Audio-Only Call', 8000);
				} else {
					console.log('⚠️ No audio or video tracks available');
					showInfoToast('No audio or video available. Others won\'t see or hear you.', 'Limited Call', 8000);
				}
			} catch (error: any) {
				console.warn('❌ Media access error:', error);
				
				// Handle specific getUserMedia errors
				switch (error.name) {
					case 'NotAllowedError':
						showErrorToast('Media access was denied. Please grant permission in your browser settings and try again.', undefined, 8000);
						// Create an empty stream as fallback
						this.localStream = new MediaStream();
						showInfoToast('Call will be limited without audio/video permissions.', 'Limited Call', 8000);
						break;
					case 'NotFoundError':
						// Create an empty stream as fallback
						this.localStream = new MediaStream();
						showInfoToast('No media devices found. Call will continue but others won\'t see or hear you.', 'Limited Call', 8000);
						break;
					case 'NotReadableError':
						// Show informative message explaining cameras can only be used by one app
						showErrorToast('Your camera is already in use by another application (like Zoom, Teams, or another browser tab). Unlike microphones which can be shared, cameras can only be used by one application at a time.', 'Camera Busy', 8000);
						
						// Try again with just audio
						try {
							this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
							showInfoToast('Proceeding with audio-only call.', 'Audio-Only Call', 5000);
						} catch (audioError) {
							// Even audio failed, create empty stream
							this.localStream = new MediaStream();
							showInfoToast('Call will be limited without audio/video.', 'Limited Call', 5000);
						}
						break;
					case 'OverconstrainedError':
						// Try again with less strict constraints
						try {
							this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
							showInfoToast('Your camera doesn\'t meet requirements. Using audio only.', 'Audio-Only Call', 5000);
						} catch (audioError) {
							this.localStream = new MediaStream();
							showInfoToast('Call will be limited without audio/video.', 'Limited Call', 5000);
						}
						break;
					default:
						// Generic fallback for unknown errors
						this.localStream = new MediaStream();
						showInfoToast('Unable to access media devices. Call will be limited.', 'Limited Call', 5000);
						console.error('Media access error:', error);
						break;
				}
			}

			// Update store FIRST so ICE candidate handler can access participants
			const currentUserId = await this.getCurrentUserId();
			currentCall.set({
				id: callId,
				participants: [currentUserId, otherUserId],
				isActive: true,
				localStream: this.localStream,
				isAudioOnly: !this.localStream?.getVideoTracks().length
			});

			// Create peer connection
			this.createPeerConnection();
			
			// Add local stream to peer connection
			if (this.localStream) {
				this.localStream.getTracks().forEach(track => {
					if (this.peerConnection && this.localStream) {
						this.peerConnection.addTrack(track, this.localStream);
					}
				});
			}

			// Create offer
			const offer = await this.peerConnection!.createOffer();
			await this.peerConnection!.setLocalDescription(offer);

			// Send offer via signaling
			await this.sendSignal({
				type: 'offer',
				data: offer,
				from: currentUserId,
				to: otherUserId,
				callId
			});

			return true;
		} catch (error) {
			return false;
		}
	}

	async answerCall(callData: SignalData): Promise<boolean> {
		try {
			this.currentCallId = callData.callId;
			
			// Check for secure context and mediaDevices availability
			if (!window.isSecureContext) {
				showErrorToast('Video calls require a secure connection (HTTPS). Please access the site via HTTPS.');
				throw new Error('Video calls require a secure connection (HTTPS). Please access the site via HTTPS.');
			}
			
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				showErrorToast('Your browser does not support camera and microphone access. Please use a modern browser.');
				throw new Error('Your browser does not support camera and microphone access. Please use a modern browser.');
			}

			// Check available devices first
			const devices = await navigator.mediaDevices.enumerateDevices();
			let hasCamera = devices.some(device => device.kind === 'videoinput');
			const hasMicrophone = devices.some(device => device.kind === 'audioinput');
			
			console.log('📱 Available devices:', { hasCamera, hasMicrophone });
			
			if (!hasCamera && !hasMicrophone) {
				showErrorToast('No camera or microphone devices found. Please connect audio/video devices and try again.');
				throw new Error('No camera or microphone devices found. Please connect audio/video devices and try again.');
			}
			
			// Get user media - gracefully handle missing devices
			try {
				const constraints: MediaStreamConstraints = {
					video: hasCamera ? { facingMode: 'user' } : false,
					audio: hasMicrophone
				};
				
				this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
				
				if (hasCamera && hasMicrophone) {
					console.log('✅ Camera and microphone access granted');
				} else if (hasCamera) {
					console.log('✅ Camera access granted (no microphone available)');
					showInfoToast('No microphone detected. Others won\'t be able to hear you.', 'Audio Unavailable');
				} else if (hasMicrophone) {
					console.log('✅ Microphone access granted (no camera available)');
					showInfoToast('No camera detected. Others won\'t be able to see you.', 'Video Unavailable');
				} else {
					console.log('⚠️ No audio or video available');
					showInfoToast('No audio or video available. This will be a limited call.', 'Limited Call');
				}
			} catch (error: any) {
				console.warn('❌ Media access error:', error);
				
				// Handle specific getUserMedia errors
				switch (error.name) {
					case 'NotAllowedError':
						showErrorToast('Camera/microphone access was denied. Please grant permission in your browser settings and try again.');
						throw new Error('Media access was denied. Please grant permission in your browser settings and try again.');
					case 'NotFoundError':
						showErrorToast('No media devices found. Please connect a camera or microphone and try again.');
						throw new Error('No media devices found. Please connect a camera or microphone and try again.');
					case 'NotReadableError':
						showErrorToast('Cannot access your camera or microphone. They may be in use by another application.');
						throw new Error('Media device is not available or already in use by another application.');
					case 'OverconstrainedError':
						showErrorToast('Your camera doesn\'t meet the required constraints. Try using a different camera.');
						throw new Error('Media device constraints cannot be satisfied. Please try again.');
					default:
						showErrorToast(`Failed to access media devices: ${error.message}`);
						throw new Error(`Failed to access media devices: ${error.message}`);
				}
			}

			// Update store FIRST so ICE candidate handler can access participants
			const currentUserId = await this.getCurrentUserId();
			currentCall.set({
				id: callData.callId,
				participants: [currentUserId, callData.from],
				isActive: true,
				localStream: this.localStream
			});

			// Create peer connection
			this.createPeerConnection();
			
			// Add local stream
			if (this.localStream) {
				this.localStream.getTracks().forEach(track => {
					if (this.peerConnection && this.localStream) {
						this.peerConnection.addTrack(track, this.localStream);
					}
				});
			}

			// Set remote description (offer)
			await this.peerConnection!.setRemoteDescription(callData.data);

			// Create answer
			const answer = await this.peerConnection!.createAnswer();
			await this.peerConnection!.setLocalDescription(answer);

			// Send answer
			await this.sendSignal({
				type: 'answer',
				data: answer,
				from: currentUserId,
				to: callData.from,
				callId: callData.callId
			});

			return true;
		} catch (error) {
			return false;
		}
	}

	async endCall(): Promise<void> {
		if (this.currentCallId) {
			// Send end call signal
			await this.sendSignal({
				type: 'end-call',
				data: {},
				from: await this.getCurrentUserId(),
				to: '', // Will be handled by all participants
				callId: this.currentCallId
			});
		}

		this.cleanup();
	}

	private createPeerConnection() {
		this.peerConnection = new RTCPeerConnection({
			iceServers: this.iceServers
		});

		// Enhanced ICE candidate handling with detailed logging
		this.peerConnection.onicecandidate = async (event) => {
			console.log('🧊 ICE candidate event:', event.candidate ? 'New candidate' : 'All candidates sent');
			if (event.candidate && this.currentCallId) {
				console.log('🧊 ICE candidate details:', {
					type: event.candidate.type,
					protocol: event.candidate.protocol,
					address: event.candidate.address,
					port: event.candidate.port
				});
				
				const currentCallData = get(currentCall);
				if (currentCallData) {
					const currentUserId = await this.getCurrentUserId();
					const otherUserId = currentCallData.participants.find(
						id => id !== currentUserId
					);
					
					if (otherUserId) {
						console.log('📤 Sending ICE candidate to:', otherUserId, 'type:', event.candidate.type);
						const result = await this.sendSignal({
							type: 'ice-candidate',
							data: event.candidate,
							from: currentUserId,
							to: otherUserId,
							callId: this.currentCallId
						});
						console.log('📤 ICE candidate send result:', result);
					}
				}
			} else if (!event.candidate) {
				console.log('✅ All ICE candidates have been sent');
			}
		};

		// Enhanced remote stream handling
		this.peerConnection.ontrack = (event) => {
			console.log('🎥 Remote track received:', event.track.kind, event.streams.length, 'streams');
			let remoteStream = event.streams[0];
			if (remoteStream && remoteStream.getTracks().length > 0) {
				console.log('✅ Setting remote stream with tracks:', remoteStream.getTracks().length);
				currentCall.update(call => call ? {
					...call, 
					remoteStream,
					isAudioOnly: call.isAudioOnly || !remoteStream.getVideoTracks().length
				} : null);
			}
		};

		// Enhanced connection state logging
		this.peerConnection.onconnectionstatechange = () => {
			const state = this.peerConnection?.connectionState;
			console.log('🔗 Connection state changed to:', state);
			
			switch (state) {
				case 'connecting':
					console.log('🔄 WebRTC connection attempting...');
					break;
				case 'connected':
					console.log('✅ WebRTC connection established successfully!');
					break;
				case 'disconnected':
					console.log('⚠️ WebRTC connection disconnected');
					break;
				case 'failed':
					console.log('❌ WebRTC connection failed');
					console.log('🔍 Checking ICE connection state:', this.peerConnection?.iceConnectionState);
					console.log('🔍 Checking signaling state:', this.peerConnection?.signalingState);
					this.cleanup();
					break;
				case 'closed':
					console.log('🔒 WebRTC connection closed');
					break;
			}
		};

		// Enhanced ICE connection state logging
		this.peerConnection.oniceconnectionstatechange = () => {
			const iceState = this.peerConnection?.iceConnectionState;
			console.log('🧊 ICE connection state changed to:', iceState);
			
			switch (iceState) {
				case 'checking':
					console.log('🔍 ICE candidates are being checked...');
					break;
				case 'connected':
					console.log('✅ ICE connection established!');
					break;
				case 'completed':
					console.log('🎉 ICE connection completed successfully!');
					break;
				case 'failed':
					console.log('❌ ICE connection failed - likely firewall/NAT issues');
					console.log('💡 Suggestion: Try on different networks or use TURN servers');
					break;
				case 'disconnected':
					console.log('⚠️ ICE connection temporarily disconnected');
					break;
				case 'closed':
					console.log('🔒 ICE connection closed');
					break;
			}
		};

		// Enhanced signaling state logging
		this.peerConnection.onsignalingstatechange = () => {
			const signalingState = this.peerConnection?.signalingState;
			console.log('📡 Signaling state changed to:', signalingState);
			
			switch (signalingState) {
				case 'stable':
					console.log('✅ Signaling is stable - ready for communication');
					break;
				case 'have-local-offer':
					console.log('📞 Local offer created, waiting for answer');
					break;
				case 'have-remote-offer':
					console.log('📞 Remote offer received, creating answer');
					break;
				case 'have-local-pranswer':
					console.log('📞 Local provisional answer sent');
					break;
				case 'have-remote-pranswer':
					console.log('📞 Remote provisional answer received');
					break;
				case 'closed':
					console.log('🔒 Signaling closed');
					break;
			}
		};

		// Add ICE gathering state logging
		this.peerConnection.onicegatheringstatechange = () => {
			const gatheringState = this.peerConnection?.iceGatheringState;
			console.log('🔍 ICE gathering state changed to:', gatheringState);
			
			switch (gatheringState) {
				case 'new':
					console.log('🆕 ICE gathering starting...');
					break;
				case 'gathering':
					console.log('🔍 ICE gathering in progress...');
					break;
				case 'complete':
					console.log('✅ ICE gathering completed');
					break;
			}
		};
	}

	private async handleSignal(signal: SignalData) {
		// Only handle signals for current user
		const currentUserId = await this.getCurrentUserId();
		console.log('🎯 Checking signal:', { signal, currentUserId, shouldHandle: signal.to === currentUserId || signal.to === '' });
		
		if (signal.to !== currentUserId && signal.to !== '') {
			console.log('❌ Ignoring signal - not for this user');
			return;
		}
		
		try {
			console.log('✅ Processing signal type:', signal.type);
			switch (signal.type) {
				case 'offer':
					// Incoming call - show notification for user to accept/decline
					console.log('📞 Incoming call from:', signal.from);
					// Show incoming call notification (don't auto-answer)
					this.notifyIncomingCall(signal);
					break;

				case 'answer':
					if (this.peerConnection) {
						console.log('📥 Received answer from:', signal.from);
						console.log('🔧 Setting remote description (answer)');
						await this.peerConnection.setRemoteDescription(signal.data);
						console.log('✅ Remote description (answer) set successfully');
					}
					break;

				case 'ice-candidate':
					if (this.peerConnection) {
						try {
							console.log('📥 Adding received ICE candidate:', {
								type: signal.data.type,
								protocol: signal.data.protocol,
								from: signal.from
							});
							await this.peerConnection.addIceCandidate(signal.data);
							console.log('✅ ICE candidate added successfully');
						} catch (error) {
							console.error('❌ Failed to add ICE candidate:', error);
							// Don't fail the entire call for a single bad candidate
						}
					}
					break;

				case 'end-call':
					this.cleanup();
					break;
			}
		} catch (error) {
			console.error('Error handling signal:', error);
		}
	}

	private async sendSignal(signal: SignalData): Promise<string> {
		console.log('📤 Sending signal:', signal);
		if (this.signalChannel) {
			const result = await this.signalChannel.send({
				type: 'broadcast',
				event: 'signal',
				payload: signal
			});
			console.log('📤 Signal sent result:', result);
			return result;
		} else {
			console.error('❌ No signal channel available');
			return 'error';
		}
	}

	private async getCurrentUserId(): Promise<string> {
		// Get current user ID from Supabase
		const { data } = await supabase.auth.getUser();
		return data.user?.id || '';
	}

	private notifyIncomingCall(signal: SignalData) {
		// Set incoming call data to show UI with accept/decline options
		incomingCall.set({ 
			isIncoming: true, 
			callData: signal 
		});
	}

	// Method to accept an incoming call
	async acceptCall(): Promise<boolean> {
		const incoming = get(incomingCall);
		if (!incoming.isIncoming || !incoming.callData) {
			console.error('❌ No incoming call to accept');
			return false;
		}

		console.log('✅ Accepting incoming call');
		const success = await this.answerCall(incoming.callData);
		
		if (success) {
			// Clear incoming call notification
			incomingCall.set({ isIncoming: false, callData: null });
		}
		
		return success;
	}

	// Method to decline an incoming call
	async declineCall(): Promise<void> {
		const incoming = get(incomingCall);
		if (!incoming.isIncoming || !incoming.callData) {
			console.error('❌ No incoming call to decline');
			return;
		}

		console.log('❌ Declining incoming call');
		
		// Send decline signal to caller
		await this.sendSignal({
			type: 'end-call',
			data: { reason: 'declined' },
			from: await this.getCurrentUserId(),
			to: incoming.callData.from,
			callId: incoming.callData.callId
		});

		// Clear incoming call notification
		incomingCall.set({ isIncoming: false, callData: null });
	}

	private cleanup() {
		// Stop local stream
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => track.stop());
			this.localStream = null;
		}

		// Close peer connection
		if (this.peerConnection) {
			this.peerConnection.close();
			this.peerConnection = null;
		}

		// Clear call state
		currentCall.set(null);
		incomingCall.set({ isIncoming: false, callData: null });
		this.currentCallId = null;
	}
	
	// Method to completely destroy the service and clean up resources
	destroy() {
		this.cleanup();
		
		// Unsubscribe from signaling channel
		if (this.signalChannel) {
			this.signalChannel.unsubscribe();
			this.signalChannel = null;
		}
	}


	// Helper method to create a unique call ID
	createCallId(userId1: string, userId2: string): string {
		const participants = [userId1, userId2].sort();
		return `call-${participants[0]}-${participants[1]}-${Date.now()}`;
	}
}

// Singleton instance
let webrtcServiceInstance: WebRTCService | null = null;

export const webrtcService = (() => {
	if (!webrtcServiceInstance) {
		console.log('🔄 Creating new WebRTC service instance');
		webrtcServiceInstance = new WebRTCService();
	} else {
		console.log('♻️ Reusing existing WebRTC service instance');
	}
	return webrtcServiceInstance;
})();