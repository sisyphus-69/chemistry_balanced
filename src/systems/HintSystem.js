/**
 * HintSystem — 3-tier adaptive hints.
 */
export class HintSystem {
  constructor(hints) {
    this.hints = hints || [];
    this.currentTier = 0;
    this.hintsUsed = 0;
    this.idleTimer = 0;
    this.failCount = 0;
  }

  /**
   * Called when the student fails a check.
   */
  onFail() {
    this.failCount++;
  }

  /**
   * Update idle timer (call in scene update with delta).
   */
  updateIdle(deltaMs) {
    this.idleTimer += deltaMs;
  }

  /**
   * Reset idle timer (call when student interacts).
   */
  resetIdle() {
    this.idleTimer = 0;
  }

  /**
   * Check if an auto-hint should trigger.
   * @returns {string|null} Hint text or null
   */
  checkAutoHint() {
    // Tier 1: 1st fail or 30s idle
    if (this.currentTier === 0 && (this.failCount >= 1 || this.idleTimer >= 30000)) {
      return this.getNextHint();
    }
    // Tier 2: 2nd fail or 60s idle
    if (this.currentTier === 1 && (this.failCount >= 2 || this.idleTimer >= 60000)) {
      return this.getNextHint();
    }
    return null;
  }

  /**
   * Manually request the next hint.
   * @returns {string|null}
   */
  getNextHint() {
    if (this.currentTier >= this.hints.length) {
      return this.hints[this.hints.length - 1] || null;
    }
    const hint = this.hints[this.currentTier];
    this.currentTier++;
    this.hintsUsed++;
    this.idleTimer = 0;
    return hint;
  }

  /**
   * Get current tier (0-indexed).
   */
  getTier() {
    return this.currentTier;
  }

  /**
   * Get number of hints used.
   */
  getHintsUsed() {
    return this.hintsUsed;
  }

  /**
   * Whether there are more hints available.
   */
  hasMoreHints() {
    return this.currentTier < this.hints.length;
  }

  reset() {
    this.currentTier = 0;
    this.hintsUsed = 0;
    this.idleTimer = 0;
    this.failCount = 0;
  }
}
