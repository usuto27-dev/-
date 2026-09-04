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
    // Manual overrides for daily targets; null means "use the automatic
    // calculation instead" (TDEE-based calorie, LBM-based protein, etc.).
    calorieTargetOverride: null,
    proteinTargetOverride: null,
    fatTargetOverride: null,
    carbTargetOverride: null,
    // Cheat-day pacing: how many days between cheat days, and the date of
    // the most recent one (null until the user records or sets one).
    cheatDayIntervalDays: 14,
    lastCheatDayDate: null,
  },
  bodyLogs: [],   // { id, date, weight, bodyFat, muscleMass }
  meals: [],      // { id, date, type, name, cal, protein, carb, fat }
  workouts: [],   // { id, date, exercise, sets: [{ weight, reps, count }] }
};

// One entry per (date, exercise), so the same exercise done at several
// weights in one session shows as a single row instead of several.
// Also upgrades any older flat-shaped entries ({weight,reps,sets} directly
// on the record, from before this grouping existed) into the new shape.
function migrateWorkouts(workouts) {
  const result = [];
  const byKey = new Map();
  for (const w of workouts) {
    if (Array.isArray(w.sets)) {
      const key = w.date + '||' + w.exercise;
      if (byKey.has(key)) {
        byKey.get(key).sets.push(...w.sets);
      } else {
        const entry = { id: w.id || uid(), date: w.date, exercise: w.exercise, sets: [...w.sets] };
        byKey.set(key, entry);
        result.push(entry);
      }
      continue;
    }
    const key = w.date + '||' + w.exercise;
    if (!byKey.has(key)) {
      const entry = { id: w.id || uid(), date: w.date, exercise: w.exercise, sets: [] };
      byKey.set(key, entry);
      result.push(entry);
    }
    byKey.get(key).sets.push({ weight: w.weight || 0, reps: w.reps || 0, count: w.sets || 1 });
  }
  return result;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
      bodyLogs: parsed.bodyLogs || [],
      meals: parsed.meals || [],
      workouts: migrateWorkouts(parsed.workouts || []),
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
