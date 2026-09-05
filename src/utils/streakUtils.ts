import { GTDAction, RecurrenceConfig, RecurrencePeriod } from '../types/gtd';

/**
 * Format a Date object into YYYY-MM-DD
 */
export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a local Date object
 */
export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns ISO week key (e.g., "2026-W35") for grouping weekly completions
 */
export function getISOWeekKey(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3); // Thursday of same week
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get start and end dates of the current week (Monday to Sunday)
 */
export function getCurrentWeekDays(refDate: Date = new Date()): { dateStr: string; dayLabel: string; isToday: boolean }[] {
  const current = new Date(refDate);
  const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = (dayOfWeek + 6) % 7;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() - distanceToMonday);
  
  const days: { dateStr: string; dayLabel: string; isToday: boolean }[] = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = formatDateKey(refDate);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateKey(d);
    days.push({
      dateStr,
      dayLabel: dayLabels[i],
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export interface ActionStreakInfo {
  isRecurring: boolean;
  targetCount: number;
  period: RecurrencePeriod;
  requirementText: string;
  currentPeriodCompletions: number;
  isPeriodTargetMet: boolean;
  completedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  progressPercent: number;
  periodLabel: string;
  streakBadgeText: string;
  currentWeekDays: { dateStr: string; dayLabel: string; isCompleted: boolean; isToday: boolean }[];
  historyCount: number;
}

/**
 * Calculates current streak and period progress for a recurring action
 */
export function getActionStreakInfo(action: GTDAction, refDate: Date = new Date()): ActionStreakInfo {
  if (!action.isRecurring || !action.recurrence) {
    return {
      isRecurring: false,
      targetCount: 1,
      period: 'day',
      requirementText: 'Single Action',
      currentPeriodCompletions: action.completed ? 1 : 0,
      isPeriodTargetMet: action.completed,
      completedToday: action.completed,
      currentStreak: 0,
      bestStreak: 0,
      progressPercent: action.completed ? 100 : 0,
      periodLabel: 'today',
      streakBadgeText: '',
      currentWeekDays: [],
      historyCount: 0,
    };
  }

  const { targetCount = 1, period = 'week' } = action.recurrence;
  const history = action.completionHistory || [];
  const todayStr = formatDateKey(refDate);
  const completedToday = history.includes(todayStr);

  const weekDays = getCurrentWeekDays(refDate);
  const currentWeekDays = weekDays.map((d) => ({
    ...d,
    isCompleted: history.includes(d.dateStr),
  }));

  let currentPeriodCompletions = 0;
  let periodLabel = 'this week';
  let requirementText = '';

  if (period === 'day') {
    periodLabel = 'today';
    requirementText = targetCount === 1 ? 'Daily' : `${targetCount}x / day`;
    currentPeriodCompletions = completedToday ? 1 : 0;
  } else if (period === 'week') {
    periodLabel = 'this week';
    requirementText = targetCount === 1 ? '1x / week' : `${targetCount}x / week`;
    const weekDateStrings = new Set(weekDays.map((w) => w.dateStr));
    currentPeriodCompletions = history.filter((d) => weekDateStrings.has(d)).length;
  } else {
    // Month
    periodLabel = 'this month';
    requirementText = `${targetCount}x / month`;
    const currentMonthPrefix = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
    currentPeriodCompletions = history.filter((d) => d.startsWith(currentMonthPrefix)).length;
  }

  const isPeriodTargetMet = currentPeriodCompletions >= targetCount;
  const progressPercent = Math.min(100, Math.round((currentPeriodCompletions / targetCount) * 100));

  // Compute Streak Count
  let calculatedStreak = 0;
  let bestStreak = action.bestStreak || 0;

  if (period === 'week') {
    // Group history by ISO week
    const weekCounts: Record<string, number> = {};
    history.forEach((dStr) => {
      const d = parseDateKey(dStr);
      const wKey = getISOWeekKey(d);
      weekCounts[wKey] = (weekCounts[wKey] || 0) + 1;
    });

    // Check backwards week by week
    const currentWeekKey = getISOWeekKey(refDate);
    const thisWeekMet = (weekCounts[currentWeekKey] || 0) >= targetCount;
    
    // If this week is already met, start streak at 1 and check previous weeks
    let checkDate = new Date(refDate);
    if (thisWeekMet) {
      calculatedStreak = 1;
    }

    // Iterate previous weeks
    for (let i = 1; i <= 52; i++) {
      const prevWeekDate = new Date(refDate);
      prevWeekDate.setDate(prevWeekDate.getDate() - i * 7);
      const wKey = getISOWeekKey(prevWeekDate);
      
      if ((weekCounts[wKey] || 0) >= targetCount) {
        calculatedStreak++;
      } else {
        // Streak broken
        break;
      }
    }
  } else if (period === 'day') {
    // Daily streak
    const historySet = new Set(history);
    let checkDate = new Date(refDate);
    
    if (completedToday) {
      calculatedStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const dStr = formatDateKey(checkDate);
      if (historySet.has(dStr)) {
        calculatedStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today not completed yet, yesterday might still maintain previous streak
        if (!completedToday && i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
  } else {
    // Monthly streak
    const monthCounts: Record<string, number> = {};
    history.forEach((dStr) => {
      const mKey = dStr.substring(0, 7);
      monthCounts[mKey] = (monthCounts[mKey] || 0) + 1;
    });

    const currentMKey = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthMet = (monthCounts[currentMKey] || 0) >= targetCount;
    
    if (thisMonthMet) {
      calculatedStreak = 1;
    }

    const testMonth = new Date(refDate);
    for (let i = 1; i <= 24; i++) {
      testMonth.setMonth(testMonth.getMonth() - 1);
      const mKey = `${testMonth.getFullYear()}-${String(testMonth.getMonth() + 1).padStart(2, '0')}`;
      if ((monthCounts[mKey] || 0) >= targetCount) {
        calculatedStreak++;
      } else {
        break;
      }
    }
  }

  bestStreak = Math.max(bestStreak, calculatedStreak);

  // Streak badge text
  let streakBadgeText = '';
  if (calculatedStreak > 0) {
    const unit = period === 'week' ? 'wk' : period === 'day' ? 'day' : 'mo';
    streakBadgeText = `🔥 ${calculatedStreak} ${unit} streak`;
  }

  return {
    isRecurring: true,
    targetCount,
    period,
    requirementText,
    currentPeriodCompletions,
    isPeriodTargetMet,
    completedToday,
    currentStreak: calculatedStreak,
    bestStreak,
    progressPercent,
    periodLabel,
    streakBadgeText,
    currentWeekDays,
    historyCount: history.length,
  };
}

/**
 * Format recurrence requirement into friendly label
 */
export function formatRecurrenceLabel(targetCount: number, period: RecurrencePeriod): string {
  if (period === 'day') {
    return targetCount === 1 ? 'Daily (1x / day)' : `${targetCount}x a day`;
  }
  if (period === 'week') {
    return targetCount === 1 ? '1x a week' : `${targetCount}x a week`;
  }
  return targetCount === 1 ? 'Monthly (1x / mo)' : `${targetCount}x a month`;
}
