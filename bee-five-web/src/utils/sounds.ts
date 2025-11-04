// Sound utility for generating bee-themed game sounds using Web Audio API

class SoundGenerator {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3;
  private isMuted: boolean = false; // Sounds enabled by default

  constructor() {
    // Audio context will be initialized on first use
  }

  private initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = this.volume;
      } catch (error) {
        console.warn('Could not initialize audio context:', error);
      }
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.initAudioContext();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext !== null;
  }

  // Generate a buzzing bee sound for piece placement
  playBuzzSound() {
    if (this.isMuted) return;
    if (!this.ensureAudioContext() || !this.audioContext || !this.masterGain) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.value = 440;
      oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.1);
      
      gainNode.gain.value = 0.1;
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play buzz sound:', error);
    }
  }

  // Generate a sweet victory sound (ascending melody)
  playVictorySound() {
    if (this.isMuted) return;
    if (!this.ensureAudioContext() || !this.audioContext || !this.masterGain) return;

    try {
      const notes = [262, 330, 392, 523]; // C major chord ascending
      const duration = 0.15;
      
      notes.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = freq;
        
        gainNode.gain.value = 0.2;
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain!);
        
        oscillator.start(this.audioContext!.currentTime + index * duration);
        oscillator.stop(this.audioContext!.currentTime + index * duration + duration);
      });
    } catch (error) {
      console.warn('Could not play victory sound:', error);
    }
  }

  // Generate a defeat sound (descending melody)
  playDefeatSound() {
    if (this.isMuted) return;
    if (!this.ensureAudioContext() || !this.audioContext || !this.masterGain) return;

    try {
      const notes = [523, 392, 330, 262]; // C major chord descending
      const duration = 0.2;
      
      notes.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = freq * 0.5; // Lower pitch for sad sound
        
        gainNode.gain.value = 0.15;
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain!);
        
        oscillator.start(this.audioContext!.currentTime + index * duration * 0.8);
        oscillator.stop(this.audioContext!.currentTime + index * duration * 0.8 + duration);
      });
    } catch (error) {
      console.warn('Could not play defeat sound:', error);
    }
  }

  // Generate a hover sound (subtle buzz)
  playHoverSound() {
    if (this.isMuted) return;
    if (!this.ensureAudioContext() || !this.audioContext || !this.masterGain) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.05);
      
      gainNode.gain.value = 0.05;
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.05);
    } catch (error) {
      console.warn('Could not play hover sound:', error);
    }
  }

  // Generate a button click sound
  playClickSound() {
    if (this.isMuted) return;
    if (!this.ensureAudioContext() || !this.audioContext || !this.masterGain) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.value = 800;
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.05);
      
      gainNode.gain.value = 0.1;
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.05);
    } catch (error) {
      console.warn('Could not play click sound:', error);
    }
  }

  // Play the "Get Ready" audio file during countdown
  playGetReadySound() {
    // Use click sound as substitute
    this.playClickSound();
  }

  // Play countdown sound synchronized with countdown number
  playCountdownSound(countdownNumber: number) {
    if (this.isMuted) return;
    if (!this.ensureAudioContext() || !this.audioContext || !this.masterGain) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440 + (countdownNumber * 55); // Higher pitch for each count
      
      gainNode.gain.value = 0.15;
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play countdown sound:', error);
    }
  }

  // Volume and mute controls
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }
}

// Create a singleton instance
export const soundManager = new SoundGenerator();
