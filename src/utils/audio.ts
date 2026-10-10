/**
 * Web Audio API synthesizer for Kitchen KDS audible alerts
 */
class KitchenAudioSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public prepareForPlayback() {
    this.initCtx();
  }

  public playCheckItemSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playDispatchSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      // High-low two-tone success chord
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.1, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.25);
      });
    } catch {
      // safe ignore
    }
  }

  public playRunnerAlertSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // safe ignore
    }
  }

  public playReadyBell() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      [880, 1174.66].forEach((frequency, index) => {
        if (!this.ctx) return;
        const startAt = now + index * 0.09;
        const oscillator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.07, startAt);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.24);
        oscillator.connect(gain);
        gain.connect(this.ctx.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.24);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * CD-28 · Campanilla suave de "llamado de mesa" para el personal (KDS / Salón).
   * Deliberadamente SUTIL: dos notas senoidales de baja ganancia con ataque/caída
   * largos (ding cristalino). No es una alarma crítica: no usa sawtooth, no repite
   * y no compite con los avisos rojos de demora.
   */
  public playWaiterCallChime() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const now = this.ctx.currentTime;
      const notes = [
        { freq: 1318.51, startAt: now, gain: 0.06, dur: 0.45 }, // E6
        { freq: 1975.53, startAt: now + 0.1, gain: 0.032, dur: 0.55 } // B6 (armónico tenue)
      ];

      notes.forEach(({ freq, startAt, gain, dur }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);
        env.gain.setValueAtTime(0.0001, startAt);
        env.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
        osc.connect(env);
        env.connect(this.ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + dur + 0.02);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playAllergyWarning() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(350, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // safe ignore
    }
  }
}

export const kitchenAudio = new KitchenAudioSystem();
