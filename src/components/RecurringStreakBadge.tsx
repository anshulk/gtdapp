import React from 'react';
import { Flame, Check, Plus, Calendar, RotateCcw } from 'lucide-react';
import { GTDAction } from '../types/gtd';
import { getActionStreakInfo, formatDateKey } from '../utils/streakUtils';

interface RecurringStreakBadgeProps {
  action: GTDAction;
  onToggleToday?: () => void;
  compact?: boolean;
  showWeekDots?: boolean;
}

export const RecurringStreakBadge: React.FC<RecurringStreakBadgeProps> = ({
  action,
  onToggleToday,
  compact = false,
  showWeekDots = true,
}) => {
  if (!action.isRecurring || !action.recurrence) return null;

  const streakInfo = getActionStreakInfo(action);
  const {
    targetCount,
    period,
    requirementText,
    currentPeriodCompletions,
    isPeriodTargetMet,
    completedToday,
    currentStreak,
    progressPercent,
    currentWeekDays,
  } = streakInfo;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[10px]">
        {/* Recurrence Requirement */}
        <span className="px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800/40 font-semibold font-mono flex items-center gap-1">
          <RotateCcw className="w-2.5 h-2.5" />
          <span>{requirementText}</span>
        </span>

        {/* Progress in current period */}
        <span className={`px-1.5 py-0.5 rounded font-bold border ${
          isPeriodTargetMet
            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
            : 'bg-[#1C1C1C] text-gray-300 border-[#2C2C2C]'
        }`}>
          {currentPeriodCompletions}/{targetCount} {period === 'week' ? 'wk' : period === 'day' ? 'today' : 'mo'}
        </span>

        {/* Streak Flame */}
        {currentStreak > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/40 font-bold flex items-center gap-0.5 animate-pulse">
            <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
            <span>{currentStreak}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#191919] border border-[#2A2A2A] rounded-xl p-2.5 sm:p-3 space-y-2">
      {/* Top row: Requirement + Period Progress + Streak */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[11px] font-bold flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>{requirementText}</span>
          </span>

          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
            isPeriodTargetMet
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              : 'bg-[#141414] text-gray-300 border-[#2A2A2A]'
          }`}>
            {currentPeriodCompletions} of {targetCount} met {period === 'week' ? 'this week' : period === 'day' ? 'today' : 'this month'}
          </span>
        </div>

        {/* Streak Flame Badge */}
        <div className="flex items-center gap-1.5">
          {currentStreak > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-950/80 to-amber-950/80 text-orange-300 border border-orange-700/50 text-xs font-extrabold shadow-xs">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-bounce" />
              <span>{currentStreak} {period === 'week' ? 'wk' : period === 'day' ? 'day' : 'mo'} streak</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
              <span>0 streak</span>
            </div>
          )}

          {onToggleToday && (
            <button
              type="button"
              onClick={onToggleToday}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                completedToday
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-800/60'
                  : 'bg-[#C5A47E] hover:bg-[#b8946e] text-black shadow-xs'
              }`}
              title={completedToday ? 'Logged for today (click to undo)' : 'Log session for today'}
            >
              {completedToday ? (
                <>
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Done Today</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Log Today</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#121212] rounded-full h-1.5 overflow-hidden border border-[#242424]">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isPeriodTargetMet
              ? 'bg-emerald-400'
              : progressPercent > 50
              ? 'bg-amber-400'
              : 'bg-[#C5A47E]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Weekly Visual Dots Tracker (for weekly / daily habits) */}
      {showWeekDots && period !== 'month' && (
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#242424] text-[10px]">
          <span className="text-gray-500 font-medium shrink-0">Current Week:</span>
          <div className="flex items-center gap-1.5">
            {currentWeekDays.map((day) => (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center justify-center w-6 h-6 rounded-md border text-[9px] font-bold transition-all ${
                  day.isCompleted
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60 shadow-xs'
                    : day.isToday
                    ? 'bg-[#222222] text-amber-300 border-amber-500/50'
                    : 'bg-[#141414] text-gray-600 border-[#242424]'
                }`}
                title={`${day.dayLabel} (${day.dateStr}): ${day.isCompleted ? 'Completed' : 'Not logged'}`}
              >
                {day.isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                ) : (
                  <span>{day.dayLabel[0]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
