/**
 * SoundManager — Programmatic Web Audio synthesis for game feedback.
 *
 * All sounds are generated on-the-fly with oscillators and gain envelopes.
 * No external audio files needed.
 */
export class SoundManager {
  constructor() {
    this._ctx = null;
    this._enabled = true;
    this._volume = 0.3;
  }

  /** Lazy-init AudioContext (must happen after user gesture) */
  _ensureCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  setEnabled(on) { this._enabled = on; }
  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }

  // ─── Primitives ───────────────────────────

  /** Play a single tone with ADSR-ish envelope */
  _tone(freq, duration, type = 'sine', vol = 1) {
    if (!this._enabled) return;
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(this._volume * vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  /** Play a quick noise burst (for percussive clicks) */
  _noise(duration, vol = 0.5) {
    if (!this._enabled) return;
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._volume * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  }

  // ─── Game sounds ──────────────────────────

  /** Soft click when changing a coefficient */
  coeffChange() {
    this._tone(880, 0.08, 'sine', 0.4);
    this._noise(0.03, 0.15);
  }

  /** Subtle tick when selecting / focusing a slot */
  slotSelect() {
    this._tone(1200, 0.05, 'sine', 0.25);
  }

  /** Short blip for typing a number into a slot */
  coeffType() {
    this._tone(660, 0.06, 'triangle', 0.3);
  }

  /** Ascending 3-note chime when equation is balanced */
  success() {
    this._tone(523, 0.15, 'sine', 0.5);
    setTimeout(() => this._tone(659, 0.15, 'sine', 0.5), 100);
    setTimeout(() => this._tone(784, 0.25, 'sine', 0.6), 200);
    setTimeout(() => this._tone(1047, 0.4, 'sine', 0.4), 350);
  }

  /** Descending buzz on wrong answer */
  fail() {
    this._tone(220, 0.12, 'sawtooth', 0.25);
    setTimeout(() => this._tone(180, 0.15, 'sawtooth', 0.2), 80);
    setTimeout(() => this._tone(140, 0.2, 'sawtooth', 0.15), 160);
  }

  /** Ding when an individual element becomes balanced */
  elementBalanced() {
    this._tone(1047, 0.12, 'sine', 0.3);
  }

  /** Sparkle for earning a star */
  starReveal() {
    this._tone(1320, 0.08, 'sine', 0.35);
    setTimeout(() => this._tone(1760, 0.15, 'sine', 0.3), 60);
  }

  /** Notification tone for hints */
  hint() {
    this._tone(440, 0.1, 'triangle', 0.25);
    setTimeout(() => this._tone(550, 0.15, 'triangle', 0.2), 100);
  }

  /** XP gain whoosh */
  xpGain() {
    if (!this._enabled) return;
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
    gain.gain.setValueAtTime(this._volume * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  /** Boss defeated fanfare */
  bossDefeat() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1320];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, 'sine', 0.5), i * 100);
    });
  }

  /** Boss timeout sad trombone */
  bossTimeout() {
    const notes = [400, 380, 340, 260];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.3, 'sawtooth', 0.2), i * 250);
    });
  }

  /** Button press click */
  buttonPress() {
    this._noise(0.04, 0.3);
    this._tone(600, 0.05, 'square', 0.15);
  }
}

/** Shared singleton */
export const soundManager = new SoundManager();
