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
import { audioService } from './audioService';

export interface VideoCall {
	id: string;
	participants: string[];
	isActive: boolean;
	localStream?: MediaStream;
	remoteStream?: MediaStream;
	isAudioOnly?: boolean;
	currentAudioDevice?: string;
	currentVideoDevice?: string;
	currentAudioOutput?: string;
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
			try {
				// First try enumerating devices to check what's available
				const devices = await navigator.mediaDevices.enumerateDevices();
				const hasCamera = devices.some(device => device.kind === 'videoinput');
				const hasMicrophone = devices.some(device => device.kind === 'audioinput');
				
				console.log('📱 Available devices:', { hasCamera, hasMicrophone });
				
				if (!hasMicrophone && !hasCamera) {
					// No devices at all - show a warning but create an empty stream
					showErrorToast('No camera or microphone devices found. Please connect audio/video devices.', undefined, 8000);
					this.localStream = new MediaStream();
					return;
				}

				// Try with video first if camera is available
				if (hasCamera) {
					try {
						// First try both audio and video
						this.localStream = await navigator.mediaDevices.getUserMedia({
							video: { facingMode: "user" },
							audio: hasMicrophone ? {
								echoCancellation: true,
								noiseSuppression: true,
								autoGainControl: true,
								sampleRate: 48000
							} : false
						});
						console.log('✅ Got camera and microphone access');
					} catch (error: any) {
						// Handle specific camera-in-use error
						if (error.name === 'NotReadableError') {
							console.log('📸 NotReadableError occurred, determining which device is busy...');
							
							// Try to determine which device is actually busy
							let cameraError = null;
							let audioError = null;
							
							// Test camera alone
							if (hasCamera) {
								try {
									const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
									testStream.getTracks().forEach(track => track.stop());
									console.log('✅ Camera is available');
								} catch (e: any) {
									cameraError = e;
									console.log('❌ Camera is busy:', e.message);
								}
							}
							
							// Test microphone alone
							if (hasMicrophone) {
								try {
									const testStream = await navigator.mediaDevices.getUserMedia({ 
										audio: {
											echoCancellation: true,
											noiseSuppression: true,
											autoGainControl: true,
											sampleRate: 48000
										}, 
										video: false 
									});
									testStream.getTracks().forEach(track => track.stop());
									console.log('✅ Microphone is available');
								} catch (e: any) {
									audioError = e;
									console.log('❌ Microphone error:', e.message);
								}
							}
							
							// Now handle based on what we found
							if (cameraError && !audioError) {
								// Only camera is busy
								showInfoToast('Your camera is in use by another application (like Zoom or Teams). Cameras can only be used by one app at a time.', 'Camera Busy', 8000);
								
								try {
									// Try with audio only
									this.localStream = await navigator.mediaDevices.getUserMedia({
										audio: hasMicrophone ? {
											echoCancellation: true,
											noiseSuppression: true,
											autoGainControl: true,
											sampleRate: 48000
										} : false,
										video: false
									});
									console.log('✅ Got audio-only after camera busy error');
								} catch (audioError2) {
									// If even audio fails, create empty stream
									console.error('Failed to get audio after camera busy:', audioError2);
									this.localStream = new MediaStream();
									showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
								}
							} else if (!cameraError && audioError) {
								// Only microphone has issues
								if (audioError.name === 'NotReadableError') {
									showErrorToast('Your microphone appears to be in use or misconfigured. This is unusual as microphones can typically be shared. Please check your system audio settings.', 'Microphone Issue', 8000);
								} else {
									showErrorToast(`Microphone error: ${audioError.message || 'Unknown error'}`, 'Audio Error', 8000);
								}
								
								try {
									// Try with video only
									this.localStream = await navigator.mediaDevices.getUserMedia({
										video: hasCamera,
										audio: false
									});
									console.log('✅ Got video-only after microphone error');
									showInfoToast('Proceeding without audio. Others won\'t be able to hear you.', 'No Audio', 5000);
								} catch (videoError) {
									this.localStream = new MediaStream();
									showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
								}
							} else if (cameraError && audioError) {
								// Both devices have issues
								showErrorToast('Both camera and microphone are unavailable. Camera is likely in use by another app, and microphone has an error.', 'Device Error', 8000);
								this.localStream = new MediaStream();
							} else {
								// Original error wasn't actually about device availability
								showInfoToast('Device access error. Trying fallback options...', 'Device Error', 5000);
								
								try {
									// Try with audio only
									this.localStream = await navigator.mediaDevices.getUserMedia({
										audio: hasMicrophone ? {
											echoCancellation: true,
											noiseSuppression: true,
											autoGainControl: true,
											sampleRate: 48000
										} : false,
										video: false
									});
									console.log('✅ Got audio-only as fallback');
								} catch (audioError3) {
									this.localStream = new MediaStream();
									showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
								}
							}
						} else if (error.name === 'NotFoundError') {
							// No devices found despite enumeration saying they exist
							showInfoToast('Camera reported as available but could not be accessed.', 'Hardware Error', 5000);
							
							try {
								// Try with audio only
								this.localStream = await navigator.mediaDevices.getUserMedia({
									audio: hasMicrophone,
									video: false
								});
							} catch (audioError) {
								this.localStream = new MediaStream();
								showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
							}
						} else if (error.name === 'NotAllowedError') {
							// Permission denied
							showErrorToast('Permission to use camera/microphone was denied. Please check your browser settings.', undefined, 8000);
							this.localStream = new MediaStream();
						} else {
							// Other errors
							console.error('Media access error:', error);
						}
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

			// Get device IDs from the stream
			const audioTrack = this.localStream?.getAudioTracks()[0];
			const videoTrack = this.localStream?.getVideoTracks()[0];
			const audioDeviceId = audioTrack?.getSettings().deviceId || '';
			const videoDeviceId = videoTrack?.getSettings().deviceId || '';

			// Update store FIRST so ICE candidate handler can access participants
			const currentUserId = await this.getCurrentUserId();
			currentCall.set({
				id: callId,
				participants: [currentUserId, otherUserId],
				isActive: true,
				localStream: this.localStream,
				isAudioOnly: !this.localStream?.getVideoTracks().length,
				currentAudioDevice: audioDeviceId,
				currentVideoDevice: videoDeviceId
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

			// Initialize media (get camera/mic)
			await this.initializeMedia();

			// Get device IDs from the stream
			const audioTrack = this.localStream?.getAudioTracks()[0];
			const videoTrack = this.localStream?.getVideoTracks()[0];
			const audioDeviceId = audioTrack?.getSettings().deviceId || '';
			const videoDeviceId = videoTrack?.getSettings().deviceId || '';

			// Update store FIRST so ICE candidate handler can access participants
			const currentUserId = await this.getCurrentUserId();
			currentCall.set({
				id: callData.callId,
				participants: [currentUserId, callData.from],
				isActive: true,
				localStream: this.localStream || new MediaStream(),
				isAudioOnly: !this.localStream?.getVideoTracks()?.length,
				currentAudioDevice: audioDeviceId,
				currentVideoDevice: videoDeviceId
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
		// Play call ended sound
		audioService.playCallEndedSound();
		
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

	/**
	 * Initialize media stream with graceful fallbacks for various error cases
	 */
	private async initializeMedia(): Promise<void> {
		try {
			// First try enumerating devices to check what's available
			const devices = await navigator.mediaDevices.enumerateDevices();
			const hasCamera = devices.some(device => device.kind === 'videoinput');
			const hasMicrophone = devices.some(device => device.kind === 'audioinput');
			
			console.log('📱 Available devices:', { hasCamera, hasMicrophone });
			
			if (!hasMicrophone && !hasCamera) {
				// No devices at all - show a warning but create an empty stream
				showErrorToast('No camera or microphone devices found. Please connect audio/video devices.', undefined, 8000);
				this.localStream = new MediaStream();
				return;
			}

			// Try with video first if camera is available
			if (hasCamera) {
				try {
					// First try both audio and video
					this.localStream = await navigator.mediaDevices.getUserMedia({
						video: { facingMode: "user" },
						audio: hasMicrophone ? {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
							sampleRate: 48000
						} : false
					});
					console.log('✅ Got camera and microphone access');
				} catch (error: any) {
					// Handle specific camera-in-use error
					if (error.name === 'NotReadableError') {
						console.log('📸 NotReadableError occurred in initializeMedia, determining which device is busy...');
						
						// Try to determine which device is actually busy
						let cameraError = null;
						let audioError = null;
						
						// Test camera alone
						if (hasCamera) {
							try {
								const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
								testStream.getTracks().forEach(track => track.stop());
								console.log('✅ Camera is available');
							} catch (e: any) {
								cameraError = e;
								console.log('❌ Camera is busy:', e.message);
							}
						}
						
						// Test microphone alone
						if (hasMicrophone) {
							try {
								const testStream = await navigator.mediaDevices.getUserMedia({ 
									audio: {
										echoCancellation: true,
										noiseSuppression: true,
										autoGainControl: true,
										sampleRate: 48000
									}, 
									video: false 
								});
								testStream.getTracks().forEach(track => track.stop());
								console.log('✅ Microphone is available');
							} catch (e: any) {
								audioError = e;
								console.log('❌ Microphone error:', e.message);
							}
						}
						
						// Now handle based on what we found
						if (cameraError && !audioError) {
							// Only camera is busy
							showInfoToast('Your camera is in use by another application (like Zoom, Teams, or another browser tab). Cameras can only be used by one app at a time.', 'Camera Busy', 8000);
							
							try {
								// Try with audio only
								this.localStream = await navigator.mediaDevices.getUserMedia({
									audio: hasMicrophone,
									video: false
								});
								console.log('✅ Got audio-only after camera busy error');
								showInfoToast('Proceeding with audio-only call', 'Audio Only', 5000);
							} catch (audioError2) {
								// If even audio fails, create empty stream
								console.error('Failed to get audio after camera busy:', audioError2);
								this.localStream = new MediaStream();
								showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
							}
						} else if (!cameraError && audioError) {
							// Only microphone has issues
							if (audioError.name === 'NotReadableError') {
								showErrorToast('Your microphone appears to be in use or misconfigured. This is unusual as microphones can typically be shared. Please check your system audio settings or try closing other applications.', 'Microphone Issue', 8000);
							} else {
								showErrorToast(`Microphone error: ${audioError.message || 'Unknown error'}`, 'Audio Error', 8000);
							}
							
							try {
								// Try with video only
								this.localStream = await navigator.mediaDevices.getUserMedia({
									video: hasCamera,
									audio: false
								});
								console.log('✅ Got video-only after microphone error');
								showInfoToast('Proceeding without audio. Others won\'t be able to hear you.', 'No Audio', 5000);
							} catch (videoError) {
								this.localStream = new MediaStream();
								showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
							}
						} else if (cameraError && audioError) {
							// Both devices have issues
							showErrorToast('Both camera and microphone are unavailable. Camera is likely in use by another app, and microphone has an error.', 'Device Error', 8000);
							this.localStream = new MediaStream();
						} else {
							// Original error wasn't actually about device availability
							showInfoToast('Device access error. Trying fallback options...', 'Device Error', 5000);
							
							try {
								// Try with audio only
								this.localStream = await navigator.mediaDevices.getUserMedia({
									audio: hasMicrophone,
									video: false
								});
								console.log('✅ Got audio-only as fallback');
								showInfoToast('Proceeding with audio-only call', 'Audio Only', 5000);
							} catch (audioError3) {
								this.localStream = new MediaStream();
								showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
							}
						}
					} else if (error.name === 'NotFoundError') {
						// No devices found despite enumeration saying they exist
						showInfoToast('Camera reported as available but could not be accessed.', 'Hardware Error', 5000);
						
						try {
							// Try with audio only
							this.localStream = await navigator.mediaDevices.getUserMedia({
								audio: hasMicrophone,
								video: false
							});
						} catch (audioError) {
							this.localStream = new MediaStream();
							showInfoToast('Unable to access any devices. Others won\'t see or hear you.', 'Limited Call', 5000);
						}
					} else if (error.name === 'NotAllowedError') {
						// Permission denied
						showErrorToast('Permission to use camera/microphone was denied. Please check your browser settings.', undefined, 8000);
						this.localStream = new MediaStream();
					} else {
						// Other errors
						console.error('Media access error:', error);
						showErrorToast(`Error accessing media devices: ${error.message || 'Unknown error'}`, undefined, 5000);
						
						// Try audio-only as fallback
						try {
							this.localStream = await navigator.mediaDevices.getUserMedia({
								audio: hasMicrophone,
								video: false
							});
							showInfoToast('Using audio only due to camera error', 'Audio Only', 5000);
						} catch (audioError) {
							this.localStream = new MediaStream();
						}
					}
				}
			} else if (hasMicrophone) {
				// No camera, just try microphone
				try {
					this.localStream = await navigator.mediaDevices.getUserMedia({
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
							sampleRate: 48000
						},
						video: false
					});
					showInfoToast('No camera detected. This will be an audio-only call.', 'Audio Only', 5000);
				} catch (error) {
					console.error('Microphone access error:', error);
					this.localStream = new MediaStream();
					showInfoToast('Failed to access microphone. Others won\'t be able to hear you.', 'Limited Call', 5000);
				}
			} else {
				// No devices available
				this.localStream = new MediaStream();
				showInfoToast('No audio or video devices available. Others won\'t see or hear you.', 'Limited Call', 5000);
			}
			
			// Check what we actually got
			const hasVideoTrack = this.localStream.getVideoTracks().length > 0;
			const hasAudioTrack = this.localStream.getAudioTracks().length > 0;
			
			if (hasVideoTrack && hasAudioTrack) {
				console.log('✅ Got camera and microphone access');
			} else if (hasVideoTrack) {
				console.log('✅ Got camera access only');
				showInfoToast('No microphone detected. Others won\'t be able to hear you.', 'Audio Unavailable', 5000);
			} else if (hasAudioTrack) {
				console.log('✅ Got microphone access only');
			} else {
				console.log('⚠️ No audio or video tracks available');
			}
		} catch (error: any) {
			console.error('❌ Failed to initialize media:', error);
			this.localStream = new MediaStream();
			showErrorToast('Failed to initialize media devices', undefined, 5000);
		}
	}

	private notifyIncomingCall(signal: SignalData) {
		// Set incoming call data to show UI with accept/decline options
		incomingCall.set({ 
			isIncoming: true, 
			callData: signal 
		});
		
		// Start ringtone for incoming call
		audioService.startIncomingCallRingtone();
	}

	// Method to accept an incoming call
	async acceptCall(): Promise<boolean> {
		const incoming = get(incomingCall);
		if (!incoming.isIncoming || !incoming.callData) {
			console.error('❌ No incoming call to accept');
			return false;
		}

		console.log('✅ Accepting incoming call');
		
		// Stop ringtone and play accept sound
		audioService.stopRingtone();
		audioService.playCallAcceptedSound();
		
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
		
		// Stop ringtone
		audioService.stopRingtone();
		
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
		
		// Stop any ongoing ringtone
		audioService.stopRingtone();
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

	// Switch audio input device
	async switchAudioDevice(deviceId: string): Promise<boolean> {
		if (!this.localStream) return false;
		
		try {
			console.log('🎤 Switching audio device to:', deviceId);
			
			// Get new stream with the selected audio device
			const newStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					deviceId: { exact: deviceId },
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					sampleRate: 48000
				},
				video: this.localStream.getVideoTracks().length > 0 ? {
					deviceId: this.localStream.getVideoTracks()[0].getSettings().deviceId
				} : false
			});
			
			// Replace audio track in peer connection
			if (this.peerConnection) {
				const senders = this.peerConnection.getSenders();
				const audioSender = senders.find(sender => sender.track?.kind === 'audio');
				
				if (audioSender && newStream.getAudioTracks().length > 0) {
					await audioSender.replaceTrack(newStream.getAudioTracks()[0]);
				}
			}
			
			// Stop old audio tracks
			this.localStream.getAudioTracks().forEach(track => track.stop());
			
			// Remove old audio tracks and add new ones
			this.localStream.getAudioTracks().forEach(track => {
				this.localStream!.removeTrack(track);
			});
			newStream.getAudioTracks().forEach(track => {
				this.localStream!.addTrack(track);
			});
			
			// Update current call with new device
			currentCall.update(call => call ? {
				...call,
				currentAudioDevice: deviceId
			} : null);
			
			console.log('✅ Audio device switched successfully');
			return true;
		} catch (error) {
			console.error('❌ Failed to switch audio device:', error);
			showErrorToast('Failed to switch microphone');
			return false;
		}
	}

	// Switch video input device
	async switchVideoDevice(deviceId: string): Promise<boolean> {
		if (!this.localStream) return false;
		
		try {
			console.log('📹 Switching video device to:', deviceId);
			
			// Get new stream with the selected video device
			const newStream = await navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: { exact: deviceId },
					facingMode: undefined // Remove facingMode when using exact deviceId
				},
				audio: this.localStream.getAudioTracks().length > 0 ? {
					deviceId: this.localStream.getAudioTracks()[0].getSettings().deviceId
				} : false
			});
			
			// Replace video track in peer connection
			if (this.peerConnection) {
				const senders = this.peerConnection.getSenders();
				const videoSender = senders.find(sender => sender.track?.kind === 'video');
				
				if (videoSender && newStream.getVideoTracks().length > 0) {
					await videoSender.replaceTrack(newStream.getVideoTracks()[0]);
				}
			}
			
			// Stop old video tracks
			this.localStream.getVideoTracks().forEach(track => track.stop());
			
			// Remove old video tracks and add new ones
			this.localStream.getVideoTracks().forEach(track => {
				this.localStream!.removeTrack(track);
			});
			newStream.getVideoTracks().forEach(track => {
				this.localStream!.addTrack(track);
			});
			
			// Update current call with new device
			currentCall.update(call => call ? {
				...call,
				currentVideoDevice: deviceId
			} : null);
			
			console.log('✅ Video device switched successfully');
			return true;
		} catch (error) {
			console.error('❌ Failed to switch video device:', error);
			showErrorToast('Failed to switch camera');
			return false;
		}
	}

	// Set audio output device (for remote audio)
	async setAudioOutput(deviceId: string, audioElement?: HTMLAudioElement | HTMLVideoElement): Promise<boolean> {
		try {
			console.log('🔊 Setting audio output device to:', deviceId);
			
			// Get the remote video element if not provided
			const element = audioElement || get(remoteVideo);
			
			if (!element) {
				console.warn('No audio element to set output device on');
				return false;
			}
			
			// Check if setSinkId is supported
			if ('setSinkId' in element) {
				await (element as any).setSinkId(deviceId);
				
				// Update current call with new device
				currentCall.update(call => call ? {
					...call,
					currentAudioOutput: deviceId
				} : null);
				
				console.log('✅ Audio output device set successfully');
				return true;
			} else {
				console.warn('setSinkId not supported in this browser');
				showInfoToast('Audio output selection not supported in this browser');
				return false;
			}
		} catch (error) {
			console.error('❌ Failed to set audio output device:', error);
			showErrorToast('Failed to switch speakers');
			return false;
		}
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