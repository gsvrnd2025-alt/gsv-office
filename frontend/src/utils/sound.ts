// ── Sound Resonance Manager using Web Audio API ───────────────────
// Synthesizes high-fidelity premium chimes and clicks on-the-fly

export class SoundManager {
  private static getContext(): AudioContext | null {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  }

  /**
   * Play a dual-tone premium Ding-Dong chime sound
   */
  static playNotification() {
    if (localStorage.getItem('gsv-sound-notifications') === 'false') return;
    
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const playTone = (freq: number, start: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      // Ding (High Tone)
      playTone(880, now, 0.4, 0.12);
      // Dong (Harmonic Low Tone)
      playTone(659.25, now + 0.12, 0.6, 0.12);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }

  /**
   * Play a crisp, rapid micro click sound for UI feedback
   */
  static playClick() {
    if (localStorage.getItem('gsv-sound-clicks') === 'false') return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Crispy snap frequency sweep
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn('Click synthesis failed:', e);
    }
  }
}
