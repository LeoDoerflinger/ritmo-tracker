const HABIT_ICONS = ['💧', '🏃', '📚', '🧘', '🥗', '💊', '☀️', '✍️', '🎨', '🚶', '😴', '🌿'];

const CARD_TONES = [
  { id: 'cloud', label: 'Blanco Nube', hex: '#FFFFFF' },
  { id: 'mint', label: 'Menta Pastel', hex: '#D8EFE0' },
  { id: 'peach', label: 'Arena Durazno', hex: '#EFE2D0' },
  { id: 'sky', label: 'Cielo Pastel', hex: '#D4E8F9' },
  { id: 'blush', label: 'Rosa Sakura', hex: '#F6DCE4' },
  { id: 'lavender', label: 'Lavanda Suave', hex: '#E3DAF7' },
  { id: 'butter', label: 'Manteca Limón', hex: '#F5E9BE' },
  { id: 'coral', label: 'Coral Peonía', hex: '#F7D7CE' }
];

let appState = window.StorageEngine.loadState();
let activeTab = 'habits';
let editingHabitId = null;
let selectedHabitIcon = '💧';
let selectedHabitTone = 'sky';
let selectedReminderDays = [1, 2, 3, 4, 5, 6, 0];
let currentStatsHabitId = null;
let deferredPwaPrompt = null;
let toastTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const recovered = await window.StorageEngine.syncFromIndexedDBIfNeeded();
  if (recovered) {
    appState = recovered;
  }

  applyInterfacePreferences();
  updateDateHeader();
  initFormPickers();
  bindGlobalEvents();
  renderAll();

  window.NotificationEngine.startScheduler(
    () => appState,
    ({ habit, title, body }) => {
      showToast(`${title}: ${body}`, habit.id, 'Sumar +1');
    }
  );

  registerServiceWorker();
  handleHashRoute();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK' && event.data.habitId) {
        openHabitStatsModal(event.data.habitId);
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = document.getElementById('pwa-direct-install-btn');
    if (installBtn) {
      installBtn.hidden = false;
    }
  });
}

function handleHashRoute() {
  const hash = window.location.hash;
  if (hash === '#widget') switchTab('widget');
  else if (hash === '#stats') switchTab('stats');
  else if (hash === '#coach') openCoachModal();
}

function applyInterfacePreferences() {
  const prefs = appState.preferences || {};
  document.documentElement.setAttribute('data-theme', prefs.theme || 'sakura');
  document.documentElement.setAttribute('data-font', prefs.font || 'soft');
  document.documentElement.setAttribute('data-layout', prefs.layout || 'grid');
  document.documentElement.setAttribute('data-shape', prefs.shape || 'squircle');

  const themeColors = {
    sakura: '#FAF6F0',
    matcha: '#F4F8F4',
    lavender: '#F6F3FA',
    peach: '#FDF6F2',
    night: '#1D1922'
  };
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', themeColors[prefs.theme] || '#FAF6F0');
  }
}

function updateDateHeader() {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const formatted = new Date().toLocaleDateString('es-AR', options).toUpperCase();
  const el = document.getElementById('current-date');
  if (el) el.textContent = formatted;
}

function saveAndRender() {
  window.StorageEngine.saveState(appState);
  applyInterfacePreferences();
  renderAll();
}

function renderAll() {
  const greetingNameEl = document.getElementById('greeting-name-text');
  if (greetingNameEl) {
    greetingNameEl.textContent = `Hola, ${appState.userName || 'Sofía'}`;
  }

  const globalStats = window.StorageEngine.getGlobalStats(appState);
  const todayCounterEl = document.getElementById('header-today-count');
  if (todayCounterEl) {
    todayCounterEl.textContent = String(globalStats.totalToday);
  }

  const activeRemindersCount = appState.habits.filter(
    (h) => h.reminder && h.reminder.enabled
  ).length;
  const notifDot = document.getElementById('header-notif-dot');
  if (notifDot) {
    notifDot.hidden = activeRemindersCount === 0;
  }

  renderCoachBanner();
  renderHabitsGrid(globalStats);
  renderWidgetView(globalStats);
  renderGlobalStatsView(globalStats);
  syncCustomizationControls();
}

function renderCoachBanner() {
  const banner = document.getElementById('coach-banner');
  if (!banner) return;

  if (appState.bannerDismissed) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;

  const suggestion = window.CoachEngine.getBannerSuggestion(appState);
  document.getElementById('coach-banner-title').textContent = suggestion.title;
  document.getElementById('coach-banner-text').textContent = suggestion.text;

  const quickBtn = document.getElementById('coach-banner-action-btn');
  if (suggestion.actionHabitId && suggestion.actionLabel) {
    quickBtn.hidden = false;
    quickBtn.textContent = suggestion.actionLabel;
    quickBtn.onclick = () => incrementHabit(suggestion.actionHabitId);
  } else {
    quickBtn.hidden = true;
  }
}

