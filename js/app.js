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

const TOUR_STEPS = [
  {
    selector: '#habits-grid',
    title: 'Sumá +1 con un toque',
    desc: 'Tocá cualquier tarjeta para registrar tu progreso diario al instante. La barra inferior mostrará cuánto te falta para tu meta.'
  },
  {
    selector: '.habit-stats-btn',
    title: 'Opciones y estadísticas (?)',
    desc: 'Tocá el botón "?" en la esquina de cada tarjeta para ver su historial, corregir un toque (-1), programar recordatorios o editarla.'
  },
  {
    selector: '#open-coach-btn',
    title: 'Sugerencias y Resumen IA',
    desc: 'Consultá tu informe dinámico personalizado según tus datos, horarios más activos y el enfoque que elegiste.'
  },
  {
    selector: '#open-create-modal-btn',
    title: 'Creá nuevos hábitos (+)',
    desc: 'Usá el botón "+" para agregar hábitos eligiendo su ícono, color pastel, meta diaria y alertas.'
  },
  {
    selector: '#header-actions-group',
    title: 'Ajustes e instalación móvil',
    desc: 'Desde arriba a la derecha podés cambiar los colores y la fuente de toda la app, o instalarla en la pantalla de tu celular.'
  }
];

let appState = window.StorageEngine.loadState();
let activeTab = 'habits';
let editingHabitId = null;
let selectedHabitIcon = '💧';
let selectedHabitTone = 'sky';
let selectedReminderDays = [1, 2, 3, 4, 5, 6, 0];
let selectedProfileGender = 'femenino';
let selectedProfileFocus = 'bienestar';
let currentStatsHabitId = null;
let deferredPwaPrompt = null;
let toastTimer = null;
let currentTourIndex = -1;

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

  if (!appState.onboardingCompleted) {
    openOnboardingModal();
  } else if (!appState.tourCompleted) {
    setTimeout(() => startGuidedTour(), 350);
  }
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
    const displayName =
      (appState.profile && appState.profile.name) || appState.userName || 'Sofía';
    greetingNameEl.textContent = `Hola, ${displayName}`;
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
        <button type="button" class="habit-stats-btn" data-stats-id="${escapeHtml(
          habit.id
        )}" aria-label="Ver opciones y estadísticas de ${escapeHtml(
          habit.name
        )}" title="Opciones y estadísticas">
          ?
        </button>
      </div>

      <button type="button" class="habit-click-area" data-click-id="${escapeHtml(
        habit.id
      )}" aria-label="Sumar 1 a ${escapeHtml(habit.name)}. Progreso actual ${
        stats.todayCount
      } de ${stats.goal} hoy">
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
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary);">Mañana</div>
          <div class="tabular-nums" style="font-size:1.05rem; font-weight:800; margin-top:0.15rem;">${mPct}%</div>
          <div class="tabular-nums" style="font-size:0.68rem; color:var(--text-muted);">${td.morning} reg.</div>
        </div>
        <div style="background:var(--bg-subtle); padding:0.65rem; border-radius:14px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary);">Tarde</div>
          <div class="tabular-nums" style="font-size:1.05rem; font-weight:800; margin-top:0.15rem;">${aPct}%</div>
          <div class="tabular-nums" style="font-size:0.68rem; color:var(--text-muted);">${td.afternoon} reg.</div>
        </div>
        <div style="background:var(--bg-subtle); padding:0.65rem; border-radius:14px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary);">Noche</div>
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

  const msg =
    newStats.completedToday && !prevStats.completedToday
      ? `Meta de hoy alcanzada en ${habit.icon} ${habit.name} (${newStats.todayCount}/${newStats.goal})`
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

  if (habitId || actionType === 'Mostrar') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-undo-btn';
    btn.textContent = actionType;
    btn.addEventListener('click', () => {
      if (actionType === 'Mostrar') {
        appState.bannerDismissed = false;
        saveAndRender();
      } else if (actionType === 'Deshacer') {
        decrementHabitToday(habitId);
      } else if (habitId) {
        incrementHabit(habitId);
      }
      container.innerHTML = '';
    });
    box.appendChild(btn);
  }

  container.appendChild(box);
  toastTimer = setTimeout(() => {
    container.innerHTML = '';
  }, 4200);
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

function openOnboardingModal() {
  const profile = appState.profile || {};
  document.getElementById('profile-name-input').value =
    profile.name || appState.userName || 'Sofía';
  document.getElementById('profile-age-input').value = profile.age || 24;
  selectedProfileGender = profile.gender || 'femenino';
  selectedProfileFocus = profile.focus || 'bienestar';

  document.querySelectorAll('[data-profile-gender]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.profileGender === selectedProfileGender ? 'true' : 'false'
    );
  });

  document.querySelectorAll('[data-profile-focus]').forEach((btn) => {
    btn.setAttribute(
      'aria-pressed',
      btn.dataset.profileFocus === selectedProfileFocus ? 'true' : 'false'
    );
  });

  document.getElementById('onboarding-error').hidden = true;
  document.getElementById('onboarding-modal').hidden = false;
}

