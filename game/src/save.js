// Save / load: money earned and the highest mission unlocked.
// localStorage only — nothing leaves the player's browser.
import { SAVE_KEY, START_MONEY } from './config.js';

// A fresh save: starting cash, first mission, no best result yet, no
// Solano packages collected yet.
function freshSave() {
  return { money: START_MONEY, missionIndex: 0, best: 0, packages: [] };
}

// Coerce one stored field back to a number, falling back to `fallback`
// when the stored value is missing or corrupted.
function numericField(data, field, fallback) {
  return typeof data[field] === 'number' ? data[field] : fallback;
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    return {
      money: numericField(data, 'money', START_MONEY),
      missionIndex: numericField(data, 'missionIndex', 0),
      best: numericField(data, 'best', 0),
      packages: Array.isArray(data.packages) ? data.packages.filter((n) => Number.isInteger(n)) : [],
    };
  } catch {
    return freshSave();
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
