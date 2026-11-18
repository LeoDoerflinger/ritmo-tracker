const CoachEngine = {
  getBannerSuggestion(state) {
    if (!state.habits || state.habits.length === 0) {
      return {
        title: 'SUGERENCIA IA',
        text: 'Todavía no tenés hábitos cargados. Tocá el botón + abajo a la derecha para crear tu primer hábito diario.',
        actionHabitId: null,
        actionLabel: null
      };
    }

    const global = window.StorageEngine.getGlobalStats(state);
    const suggestions = [];

    const incompleteByPrevWeek = global.habitsWithStats
      .filter((x) => !x.stats.completedToday && x.stats.prevWeekCount > 0)
      .sort((a, b) => b.stats.prevWeekCount - a.stats.prevWeekCount);

    if (incompleteByPrevWeek.length > 0) {
      const top = incompleteByPrevWeek[0];
      suggestions.push({
        title: 'SUGERENCIA IA',
        text: `La semana pasada hiciste "${top.habit.name}" ${top.stats.prevWeekCount} veces. Hoy llevás ${top.stats.todayCount}; ¡tomate un momento para sumar uno ahora!`,
        actionHabitId: top.habit.id,
        actionLabel: `+1 ${top.habit.icon} ${top.habit.name}`
      });
    }

    const almostDone = global.habitsWithStats.filter(
      (x) => !x.stats.completedToday && x.stats.goal - x.stats.todayCount === 1
    );
    if (almostDone.length > 0) {
      const target = almostDone[0];
      suggestions.push({
        title: 'META CERCANA',
        text: `Te falta solo 1 registro para completar tu objetivo de hoy en "${target.habit.name}" (${target.stats.todayCount}/${target.stats.goal}).`,
        actionHabitId: target.habit.id,
        actionLabel: `Completar ${target.habit.icon}`
      });
    }

    const zeroToday = global.habitsWithStats.filter((x) => x.stats.todayCount === 0);
    if (zeroToday.length > 0) {
      const firstZero = zeroToday[0];
      suggestions.push({
        title: 'PEQUEÑO PASO DE HOY',
        text: `Hoy todavía no registraste avances en "${firstZero.habit.name}". Empezar con 5 minutos alcanza para cuidar tu constancia.`,
        actionHabitId: firstZero.habit.id,
        actionLabel: `Sumar +1 a ${firstZero.habit.name}`
      });
    }

    if (global.bestHabitMonth && global.bestHabitMonth.stats.monthCount > 0) {
      const star = global.bestHabitMonth;
      suggestions.push({
        title: 'PATRÓN DETECTADO',
        text: `"${star.habit.name}" es tu hábito más firme con ${star.stats.monthCount} registros en los últimos 30 días. Tu franja más activa es por la ${global.timeDistributionGlobal.peakGlobal.toLowerCase()}.`,
        actionHabitId: null,
        actionLabel: null
      });
    }

    if (suggestions.length === 0) {
      return {
        title: 'EXCELENTE JORNADA',
        text: `¡Completaste todas tus metas de hoy (${global.totalToday} registros en total)! Descansá y celebrá tu constancia.`,
        actionHabitId: null,
        actionLabel: null
      };
    }

    const idx = Math.abs(state.coachSuggestionIndex || 0) % suggestions.length;
    return suggestions[idx];
  },

  generateCoachReport(state) {
    const name = state.userName || 'Sofía';
    const tone = (state.preferences && state.preferences.coachTone) || 'sweet';

    if (!state.habits || state.habits.length === 0) {
      return {
        greeting: `¡Hola ${name}!`,
        mainParagraph:
          'Aún no hay hábitos registrados para analizar tu rendimiento. Creá tu primer hábito con el botón + y empezá a sumar toques diarios para ver tu informe personalizado.',
        secondaryInsight: '',
        metrics: [],
        recommendedHabit: null
      };
    }

    const global = window.StorageEngine.getGlobalStats(state);
    const star = global.bestHabitMonth;
    const focus = global.needsAttentionHabit;

    const starName = star ? star.habit.name.toLowerCase() : 'tus hábitos';
    const starCount = star ? star.stats.monthCount : 0;
    const focusName = focus ? focus.habit.name.toLowerCase() : 'tu próximo objetivo';
    const focusRemaining = focus
      ? Math.max(1, focus.stats.goal - focus.stats.todayCount)
      : 1;

    let mainParagraph = '';
    let secondaryInsight = '';

    if (tone === 'sweet') {
      if (global.completedHabitsToday === global.totalHabits) {
        mainParagraph = `¡Hola ${name}! Hoy cumpliste el 100% de tus objetivos diarios con ${global.totalToday} registros. Tu constancia con "${star ? star.habit.name : ''}" brilla este mes con ${starCount} toques acumulados. ¡Seguí así, venís con un ritmo hermoso!`;
      } else {
        mainParagraph = `¡Hola ${name}! Tu constancia con "${star ? star.habit.name : starName}" es increíble, siendo tu hábito más fuerte con ${starCount} registros este mes. Para hoy, te propongo sumar un toque en "${focus ? focus.habit.name : focusName}" ahora mismo (te faltan ${focusRemaining} para la meta) y dedicarle unos minutos antes de terminar el día. ¡Vas por excelente camino!`;
      }
      secondaryInsight = `Tu momento de mayor energía suele ser en la ${global.timeDistributionGlobal.peakGlobal.toLowerCase()}. Aprovechá esa franja para los hábitos que más te cuestan.`;
    } else if (tone === 'direct') {
      const diffWeek = global.totalWeek - global.totalPrevWeek;
      const diffText =
        diffWeek >= 0
          ? `${diffWeek} registros por encima de los 7 días previos`
          : `${Math.abs(diffWeek)} registros por debajo de la semana anterior`;
      mainParagraph = `Informe para ${name}: acumulás ${global.totalMonth} registros en los últimos 30 días y ${global.totalWeek} en la última semana (${diffText}). Tu hábito líder es "${star ? star.habit.name : starName}" (${starCount} en el mes). Prioridad inmediata: completar ${focusRemaining} pendiente(s) en "${focus ? focus.habit.name : focusName}".`;
      secondaryInsight = `Franja horaria dominante: ${global.timeDistributionGlobal.peakGlobal}. Programá tus recordatorios 15 minutos antes de ese bloque.`;
    } else {
      mainParagraph = `Hola ${name}. Cada pequeño registro cuenta. Este mes acompañaste tu rutina con ${global.totalMonth} momentos conscientes, destacando "${star ? star.habit.name : starName}" (${starCount} veces). Hoy no hace falta exigirte de más: si tenés un ratito, sumá un paso suave en "${focus ? focus.habit.name : focusName}".`;
      secondaryInsight = `Observamos que fluís mejor durante la ${global.timeDistributionGlobal.peakGlobal.toLowerCase()}. Escuchá tu propio ritmo sin presiones.`;
    }

    const metrics = [
      {
        label: 'Hábito estrella (30d)',
        value: star ? `${star.habit.icon} ${star.habit.name}` : 'Sin datos',
        sub: star ? `${star.stats.monthCount} registros en el mes` : ''
      },
      {
        label: 'Avance de hoy',
        value: `${global.completedHabitsToday} / ${global.totalHabits} metas`,
        sub: `${global.totalToday} toques registrados hoy`
      },
      {
        label: 'Horario pico',
        value: global.timeDistributionGlobal.peakGlobal,
        sub: `${global.totalWeek} toques esta semana`
      }
    ];

    return {
      greeting: `¡Hola ${name}!`,
      mainParagraph,
      secondaryInsight,
      metrics,
      recommendedHabit:
        focus && !focus.stats.completedToday ? focus.habit : null
    };
  },

  generateHabitInsight(habit, stats) {
    if (stats.totalAllTime === 0) {
      return {
        analysis: `Todavía no tenés registros en "${habit.name}". Tocá la tarjeta o el botón +1 para inaugurar tu historial y empezar a medir tu progreso.`,
        reminderSuggestion: `Activá un recordatorio diario a las ${habit.reminder.time || '10:00'} para crear el disparador del hábito.`
      };
    }

    const diff = stats.weekCount - stats.prevWeekCount;
    let trendSentence = '';
    if (diff > 0) {
      trendSentence = `Esta semana llevás ${stats.weekCount} registros, superando por ${diff} los ${stats.prevWeekCount} de la semana pasada.`;
    } else if (diff === 0) {
      trendSentence = `Mantenés un ritmo estable con ${stats.weekCount} registros semanales, igualando tu marca de la semana anterior.`;
    } else {
      trendSentence = `La semana pasada sumaste ${stats.prevWeekCount} registros y en los últimos 7 días llevás ${stats.weekCount}. Un toque hoy te ayuda a recuperar el promedio.`;
    }

    const streakText =
      stats.currentStreak > 1
        ? `Llevás ${stats.currentStreak} días consecutivos cumpliendo este hábito.`
        : stats.todayCount > 0
        ? `Ya sumaste ${stats.todayCount} de ${stats.goal} hoy.`
        : `Hoy aún está pendiente (${stats.todayCount}/${stats.goal}).`;

    return {
      analysis: `${trendSentence} ${streakText} Tu franja horaria más frecuente es: ${stats.timeDistribution.peakPeriodLabel}.`,
      reminderSuggestion: habit.reminder && habit.reminder.enabled
        ? `Recordatorio activo programado a las ${habit.reminder.time} hs.`
        : `Sugerencia: programá una alerta cerca de tu horario frecuente (${stats.timeDistribution.peakPeriodLabel.split(' ')[0]}) para no cortarlo.`
    };
  }
};

window.CoachEngine = CoachEngine;
