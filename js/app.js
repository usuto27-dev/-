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

async function exportData() {
  const filename = `bodyfat-app-backup-${todayStr()}.json`;
  const json = JSON.stringify(data, null, 2);

  // When embedded in the Claude artifact viewer, a plain <a download> link
  // is inert there — use the downloads capability instead when present.
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        try {
          await downloads.save({ filename, data: json });
        } catch (err) {
          if (!err || err.code !== 'declined') {
            alert('保存に失敗しました: ' + (err && err.message ? err.message : err));
          }
        }
        return;
      }
    } catch (e) {
      // fall through to the standalone-hosting fallback below
    }
  }

  // Standalone hosting (e.g. GitHub Pages, local file): plain browser download.
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('btn-export').addEventListener('click', exportData);

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
        workouts: migrateWorkouts(imported.workouts || []),
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

// ---------- OCR helper (shared by body & meal photo inputs) ----------
async function runOcrOnFile(file, statusEl) {
  statusEl.textContent = '画像を解析しています…(初回は時間がかかることがあります)';
  if (typeof Tesseract === 'undefined') {
    statusEl.textContent = 'この環境では写真の読み取り機能を利用できませんでした。数値は手動で入力してください。';
    return null;
  }
  try {
    const { data: { text } } = await Tesseract.recognize(file, 'jpn+eng');
    return text;
  } catch (e) {
    statusEl.textContent = 'この環境では写真の読み取りができませんでした。数値は手動で入力してください。';
    return null;
  }
}

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
  const muscleVal = document.getElementById('body-muscle').value;
  data.bodyLogs.push({
    id: uid(),
    date: document.getElementById('body-date').value,
    weight: parseFloat(document.getElementById('body-weight').value),
    bodyFat: parseFloat(document.getElementById('body-fat').value),
    muscleMass: muscleVal !== '' ? parseFloat(muscleVal) : null,
  });
  saveData(data);
  e.target.reset();
  document.getElementById('body-date').value = todayStr();
  document.getElementById('body-ocr-status').textContent = '';
  renderBodyTable();
  renderDashboard();
});

document.getElementById('body-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('body-ocr-status');
  const text = await runOcrOnFile(file, statusEl);
  e.target.value = '';
  if (!text) return;
  const parsed = parseBodyCompositionText(text);
  const found = [];
  if (parsed.weight != null) { document.getElementById('body-weight').value = parsed.weight; found.push(`体重${parsed.weight}kg`); }
  if (parsed.bodyFat != null) { document.getElementById('body-fat').value = parsed.bodyFat; found.push(`体脂肪率${parsed.bodyFat}%`); }
  if (parsed.muscleMass != null) { document.getElementById('body-muscle').value = parsed.muscleMass; found.push(`筋肉量${parsed.muscleMass}kg`); }
  statusEl.textContent = found.length
    ? `読み取りました: ${found.join(' / ')}。内容を確認して「記録する」を押してください。`
    : '数値を読み取れませんでした。手動で入力してください。';
});

function renderBodyTable() {
  const tbody = document.getElementById('body-log-table');
  const logs = sortedBodyLogs().slice().reverse();
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${l.date}</td>
      <td class="num">${l.weight.toFixed(1)}</td>
      <td class="num">${l.bodyFat.toFixed(1)}</td>
      <td class="num">${l.muscleMass != null ? l.muscleMass.toFixed(1) : '-'}</td>
      <td class="num">${calcLBM(l.weight, l.bodyFat).toFixed(1)}</td>
      <td><button class="del-btn" data-id="${l.id}" data-kind="body">削除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6">記録がありません</td></tr>';
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
  document.getElementById('meal-paste-text').value = '';
  document.getElementById('meal-parse-status').textContent = '';
  document.getElementById('meal-ocr-status').textContent = '';
  renderMealTable();
  renderDashboard();
});

