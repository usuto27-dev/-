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

function daysBetween(dateFromStr, dateToStr) {
  const from = new Date(dateFromStr);
  const to = new Date(dateToStr);
  const ms = to - from;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