function renderHabitsGrid(globalStats) {
  const grid = document.getElementById('habits-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid || !emptyState) return;

  grid.innerHTML = '';

  if (appState.habits.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  globalStats.habitsWithStats.forEach(({ habit, stats }) => {
    const card = document.createElement('article');
    card.className = `habit-card pastel-${habit.tone || 'sky'}`;
    card.id = `habit-card-${habit.id}`;

    const reminderBadgeHtml =
      habit.reminder && habit.reminder.enabled
        ? `<span class="habit-reminder-badge" title="Recordatorio activo a las ${escapeHtml(
            habit.reminder.time
          )} hs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </span>`
        : '';

    card.innerHTML = `
      <div class="habit-card-top">
        <div class="habit-emoji-box" aria-hidden="true">${escapeHtml(habit.icon)}</div>
        <button type="button" class="habit-stats-btn" data-stats-id="${escapeHtml(habit.id)}" aria-label="Ver estadísticas y ajustes de ${escapeHtml(habit.name)}" title="Estadísticas y recordatorios">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
      </div>

      <button type="button" class="habit-click-area" data-click-id="${escapeHtml(habit.id)}" aria-label="Sumar 1 a ${escapeHtml(habit.name)}. Progreso actual ${stats.todayCount} de ${stats.goal} hoy">
        <h2 class="habit-title">${escapeHtml(habit.name)}</h2>
        <div class="habit-meta-row">
          <span class="habit-count-pill tabular-nums">
            <span class="habit-count-current">${stats.todayCount}</span>
            <span>/ ${stats.goal} hoy</span>
          </span>
          ${reminderBadgeHtml}
        </div>
      </button>

      <div class="habit-plus-badge" id="plus-badge-${escapeHtml(habit.id)}" aria-hidden="true">+1</div>

      <div class="habit-progress-track" aria-hidden="true">
        <div class="habit-progress-fill" style="width: ${stats.progressPct}%"></div>
      </div>
    `;

    card.querySelector('[data-stats-id]').addEventListener('click', (e) => {
      e.stopPropagation();
      openHabitStatsModal(habit.id);
    });

    card.querySelector('[data-click-id]').addEventListener('click', () => {
      incrementHabit(habit.id);
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-stats-id]') || e.target.closest('[data-click-id]')) {
        return;
      }
      incrementHabit(habit.id);
    });

    grid.appendChild(card);
  });
}

function renderWidgetView(globalStats) {
  const grid2x2 = document.getElementById('widget-2x2-container');
  const strip = document.getElementById('widget-scroll-container');
  if (!grid2x2 || !strip) return;

  grid2x2.innerHTML = '';
  strip.innerHTML = '';

  if (globalStats.habitsWithStats.length === 0) {
    grid2x2.innerHTML = `<p style="grid-column: span 2; font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">Agregá hábitos con el botón + para verlos en el widget.</p>`;
    return;
  }

  globalStats.habitsWithStats.slice(0, 4).forEach(({ habit, stats }) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `widget-mini-tile pastel-${habit.tone || 'sky'}`;
    tile.setAttribute('aria-label', `Widget: sumar 1 a ${habit.name}`);
    tile.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <span style="font-size:1.35rem;" aria-hidden="true">${escapeHtml(habit.icon)}</span>
        <span class="tabular-nums" style="font-size:0.74rem; font-weight:800; background:var(--bg-surface); padding:0.15rem 0.5rem; border-radius:999px; color:var(--text-primary);">${stats.todayCount}/${stats.goal}</span>
      </div>
      <div style="margin-top:0.5rem;">
        <div style="font-weight:700; font-size:0.84rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(habit.name)}</div>
        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.1rem;">Tocá para +1</div>
      </div>
    `;
    tile.addEventListener('click', () => incrementHabit(habit.id));
    grid2x2.appendChild(tile);
  });

  globalStats.habitsWithStats.forEach(({ habit, stats }) => {
    const hCard = document.createElement('div');
    hCard.className = `widget-horizontal-card pastel-${habit.tone || 'sky'}`;
    hCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="width:36px; height:36px; border-radius:12px; background:var(--bg-surface); display:flex; align-items:center; justify-content:center; font-size:1.15rem;" aria-hidden="true">${escapeHtml(habit.icon)}</span>
        <span class="tabular-nums" style="font-size:0.74rem; font-weight:800; background:var(--bg-surface); padding:0.2rem 0.55rem; border-radius:8px; color:var(--text-primary);">${stats.todayCount}/${stats.goal}</span>
      </div>
      <div>
        <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); margin-bottom:0.45rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(habit.name)}</div>
        <button type="button" class="primary-cta-btn" style="min-height:44px; font-size:0.78rem; border-radius:12px;" data-widget-add="${escapeHtml(habit.id)}">+ Sumar 1</button>
      </div>
    `;
    hCard.querySelector('[data-widget-add]').addEventListener('click', () => {
      incrementHabit(habit.id);
    });
    strip.appendChild(hCard);
  });
}

