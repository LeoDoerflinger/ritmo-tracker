const STORAGE_KEY = 'ritmo_tracker_state_v2';
const IDB_NAME = 'RitmoTrackerDB';
const IDB_STORE = 'app_state';

function toLocalDateKey(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildSeedLogs({ todayCount, last7DaysCounts, prevWeekTotal, olderMonthTotal }) {
  const logs = [];
  const now = new Date();

  for (let i = 0; i < todayCount; i++) {
    const t = new Date(now);
    t.setHours(Math.max(8, now.getHours() - (todayCount - i)), (i * 17) % 60, 0, 0);
    logs.push(t.toISOString());
  }

  for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
    const countForDay = last7DaysCounts[dayOffset - 1] || 0;
    for (let c = 0; c < countForDay; c++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(9 + ((c * 3) % 11), (c * 23) % 60, 0, 0);
      logs.push(d.toISOString());
    }
  }

  let remPrevWeek = prevWeekTotal;
  for (let dayOffset = 7; dayOffset <= 13 && remPrevWeek > 0; dayOffset++) {
    const perDay = Math.ceil(remPrevWeek / (14 - dayOffset));
    for (let c = 0; c < perDay && remPrevWeek > 0; c++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(10 + ((c * 2) % 10), (c * 19) % 60, 0, 0);
      logs.push(d.toISOString());
      remPrevWeek--;
    }
  }

  let remOlder = olderMonthTotal;
  for (let dayOffset = 14; dayOffset <= 28 && remOlder > 0; dayOffset++) {
    const perDay = Math.ceil(remOlder / (29 - dayOffset));
    for (let c = 0; c < perDay && remOlder > 0; c++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(11 + ((c * 2) % 9), (c * 13) % 60, 0, 0);
      logs.push(d.toISOString());
      remOlder--;
    }
  }

  return logs.sort((a, b) => new Date(b) - new Date(a));
}

function createInitialDemoState() {
  return {
    version: 2,
    userName: 'Sofía',
    bannerDismissed: false,
    coachSuggestionIndex: 0,
    preferences: {
      theme: 'sakura',
      font: 'soft',
      layout: 'grid',
      shape: 'squircle',
      sound: true,
      coachTone: 'sweet'
    },
    habits: [
      {
        id: 'habit-agua',
        name: 'Tomar agua',
        icon: '💧',
        tone: 'sky',
        goal: 6,
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        reminder: {
          enabled: true,
          time: '11:30',
          days: [1, 2, 3, 4, 5, 6, 0],
          note: 'Tomá un vaso de agua fresca para mantenerte hidratada'
        },
        logs: buildSeedLogs({
          todayCount: 2,
          last7DaysCounts: [6, 5, 6, 4, 6, 5],
          prevWeekTotal: 36,
          olderMonthTotal: 4
        })
      },
      {
        id: 'habit-ejercicio',
        name: 'Hacer ejercicio',
        icon: '🏃',
        tone: 'mint',
        goal: 1,
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        reminder: {
          enabled: false,
          time: '18:30',
          days: [1, 3, 5],
          note: 'Momento de mover el cuerpo 30 minutos'
        },
        logs: buildSeedLogs({
          todayCount: 1,
          last7DaysCounts: [1, 0, 1, 1, 0, 1],
          prevWeekTotal: 4,
          olderMonthTotal: 6
        })
      },
      {
        id: 'habit-lectura',
        name: 'Leer 20 min',
        icon: '📚',
        tone: 'peach',
        goal: 1,
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        reminder: {
          enabled: false,
          time: '21:30',
          days: [1, 2, 3, 4, 5, 6, 0],
          note: 'Leé 5 a 20 minutos antes de dormir'
        },
        logs: buildSeedLogs({
          todayCount: 0,
          last7DaysCounts: [1, 1, 0, 1, 1, 0],
          prevWeekTotal: 5,
          olderMonthTotal: 8
        })
      },
      {
        id: 'habit-estirar',
        name: 'Estirar cuerpo',
        icon: '🧘',
        tone: 'lavender',
        goal: 2,
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        reminder: {
          enabled: false,
          time: '16:00',
          days: [1, 2, 3, 4, 5],
          note: 'Pausa activa para estirar cuello y espalda'
        },
        logs: buildSeedLogs({
          todayCount: 1,
          last7DaysCounts: [2, 1, 2, 1, 2, 1],
          prevWeekTotal: 9,
          olderMonthTotal: 8
        })
      }
    ]
  };
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(state) {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(state, 'current');
  } catch (_) {
    // IndexedDB is an asynchronous backup layer; localStorage remains primary.
  }
}

