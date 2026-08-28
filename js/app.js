let data = loadData();
let chartBody, chartCalories, chartWorkout;

// ---------- Tabs ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'dashboard') renderDashboard();
});

// ---------- Settings ----------
function fillSettingsForm() {
  const s = data.settings;
  document.getElementById('set-gender').value = s.gender;
  document.getElementById('set-birthdate').value = s.birthdate;
  document.getElementById('set-height').value = s.height;
  document.getElementById('set-activity').value = s.activity;
  document.getElementById('set-deficit').value = s.deficit;
  document.getElementById('set-goal-bf').value = s.goalBodyFat;
  document.getElementById('set-goal-date').value = s.goalDate;
}

document.getElementById('form-settings').addEventListener('submit', (e) => {
  e.preventDefault();
  data.settings = {
    gender: document.getElementById('set-gender').value,
    birthdate: document.getElementById('set-birthdate').value,
    height: parseFloat(document.getElementById('set-height').value),
    activity: parseFloat(document.getElementById('set-activity').value),
    deficit: parseFloat(document.getElementById('set-deficit').value),
    goalBodyFat: parseFloat(document.getElementById('set-goal-bf').value),
    goalDate: document.getElementById('set-goal-date').value,
  };
  saveData(data);
  renderDashboard();
  alert('設定を保存しました');
});

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bodyfat-app-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('file-import').click();
});

document.getElementById('file-import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      data = {
        settings: { ...DEFAULT_DATA.settings, ...(imported.settings || {}) },
        bodyLogs: imported.bodyLogs || [],
        meals: imported.meals || [],
        workouts: imported.workouts || [],
      };
      saveData(data);
      fillSettingsForm();
      renderAll();
      alert('インポートしました');
    } catch (err) {
      alert('インポートに失敗しました: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('全データを削除します。よろしいですか？')) return;
  data = structuredClone(DEFAULT_DATA);
  saveData(data);
  fillSettingsForm();
  renderAll();
});

// ---------- Body logs ----------
function sortedBodyLogs() {
  return [...data.bodyLogs].sort((a, b) => a.date.localeCompare(b.date));
}

function latestBodyLog() {
  const logs = sortedBodyLogs();
  return logs.length ? logs[logs.length - 1] : null;
}

document.getElementById('form-body').addEventListener('submit', (e) => {
  e.preventDefault();
  data.bodyLogs.push({
    id: uid(),
    date: document.getElementById('body-date').value,
    weight: parseFloat(document.getElementById('body-weight').value),
    bodyFat: parseFloat(document.getElementById('body-fat').value),
  });
  saveData(data);
  e.target.reset();
  document.getElementById('body-date').value = todayStr();
  renderBodyTable();
  renderDashboard();
});

function renderBodyTable() {
  const tbody = document.getElementById('body-log-table');
  const logs = sortedBodyLogs().slice().reverse();
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${l.date}</td>
      <td>${l.weight.toFixed(1)}</td>
      <td>${l.bodyFat.toFixed(1)}</td>
      <td>${calcLBM(l.weight, l.bodyFat).toFixed(1)}</td>
      <td><button class="del-btn" data-id="${l.id}" data-kind="body">削除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="5">記録がありません</td></tr>';
}

// ---------- Meals ----------
document.getElementById('form-meal').addEventListener('submit', (e) => {
  e.preventDefault();
  data.meals.push({
    id: uid(),
    date: document.getElementById('meal-date').value,
    type: document.getElementById('meal-type').value,
    name: document.getElementById('meal-name').value,
    cal: parseFloat(document.getElementById('meal-cal').value) || 0,
    protein: parseFloat(document.getElementById('meal-protein').value) || 0,
    carb: parseFloat(document.getElementById('meal-carb').value) || 0,
    fat: parseFloat(document.getElementById('meal-fat').value) || 0,
  });
  saveData(data);
  e.target.reset();
  document.getElementById('meal-date').value = todayStr();
  document.getElementById('meal-carb').value = 0;
  document.getElementById('meal-fat').value = 0;
  renderMealTable();
  renderDashboard();
});

document.getElementById('meal-filter-date').addEventListener('change', renderMealTable);

