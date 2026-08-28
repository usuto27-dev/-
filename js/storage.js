// localStorage-backed data store for the app.
const STORAGE_KEY = 'bodyfat-app-data-v1';

const DEFAULT_DATA = {
  settings: {
    gender: 'male',
    birthdate: '',
    height: 170,
    activity: 1.55,
    deficit: 400,
    goalBodyFat: 8,
    goalDate: '2026-12-31',
  },
  bodyLogs: [],   // { id, date, weight, bodyFat }
  meals: [],      // { id, date, type, name, cal, protein, carb, fat }
  workouts: [],   // { id, date, exercise, weight, reps, sets }
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
      bodyLogs: parsed.bodyLogs || [],
      meals: parsed.meals || [],
      workouts: parsed.workouts || [],
    };
  } catch (e) {
    console.error('Failed to load data', e);
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