function renderGlobalStatsView(globalStats) {
  const kpiToday = document.getElementById('global-kpi-today');
  const kpiWeek = document.getElementById('global-kpi-week');
  const kpiMonth = document.getElementById('global-kpi-month');
  if (kpiToday) kpiToday.textContent = String(globalStats.totalToday);
  if (kpiWeek) kpiWeek.textContent = String(globalStats.totalWeek);
  if (kpiMonth) kpiMonth.textContent = String(globalStats.totalMonth);

  const chartContainer = document.getElementById('global-7days-chart');
  if (chartContainer) {
    chartContainer.innerHTML = '';
    const maxDay = Math.max(
      1,
      ...globalStats.last7DaysGlobal.map((d) => d.count)
    );
    globalStats.last7DaysGlobal.forEach((day) => {
      const heightPct = Math.max(8, Math.round((day.count / maxDay) * 100));
      const col = document.createElement('div');
      col.className = 'chart-bar-col';
      col.innerHTML = `
        <span class="tabular-nums" style="font-size:0.68rem; font-weight:700; color:var(--text-secondary);">${day.count}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="height:${heightPct}%;"></div>
        </div>
        <span class="chart-bar-day">${escapeHtml(day.shortDay)}</span>
      `;
      chartContainer.appendChild(col);
    });
  }

  const rankingList = document.getElementById('global-habits-ranking');
  if (rankingList) {
    rankingList.innerHTML = '';
    if (globalStats.habitsWithStats.length === 0) {
      rankingList.innerHTML = `<p style="font-size:0.84rem; color:var(--text-muted);">No hay hábitos registrados todavía.</p>`;
    } else {
      globalStats.habitsWithStats.forEach(({ habit, stats }) => {
        const item = document.createElement('div');
        item.style.cssText =
          'display:flex; align-items:center; justify-content:space-between; gap:0.75rem; padding:0.7rem 0.85rem; background:var(--bg-subtle); border-radius:16px; margin-bottom:0.5rem;';
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.65rem; min-width:0;">
            <span style="font-size:1.3rem;" aria-hidden="true">${escapeHtml(habit.icon)}</span>
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${escapeHtml(habit.name)}</div>
              <div style="font-size:0.74rem; color:var(--text-secondary);">Racha: ${stats.currentStreak} día(s) · Semana: ${stats.weekCount}</div>
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <span class="tabular-nums" style="font-weight:800; font-size:0.9rem; color:var(--text-primary);">${stats.monthCount}</span>
            <div style="font-size:0.68rem; color:var(--text-muted);">este mes</div>
          </div>
        `;
        rankingList.appendChild(item);
      });
    }
  }

  const timeDistEl = document.getElementById('global-time-distribution');
  if (timeDistEl) {
    const td = globalStats.timeDistributionGlobal;
    const total = Math.max(1, td.morning + td.afternoon + td.night);
    const mPct = Math.round((td.morning / total) * 100);
    const aPct = Math.round((td.afternoon / total) * 100);
    const nPct = Math.round((td.night / total) * 100);
    timeDistEl.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.5rem; text-align:center;">
        <div style="background:var(--bg-subtle); padding:0.65rem; border-radius:14px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary);">☀️ Mañana</div>
          <div class="tabular-nums" style="font-size:1.05rem; font-weight:800; margin-top:0.15rem;">${mPct}%</div>
          <div class="tabular-nums" style="font-size:0.68rem; color:var(--text-muted);">${td.morning} reg.</div>
        </div>
        <div style="background:var(--bg-subtle); padding:0.65rem; border-radius:14px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary);">🌤️ Tarde</div>
          <div class="tabular-nums" style="font-size:1.05rem; font-weight:800; margin-top:0.15rem;">${aPct}%</div>
          <div class="tabular-nums" style="font-size:0.68rem; color:var(--text-muted);">${td.afternoon} reg.</div>
        </div>
        <div style="background:var(--bg-subtle); padding:0.65rem; border-radius:14px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary);">🌙 Noche</div>
          <div class="tabular-nums" style="font-size:1.05rem; font-weight:800; margin-top:0.15rem;">${nPct}%</div>
          <div class="tabular-nums" style="font-size:0.68rem; color:var(--text-muted);">${td.night} reg.</div>
        </div>
      </div>
    `;
  }
}

function incrementHabit(habitId) {
  const habit = appState.habits.find((h) => h.id === habitId);
  if (!habit) return;

  const prevStats = window.StorageEngine.getHabitStats(habit);
  habit.logs.unshift(new Date().toISOString());
  const newStats = window.StorageEngine.getHabitStats(habit);

  const soundOn = appState.preferences ? appState.preferences.sound : true;
  if (!prevStats.completedToday && newStats.completedToday) {
    window.SoundEngine.playGoalComplete(soundOn);
    window.SoundEngine.vibrate(40);
  } else {
    window.SoundEngine.playPop(soundOn);
    window.SoundEngine.vibrate(15);
  }

  saveAndRender();

  const cardEl = document.getElementById(`habit-card-${habitId}`);
  const badgeEl = document.getElementById(`plus-badge-${habitId}`);
  if (cardEl) {
    cardEl.classList.add('pop-anim');
    setTimeout(() => cardEl.classList.remove('pop-anim'), 160);
  }
  if (badgeEl) {
    badgeEl.classList.add('show');
    setTimeout(() => badgeEl.classList.remove('show'), 520);
  }

  if (currentStatsHabitId === habitId && !document.getElementById('stats-modal').hidden) {
    openHabitStatsModal(habitId);
  }

  const msg = newStats.completedToday && !prevStats.completedToday
    ? `¡Meta de hoy alcanzada en ${habit.icon} ${habit.name}! (${newStats.todayCount}/${newStats.goal})`
    : `Sumaste +1 en ${habit.icon} ${habit.name} (${newStats.todayCount}/${newStats.goal} hoy)`;

  showToast(msg, habitId, 'Deshacer');
}

function decrementHabitToday(habitId) {
  const habit = appState.habits.find((h) => h.id === habitId);
  if (!habit || habit.logs.length === 0) return;

  const todayKey = window.toLocalDateKey(new Date());
  const index = habit.logs.findIndex((iso) => window.toLocalDateKey(iso) === todayKey);
  if (index !== -1) {
    habit.logs.splice(index, 1);
    saveAndRender();
    if (currentStatsHabitId === habitId && !document.getElementById('stats-modal').hidden) {
      openHabitStatsModal(habitId);
    }
  }
}

function showToast(message, habitId = null, actionType = 'Deshacer') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  if (toastTimer) clearTimeout(toastTimer);
  container.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'toast-box';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  box.appendChild(textSpan);

  if (habitId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-undo-btn';
    btn.textContent = actionType;
    btn.addEventListener('click', () => {
      if (actionType === 'Deshacer') {
        decrementHabitToday(habitId);
      } else {
        incrementHabit(habitId);
      }
      container.innerHTML = '';
    });
    box.appendChild(btn);
  }

  container.appendChild(box);
  toastTimer = setTimeout(() => {
    container.innerHTML = '';
  }, 4000);
}

function switchTab(tabName) {
  activeTab = tabName;
  const tabs = ['habits', 'widget', 'stats'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const view = document.getElementById(`view-${t}`);
    if (btn) btn.setAttribute('aria-selected', t === tabName ? 'true' : 'false');
    if (view) view.hidden = t !== tabName;
  });
}

function initFormPickers() {
  const emojiGrid = document.getElementById('emoji-picker-grid');
  if (emojiGrid) {
    emojiGrid.innerHTML = '';
    HABIT_ICONS.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-option-btn';
      btn.dataset.emoji = emoji;
      btn.setAttribute('aria-label', `Elegir ícono ${emoji}`);
      btn.setAttribute('aria-pressed', emoji === selectedHabitIcon ? 'true' : 'false');
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        selectedHabitIcon = emoji;
        document.getElementById('custom-emoji-input').value = '';
        updateEmojiPickerSelection();
      });
      emojiGrid.appendChild(btn);
    });
  }

  const colorRow = document.getElementById('color-swatches-row');
  if (colorRow) {
    colorRow.innerHTML = '';
    CARD_TONES.forEach((tone) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-swatch-btn';
      btn.style.backgroundColor = tone.hex;
      btn.dataset.tone = tone.id;
      btn.setAttribute('aria-label', `Tono ${tone.label}`);
      btn.setAttribute('aria-pressed', tone.id === selectedHabitTone ? 'true' : 'false');
      btn.addEventListener('click', () => {
        selectedHabitTone = tone.id;
        updateColorPickerSelection();
      });
      colorRow.appendChild(btn);
    });
  }

  const slider = document.getElementById('habit-goal-slider');
  const badge = document.getElementById('habit-goal-badge');
  if (slider && badge) {
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      badge.textContent = v === 1 ? '1 vez' : `${v} veces`;
    });
  }

  const dayBtns = document.querySelectorAll('.day-pill-btn');
  dayBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const dayNum = Number(btn.dataset.day);
      if (selectedReminderDays.includes(dayNum)) {
        if (selectedReminderDays.length > 1) {
          selectedReminderDays = selectedReminderDays.filter((d) => d !== dayNum);
        }
      } else {
        selectedReminderDays.push(dayNum);
      }
      updateReminderDaysSelection();
    });
  });

  const remToggle = document.getElementById('habit-reminder-enabled');
  const remFields = document.getElementById('habit-reminder-fields');
  if (remToggle && remFields) {
    remToggle.addEventListener('change', () => {
      remFields.hidden = !remToggle.checked;
    });
  }
}