function renderMealTable() {
  const filterDate = document.getElementById('meal-filter-date').value || todayStr();
  const dayMeals = data.meals.filter(m => m.date === filterDate);
  const tbody = document.getElementById('meal-log-table');
  tbody.innerHTML = dayMeals.map(m => `
    <tr>
      <td>${m.type}</td>
      <td>${m.name}</td>
      <td>${m.cal}</td>
      <td>${m.protein}</td>
      <td>${m.carb}</td>
      <td>${m.fat}</td>
      <td><button class="del-btn" data-id="${m.id}" data-kind="meal">削除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7">この日の記録はありません</td></tr>';

  const totals = dayMeals.reduce((acc, m) => {
    acc.cal += m.cal; acc.protein += m.protein; acc.carb += m.carb; acc.fat += m.fat;
    return acc;
  }, { cal: 0, protein: 0, carb: 0, fat: 0 });

  document.getElementById('meal-day-totals').innerHTML = `
    <span>カロリー: <b>${totals.cal}</b> kcal</span>
    <span>P: <b>${totals.protein.toFixed(1)}</b>g</span>
    <span>C: <b>${totals.carb.toFixed(1)}</b>g</span>
    <span>F: <b>${totals.fat.toFixed(1)}</b>g</span>
  `;
}

function mealTotalsForDate(dateStr) {
  return data.meals.filter(m => m.date === dateStr).reduce((acc, m) => {
    acc.cal += m.cal; acc.protein += m.protein;
    return acc;
  }, { cal: 0, protein: 0 });
}

// ---------- Workouts ----------
document.getElementById('form-workout').addEventListener('submit', (e) => {
  e.preventDefault();
  data.workouts.push({
    id: uid(),
    date: document.getElementById('workout-date').value,
    exercise: document.getElementById('workout-exercise').value,
    weight: parseFloat(document.getElementById('workout-weight').value) || 0,
    reps: parseInt(document.getElementById('workout-reps').value) || 0,
    sets: parseInt(document.getElementById('workout-sets').value) || 0,
  });
  saveData(data);
  e.target.reset();
  document.getElementById('workout-date').value = todayStr();
  document.getElementById('workout-sets').value = 3;
  renderWorkoutTable();
  renderWorkoutExerciseSelect();
  renderWorkoutChart();
});

document.getElementById('workout-filter-date').addEventListener('change', renderWorkoutTable);

function renderWorkoutTable() {
  const filterDate = document.getElementById('workout-filter-date').value || todayStr();
  const dayWorkouts = data.workouts.filter(w => w.date === filterDate);
  const tbody = document.getElementById('workout-log-table');
  tbody.innerHTML = dayWorkouts.map(w => `
    <tr>
      <td>${w.exercise}</td>
      <td>${w.weight}kg</td>
      <td>${w.reps}</td>
      <td>${w.sets}</td>
      <td>${(w.weight * w.reps * w.sets).toFixed(1)}kg</td>
      <td><button class="del-btn" data-id="${w.id}" data-kind="workout">削除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6">この日の記録はありません</td></tr>';
}

function renderWorkoutExerciseSelect() {
  const select = document.getElementById('workout-exercise-select');
  const current = select.value;
  const exercises = [...new Set(data.workouts.map(w => w.exercise))].sort();
  select.innerHTML = exercises.map(ex => `<option value="${ex}">${ex}</option>`).join('');
  if (exercises.includes(current)) select.value = current;
}

document.getElementById('workout-exercise-select').addEventListener('change', renderWorkoutChart);

function renderWorkoutChart() {
  if (typeof Chart === 'undefined') return;
  const select = document.getElementById('workout-exercise-select');
  const exercise = select.value;
  const ctx = document.getElementById('chart-workout');
  const logs = data.workouts
    .filter(w => w.exercise === exercise)
    .sort((a, b) => a.date.localeCompare(b.date));

  const labels = logs.map(w => w.date);
  const volumes = logs.map(w => w.weight * w.reps * w.sets);

  if (chartWorkout) chartWorkout.destroy();
  chartWorkout = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${exercise || '種目'} 総ボリューム (kg)`,
        data: volumes,
        borderColor: '#4fd1a5',
        backgroundColor: 'rgba(79,209,165,0.15)',
        tension: 0.3,
        fill: true,
      }],
    },
    options: chartBaseOptions(),
  });
}

// ---------- Delete handler (event delegation) ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  const { id, kind } = btn.dataset;
  if (!confirm('削除しますか？')) return;
  if (kind === 'body') data.bodyLogs = data.bodyLogs.filter(l => l.id !== id);
  if (kind === 'meal') data.meals = data.meals.filter(m => m.id !== id);
  if (kind === 'workout') data.workouts = data.workouts.filter(w => w.id !== id);
  saveData(data);
  renderAll();
});

// ---------- Charts ----------
function chartBaseOptions() {
  return {
    responsive: true,
    plugins: { legend: { labels: { color: '#e8ecf5' } } },
    scales: {
      x: { ticks: { color: '#8f9bb8' }, grid: { color: '#2a3550' } },
      y: { ticks: { color: '#8f9bb8' }, grid: { color: '#2a3550' } },
    },
  };
}

function renderBodyChart() {
  if (typeof Chart === 'undefined') return;
  const logs = sortedBodyLogs();
  const ctx = document.getElementById('chart-body');
  if (chartBody) chartBody.destroy();
  chartBody = new Chart(ctx, {
    type: 'line',
    data: {
      labels: logs.map(l => l.date),
      datasets: [
        {
          label: '体重 (kg)',
          data: logs.map(l => l.weight),
          borderColor: '#4fd1a5',
          backgroundColor: 'rgba(79,209,165,0.15)',
          yAxisID: 'y',
          tension: 0.3,
        },
        {
          label: '体脂肪率 (%)',
          data: logs.map(l => l.bodyFat),
          borderColor: '#ff9f6b',
          backgroundColor: 'rgba(255,159,107,0.15)',
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#8f9bb8' }, grid: { color: '#2a3550' } },
        y: { position: 'left', ticks: { color: '#8f9bb8' }, grid: { color: '#2a3550' } },
        y1: { position: 'right', ticks: { color: '#8f9bb8' }, grid: { display: false } },
      },
    },
  });
}

function renderCalorieChart(calorieTarget) {
  if (typeof Chart === 'undefined') return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const totals = days.map(d => mealTotalsForDate(d).cal);
  const ctx = document.getElementById('chart-calories');
  if (chartCalories) chartCalories.destroy();
  chartCalories = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        {
          label: '摂取カロリー',
          data: totals,
          backgroundColor: '#4fd1a5',
        },
        {
          label: '目標カロリー',
          data: days.map(() => calorieTarget || 0),
          type: 'line',
          borderColor: '#ff9f6b',
          borderDash: [6, 4],
          pointRadius: 0,
        },
      ],
    },
    options: chartBaseOptions(),
  });
}

// ---------- Dashboard ----------
function renderDashboard() {
  const s = data.settings;
  const latest = latestBodyLog();
  const logs = sortedBodyLogs();
  const first = logs.length ? logs[0] : null;

  // Countdown
  const today = todayStr();
  const daysLeft = daysBetween(today, s.goalDate);
  document.getElementById('dash-days-left').textContent =
    daysLeft >= 0 ? `${daysLeft}日` : '目標日を過ぎています';
  document.getElementById('dash-goal-date').textContent = `目標日: ${s.goalDate}`;

  // Current body fat / weight
  document.getElementById('dash-current-bf').textContent = latest ? `${latest.bodyFat.toFixed(1)}%` : '-';
  document.getElementById('dash-bf-diff').textContent = latest
    ? `目標まで ${(latest.bodyFat - s.goalBodyFat).toFixed(1)}pt`
    : '記録なし';

  document.getElementById('dash-current-weight').textContent = latest ? `${latest.weight.toFixed(1)}kg` : '-';
  if (logs.length >= 2) {
    const prev = logs[logs.length - 2];
    const diff = latest.weight - prev.weight;
    document.getElementById('dash-weight-diff').textContent = `前回比 ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}kg`;
  } else {
    document.getElementById('dash-weight-diff').textContent = '前回比 -';
  }

  const lbm = latest ? calcLBM(latest.weight, latest.bodyFat) : null;
  document.getElementById('dash-lbm').textContent = lbm ? `${lbm.toFixed(1)}kg` : '-';

  // TDEE / targets
  const age = ageFromBirthdate(s.birthdate);
  const bmr = latest ? calcBMR({ gender: s.gender, weight: latest.weight, height: s.height, age }) : null;
  const tdee = calcTDEE(bmr, s.activity);
  const calorieTarget = calcCalorieTarget(tdee, s.deficit);
  const proteinTarget = calcProteinTarget(lbm);

  document.getElementById('dash-cal-target').textContent = calorieTarget ? `${calorieTarget}kcal` : '-';
  document.getElementById('dash-cal-detail').textContent = tdee ? `TDEE: ${Math.round(tdee)}kcal` : 'プロフィールと体組成を入力してください';

  document.getElementById('dash-protein-target').textContent = proteinTarget ? `${Math.round(proteinTarget)}g` : '-';

  // Today's intake
  const todayTotals = mealTotalsForDate(today);
  document.getElementById('dash-today-cal').textContent = `${todayTotals.cal}kcal`;
  document.getElementById('dash-today-cal-diff').textContent = calorieTarget
    ? `残り ${calorieTarget - todayTotals.cal}kcal`
    : '-';
  document.getElementById('dash-today-protein').textContent = `${todayTotals.protein.toFixed(1)}g`;
  document.getElementById('dash-today-protein-diff').textContent = proteinTarget
    ? `残り ${(proteinTarget - todayTotals.protein).toFixed(1)}g`
    : '-';

  // Progress bar (start bodyFat -> goal bodyFat)
  const startBf = first ? first.bodyFat : (latest ? latest.bodyFat : null);
  const goalBf = s.goalBodyFat;
  let pct = 0;
  if (startBf != null && latest) {
    const total = startBf - goalBf;
    const done = startBf - latest.bodyFat;
    pct = total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : (latest.bodyFat <= goalBf ? 100 : 0);
  }
  document.getElementById('dash-progress-bar').style.width = `${pct}%`;
  document.getElementById('dash-progress-start').textContent = startBf != null ? `開始 ${startBf.toFixed(1)}%` : '開始 -';
  document.getElementById('dash-progress-goal').textContent = `目標 ${goalBf}%`;

  renderBodyChart();
  renderCalorieChart(calorieTarget);
}

// ---------- Init ----------
function renderAll() {
  fillSettingsForm();
  renderBodyTable();
  renderMealTable();
  renderWorkoutTable();
  renderWorkoutExerciseSelect();
  renderWorkoutChart();
  renderDashboard();
}

function setDefaultDates() {
  const t = todayStr();
  document.getElementById('body-date').value = t;
  document.getElementById('meal-date').value = t;
  document.getElementById('meal-filter-date').value = t;
  document.getElementById('workout-date').value = t;
  document.getElementById('workout-filter-date').value = t;
}

setDefaultDates();
renderAll();
