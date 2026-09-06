// ── GSV Sound Manager — Telephony-grade Audio Synthesis ─────────────────────
// Uses Web Audio API to synthesize authentic phone tones.
// All tones use a singleton AudioContext (avoids mobile "unlock" issues).

export class SoundManager {
  private static _ctx: AudioContext | null = null;
  private static _activeNodes: (AudioBufferSourceNode | OscillatorNode | GainNode)[] = [];
  private static _ringInterval: any = null;
  private static _dialInterval: any = null;

  /** Get or create singleton AudioContext, resume if suspended */
  private static async getCtx(): Promise<AudioContext | null> {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!this._ctx || this._ctx.state === 'closed') {
      this._ctx = new AC();
    }
    if (this._ctx.state === 'suspended') {
      try { await this._ctx.resume(); } catch (_) {}
    }
    return this._ctx;
  }

  private static isMuted(): boolean {
    return localStorage.getItem('gsv-sound-notifications') === 'false';
  }

  /** Stop all active audio nodes and intervals */
  static stopAll() {
    if (this._ringInterval) { clearInterval(this._ringInterval); this._ringInterval = null; }
    if (this._dialInterval) { clearInterval(this._dialInterval); this._dialInterval = null; }
    for (const node of this._activeNodes) {
      try { (node as any).stop?.(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    }
    this._activeNodes = [];
  }

  /** Play a continuous tone pair (e.g. dial tone 350Hz + 440Hz) until stopAll() */
  private static async playContiniousDualTone(freq1: number, freq2: number, vol: number = 0.08) {
    const ctx = await this.getCtx();
    if (!ctx) return;

    const createOsc = (freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this._activeNodes.push(osc, gain);
      return osc;
    };
    createOsc(freq1);
    createOsc(freq2);
  }

  /** DIAL TONE — 350Hz + 440Hz continuous (standard telephone) */
  static async playDialTone() {
    if (this.isMuted()) return;
    this.stopAll();
    await this.playContiniousDualTone(350, 440, 0.07);
  }

  /** RINGBACK TONE — caller hears "ring…ring…ring" while waiting.
   *  Pattern: 2s on, 4s off (US standard). */
  static async playRingback() {
    if (this.isMuted()) return;
    this.stopAll();

    const ctx = await this.getCtx();
    if (!ctx) return;

    const playBurst = async () => {
      const c = await this.getCtx();
      if (!c) return;
      const now = c.currentTime;
      const freqs = [440, 480];
      for (const freq of freqs) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
        gain.gain.setValueAtTime(0.07, now + 1.8);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 2.0);
        this._activeNodes.push(osc, gain);
      }
    };

    playBurst();
    // 2s on, 4s off = 6s cycle
    this._ringInterval = setInterval(playBurst, 6000);
  }

  /** INCOMING RING — callee hears a strong phone ring pattern.
   *  Pattern: 1s ring, 2s silence. */
  static async playIncomingRing() {
    if (this.isMuted()) return;
    this.stopAll();

    const playBurst = async () => {
      const ctx = await this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const pulseDuration = 0.35;
      const pulseGap = 0.12;
      const numPulses = 3; // 3 pulses per burst ≈ 1.4s

      for (let i = 0; i < numPulses; i++) {
        const start = now + i * (pulseDuration + pulseGap);
        for (const freq of [880, 987.77]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.12, start + 0.03);
          gain.gain.setValueAtTime(0.12, start + pulseDuration - 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + pulseDuration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + pulseDuration);
          this._activeNodes.push(osc, gain);
        }
      }
    };

    playBurst();
    this._ringInterval = setInterval(playBurst, 3000); // ring every 3s
  }

  /** BUSY TONE — 480Hz + 620Hz, 0.5s on / 0.5s off (US busy signal) */
  static async playBusyTone() {
    if (this.isMuted()) return;
    this.stopAll();

    const ctx = await this.getCtx();
    if (!ctx) return;

    const playBurst = async () => {
      const c = await this.getCtx();
      if (!c) return;
      const now = c.currentTime;
      for (const freq of [480, 620]) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.45);
        this._activeNodes.push(osc, gain);
      }
    };

    playBurst();
    this._dialInterval = setInterval(playBurst, 1000);
    // Auto-stop after 3s
    setTimeout(() => this.stopAll(), 3000);
  }

  /** CALL END — short descending beep */
  static async playCallEnd() {
    this.stopAll();
    const ctx = await this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    this._activeNodes.push(osc, gain);
  }

  /** NOTIFICATION — ding-dong chime for new messages */
  static async playNotification() {
    if (this.isMuted()) return;
    const ctx = await this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(880, now, 0.4, 0.12);
    playTone(659.25, now + 0.12, 0.6, 0.12);
  }

  /** UI click feedback */
  static async playClick() {
    if (localStorage.getItem('gsv-sound-clicks') === 'false') return;
    const ctx = await this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /** Legacy compat aliases */
  static playMessageRing() { this.playIncomingRing(); }
  static playRemoteRequestRing() { this.playIncomingRing(); }
  static playRing(_durationSeconds: number) { this.playIncomingRing(); }
}