function updateEmojiPickerSelection() {
  document.querySelectorAll('.emoji-option-btn').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.emoji === selectedHabitIcon ? 'true' : 'false'
    );
  });
}

function updateColorPickerSelection() {
  document.querySelectorAll('.color-swatch-btn').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.tone === selectedHabitTone ? 'true' : 'false'
    );
  });
}

function updateReminderDaysSelection() {
  document.querySelectorAll('.day-pill-btn').forEach((btn) => {
    const d = Number(btn.dataset.day);
    btn.setAttribute(
      'aria-pressed',
      selectedReminderDays.includes(d) ? 'true' : 'false'
    );
  });
}

function openCreateHabitModal(habitToEdit = null) {
  const modal = document.getElementById('habit-modal');
  const titleEl = document.getElementById('habit-modal-title');
  const submitBtn = document.getElementById('habit-submit-btn');
  const nameInput = document.getElementById('habit-name-input');
  const customEmojiInput = document.getElementById('custom-emoji-input');
  const slider = document.getElementById('habit-goal-slider');
  const badge = document.getElementById('habit-goal-badge');
  const remEnabled = document.getElementById('habit-reminder-enabled');
  const remFields = document.getElementById('habit-reminder-fields');
  const remTime = document.getElementById('habit-reminder-time');
  const remNote = document.getElementById('habit-reminder-note');

  if (habitToEdit) {
    editingHabitId = habitToEdit.id;
    titleEl.textContent = 'Editar hábito';
    submitBtn.textContent = 'Guardar cambios';
    nameInput.value = habitToEdit.name;
    selectedHabitIcon = habitToEdit.icon || '💧';
    customEmojiInput.value = HABIT_ICONS.includes(selectedHabitIcon) ? '' : selectedHabitIcon;
    selectedHabitTone = habitToEdit.tone || 'sky';
    slider.value = String(habitToEdit.goal || 1);
    badge.textContent = habitToEdit.goal === 1 ? '1 vez' : `${habitToEdit.goal} veces`;
    remEnabled.checked = Boolean(habitToEdit.reminder && habitToEdit.reminder.enabled);
    remFields.hidden = !remEnabled.checked;
    remTime.value = (habitToEdit.reminder && habitToEdit.reminder.time) || '10:00';
    remNote.value = (habitToEdit.reminder && habitToEdit.reminder.note) || '';
    selectedReminderDays =
      habitToEdit.reminder && Array.isArray(habitToEdit.reminder.days)
        ? [...habitToEdit.reminder.days]
        : [1, 2, 3, 4, 5, 6, 0];
  } else {
    editingHabitId = null;
    titleEl.textContent = 'Nuevo hábito';
    submitBtn.textContent = 'Crear hábito';
    nameInput.value = '';
    customEmojiInput.value = '';
    selectedHabitIcon = '💧';
    selectedHabitTone = 'sky';
    slider.value = '1';
    badge.textContent = '1 vez';
    remEnabled.checked = false;
    remFields.hidden = true;
    remTime.value = '10:00';
    remNote.value = '';
    selectedReminderDays = [1, 2, 3, 4, 5, 6, 0];
  }

  updateEmojiPickerSelection();
  updateColorPickerSelection();
  updateReminderDaysSelection();
  document.getElementById('habit-form-error').hidden = true;

  modal.hidden = false;
  setTimeout(() => nameInput.focus(), 60);
}