function applyParsedNutrition(parsed, statusEl) {
  const found = [];
  if (parsed.cal != null) { document.getElementById('meal-cal').value = parsed.cal; found.push(`カロリー${parsed.cal}kcal`); }
  if (parsed.protein != null) { document.getElementById('meal-protein').value = parsed.protein; found.push(`たんぱく質${parsed.protein}g`); }
  if (parsed.carb != null) { document.getElementById('meal-carb').value = parsed.carb; found.push(`炭水化物${parsed.carb}g`); }
  if (parsed.fat != null) { document.getElementById('meal-fat').value = parsed.fat; found.push(`脂質${parsed.fat}g`); }
  statusEl.textContent = found.length
    ? `読み取りました: ${found.join(' / ')}。内容を確認して「記録する」を押してください。`
    : '数値を読み取れませんでした。手動で入力してください。';
}

document.getElementById('btn-parse-meal-text').addEventListener('click', () => {
  const text = document.getElementById('meal-paste-text').value;
  const statusEl = document.getElementById('meal-parse-status');
  if (!text.trim()) {
    statusEl.textContent = 'テキストを入力してください。';
    return;
  }
  applyParsedNutrition(parseNutritionText(text), statusEl);
});

document.getElementById('meal-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('meal-ocr-status');
  const text = await runOcrOnFile(file, statusEl);
  e.target.value = '';
  if (!text) return;
  applyParsedNutrition(parseNutritionText(text), statusEl);
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
      <td class="num">${m.cal}</td>
      <td class="num">${m.protein}</td>
      <td class="num">${m.carb}</td>
      <td class="num">${m.fat}</td>
      <td><button class="del-btn" data-id="${m.id}" data-kind="meal">削除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7">この日の記録はありません</td></tr>';

  const totals = dayMeals.reduce((acc, m) => {
    acc.cal += m.cal; acc.protein += m.protein; acc.carb += m.carb; acc.fat += m.fat;
    return acc;
  }, { cal: 0, protein: 0, carb: 0, fat: 0 });

  document.getElementById('meal-day-totals').innerHTML = `
    <span>カロリー: <b class="num">${totals.cal}</b> kcal</span>
    <span>たんぱく質: <b class="num">${totals.protein.toFixed(1)}</b>g</span>
    <span>炭水化物: <b class="num">${totals.carb.toFixed(1)}</b>g</span>
    <span>脂質: <b class="num">${totals.fat.toFixed(1)}</b>g</span>
  `;
}

function mealTotalsForDate(dateStr) {
  return data.meals.filter(m => m.date === dateStr).reduce((acc, m) => {
    acc.cal += m.cal; acc.protein += m.protein; acc.fat += m.fat;
    return acc;
  }, { cal: 0, protein: 0, fat: 0 });
}

// ---------- Workouts (multi-exercise quick entry) ----------
function createExerciseRow(prefill = {}) {
  const row = document.createElement('div');
  row.className = 'exercise-row';
  row.innerHTML = `
    <div class="exercise-row-top">
      <input type="text" class="ex-name" list="exercise-suggestions" placeholder="種目名(例: ベンチプレス)" value="${prefill.exercise || ''}">
      <button type="button" class="row-remove-btn" aria-label="この行を削除">×</button>
    </div>
    <div class="exercise-row-numbers">
      <label>重量(kg)<input type="number" class="ex-weight" step="0.5" inputmode="decimal" value="${prefill.weight != null ? prefill.weight : ''}"></label>
      <label>回数<input type="number" class="ex-reps" step="1" inputmode="numeric" value="${prefill.reps != null ? prefill.reps : ''}"></label>
      <label>セット<input type="number" class="ex-sets" step="1" inputmode="numeric" value="${prefill.sets != null ? prefill.sets : 3}"></label>
    </div>
  `;
  row.querySelector('.row-remove-btn').addEventListener('click', () => row.remove());
  return row;
}

function addExerciseRow(prefill) {
  document.getElementById('workout-rows').appendChild(createExerciseRow(prefill));
}

function initWorkoutRows(count = 3) {
  const container = document.getElementById('workout-rows');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) addExerciseRow();
}

document.getElementById('btn-add-exercise-row').addEventListener('click', () => addExerciseRow());

