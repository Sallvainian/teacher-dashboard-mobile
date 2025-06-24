/**
 * @ai-context Audio Service - Sound effects and ringtones for messaging and calls
 * @ai-dependencies None - uses Web Audio API
 * @ai-sideEffects Plays audio sounds through device speakers
 * @ai-exports Audio service for notifications and call sounds
 */

class AudioService {
	private audioContext: AudioContext | null = null;
	private ringtoneInterval: number | null = null;
	private isRinging = false;

	constructor() {
		// Initialize audio context when user interacts with page
		this.initializeAudioContext();
	}

	private initializeAudioContext() {
		if (typeof window !== 'undefined') {
			// Create audio context on first user interaction
			const createContext = () => {
				if (!this.audioContext) {
					this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
				}
			};

			// Listen for first user interaction
			document.addEventListener('click', createContext, { once: true });
			document.addEventListener('keydown', createContext, { once: true });
			document.addEventListener('touchstart', createContext, { once: true });
		}
	}

	private async ensureAudioContext(): Promise<AudioContext | null> {
		if (!this.audioContext) {
			try {
				this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			} catch (error) {
				console.warn('Audio not supported:', error);
				return null;
			}
		}

		if (this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume();
			} catch (error) {
				console.warn('Could not resume audio context:', error);
			}
		}

		return this.audioContext;
	}

	private async playTone(frequency: number, duration: number, volume: number = 0.3) {
		const context = await this.ensureAudioContext();
		if (!context) return;

		try {
			const oscillator = context.createOscillator();
			const gainNode = context.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(context.destination);

			oscillator.frequency.setValueAtTime(frequency, context.currentTime);
			oscillator.type = 'sine';

			gainNode.gain.setValueAtTime(0, context.currentTime);
			gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
			gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

			oscillator.start(context.currentTime);
			oscillator.stop(context.currentTime + duration);
		} catch (error) {
			console.warn('Error playing tone:', error);
		}
	}

	private async playChord(frequencies: number[], duration: number, volume: number = 0.2) {
		const context = await this.ensureAudioContext();
		if (!context) return;

		try {
			frequencies.forEach(frequency => {
				const oscillator = context.createOscillator();
				const gainNode = context.createGain();

				oscillator.connect(gainNode);
				gainNode.connect(context.destination);

				oscillator.frequency.setValueAtTime(frequency, context.currentTime);
				oscillator.type = 'sine';

				gainNode.gain.setValueAtTime(0, context.currentTime);
				gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
				gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

				oscillator.start(context.currentTime);
				oscillator.stop(context.currentTime + duration);
			});
		} catch (error) {
			console.warn('Error playing chord:', error);
		}
	}

	/**
	 * Start playing incoming call ringtone
	 * Plays until stopRingtone() is called or call times out (30 seconds)
	 */
	async startIncomingCallRingtone() {
		if (this.isRinging) return;
		
		this.isRinging = true;
		console.log('🔔 Starting ringtone');

		// Classic phone ring pattern: two high tones
		const playRingPattern = async () => {
			if (!this.isRinging) return;
			
			// First ring
			await this.playTone(800, 0.5, 0.4);
			
			setTimeout(async () => {
				if (!this.isRinging) return;
				// Second ring
				await this.playTone(800, 0.5, 0.4);
			}, 600);
		};

		// Play ring pattern every 3 seconds
		playRingPattern();
		this.ringtoneInterval = window.setInterval(playRingPattern, 3000);

		// Auto-stop after 30 seconds (call timeout)
		setTimeout(() => {
			if (this.isRinging) {
				this.stopRingtone();
				this.playMissedCallSound();
			}
		}, 30000);
	}

	/**
	 * Stop the incoming call ringtone
	 */
	stopRingtone() {
		if (!this.isRinging) return;
		
		this.isRinging = false;
		console.log('🔕 Stopping ringtone');
		
		if (this.ringtoneInterval) {
			clearInterval(this.ringtoneInterval);
			this.ringtoneInterval = null;
		}
	}

	/**
	 * Play missed call notification sound
	 */
	async playMissedCallSound() {
		console.log('📞 Playing missed call sound');
		
		// Descending tone to indicate missed call
		await this.playTone(600, 0.3, 0.3);
		setTimeout(() => this.playTone(400, 0.4, 0.3), 200);
		setTimeout(() => this.playTone(300, 0.5, 0.3), 500);
	}

	/**
	 * Play call accepted/connected sound
	 */
	async playCallAcceptedSound() {
		console.log('✅ Playing call accepted sound');
		
		// Pleasant ascending chord
		await this.playChord([440, 554, 659], 0.8, 0.2); // A major chord
	}

	/**
	 * Play call ended sound
	 */
	async playCallEndedSound() {
		console.log('📞 Playing call ended sound');
		
		// Simple descending tone
		await this.playTone(400, 0.4, 0.2);
		setTimeout(() => this.playTone(300, 0.6, 0.2), 300);
	}

	/**
	 * Play message notification sound
	 */
	async playMessageNotification() {
		console.log('💬 Playing message notification');
		
		// Gentle notification sound
		await this.playTone(800, 0.2, 0.3);
		setTimeout(() => this.playTone(1000, 0.2, 0.3), 150);
	}

	/**
	 * Play emoji/poke notification sound (more playful)
	 */
	async playEmojiNotification() {
		console.log('😄 Playing emoji notification');
		
		// Playful ascending tones
		await this.playTone(600, 0.15, 0.25);
		setTimeout(() => this.playTone(800, 0.15, 0.25), 100);
		setTimeout(() => this.playTone(1000, 0.15, 0.25), 200);
	}

	/**
	 * Play typing notification (subtle)
	 */
	async playTypingSound() {
		// Very subtle click sound
		await this.playTone(1200, 0.05, 0.1);
	}

	/**
	 * Get current ringtone state
	 */
	get isCurrentlyRinging(): boolean {
		return this.isRinging;
	}

	/**
	 * Cleanup audio resources
	 */
	cleanup() {
		this.stopRingtone();
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
	}
}

// Export singleton instance
export const audioService = new AudioService();