async function handleSaveHabitForm(e) {
  e.preventDefault();
  const nameInput = document.getElementById('habit-name-input');
  const customEmoji = document.getElementById('custom-emoji-input').value.trim();
  const slider = document.getElementById('habit-goal-slider');
  const remEnabled = document.getElementById('habit-reminder-enabled').checked;
  const remTime = document.getElementById('habit-reminder-time').value || '10:00';
  const remNote = document.getElementById('habit-reminder-note').value.trim();
  const errorEl = document.getElementById('habit-form-error');

  const cleanName = nameInput.value.trim();
  if (!cleanName) {
    errorEl.textContent = 'Por favor escribí un nombre para tu hábito.';
    errorEl.hidden = false;
    nameInput.focus();
    return;
  }

  const finalIcon = customEmoji ? Array.from(customEmoji)[0] : selectedHabitIcon;
  const finalGoal = Math.max(1, Number(slider.value) || 1);

  if (remEnabled && window.NotificationEngine.getPermissionStatus() === 'default') {
    await window.NotificationEngine.requestPermission();
  }

  if (editingHabitId) {
    const existing = appState.habits.find((h) => h.id === editingHabitId);
    if (existing) {
      existing.name = cleanName;
      existing.icon = finalIcon;
      existing.tone = selectedHabitTone;
      existing.goal = finalGoal;
      existing.reminder = {
        enabled: remEnabled,
        time: remTime,
        days: [...selectedReminderDays],
        note: remNote
      };
    }
  } else {
    appState.habits.push({
      id: `habit-${Date.now()}`,
      name: cleanName,
      icon: finalIcon,
      tone: selectedHabitTone,
      goal: finalGoal,
      createdAt: new Date().toISOString(),
      reminder: {
        enabled: remEnabled,
        time: remTime,
        days: [...selectedReminderDays],
        note: remNote
      },
      logs: []
    });
  }

  closeModal('habit-modal');
  saveAndRender();
}

