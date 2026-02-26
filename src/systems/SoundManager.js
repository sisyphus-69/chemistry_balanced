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

  /** Heartbeat — classic lub-DUB double thump */
  heartbeat(intensity = 0.5) {
    if (!this._enabled) return;
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const vol = this._volume * intensity;

    // Lub (softer, lower)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, t);
    osc1.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(vol * 0.7, t + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.2);

    // DUB (louder, slightly higher) — 0.15s after lub
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(65, t + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(40, t + 0.30);
    g2.gain.setValueAtTime(0, t + 0.15);
    g2.gain.linearRampToValueAtTime(vol, t + 0.17);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(t + 0.15);
    osc2.stop(t + 0.4);

    // Sub-bass thud for chest-feel
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(30, t + 0.15);
    g3.gain.setValueAtTime(0, t + 0.15);
    g3.gain.linearRampToValueAtTime(vol * 0.4, t + 0.17);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    osc3.connect(g3);
    g3.connect(ctx.destination);
    osc3.start(t + 0.15);
    osc3.stop(t + 0.35);
  }

  /** Low rumble for boss tension */
  bossRumble() {
    if (!this._enabled) return;
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.5);
    g.gain.setValueAtTime(this._volume * 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  /** Warning alarm blip for low time */
  bossWarning() {
    this._tone(800, 0.08, 'square', 0.3);
    setTimeout(() => this._tone(800, 0.08, 'square', 0.3), 120);
  }

  /** Impact thud when boss takes damage */
  bossImpact() {
    this._noise(0.15, 0.6);
    this._tone(80, 0.2, 'sine', 0.6);
    setTimeout(() => this._tone(60, 0.15, 'sine', 0.4), 50);
  }
}

/** Shared singleton */
export const soundManager = new SoundManager();