document.getElementById('btn-parse-workout-text').addEventListener('click', () => {
  const text = document.getElementById('workout-paste-text').value;
  const statusEl = document.getElementById('workout-parse-status');
  if (!text.trim()) {
    statusEl.textContent = 'テキストを入力してください。';
    return;
  }
  const parsedRows = parseWorkoutText(text);
  if (!parsedRows.length) {
    statusEl.textContent = '種目を読み取れませんでした。「種目名 重量×回数.回数.回数」の形式で入力してください。';
    return;
  }
  document.getElementById('workout-rows').innerHTML = '';
  parsedRows.forEach(r => addExerciseRow(r));
  const names = [...new Set(parsedRows.map(r => r.exercise))];
  statusEl.textContent = `${parsedRows.length}行を読み取りました(${names.join('、')})。内容を確認して「まとめて記録する」を押してください。`;
});

document.getElementById('btn-load-last-session').addEventListener('click', () => {
  const dates = [...new Set(data.workouts.map(w => w.date))].sort();
  const lastDate = dates[dates.length - 1];
  if (!lastDate) {
    alert('過去の記録がありません');
    return;
  }
  document.getElementById('workout-rows').innerHTML = '';
  data.workouts.filter(w => w.date === lastDate).forEach(w => {
    w.sets.forEach(s => addExerciseRow({ exercise: w.exercise, weight: s.weight, reps: s.reps, sets: s.count }));
  });
});

document.getElementById('btn-save-workout-rows').addEventListener('click', () => {
  const date = document.getElementById('workout-date').value || todayStr();
  const rows = [...document.querySelectorAll('#workout-rows .exercise-row')];
  const grouped = new Map(); // exercise -> sets[]
  rows.forEach(row => {
    const exercise = row.querySelector('.ex-name').value.trim();
    if (!exercise) return;
    const weight = parseFloat(row.querySelector('.ex-weight').value) || 0;
    const reps = parseInt(row.querySelector('.ex-reps').value) || 0;
    const count = parseInt(row.querySelector('.ex-sets').value) || 0;
    if (!reps || !count) return;
    if (!grouped.has(exercise)) grouped.set(exercise, []);
    grouped.get(exercise).push({ weight, reps, count });
  });
  if (grouped.size === 0) {
    alert('種目名・回数・セット数が入力された行がありません');
    return;
  }
  // Same exercise already logged today -> append sets to that row instead
  // of creating a duplicate.
  grouped.forEach((sets, exercise) => {
    const existing = data.workouts.find(w => w.date === date && w.exercise === exercise);
    if (existing) {
      existing.sets.push(...sets);
    } else {
      data.workouts.push({ id: uid(), date, exercise, sets });
    }
  });
  saveData(data);
  initWorkoutRows(3);
  document.getElementById('workout-date').value = date;
  document.getElementById('workout-paste-text').value = '';
  document.getElementById('workout-parse-status').textContent = '';
  renderWorkoutTable();
  renderWorkoutExerciseSelect();
  renderWorkoutChart();
  renderExerciseSuggestions();
  alert(`${grouped.size}種目を記録しました`);
});

document.getElementById('workout-filter-date').addEventListener('change', renderWorkoutTable);

function workoutVolume(w) {
  return w.sets.reduce((sum, s) => sum + s.weight * s.reps * s.count, 0);
}

function renderWorkoutTable() {
  const filterDate = document.getElementById('workout-filter-date').value || todayStr();
  const dayWorkouts = data.workouts.filter(w => w.date === filterDate);
  const tbody = document.getElementById('workout-log-table');
  tbody.innerHTML = dayWorkouts.map(w => {
    const setsText = w.sets
      .map(s => `${s.weight}kg×${s.reps}回${s.count > 1 ? `×${s.count}セット` : ''}`)
      .join(' / ');
    return `
    <tr>
      <td>${w.exercise}</td>
      <td>${setsText}</td>
      <td class="num">${workoutVolume(w).toFixed(1)}kg</td>
      <td><button class="del-btn" data-id="${w.id}" data-kind="workout">削除</button></td>
    </tr>
  `;
  }).join('') || '<tr><td colspan="4">この日の記録はありません</td></tr>';
}