function openHabitStatsModal(habitId) {
  const habit = appState.habits.find((h) => h.id === habitId);
  if (!habit) return;
  currentStatsHabitId = habitId;

  const stats = window.StorageEngine.getHabitStats(habit);
  const insight = window.CoachEngine.generateHabitInsight(habit, stats);

  document.getElementById('stats-habit-icon').textContent = habit.icon;
  document.getElementById('stats-habit-name').textContent = habit.name;
  document.getElementById('stat-today').textContent = `${stats.todayCount}/${stats.goal}`;
  document.getElementById('stat-week').textContent = String(stats.weekCount);
  document.getElementById('stat-month').textContent = String(stats.monthCount);
  document.getElementById('stat-streak').textContent = `${stats.currentStreak}d`;

  document.getElementById('stats-ai-insight').textContent = insight.analysis;
  document.getElementById('stats-reminder-summary').textContent = insight.reminderSuggestion;

  const chartBox = document.getElementById('habit-7days-chart');
  chartBox.innerHTML = '';
  const maxVal = Math.max(stats.goal, ...stats.last7DaysSeries.map((s) => s.count), 1);
  stats.last7DaysSeries.forEach((day) => {
    const pct = Math.max(8, Math.round((day.count / maxVal) * 100));
    const col = document.createElement('div');
    col.className = 'chart-bar-col';
    col.innerHTML = `
      <span class="tabular-nums" style="font-size:0.68rem; font-weight:700; color:var(--text-secondary);">${day.count}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="height:${pct}%;"></div>
      </div>
      <span class="chart-bar-day">${escapeHtml(day.shortDay)}</span>
    `;
    chartBox.appendChild(col);
  });

  const logsList = document.getElementById('stats-logs-list');
  logsList.innerHTML = '';
  if (habit.logs.length === 0) {
    logsList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); padding:0.5rem 0;">Sin registros todavía. Tocá +1 para empezar.</p>`;
  } else {
    habit.logs.slice(0, 12).forEach((iso) => {
      const d = new Date(iso);
      const dateFormatted = d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short'
      });
      const timeFormatted = d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0.7rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; font-size:0.78rem;';
      row.innerHTML = `
        <span style="font-weight:600; color:var(--text-primary);">✔️ Registro completado</span>
        <span class="tabular-nums" style="color:var(--text-muted);">${escapeHtml(dateFormatted)} · ${escapeHtml(timeFormatted)}</span>
      `;
      logsList.appendChild(row);
    });
  }

  const minusBtn = document.getElementById('stats-minus-today-btn');
  minusBtn.disabled = stats.todayCount === 0;
  minusBtn.onclick = () => decrementHabitToday(habit.id);

  document.getElementById('stats-plus-today-btn').onclick = () => incrementHabit(habit.id);

  document.getElementById('stats-edit-habit-btn').onclick = () => {
    closeModal('stats-modal');
    openCreateHabitModal(habit);
  };

  document.getElementById('stats-delete-habit-btn').onclick = () => {
    appState.habits = appState.habits.filter((h) => h.id !== habit.id);
    closeModal('stats-modal');
    saveAndRender();
    showToast(`Se eliminó el hábito "${habit.name}"`);
  };

  document.getElementById('stats-modal').hidden = false;
}