async function loadFromIndexedDB() {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

const StorageEngine = {
  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.habits)) {
          return this.normalizeState(parsed);
        }
      }
    } catch (_) {
      // Fallback to demo state if corrupted
    }
    const seed = createInitialDemoState();
    this.saveState(seed);
    return seed;
  },

  async syncFromIndexedDBIfNeeded() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return null;
    const idbState = await loadFromIndexedDB();
    if (idbState && Array.isArray(idbState.habits)) {
      const normalized = this.normalizeState(idbState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
    return null;
  },

  normalizeState(state) {
    const defaults = createInitialDemoState();
    return {
      version: 2,
      userName: state.userName || defaults.userName,
      bannerDismissed: Boolean(state.bannerDismissed),
      coachSuggestionIndex: Number(state.coachSuggestionIndex || 0),
      preferences: {
        ...defaults.preferences,
        ...(state.preferences || {})
      },
      habits: (state.habits || []).map((h) => ({
        id: h.id || `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: h.name || 'Hábito',
        icon: h.icon || '💧',
        tone: h.tone || 'sky',
        goal: Math.max(1, Number(h.goal) || 1),
        createdAt: h.createdAt || new Date().toISOString(),
        reminder: {
          enabled: Boolean(h.reminder && h.reminder.enabled),
          time: (h.reminder && h.reminder.time) || '10:00',
          days:
            h.reminder && Array.isArray(h.reminder.days)
              ? h.reminder.days
              : [1, 2, 3, 4, 5, 6, 0],
          note: (h.reminder && h.reminder.note) || ''
        },
        logs: Array.isArray(h.logs) ? h.logs : []
      }))
    };
  },

  saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Storage quota fallback
    }
    saveToIndexedDB(state);
  },

  resetToDemoState() {
    const fresh = createInitialDemoState();
    this.saveState(fresh);
    return fresh;
  },

  clearAllHabits(currentState) {
    const cleared = {
      ...currentState,
      habits: []
    };
    this.saveState(cleared);
    return cleared;
  },

  getHabitStats(habit) {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const dayCountsMap = {};

    let morning = 0;
    let afternoon = 0;
    let night = 0;

    habit.logs.forEach((iso) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return;
      const k = toLocalDateKey(d);
      dayCountsMap[k] = (dayCountsMap[k] || 0) + 1;

      const hr = d.getHours();
      if (hr >= 6 && hr < 12) morning++;
      else if (hr >= 12 && hr < 19) afternoon++;
      else night++;
    });

    const todayCount = dayCountsMap[todayKey] || 0;
    const goal = Math.max(1, Number(habit.goal) || 1);
    const progressPct = Math.min(100, Math.round((todayCount / goal) * 100));

    const last7DaysSeries = [];
    const dayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    let weekCount = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toLocalDateKey(d);
      const count = dayCountsMap[key] || 0;
      weekCount += count;
      last7DaysSeries.push({
        dateKey: key,
        shortDay: i === 0 ? 'Hoy' : dayLetters[d.getDay()],
        count,
        goal,
        pct: Math.min(100, Math.round((count / goal) * 100))
      });
    }

    let prevWeekCount = 0;
    for (let i = 7; i <= 13; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toLocalDateKey(d);
      prevWeekCount += dayCountsMap[key] || 0;
    }

    let monthCount = 0;
    let activeDaysMonth = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toLocalDateKey(d);
      const c = dayCountsMap[key] || 0;
      monthCount += c;
      if (c > 0) activeDaysMonth++;
    }

    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toLocalDateKey(d);
      const count = dayCountsMap[key] || 0;
      if (count > 0) {
        currentStreak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    let peakPeriodLabel = 'Mañana (06h a 12h)';
    if (afternoon >= morning && afternoon >= night) {
      peakPeriodLabel = 'Tarde (12h a 19h)';
    } else if (night > morning && night > afternoon) {
      peakPeriodLabel = 'Noche (19h a 24h)';
    }

    return {
      todayCount,
      goal,
      progressPct,
      completedToday: todayCount >= goal,
      weekCount,
      prevWeekCount,
      monthCount,
      activeDaysMonth,
      totalAllTime: habit.logs.length,
      currentStreak,
      last7DaysSeries,
      timeDistribution: {
        morning,
        afternoon,
        night,
        peakPeriodLabel
      }
    };
  },

  getGlobalStats(state) {
    const habitsWithStats = state.habits.map((h) => ({
      habit: h,
      stats: this.getHabitStats(h)
    }));

    let totalToday = 0;
    let completedHabitsToday = 0;
    let totalWeek = 0;
    let totalPrevWeek = 0;
    let totalMonth = 0;
    let totalAllTime = 0;
    let morning = 0;
    let afternoon = 0;
    let night = 0;

    habitsWithStats.forEach(({ stats }) => {
      totalToday += stats.todayCount;
      if (stats.completedToday) completedHabitsToday++;
      totalWeek += stats.weekCount;
      totalPrevWeek += stats.prevWeekCount;
      totalMonth += stats.monthCount;
      totalAllTime += stats.totalAllTime;
      morning += stats.timeDistribution.morning;
      afternoon += stats.timeDistribution.afternoon;
      night += stats.timeDistribution.night;
    });

    const sortedByMonth = [...habitsWithStats].sort(
      (a, b) => b.stats.monthCount - a.stats.monthCount
    );
    const bestHabitMonth = sortedByMonth[0] || null;

    const incompleteToday = habitsWithStats.filter((x) => !x.stats.completedToday);
    const needsAttentionHabit =
      incompleteToday.sort((a, b) => a.stats.progressPct - b.stats.progressPct)[0] ||
      habitsWithStats[0] ||
      null;

    const now = new Date();
    const dayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const last7DaysGlobal = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toLocalDateKey(d);
      let dayTotal = 0;
      habitsWithStats.forEach(({ stats }) => {
        const found = stats.last7DaysSeries.find((s) => s.dateKey === key);
        if (found) dayTotal += found.count;
      });
      last7DaysGlobal.push({
        dateKey: key,
        shortDay: i === 0 ? 'Hoy' : dayLetters[d.getDay()],
        count: dayTotal
      });
    }

    let peakGlobal = 'Mañana';
    if (afternoon >= morning && afternoon >= night) peakGlobal = 'Tarde';
    else if (night > morning && night > afternoon) peakGlobal = 'Noche';

    return {
      totalToday,
      completedHabitsToday,
      totalHabits: state.habits.length,
      totalWeek,
      totalPrevWeek,
      totalMonth,
      totalAllTime,
      bestHabitMonth,
      needsAttentionHabit,
      last7DaysGlobal,
      habitsWithStats,
      timeDistributionGlobal: {
        morning,
        afternoon,
        night,
        peakGlobal
      }
    };
  },

  exportJSON(state) {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Ritmo Habit Tracker PWA',
      data: state
    };
    return JSON.stringify(payload, null, 2);
  },

  importJSON(rawString) {
    const parsed = JSON.parse(rawString);
    const candidate = parsed && parsed.data ? parsed.data : parsed;
    if (!candidate || !Array.isArray(candidate.habits)) {
      throw new Error('El archivo seleccionado no contiene un formato válido de hábitos.');
    }
    const normalized = this.normalizeState(candidate);
    this.saveState(normalized);
    return normalized;
  }
};

window.StorageEngine = StorageEngine;
window.toLocalDateKey = toLocalDateKey;
