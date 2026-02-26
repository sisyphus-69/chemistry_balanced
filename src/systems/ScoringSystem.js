/**
 * ScoringSystem — Points, combos, streaks, star ratings.
 */
export class ScoringSystem {
  static calculateScore(timeSeconds, parTime, hintsUsed, failedAttempts) {
    let score = 100; // base

    // Speed bonus
    if (timeSeconds < parTime * 0.5) {
      score += 50;
    } else if (timeSeconds < parTime) {
      score += 25;
    }

    // No-hint bonus
    if (hintsUsed === 0) {
      score += 25;
    }

    // First-try bonus
    if (failedAttempts === 0) {
      score += 50;
    }

    return score;
  }

  static calculateStars(hintsUsed) {
    if (hintsUsed === 0) return 3;
    if (hintsUsed === 1) return 2;
    return 1;
  }

  static calculateXP(baseScore, streakMultiplier = 1) {
    return Math.floor(baseScore * streakMultiplier);
  }

  static getStreakMultiplier(streak) {
    if (streak >= 10) return 3;
    if (streak >= 5) return 2.5;
    if (streak >= 3) return 2;
    return 1;
  }

  static getStreakLabel(streak) {
    if (streak >= 10) return 'LEGENDARY!';
    if (streak >= 5) return 'On Fire!';
    if (streak >= 3) return 'Molecule Master!';
    return '';
  }
}