function openCoachModal() {
  renderCoachModalContent();
  document.getElementById('coach-modal').hidden = false;
}

function renderCoachModalContent() {
  const report = window.CoachEngine.generateCoachReport(appState);
  document.getElementById('coach-report-main').textContent = report.mainParagraph;
  document.getElementById('coach-report-secondary').textContent = report.secondaryInsight;

  const metricsGrid = document.getElementById('coach-report-metrics');
  metricsGrid.innerHTML = '';
  report.metrics.forEach((m) => {
    const card = document.createElement('div');
    card.style.cssText =
      'background:var(--bg-surface); border:1px solid var(--border-color); border-radius:16px; padding:0.75rem; display:flex; justify-content:space-between; align-items:center;';
    card.innerHTML = `
      <div>
        <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">${escapeHtml(m.label)}</div>
        <div style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-top:0.1rem;">${escapeHtml(m.value)}</div>
      </div>
      <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); text-align:right;">${escapeHtml(m.sub)}</div>
    `;
    metricsGrid.appendChild(card);
  });

  const quickActionBtn = document.getElementById('coach-quick-action-btn');
  if (report.recommendedHabit) {
    quickActionBtn.hidden = false;
    quickActionBtn.textContent = `Sumar +1 a ${report.recommendedHabit.icon} ${report.recommendedHabit.name} ahora`;
    quickActionBtn.onclick = () => {
      incrementHabit(report.recommendedHabit.id);
      renderCoachModalContent();
    };
  } else {
    quickActionBtn.hidden = true;
  }

  const currentTone = (appState.preferences && appState.preferences.coachTone) || 'sweet';
  document.querySelectorAll('[data-coach-tone]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.coachTone === currentTone ? 'true' : 'false'
    );
  });
}

function syncCustomizationControls() {
  const prefs = appState.preferences || {};

  document.querySelectorAll('[data-theme-opt]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.themeOpt === (prefs.theme || 'sakura') ? 'true' : 'false'
    );
  });

  document.querySelectorAll('[data-font-opt]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.fontOpt === (prefs.font || 'soft') ? 'true' : 'false'
    );
  });

  document.querySelectorAll('[data-layout-opt]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.layoutOpt === (prefs.layout || 'grid') ? 'true' : 'false'
    );
  });

  document.querySelectorAll('[data-shape-opt]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.shapeOpt === (prefs.shape || 'squircle') ? 'true' : 'false'
    );
  });

  const soundCheckbox = document.getElementById('pref-sound-toggle');
  if (soundCheckbox) {
    soundCheckbox.checked = prefs.sound !== false;
  }

  const permStatusEl = document.getElementById('notif-permission-status');
  if (permStatusEl) {
    const st = window.NotificationEngine.getPermissionStatus();
    const map = {
      granted: '✅ Activas en este dispositivo',
      denied: '⚠️ Bloqueadas en ajustes del navegador',
      default: '🔔 Pendientes de activar (tocá el botón abajo)',
      unsupported: 'ℹ️ Notificaciones internas en la app'
    };
    permStatusEl.textContent = map[st] || st;
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.hidden = true;
}

