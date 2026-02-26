/**
 * ProgressionSystem — XP, ranks, unlocks, level gating. Persists to localStorage.
 */

const RANKS = [
  { title: 'Apprentice Chemist', xp: 0, levelsUnlocked: 10 },
  { title: 'Lab Technician', xp: 500, levelsUnlocked: 20 },
  { title: 'Molecule Engineer', xp: 1500, levelsUnlocked: 30 },
  { title: 'Reaction Specialist', xp: 3000, levelsUnlocked: 40 },
  { title: 'Master Chemist', xp: 5000, levelsUnlocked: 50 }
];

const SAVE_KEY = 'chemquest_save';

export class ProgressionSystem {
  constructor() {
    this.data = this._load();
  }

  _defaultData() {
    return {
      xp: 0,
      streak: 0,
      levelsCompleted: {},  // { levelId: { stars, bestTime, score } }
      achievements: [],     // array of achievement ids
      settings: {
        musicVolume: 0.5,
        sfxVolume: 0.7,
        colorblindMode: false
      }
    };
  }

  _load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this._defaultData(), ...parsed };
      }
    } catch (e) {
      // Ignore parse errors
    }
    return this._defaultData();
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      // localStorage might be unavailable
    }
  }

  addXP(amount) {
    this.data.xp += amount;
    this.save();
  }

  getXP() {
    return this.data.xp;
  }

  getRank() {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (this.data.xp >= r.xp) rank = r;
    }
    return rank;
  }

  getNextRank() {
    const current = this.getRank();
    const idx = RANKS.indexOf(current);
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  }

  getMaxUnlockedLevel() {
    return this.getRank().levelsUnlocked;
  }

  isLevelUnlocked(levelNum) {
    return levelNum <= this.getMaxUnlockedLevel();
  }

  completeLevel(levelId, stars, time, score) {
    const existing = this.data.levelsCompleted[levelId];
    if (!existing || stars > existing.stars || score > existing.score) {
      this.data.levelsCompleted[levelId] = {
        stars: Math.max(stars, existing?.stars || 0),
        bestTime: Math.min(time, existing?.bestTime || Infinity),
        score: Math.max(score, existing?.score || 0)
      };
    }
    this.save();
  }

  getLevelData(levelId) {
    return this.data.levelsCompleted[levelId] || null;
  }

  getStreak() {
    return this.data.streak;
  }

  incrementStreak() {
    this.data.streak++;
    this.save();
    return this.data.streak;
  }

  resetStreak() {
    this.data.streak = 0;
    this.save();
  }

  unlockAchievement(id) {
    if (!this.data.achievements.includes(id)) {
      this.data.achievements.push(id);
      this.save();
      return true; // newly unlocked
    }
    return false;
  }

  hasAchievement(id) {
    return this.data.achievements.includes(id);
  }

  getCompletedCount() {
    return Object.keys(this.data.levelsCompleted).length;
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(settings) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
  }

  resetAll() {
    this.data = this._defaultData();
    this.save();
  }
}