function startGuidedTour() {
  switchTab('habits');
  document.querySelectorAll('.modal-backdrop').forEach((m) => {
    m.hidden = true;
  });
  currentTourIndex = 0;
  renderTourStep();
}

function clearTourHighlights() {
  document.querySelectorAll('.tour-highlight-target').forEach((el) => {
    el.classList.remove('tour-highlight-target');
  });
}

function renderTourStep() {
  clearTourHighlights();
  const card = document.getElementById('tour-floating-card');
  if (currentTourIndex < 0 || currentTourIndex >= TOUR_STEPS.length) {
    card.hidden = true;
    appState.tourCompleted = true;
    window.StorageEngine.saveState(appState);
    return;
  }

  const step = TOUR_STEPS[currentTourIndex];
  const target = document.querySelector(step.selector);
  if (target) {
    target.classList.add('tour-highlight-target');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  document.getElementById('tour-step-counter').textContent = `PASO ${
    currentTourIndex + 1
  } DE ${TOUR_STEPS.length}`;
  document.getElementById('tour-step-title').textContent = step.title;
  document.getElementById('tour-step-desc').textContent = step.desc;

  const prevBtn = document.getElementById('tour-prev-btn');
  const nextBtn = document.getElementById('tour-next-btn');
  prevBtn.hidden = currentTourIndex === 0;
  nextBtn.textContent =
    currentTourIndex === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Siguiente';

  card.hidden = false;
}

function endGuidedTour() {
  currentTourIndex = -1;
  clearTourHighlights();
  document.getElementById('tour-floating-card').hidden = true;
  appState.tourCompleted = true;
  window.StorageEngine.saveState(appState);
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
        <span style="font-weight:700; color:var(--text-primary);">Registro completado</span>
        <span class="tabular-nums" style="color:var(--text-muted);">${escapeHtml(
          dateFormatted
        )} · ${escapeHtml(timeFormatted)}</span>
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
        <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">${escapeHtml(
          m.label
        )}</div>
        <div style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-top:0.1rem;">${escapeHtml(
          m.value
        )}</div>
      </div>
      <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); text-align:right;">${escapeHtml(
        m.sub
      )}</div>
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

  const soundCheckbox = document.getElementById('pref-sound-toggle');
  if (soundCheckbox) {
    soundCheckbox.checked = prefs.sound !== false;
  }

  const toggleBannerBtn = document.getElementById('settings-toggle-banner-btn');
  if (toggleBannerBtn) {
    toggleBannerBtn.textContent = appState.bannerDismissed
      ? 'Mostrar cartel de Sugerencia IA'
      : 'Ocultar cartel de Sugerencia IA';
  }

  const permStatusEl = document.getElementById('notif-permission-status');
  if (permStatusEl) {
    const st = window.NotificationEngine.getPermissionStatus();
    const map = {
      granted: 'Alertas activas en este dispositivo',
      denied: 'Alertas bloqueadas en el navegador',
      default: 'Alertas pendientes de activar',
      unsupported: 'Alertas internas en la aplicación'
    };
    permStatusEl.textContent = map[st] || st;
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.hidden = true;
}

