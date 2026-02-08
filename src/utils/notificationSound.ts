/**
 * Notification Sound Utility
 * أداة صوت الإشعارات
 * 
 * Plays sounds when notifications arrive.
 * Uses Web Audio API for reliable cross-browser support.
 */

// Default notification sound as base64 (a simple pleasant chime)
// This is a short WAV file encoded in base64 - about 0.5s chime sound
const DEFAULT_NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1aVFNRU1VZXmNobHN6gYmRmJ+mrLK4vsLE' +
    'xcTEw8LBwL67uLSxrqunoJ2amZiXl5aVlZSVlpaYmZuen6KkqKyxtrq+wcTGx8jIyMjHxsTCwL24tK+qpqKenJqZ' +
    'mJeWlZaXl5iZmpucoKOmqa2xtr3BxsjKy8zMy8rIxsO/u7eyrauopqSkpKSkpKSlpaaoqq2xt7vBxsvO0NHR0M7L' +
    'yMTAu7ayrqupqKenp6enp6eoqauusr3H0dvl7PH09fX08+/p4dnQx764sq6rqamoqKipqqqrrK6xt8DP3+/8/v7+' +
    '/v78+PLq4NXNxb62sayppqWkpKSlpaanqKqttL3J2Ojz/P7+/v7++/Xv5dzUzMW+t7Gsqaemp6ipq62wtbvE0d/t' +
    '+P7+/v7+/fny6uHZz8bAuLGsqKalpaanqauvsrbAzNrl8fr9/v7+/v358+zj2tLKw7y2sK2rqqqqq62vtLq/yNTi' +
    '7vf8/v7+/v79+fPt5t7Wz8nDvbm2tLOzsrO0tbe6vsPI0Nrl7vb7/v7+/v7+/Pr28Ozn4t3Z1tPS0dDQ0NDR0tTW' +
    '2d3h5uvw9fj7/f7+/v7+/v79/Pv5+Pb08vDu7Ovq6urq6uvs7e/x8/b4+vz9/v7+/v7+/v7+/v7+/v7+/v7+/v7+';

class NotificationSoundManager {
    private audioContext: AudioContext | null = null;
    private audioBuffer: AudioBuffer | null = null;
    private isEnabled: boolean = true;
    private volume: number = 0.5;
    private customSoundUrl: string | null = null;

    constructor() {
        // Try to load saved preferences
        this.loadPreferences();
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    async initialize(): Promise<void> {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            await this.loadSound();
        } catch (error) {
            console.warn('Could not initialize audio context:', error);
        }
    }

    /**
     * Load the notification sound
     */
    private async loadSound(): Promise<void> {
        if (!this.audioContext) return;

        try {
            const soundUrl = this.customSoundUrl || DEFAULT_NOTIFICATION_SOUND;

            if (soundUrl.startsWith('data:')) {
                // Base64 encoded sound
                const base64 = soundUrl.split(',')[1];
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                this.audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
            } else {
                // URL to sound file
                const response = await fetch(soundUrl);
                const arrayBuffer = await response.arrayBuffer();
                this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            }
        } catch (error) {
            console.warn('Could not load notification sound:', error);
            // Fallback: create a simple beep
            this.createFallbackSound();
        }
    }

    /**
     * Create a simple beep sound as fallback
     */
    private createFallbackSound(): void {
        if (!this.audioContext) return;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.15;
        const numSamples = sampleRate * duration;

        this.audioBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const channelData = this.audioBuffer.getChannelData(0);

        const frequency = 880; // A5 note
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            // Sine wave with envelope
            const envelope = Math.sin(Math.PI * t / duration);
            channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
    }

    /**
     * Play the notification sound
     */
    async play(): Promise<void> {
        if (!this.isEnabled) return;

        // Initialize on first play (after user interaction)
        if (!this.audioContext) {
            await this.initialize();
        }

        if (!this.audioContext || !this.audioBuffer) {
            // Fallback to HTML5 Audio
            this.playFallback();
            return;
        }

        try {
            // Resume context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.audioBuffer;
            gainNode.gain.value = this.volume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start(0);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
            this.playFallback();
        }
    }

    /**
     * Fallback using HTML5 Audio
     */
    private playFallback(): void {
        try {
            const audio = new Audio(DEFAULT_NOTIFICATION_SOUND);
            audio.volume = this.volume;
            audio.play().catch(() => {
                // Ignore autoplay errors
            });
        } catch (error) {
            // Ignore
        }
    }

    /**
     * Enable/disable notification sounds
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        this.savePreferences();
    }

    /**
     * Check if sounds are enabled
     */
    getEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Set volume (0.0 to 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.savePreferences();
    }

    /**
     * Get current volume
     */
    getVolume(): number {
        return this.volume;
    }

    /**
     * Set custom sound URL
     */
    async setCustomSound(url: string | null): Promise<void> {
        this.customSoundUrl = url;
        this.audioBuffer = null;
        if (this.audioContext) {
            await this.loadSound();
        }
        this.savePreferences();
    }

    /**
     * Save preferences to localStorage
     */
    private savePreferences(): void {
        try {
            localStorage.setItem('notification_sound_prefs', JSON.stringify({
                enabled: this.isEnabled,
                volume: this.volume,
                customSoundUrl: this.customSoundUrl
            }));
        } catch (error) {
            // localStorage not available
        }
    }

    /**
     * Load preferences from localStorage
     */
    private loadPreferences(): void {
        try {
            const saved = localStorage.getItem('notification_sound_prefs');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.isEnabled = prefs.enabled ?? true;
                this.volume = prefs.volume ?? 0.5;
                this.customSoundUrl = prefs.customSoundUrl ?? null;
            }
        } catch (error) {
            // localStorage not available or corrupted
        }
    }
}

// Singleton instance
export const notificationSound = new NotificationSoundManager();
export default notificationSound;
