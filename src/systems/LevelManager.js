import { levels } from '../data/levels.js';

const STORAGE_KEY = 'calicoQuestUnlockedLevel';

export default class LevelManager {
  static getLevels() {
    return levels;
  }

  static getLevel(id) {
    return levels.find((level) => level.id === id) || levels[0];
  }

  static getMaxLevel() {
    return Math.max(...levels.map((level) => level.id));
  }

  static getMinUnlockedLevel() {
    return 1;
  }

  static getUnlockedLevel() {
    const floor = this.getMinUnlockedLevel();
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(saved) && saved >= 0) {
        return Math.min(Math.max(saved, floor), this.getMaxLevel());
      }
    } catch {
      return floor;
    }
    return floor;
  }

  static unlockThrough(levelId) {
    const nextUnlocked = Math.min(levelId, this.getMaxLevel());
    const current = this.getUnlockedLevel();
    if (nextUnlocked <= current) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextUnlocked));
    } catch {
      // Progress still lives in the current session if storage is unavailable.
    }
  }

  static resetUnlocks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '0');
    } catch {
      // No-op for private or restricted storage contexts.
    }
  }

  static createRunState(startLevel = 0) {
    return {
      score: 0,
      lives: 3,
      food: 0,
      currentLevel: startLevel,
      completedLevels: [],
      lastTimeBonus: 0,
      nextFoodLifeAt: 30,
    };
  }

  static startNewRun(scene, startLevel = 0) {
    const state = this.createRunState(startLevel);
    scene.registry.set('runState', state);
    return state;
  }

  static ensureRunState(scene, startLevel = 0) {
    const state = scene.registry.get('runState');
    if (state) {
      state.currentLevel = startLevel;
      return state;
    }
    return this.startNewRun(scene, startLevel);
  }

  static saveRunState(scene, state) {
    scene.registry.set('runState', state);
  }

  static completeLevel(scene, levelId, timeBonus) {
    const state = this.ensureRunState(scene, levelId);
    if (!state.completedLevels.includes(levelId)) {
      state.completedLevels.push(levelId);
    }
    state.lastTimeBonus = timeBonus;
    this.unlockThrough(levelId + 1);
    this.saveRunState(scene, state);
    return state;
  }
}