function renderExerciseSuggestions() {
  const datalist = document.getElementById('exercise-suggestions');
  const names = [...new Set(data.workouts.map(w => w.exercise))].sort();
  datalist.innerHTML = names.map(n => `<option value="${n}"></option>`).join('');
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
  if (typeof Chart === 'undefined') { showChartUnavailable('chart-workout'); return; }
  const select = document.getElementById('workout-exercise-select');
  const exercise = select.value;
  const ctx = document.getElementById('chart-workout');
  const logs = data.workouts
    .filter(w => w.exercise === exercise)
    .sort((a, b) => a.date.localeCompare(b.date));

  const labels = logs.map(w => w.date);
  const volumes = logs.map(w => workoutVolume(w));

  if (chartWorkout) chartWorkout.destroy();
  chartWorkout = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${exercise || '種目'} 総ボリューム (kg)`,
        data: volumes,
        borderColor: cssVar('--accent'),
        backgroundColor: cssVar('--accent') + '26',
        pointRadius: 3,
        pointHoverRadius: 5,
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
function showChartUnavailable(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const box = canvas.closest('.chart-box') || canvas.parentElement;
  if (box.querySelector('.chart-fallback-msg')) return;
  const msg = document.createElement('p');
  msg.className = 'field-hint chart-fallback-msg';
  msg.textContent = 'グラフを読み込めませんでした。通信環境をご確認のうえ、アプリを再読み込みしてみてください。';
  box.appendChild(msg);
}

function chartBaseOptions() {
  const textDim = cssVar('--text-dim');
  const line = cssVar('--line');
  const text = cssVar('--text');
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: text } } },
    scales: {
      x: { ticks: { color: textDim }, grid: { color: line } },
      y: { ticks: { color: textDim }, grid: { color: line } },
    },
  };
}

function renderBodyChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable('chart-body'); return; }
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
          borderColor: cssVar('--accent'),
          backgroundColor: cssVar('--accent') + '26',
          yAxisID: 'y',
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
        {
          label: '体脂肪率 (%)',
          data: logs.map(l => l.bodyFat),
          borderColor: cssVar('--accent-warm'),
          backgroundColor: cssVar('--accent-warm') + '26',
          yAxisID: 'y1',
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: cssVar('--text-dim') }, grid: { color: cssVar('--line') } },
        y: { position: 'left', ticks: { color: cssVar('--text-dim') }, grid: { color: cssVar('--line') } },
        y1: { position: 'right', ticks: { color: cssVar('--text-dim') }, grid: { display: false } },
      },
    },
  });
}

function renderCalorieChart(calorieTarget) {
  if (typeof Chart === 'undefined') { showChartUnavailable('chart-calories'); return; }
  const days = [];
  // Anchor at noon UTC (safely mid-day in JST too) before stepping back
  // whole days, so each label lands on the correct JST calendar date.
  const anchor = new Date(todayStr() + 'T12:00:00Z');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(formatDateJST(d));
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
          backgroundColor: cssVar('--accent'),
        },
        {
          label: '目標カロリー',
          data: days.map(() => calorieTarget || 0),
          type: 'line',
          borderColor: cssVar('--accent-warm'),
          borderDash: [6, 4],
          pointRadius: 0,
        },
      ],
    },
    options: chartBaseOptions(),
  });
}

// ---------- Dashboard ----------
function renderProgressSummary() {
  const logs = sortedBodyLogs();
  const el = document.getElementById('dash-progress-summary');
  if (logs.length === 0) {
    el.textContent = '体組成を記録すると、ここに開始からの変化が表示されます。';
    return;
  }
  if (logs.length === 1) {
    el.textContent = `記録は${logs[0].date}に始まったばかりです。継続して記録していきましょう。`;
    return;
  }
  const first = logs[0];
  const latest = logs[logs.length - 1];
  const days = daysBetween(first.date, latest.date);
  const weightDiff = latest.weight - first.weight;
  const bfDiff = latest.bodyFat - first.bodyFat;
  const sign = (n) => (n > 0 ? '+' : '');
  el.innerHTML = `開始日(${first.date}、${days}日前)は体重 <b class="num">${first.weight.toFixed(1)}</b>kg・体脂肪率 <b class="num">${first.bodyFat.toFixed(1)}</b>% でした。そこから体重は <b class="num">${sign(weightDiff)}${weightDiff.toFixed(1)}</b>kg、体脂肪率は <b class="num">${sign(bfDiff)}${bfDiff.toFixed(1)}</b>pt 変化しています。`;
}

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
  const fatTarget = calcFatTarget(calorieTarget);

  document.getElementById('dash-cal-target').textContent = calorieTarget ? `${calorieTarget}kcal` : '-';
  document.getElementById('dash-cal-detail').textContent = tdee
    ? `1日に消費するカロリー: ${Math.round(tdee)}kcal`
    : '「設定」でプロフィールを、「体組成」で体重・体脂肪率を入力してください';

  // Today's intake
  const todayTotals = mealTotalsForDate(today);
  if (calorieTarget) {
    const remainingCal = calorieTarget - todayTotals.cal;
    document.getElementById('dash-today-cal').textContent = remainingCal >= 0
      ? `あと${remainingCal}kcal`
      : `オーバー${Math.abs(remainingCal)}kcal`;
    document.getElementById('dash-today-cal-diff').textContent =
      `今日食べた量: ${todayTotals.cal}kcal(目標${calorieTarget}kcal)`;
  } else {
    document.getElementById('dash-today-cal').textContent = `${todayTotals.cal}kcal`;
    document.getElementById('dash-today-cal-diff').textContent = '「設定」「体組成」を記録すると目標との差が表示されます';
  }

  if (proteinTarget) {
    const remainingProtein = proteinTarget - todayTotals.protein;
    document.getElementById('dash-today-protein').textContent = remainingProtein > 0
      ? `あと${remainingProtein.toFixed(1)}g`
      : '目標達成';
    document.getElementById('dash-protein-detail').textContent =
      `今日食べた量: ${todayTotals.protein.toFixed(1)}g(目標${Math.round(proteinTarget)}g)`;
  } else {
    document.getElementById('dash-today-protein').textContent = `${todayTotals.protein.toFixed(1)}g`;
    document.getElementById('dash-protein-detail').textContent = '「体組成」で記録すると目標との差が表示されます';
  }

  if (fatTarget) {
    const remainingFat = fatTarget - todayTotals.fat;
    document.getElementById('dash-today-fat').textContent = remainingFat > 0
      ? `あと${remainingFat.toFixed(1)}g`
      : '目標達成';
    document.getElementById('dash-fat-detail').textContent =
      `今日食べた量: ${todayTotals.fat.toFixed(1)}g(目標${Math.round(fatTarget)}g)`;
  } else {
    document.getElementById('dash-today-fat').textContent = `${todayTotals.fat.toFixed(1)}g`;
    document.getElementById('dash-fat-detail').textContent = '「体組成」で記録すると目標との差が表示されます';
  }

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

  renderProgressSummary();
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
  renderExerciseSuggestions();
  renderDashboard();
}

const DATE_FIELD_IDS = ['body-date', 'meal-date', 'meal-filter-date', 'workout-date', 'workout-filter-date'];

function setDefaultDates() {
  const t = todayStr();
  DATE_FIELD_IDS.forEach(id => { document.getElementById(id).value = t; });
}

// If the page is left open across midnight (JST), the date fields would
// otherwise keep showing the day the page was loaded on. Re-check "today"
// whenever the tab regains focus and periodically while it stays open, and
// roll forward any field still sitting on the old date (never a date the
// user deliberately backdated).
let currentAppDate = todayStr();

function refreshDateIfChanged() {
  const now = todayStr();
  if (now === currentAppDate) return;
  const previous = currentAppDate;
  currentAppDate = now;
  DATE_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el.value === previous) el.value = now;
  });
  renderMealTable();
  renderWorkoutTable();
  renderDashboard();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshDateIfChanged();
});
setInterval(refreshDateIfChanged, 60000);

setDefaultDates();
initWorkoutRows(3);
renderAll();

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    renderDashboard();
    renderWorkoutChart();
  });
}
