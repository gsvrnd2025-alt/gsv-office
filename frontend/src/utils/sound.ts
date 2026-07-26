// ── Sound Resonance Manager using Web Audio API ───────────────────
// Synthesizes high-fidelity premium chimes, clicks, and rings on-the-fly

export class SoundManager {
  private static getContext(): AudioContext | null {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  }

  /**
   * Play a musical GSV ringtone — 3-note ascending arpeggio pattern
   * Sounds like a premium phone ringtone (G5 → B5 → D6 → G6 pattern)
   */
  static playRing(durationSeconds: number) {
    if (localStorage.getItem('gsv-sound-notifications') === 'false') return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // GSV Musical Ringtone Pattern: 4-note ascending arpeggio G5-B5-D6-G6
      // Each cycle: 4 notes (0.12s each) + pause = ~0.7s per cycle
      const noteFreqs = [783.99, 987.77, 1174.66, 1567.98]; // G5, B5, D6, G6
      const noteDuration = 0.12;
      const noteGap = 0.03;
      const pauseBetweenCycles = 0.25;
      const cycleDuration = noteFreqs.length * (noteDuration + noteGap) + pauseBetweenCycles;

      const numCycles = Math.ceil(durationSeconds / cycleDuration);

      const playNote = (freq: number, start: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Use triangle wave for a softer, more musical tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.015);
        gain.gain.setValueAtTime(vol, start + noteDuration - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + noteDuration + 0.01);
      };

      // Add harmonic overtone for richness
      const playNoteWithHarmonic = (freq: number, start: number, vol: number) => {
        playNote(freq, start, vol);
        playNote(freq * 2, start, vol * 0.25); // Add octave harmonic quietly
      };

      for (let i = 0; i < numCycles; i++) {
        const cycleStart = now + i * cycleDuration;
        if (i * cycleDuration >= durationSeconds) break;

        noteFreqs.forEach((freq, j) => {
          const noteStart = cycleStart + j * (noteDuration + noteGap);
          playNoteWithHarmonic(freq, noteStart, 0.08);
        });
      }
    } catch (e) {
      console.warn('Ring audio synthesis failed:', e);
    }
  }

  /**
   * Play a call-rejected descending tone + Speech Synthesis announcement
   * "The user has declined the call" — plays on caller side when callee rejects
   */
  static playCallRejected() {
    if (localStorage.getItem('gsv-sound-notifications') === 'false') return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Descending 3-note drop: D6 → B5 → G5 → E5
      const descFreqs = [1174.66, 987.77, 783.99, 659.26]; // D6, B5, G5, E5
      const noteDur = 0.18;
      const noteGap = 0.04;

      descFreqs.forEach((freq, i) => {
        const start = now + i * (noteDur + noteGap);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        // Fade in quickly, fade out slowly
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + noteDur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + noteDur + 0.05);
      });

      // After the tones, use Speech Synthesis to announce
      const speechDelay = descFreqs.length * (noteDur + noteGap) + 0.3;
      setTimeout(() => {
        if ('speechSynthesis' in window) {
          // Cancel any in-progress speech first
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance('Call declined');
          utterance.rate = 0.95;
          utterance.pitch = 0.85;
          utterance.volume = 0.75;
          // Prefer a natural English voice
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || voices.find(v => v.lang.startsWith('en')) || null;
          if (preferredVoice) utterance.voice = preferredVoice;
          window.speechSynthesis.speak(utterance);
        }
      }, speechDelay * 1000);

    } catch (e) {
      console.warn('Call rejected audio synthesis failed:', e);
    }
  }

  /**
   * Play a short "call connected" chime — ascending ding when call connects
   */
  static playCallConnected() {
    if (localStorage.getItem('gsv-sound-notifications') === 'false') return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Quick ascending 2-note connection chime
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
        osc.stop(start + duration + 0.01);
      };

      // Quick G5 → D6 ascending
      playTone(783.99, now, 0.25, 0.1);
      playTone(1174.66, now + 0.18, 0.35, 0.12);

    } catch (e) {
      console.warn('Call connected audio synthesis failed:', e);
    }
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

  static playMessageRing() {
    this.playRing(2.0);
  }

  static playRemoteRequestRing() {
    this.playRing(5.0);
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
