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
  cachedLogoUrl: null,

  getLogoIconUrl() {
    if (this.cachedLogoUrl) return this.cachedLogoUrl;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');
      if (!ctx) return './assets/icon-192.svg';

      // Fondo crema redondeado
      ctx.fillStyle = '#FAF6F0';
      ctx.beginPath();
      ctx.roundRect(0, 0, 192, 192, 44);
      ctx.fill();

      // Marco interior rosa pastel
      ctx.fillStyle = '#FCE8EF';
      ctx.strokeStyle = '#E8C6D4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(12, 12, 168, 168, 36);
      ctx.fill();
      ctx.stroke();

      // Arco de ritmo circular con punta de flecha
      ctx.strokeStyle = '#9E3B5A';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(96, 96, 58, 0.72 * Math.PI, 0.22 * Math.PI, false);
      ctx.stroke();

      // Punta de flecha del arco
      ctx.beginPath();
      ctx.moveTo(147, 108);
      ctx.lineTo(149, 134);
      ctx.lineTo(123, 130);
      ctx.stroke();

      // Letra R central
      ctx.strokeStyle = '#2A2421';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(68, 132);
      ctx.lineTo(68, 60);
      ctx.lineTo(98, 60);
      ctx.arc(98, 81, 21, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(68, 102);
      ctx.stroke();

      // Pierna diagonal de la R
      ctx.beginPath();
      ctx.moveTo(96, 102);
      ctx.lineTo(122, 132);
      ctx.stroke();

      this.cachedLogoUrl = canvas.toDataURL('image/png');
      return this.cachedLogoUrl;
    } catch (_) {
      return './assets/icon-192.svg';
    }
  },

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
    const iconUrl = this.getLogoIconUrl();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(title, {
              body,
              icon: iconUrl,
              badge: iconUrl,
              tag: habitId || 'ritmo-reminder',
              data: { habitId }
            });
            return true;
          }
        }
        new Notification(title, {
          body,
          icon: iconUrl
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
        const title = `Ritmo · ${habit.icon} ${habit.name}`;
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
