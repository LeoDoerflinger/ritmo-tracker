const SoundEngine = {
  ctx: null,

  getContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  playPop(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } catch (_) {}
  },

  playGoalComplete(enabled = true) {
    if (!enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + i * 0.07;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.11, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (_) {}
  },

  vibrate(ms = 18) {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch (_) {}
  }
};

const NotificationEngine = {
  firedSlots: {},
  intervalId: null,

  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (_) {
      return Notification.permission;
    }
  },

  async sendNotification({ title, body, habitId = null, soundEnabled = true }) {
    SoundEngine.playGoalComplete(soundEnabled);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: './assets/icon-192.svg',
              badge: './assets/icon-192.svg',
              tag: habitId || 'ritmo-reminder',
              data: { habitId }
            });
            return true;
          }
        }
        new Notification(title, {
          body,
          icon: './assets/icon-192.svg'
        });
        return true;
      } catch (_) {}
    }
    return false;
  },

  startScheduler(getStateFn, onInAppNotify) {
    if (this.intervalId) clearInterval(this.intervalId);

    const checkReminders = () => {
      const state = getStateFn();
      if (!state || !Array.isArray(state.habits)) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHM = `${hh}:${mm}`;
      const currentDay = now.getDay();
      const dateKey = window.toLocalDateKey(now);

      state.habits.forEach((habit) => {
        if (!habit.reminder || !habit.reminder.enabled) return;
        if (habit.reminder.time !== currentHM) return;
        if (
          Array.isArray(habit.reminder.days) &&
          !habit.reminder.days.includes(currentDay)
        ) {
          return;
        }

        const slotKey = `${habit.id}_${dateKey}_${currentHM}`;
        if (this.firedSlots[slotKey]) return;

        const stats = window.StorageEngine.getHabitStats(habit);
        if (stats.completedToday) return;

        this.firedSlots[slotKey] = true;
        const title = `${habit.icon} Recordatorio: ${habit.name}`;
        const body =
          habit.reminder.note ||
          `Llevás ${stats.todayCount} de ${stats.goal} hoy. ¡Tomate un momento para sumar +1!`;

        this.sendNotification({
          title,
          body,
          habitId: habit.id,
          soundEnabled: state.preferences ? state.preferences.sound : true
        });

        if (typeof onInAppNotify === 'function') {
          onInAppNotify({ habit, title, body });
        }
      });
    };

    this.intervalId = setInterval(checkReminders, 20000);
  }
};

window.SoundEngine = SoundEngine;
window.NotificationEngine = NotificationEngine;