function selectPwaTab(os) {
  document.querySelectorAll('[data-pwa-os]').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.pwaOs === os ? 'true' : 'false');
  });
  document.getElementById('pwa-panel-ios').hidden = os !== 'ios';
  document.getElementById('pwa-panel-android').hidden = os !== 'android';
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

  document.getElementById('coach-banner-close-btn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    appState.bannerDismissed = true;
    saveAndRender();
    showToast('Sugerencia ocultada', null, 'Mostrar');
  });

  document.querySelectorAll('[data-coach-tone]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.preferences.coachTone = btn.dataset.coachTone;
      saveAndRender();
      renderCoachModalContent();
    });
  });

  document.getElementById('reset-demo-data-btn').addEventListener('click', () => {
    appState = window.StorageEngine.resetToDemoState(true, appState);
    applyInterfacePreferences();
    renderAll();
    renderCoachModalContent();
    showToast('Datos de prueba restaurados');
  });

  document.getElementById('open-settings-btn').addEventListener('click', () => {
    syncCustomizationControls();
    document.getElementById('settings-modal').hidden = false;
  });

  document.getElementById('open-pwa-guide-btn').addEventListener('click', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    selectPwaTab(isIOS ? 'ios' : 'android');
    document.getElementById('pwa-modal').hidden = false;
  });

  document.getElementById('widget-open-pwa-btn').addEventListener('click', () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    selectPwaTab(isIOS ? 'ios' : 'android');
    document.getElementById('pwa-modal').hidden = false;
  });

  document.getElementById('start-tour-btn').addEventListener('click', () => {
    startGuidedTour();
  });

  document.getElementById('settings-start-tour-btn').addEventListener('click', () => {
    closeModal('settings-modal');
    startGuidedTour();
  });

  document.getElementById('tour-prev-btn').addEventListener('click', () => {
    if (currentTourIndex > 0) {
      currentTourIndex--;
      renderTourStep();
    }
  });

  document.getElementById('tour-next-btn').addEventListener('click', () => {
    if (currentTourIndex < TOUR_STEPS.length - 1) {
      currentTourIndex++;
      renderTourStep();
    } else {
      endGuidedTour();
    }
  });

  document.getElementById('tour-skip-btn').addEventListener('click', () => {
    endGuidedTour();
  });

  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    openOnboardingModal();
  });

  document.getElementById('settings-edit-profile-btn').addEventListener('click', () => {
    closeModal('settings-modal');
    openOnboardingModal();
  });

  document.querySelectorAll('[data-profile-gender]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedProfileGender = btn.dataset.profileGender;
      document.querySelectorAll('[data-profile-gender]').forEach((b) => {
        b.setAttribute(
          'aria-pressed',
          b.dataset.profileGender === selectedProfileGender ? 'true' : 'false'
        );
      });
    });
  });

  document.querySelectorAll('[data-profile-focus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedProfileFocus = btn.dataset.profileFocus;
      document.querySelectorAll('[data-profile-focus]').forEach((b) => {
        b.setAttribute(
          'aria-pressed',
          b.dataset.profileFocus === selectedProfileFocus ? 'true' : 'false'
        );
      });
    });
  });

  document.getElementById('onboarding-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = document.getElementById('profile-name-input').value.trim();
    const ageVal = Number(document.getElementById('profile-age-input').value);
    const errorEl = document.getElementById('onboarding-error');

    if (!nameVal) {
      errorEl.textContent = 'Por favor ingresá tu nombre.';
      errorEl.hidden = false;
      return;
    }

    const wasFirstOnboarding = !appState.onboardingCompleted;
    appState.userName = nameVal;
    appState.profile = {
      name: nameVal,
      age: ageVal > 0 ? ageVal : 24,
      gender: selectedProfileGender,
      focus: selectedProfileFocus
    };
    appState.onboardingCompleted = true;

    closeModal('onboarding-modal');
    saveAndRender();

    if (wasFirstOnboarding && !appState.tourCompleted) {
      setTimeout(() => startGuidedTour(), 250);
    } else {
      showToast(`Perfil actualizado para ${nameVal}`);
    }
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

  document.getElementById('pref-sound-toggle').addEventListener('change', (e) => {
    appState.preferences.sound = e.target.checked;
    saveAndRender();
  });

  document.getElementById('request-notif-btn').addEventListener('click', async () => {
    const res = await window.NotificationEngine.requestPermission();
    syncCustomizationControls();
    if (res === 'granted') {
      showToast('Permiso de alertas activado');
    } else {
      showToast('Habilitá las notificaciones en la barra de tu navegador');
    }
  });

  document.getElementById('test-notif-btn').addEventListener('click', async () => {
    const sent = await window.NotificationEngine.sendNotification({
      title: 'Ritmo · Recordatorio de prueba',
      body: `Hola ${appState.userName}, así se ven tus alertas personalizadas de Ritmo.`,
      soundEnabled: appState.preferences.sound
    });
    if (!sent) {
      showToast(`Alerta de prueba: Hola ${appState.userName}, tus recordatorios están listos.`);
    } else {
      showToast('Alerta enviada a tu dispositivo');
    }
  });

  document.getElementById('settings-toggle-banner-btn').addEventListener('click', () => {
    appState.bannerDismissed = !appState.bannerDismissed;
    saveAndRender();
    showToast(
      appState.bannerDismissed
        ? 'Cartel de Sugerencia IA ocultado'
        : 'Cartel de Sugerencia IA visible en el inicio'
    );
  });

  const pwaDirectBtn = document.getElementById('pwa-direct-install-btn');
  if (pwaDirectBtn) {
    pwaDirectBtn.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        await deferredPwaPrompt.userChoice;
        deferredPwaPrompt = null;
        closeModal('pwa-modal');
        showToast('Instalación iniciada en tu dispositivo');
        return;
      }

      if (window.matchMedia('(display-mode: standalone)').matches) {
        showToast('Ritmo ya está instalado en tu pantalla de inicio');
        return;
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      selectPwaTab(isIOS ? 'ios' : 'android');
      const activePanel = document.getElementById(
        isIOS ? 'pwa-panel-ios' : 'pwa-panel-android'
      );
      if (activePanel) {
        activePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast(
        isIOS
          ? 'En Safari tocá Compartir y luego "Agregar a inicio"'
          : 'En el menú de tu navegador (⋮) tocá "Instalar aplicación"'
      );
    });
  }

  document.querySelectorAll('[data-pwa-os]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectPwaTab(btn.dataset.pwaOs);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.closeModal);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && backdrop.id !== 'onboarding-modal') {
        backdrop.hidden = true;
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (currentTourIndex >= 0) {
        endGuidedTour();
        return;
      }
      document.querySelectorAll('.modal-backdrop').forEach((m) => {
        if (m.id !== 'onboarding-modal' || appState.onboardingCompleted) {
          m.hidden = true;
        }
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
