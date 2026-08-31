// Pure calculation helpers (BMR/TDEE/LBM/targets).

function ageFromBirthdate(birthdate) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// Mifflin-St Jeor
function calcBMR({ gender, weight, height, age }) {
  if (!weight || !height || age == null) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'female' ? base - 161 : base + 5;
}

function calcTDEE(bmr, activity) {
  if (bmr == null) return null;
  return bmr * activity;
}

function calcLBM(weight, bodyFatPct) {
  if (!weight || bodyFatPct == null) return null;
  return weight * (1 - bodyFatPct / 100);
}

function calcProteinTarget(lbm) {
  if (lbm == null) return null;
  return lbm * 2.2; // g/day, common cutting recommendation per kg lean mass
}

function calcCalorieTarget(tdee, deficit) {
  if (tdee == null) return null;
  return Math.max(1200, Math.round(tdee - deficit));
}

function calcFatTarget(calorieTarget) {
  if (calorieTarget == null) return null;
  return (calorieTarget * 0.25) / 9; // ~25% of calories from fat, at 9 kcal/g
}

function daysBetween(dateFromStr, dateToStr) {
  const from = new Date(dateFromStr);
  const to = new Date(dateToStr);
  const ms = to - from;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Formats a Date as YYYY-MM-DD in Japan time, regardless of the device's
// own timezone setting, so "today" always rolls over at JST midnight
// (Date#toISOString() uses UTC, which rolls over 9 hours late for JST).
// Built from explicit numeric parts (not a locale's own separator/order)
// so it can't drift across browsers/versions.
const JST_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatDateJST(date) {
  const parts = {};
  for (const p of JST_DATE_PARTS_FORMATTER.formatToParts(date)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function todayStr() {
  return formatDateJST(new Date());
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Best-effort extraction of calorie/PFC numbers from free-form text
// (pasted from another AI's answer, or OCR output of a nutrition label).
function parseNutritionText(text) {
  const norm = text.replace(/,/g, ' ');
  const result = { cal: null, protein: null, carb: null, fat: null };

  const calMatch = norm.match(/([0-9]+(?:\.[0-9]+)?)\s*kcal/i)
    || norm.match(/(?:カロリー|エネルギー|calories?)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (calMatch) result.cal = parseFloat(calMatch[1]);

  const proteinMatch = norm.match(/(?:たんぱく質|タンパク質|蛋白質|protein)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*g/i)
    || norm.match(/\bP\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*g/i);
  if (proteinMatch) result.protein = parseFloat(proteinMatch[1]);

  const carbMatch = norm.match(/(?:炭水化物|糖質|carbohydrates?|carbs?)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*g/i)
    || norm.match(/\bC\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*g/i);
  if (carbMatch) result.carb = parseFloat(carbMatch[1]);

  const fatMatch = norm.match(/(?:脂質|脂肪|fats?)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*g/i)
    || norm.match(/\bF\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*g/i);
  if (fatMatch) result.fat = parseFloat(fatMatch[1]);

  return result;
}

// Best-effort extraction of weight/body-fat/muscle-mass numbers from OCR
// output of a gym body-composition scale's screen or printed report.
function parseBodyCompositionText(text) {
  const norm = text.replace(/,/g, ' ');
  const result = { weight: null, bodyFat: null, muscleMass: null };

  const weightMatch = norm.match(/(?:体重|weight)\s*[:：]?\s*([0-9]{2,3}(?:\.[0-9]+)?)\s*kg/i)
    || norm.match(/([0-9]{2,3}(?:\.[0-9]+)?)\s*kg/i);
  if (weightMatch) result.weight = parseFloat(weightMatch[1]);

  const muscleMatch = norm.match(/(?:骨格筋量|筋肉量|muscle\s*mass)\s*[:：]?\s*([0-9]{2,3}(?:\.[0-9]+)?)\s*kg/i);
  if (muscleMatch) result.muscleMass = parseFloat(muscleMatch[1]);

  const bfMatch = norm.match(/(?:体脂肪率|体脂肪|body\s*fat)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i)
    || norm.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (bfMatch) result.bodyFat = parseFloat(bfMatch[1]);

  return result;
}

// Collapse a sequence of rep counts into {reps, sets} groups, merging
// consecutive equal values (e.g. [16,16,16] -> one group of 3 sets;
// [16,12,10,7] -> four separate 1-set groups).
function groupReps(repsArray) {
  const groups = [];
  for (const r of repsArray) {
    const last = groups[groups.length - 1];
    if (last && last.reps === r) {
      last.sets++;
    } else {
      groups.push({ reps: r, sets: 1 });
    }
  }
  return groups;
}

// Parse shorthand workout notes into {exercise, weight, reps, sets} rows.
// Supports lines like:
//   懸垂16.12.10.7                (bodyweight, no weight given)
//   ヒップアブダクター67.5×16.16.16.   (name + weight×reps.reps.reps on one line)
//   スミスインクラインベンチ            (name on its own line)
//   67×7.5                        (weight×reps line, uses the last-seen name)
function parseWorkoutText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows = [];
  let currentName = '';

  for (let line of lines) {
    line = line.replace(/[xX＊*]/g, '×');
    const m = line.match(/^([^\d]*)([0-9].*)$/);

    if (!m) {
      // No digits at all: a pure exercise-name line.
      currentName = line;
      continue;
    }

    const namePart = m[1].trim();
    const dataPart = m[2].trim();
    if (namePart) currentName = namePart;
    if (!currentName || !dataPart) continue;

    let weight = 0;
    let repsStr = dataPart;
    if (dataPart.includes('×')) {
      const [wPart, rPart] = dataPart.split('×');
      weight = parseFloat(wPart) || 0;
      repsStr = rPart;
    }

    const reps = repsStr.split(/[.,、]/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n) && n > 0);
    if (!reps.length) continue;

    groupReps(reps).forEach(g => {
      rows.push({ exercise: currentName, weight, reps: g.reps, sets: g.sets });
    });
  }

  return rows;
}