function bindGlobalEvents() {
  document.getElementById('tab-btn-habits').addEventListener('click', () => switchTab('habits'));
  document.getElementById('tab-btn-widget').addEventListener('click', () => switchTab('widget'));
  document.getElementById('tab-btn-stats').addEventListener('click', () => switchTab('stats'));

  document.getElementById('open-create-modal-btn').addEventListener('click', () => {
    openCreateHabitModal(null);
  });

  document.getElementById('empty-create-btn').addEventListener('click', () => {
    openCreateHabitModal(null);
  });

  document.getElementById('habit-form').addEventListener('submit', handleSaveHabitForm);

  document.getElementById('custom-emoji-input').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      selectedHabitIcon = Array.from(val)[0];
      updateEmojiPickerSelection();
    }
  });

  document.getElementById('open-coach-btn').addEventListener('click', openCoachModal);

  document.getElementById('coach-banner-next-btn').addEventListener('click', () => {
    appState.coachSuggestionIndex = (appState.coachSuggestionIndex || 0) + 1;
    saveAndRender();
  });

  document.getElementById('coach-banner-close-btn').addEventListener('click', () => {
    appState.bannerDismissed = true;
    saveAndRender();
  });

  document.querySelectorAll('[data-coach-tone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.preferences.coachTone = btn.dataset.coachTone;
      saveAndRender();
      renderCoachModalContent();
    });
  });

  document.getElementById('reset-demo-data-btn').addEventListener('click', () => {
    appState = window.StorageEngine.resetToDemoState();
    applyInterfacePreferences();
    renderAll();
    renderCoachModalContent();
    showToast('Datos de demostración restaurados');
  });

  document.getElementById('open-settings-btn').addEventListener('click', () => {
    syncCustomizationControls();
    document.getElementById('settings-modal').hidden = false;
  });

  document.getElementById('open-pwa-guide-btn').addEventListener('click', () => {
    document.getElementById('pwa-modal').hidden = false;
  });

  document.getElementById('widget-open-pwa-btn').addEventListener('click', () => {
    document.getElementById('pwa-modal').hidden = false;
  });

  document.getElementById('edit-name-btn').addEventListener('click', () => {
    const input = document.getElementById('user-name-input');
    input.value = appState.userName || 'Sofía';
    document.getElementById('name-modal').hidden = false;
    setTimeout(() => input.focus(), 60);
  });

  document.getElementById('name-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('user-name-input').value.trim();
    if (val) {
      appState.userName = val;
      appState.bannerDismissed = false;
      saveAndRender();
    }
    closeModal('name-modal');
  });

  document.querySelectorAll('[data-theme-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.preferences.theme = btn.dataset.themeOpt;
      saveAndRender();
    });
  });

  document.querySelectorAll('[data-font-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.preferences.font = btn.dataset.fontOpt;
      saveAndRender();
    });
  });

  document.querySelectorAll('[data-layout-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.preferences.layout = btn.dataset.layoutOpt;
      saveAndRender();
    });
  });

  document.querySelectorAll('[data-shape-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.preferences.shape = btn.dataset.shapeOpt;
      saveAndRender();
    });
  });

  document.getElementById('pref-sound-toggle').addEventListener('change', (e) => {
    appState.preferences.sound = e.target.checked;
    saveAndRender();
  });

  document.getElementById('request-notif-btn').addEventListener('click', async () => {
    const res = await window.NotificationEngine.requestPermission();
    syncCustomizationControls();
    if (res === 'granted') {
      showToast('¡Permiso de notificaciones activado!');
    } else {
      showToast('Revisá los permisos del navegador para recibir alertas del sistema.');
    }
  });

  document.getElementById('test-notif-btn').addEventListener('click', async () => {
    const sent = await window.NotificationEngine.sendNotification({
      title: '🌸 Ritmo · Recordatorio de prueba',
      body: `¡Hola ${appState.userName}! Así se ven tus recordatorios de hábitos en tu dispositivo.`,
      soundEnabled: appState.preferences.sound
    });
    if (!sent) {
      showToast(`🔔 Recordatorio de prueba: ¡Hola ${appState.userName}, tus alertas internas funcionan perfecto!`);
    } else {
      showToast('Notificación enviada a tu dispositivo');
    }
  });

  document.getElementById('export-backup-btn').addEventListener('click', () => {
    const json = window.StorageEngine.exportJSON(appState);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ritmo-backup-${window.toLocalDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada');
  });

  document.getElementById('import-backup-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        appState = window.StorageEngine.importJSON(String(reader.result));
        applyInterfacePreferences();
        renderAll();
        showToast('¡Copia de seguridad restaurada con éxito!');
      } catch (err) {
        showToast(err.message || 'Archivo inválido');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('settings-restore-banner-btn').addEventListener('click', () => {
    appState.bannerDismissed = false;
    saveAndRender();
    showToast('Sugerencia del Coach visible nuevamente');
  });

  const pwaDirectBtn = document.getElementById('pwa-direct-install-btn');
  if (pwaDirectBtn) {
    pwaDirectBtn.addEventListener('click', async () => {
      if (!deferredPwaPrompt) return;
      deferredPwaPrompt.prompt();
      await deferredPwaPrompt.userChoice;
      deferredPwaPrompt = null;
      pwaDirectBtn.hidden = true;
    });
  }

  document.querySelectorAll('[data-pwa-os]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetOs = btn.dataset.pwaOs;
      document.querySelectorAll('[data-pwa-os]').forEach((b) => {
        b.setAttribute('aria-selected', b.dataset.pwaOs === targetOs ? 'true' : 'false');
      });
      document.getElementById('pwa-panel-ios').hidden = targetOs !== 'ios';
      document.getElementById('pwa-panel-android').hidden = targetOs !== 'android';
      document.getElementById('pwa-panel-local').hidden = targetOs !== 'local';
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.hidden = true;
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach((m) => {
        m.hidden = true;
      });
    }
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
