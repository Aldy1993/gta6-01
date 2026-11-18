// Save / load: money earned and the highest mission unlocked.
// localStorage only — nothing leaves the player's browser.
import { SAVE_KEY, START_MONEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { money: START_MONEY, missionIndex: 0, best: 0 };
    const data = JSON.parse(raw);
    return {
      money: typeof data.money === 'number' ? data.money : START_MONEY,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      best: typeof data.best === 'number' ? data.best : 0,
    };
  } catch {
    return { money: START_MONEY, missionIndex: 0, best: 0 };
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private mode: progress lasts this visit only.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
