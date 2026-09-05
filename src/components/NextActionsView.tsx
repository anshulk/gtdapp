import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Inbox, 
  Clock, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  Trash2, 
  Edit3, 
  Briefcase, 
  Calendar, 
  ArrowRight, 
  AlertCircle,
  FileText,
  ChevronDown,
  Layers,
  Sparkle,
  RotateCcw,
  Flame
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDContext, EnergyLevel, TimeEstimate, ActionType, GTDAction, RecurrencePeriod } from '../types/gtd';
import { GTD_CONTEXT_OPTIONS } from '../data/gtdData';
import { RecurringStreakBadge } from './RecurringStreakBadge';
import { ActionEditModal } from './ActionEditModal';
import { formatRecurrenceLabel } from '../utils/streakUtils';

interface NextActionsViewProps {
  initialSubTab?: 'actions' | 'inbox' | 'waiting' | 'someday';
}

export const NextActionsView: React.FC<NextActionsViewProps> = ({ initialSubTab = 'actions' }) => {
  const {
    actions = [],
    projects = [],
    addAction,
    deleteAction,
    updateAction,
    toggleActionComplete,
    logRecurringCompletion,
    setClarifyModalItem,
    setSelectedProjectId,
    setActiveTab,
    setQuickCaptureOpen,
  } = useGTD();

  const [subTab, setSubTab] = useState<'actions' | 'inbox' | 'waiting' | 'someday'>(initialSubTab);
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Action Filters
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [filterRecurringOnly, setFilterRecurringOnly] = useState<boolean>(false);
  const [search, setSearch] = useState('');

  // Quick action bar inputs
  const [newTitle, setNewTitle] = useState('');
  const [newContext, setNewContext] = useState<GTDContext>('@computer');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium');
  const [newTime, setNewTime] = useState<TimeEstimate>('15-30m');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceCount, setRecurrenceCount] = useState<number>(3);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('week');
  
  // Expanded notes toggle
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addAction({
      title: newTitle.trim(),
      projectId: newProjectId || undefined,
      context: newContext,
      energy: newEnergy,
      timeEstimate: newTime,
      type: 'action',
      priority: 'medium',
      isRecurring: isRecurring,
      recurrence: isRecurring
        ? {
            targetCount: recurrenceCount,
            period: recurrencePeriod,
            label: formatRecurrenceLabel(recurrenceCount, recurrencePeriod),
          }
        : undefined,
      completionHistory: isRecurring ? [] : undefined,
    });

    setNewTitle('');
    setIsRecurring(false);
  };

  // Filtered Actions
  const filteredActions = useMemo(() => {
    return actions.filter((act) => {
      if (act.type !== 'action') return false;
      if (filterRecurringOnly && !act.isRecurring) return false;
      if (!showCompleted && act.completed && !act.isRecurring) return false;
      if (showCompleted && !act.completed && !act.isRecurring) return false;
      if (selectedContext !== 'all' && act.context !== selectedContext) return false;
      if (selectedEnergy !== 'all' && act.energy !== selectedEnergy) return false;
      if (selectedTime !== 'all' && act.timeEstimate !== selectedTime) return false;
      if (selectedProjectFilter !== 'all' && act.projectId !== selectedProjectFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!act.title.toLowerCase().includes(q) && !act.notes?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [actions, showCompleted, filterRecurringOnly, selectedContext, selectedEnergy, selectedTime, selectedProjectFilter, search]);

  // Inbox items
  const inboxItems = useMemo(() => {
    return actions.filter((a) => a.type === 'inbox' && !a.completed);
  }, [actions]);

  // Waiting For items
  const waitingItems = useMemo(() => {
    return actions.filter((a) => a.type === 'waiting-for' && !a.completed);
  }, [actions]);

  // Someday / Maybe items
  const somedayItems = useMemo(() => {
    return actions.filter((a) => a.type === 'someday-maybe' && !a.completed);
  }, [actions]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner with GTD Ground Navigation */}
      <div className="bg-[#141414] rounded-2xl border border-[#262626] p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A47E]/10 text-[#C5A47E] text-xs font-bold border border-[#C5A47E]/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ground Level • Runway Execution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
              Actions, Inboxes & Waiting-For
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              Physical, visible, atomic next actions categorized strictly by Context, Energy, and Time available to keep cognitive friction at zero.
            </p>
          </div>

          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="w-8 h-8 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black rounded-lg shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Quick Capture (Inbox)"
            aria-label="Quick Capture"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Sub Navigation Ribbon */}
        <div className="mt-8 pt-6 border-t border-[#262626] flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setSubTab('actions')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'actions'
                ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Next Actions</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'actions' ? 'bg-black/30 text-black' : 'bg-[#282828] text-gray-400'
            }`}>
              {actions.filter((a) => a.type === 'action' && !a.completed).length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('inbox')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'inbox'
                ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox / Clarify</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'inbox' ? 'bg-black/30 text-black' : 'bg-[#282828] text-gray-400'
            }`}>
              {inboxItems.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('waiting')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'waiting'
                ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Waiting For</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'waiting' ? 'bg-black/30 text-black' : 'bg-[#282828] text-gray-400'
            }`}>
              {waitingItems.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('someday')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'someday'
                ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Someday / Maybe</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              subTab === 'someday' ? 'bg-black/30 text-black' : 'bg-[#282828] text-gray-400'
            }`}>
              {somedayItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: NEXT ACTIONS ENGINE */}
      {subTab === 'actions' && (
        <div className="space-y-6">
          
          {/* Quick Add Action Top Bar */}
          <form
            onSubmit={handleCreateAction}
            className="bg-[#141414] rounded-2xl border border-[#262626] p-4 shadow-md space-y-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Capture immediate next action or recurring routine... (e.g. 3x a week workout, Call dentist)"
                className="w-full px-3.5 py-2.5 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500 font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black text-xs font-bold rounded-xl shadow-xs shrink-0 transition-colors cursor-pointer"
              >
                {isRecurring ? 'Add Routine' : 'Add Action'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
              <select
                value={newContext}
                onChange={(e) => setNewContext(e.target.value as GTDContext)}
                className="px-2.5 py-1.5 bg-[#191919] border border-[#262626] rounded-lg text-gray-300 font-mono focus:border-[#C5A47E] focus:outline-hidden"
              >
                {GTD_CONTEXT_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={newEnergy}
                onChange={(e) => setNewEnergy(e.target.value as EnergyLevel)}
                className="px-2.5 py-1.5 bg-[#191919] border border-[#262626] rounded-lg text-gray-300 focus:border-[#C5A47E] focus:outline-hidden"
              >
                <option value="low">⚡ Low Energy</option>
                <option value="medium">⚡⚡ Medium Energy</option>
                <option value="high">⚡⚡⚡ High Energy</option>
              </select>

              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value as TimeEstimate)}
                className="px-2.5 py-1.5 bg-[#191919] border border-[#262626] rounded-lg text-gray-300 focus:border-[#C5A47E] focus:outline-hidden"
              >
                <option value="<15m">⏱ &lt;15 mins</option>
                <option value="15-30m">⏱ 15-30 mins</option>
                <option value="30-60m">⏱ 30-60 mins</option>
                <option value="1-2h">⏱ 1-2 hours</option>
                <option value="2h+">⏱ 2+ hours</option>
              </select>

              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="px-2.5 py-1.5 bg-[#191919] border border-[#262626] rounded-lg text-gray-300 max-w-[200px] focus:border-[#C5A47E] focus:outline-hidden"
              >
                <option value="">No Project (Standalone Action)</option>
                {projects
                  .filter((p) => p.status === 'active')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      📁 {p.title}
                    </option>
                  ))}
              </select>

              {/* Recurring Routine Toggle */}
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#191919] border border-[#262626] text-gray-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-[#C5A47E] focus:ring-0 focus:ring-offset-0 bg-[#141414] border-gray-600 w-3.5 h-3.5 cursor-pointer"
                />
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">Recurring / Habit</span>
              </label>
            </div>

            {/* Recurring Requirement Target Selector */}
            {isRecurring && (
              <div className="p-3 bg-[#191919] border border-amber-800/40 rounded-xl space-y-2 text-xs text-gray-300 animate-fadeIn">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Minimum Streak Target:</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Target: {formatRecurrenceLabel(recurrenceCount, recurrencePeriod)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: '3x a week (e.g. Workout)', count: 3, period: 'week' as RecurrencePeriod },
                    { label: 'Daily (1x / day)', count: 1, period: 'day' as RecurrencePeriod },
                    { label: '5x a week (Workdays)', count: 5, period: 'week' as RecurrencePeriod },
                    { label: '2x a week', count: 2, period: 'week' as RecurrencePeriod },
                    { label: '1x a week', count: 1, period: 'week' as RecurrencePeriod },
                  ].map((preset) => {
                    const isActive = recurrenceCount === preset.count && recurrencePeriod === preset.period;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setRecurrenceCount(preset.count);
                          setRecurrencePeriod(preset.period);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-400 text-black font-bold shadow-xs'
                            : 'bg-[#141414] text-gray-400 hover:text-gray-200 border border-[#282828]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#262626] text-[11px]">
                  <span className="text-gray-400">Custom Target:</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-2 py-0.5 bg-[#141414] border border-[#2E2E2E] rounded text-center text-gray-200 focus:outline-hidden focus:border-amber-400 font-bold"
                  />
                  <span className="text-gray-400">times per</span>
                  <select
                    value={recurrencePeriod}
                    onChange={(e) => setRecurrencePeriod(e.target.value as RecurrencePeriod)}
                    className="px-2 py-0.5 bg-[#141414] border border-[#2E2E2E] rounded text-gray-200 focus:outline-hidden focus:border-amber-400 text-[11px]"
                  >
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                  </select>
                </div>
              </div>
            )}
          </form>

          {/* Filter Bar Chips */}
          <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] shadow-sm space-y-3">
            {/* Context tag chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1">
                Context:
              </span>
              <button
                onClick={() => setSelectedContext('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                  selectedContext === 'all'
                    ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                    : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                }`}
              >
                All Contexts
              </button>
              {GTD_CONTEXT_OPTIONS.map((ctx) => (
                <button
                  key={ctx.value}
                  onClick={() => setSelectedContext(ctx.value)}
                  className={`px-2.5 py-1 rounded-lg font-medium font-mono transition-all shrink-0 cursor-pointer ${
                    selectedContext === ctx.value
                      ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                      : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  {ctx.label}
                </button>
              ))}
            </div>

            {/* Energy, Time, and Active/Completed filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#262626] text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Energy:
                  </span>
                  {['all', 'low', 'medium', 'high'].map((eng) => (
                    <button
                      key={eng}
                      onClick={() => setSelectedEnergy(eng)}
                      className={`px-2 py-0.5 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                        selectedEnergy === eng
                          ? 'bg-[#C5A47E] text-black font-bold'
                          : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                      }`}
                    >
                      {eng}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Time:
                  </span>
                  {['all', '<15m', '15-30m', '30-60m', '1-2h'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        selectedTime === t
                          ? 'bg-[#C5A47E] text-black font-bold'
                          : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                      }`}
                    >
                      {t === 'all' ? 'Any' : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter recurring routines only */}
                <button
                  onClick={() => setFilterRecurringOnly(!filterRecurringOnly)}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    filterRecurringOnly
                      ? 'bg-amber-400 text-black font-bold shadow-xs'
                      : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Routines & Streaks</span>
                </button>

                {/* Toggle Completed */}
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    showCompleted
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  {showCompleted ? '✓ Showing Completed Actions' : 'Show Completed'}
                </button>
              </div>
            </div>
          </div>

          {/* Action List Items */}
          <div className="space-y-2.5">
            {filteredActions.length === 0 ? (
              <div className="bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-[#C5A47E] mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-bold text-white font-serif">
                  {showCompleted ? 'No Completed Actions Found' : 'All Clear in Selected Context!'}
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  {showCompleted
                    ? 'Complete some next actions to see your archive here.'
                    : 'No pending actions match your current filter criteria. Switch context or capture new tasks.'}
                </p>
              </div>
            ) : (
              filteredActions.map((action) => {
                const linkedProject = projects.find((p) => p.id === action.projectId);
                const hasNotes = Boolean(action.notes);
                const isNotesOpen = expandedNotes[action.id];

                return (
                  <div
                    key={action.id}
                    className={`bg-[#141414] rounded-xl border transition-all p-4 flex flex-col justify-between gap-3 group shadow-md hover:shadow-lg ${
                      action.completed && !action.isRecurring
                        ? 'border-[#202020] bg-[#111111]/80 opacity-70'
                        : action.isRecurring
                        ? 'border-amber-900/30 hover:border-amber-700/40 bg-[#161616]'
                        : 'border-[#262626] hover:border-[#383838]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => toggleActionComplete(action.id)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            action.completed
                              ? 'bg-[#C5A47E] border-[#C5A47E] text-black'
                              : 'border-neutral-600 hover:border-[#C5A47E] text-transparent hover:text-[#C5A47E]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-1.5 flex-1">
                          <p
                            onClick={() => setEditingAction(action)}
                            className={`text-sm font-semibold leading-snug cursor-pointer transition-colors hover:text-[#C5A47E] ${
                              action.completed && !action.isRecurring
                                ? 'line-through text-gray-500'
                                : 'text-gray-200'
                            }`}
                          >
                            {action.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded-md bg-[#1E1E1E] text-gray-300 font-mono font-medium border border-[#262626]">
                              {action.context}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md font-medium capitalize ${
                                action.energy === 'high'
                                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                                  : action.energy === 'medium'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              }`}
                            >
                              {action.energy} energy
                            </span>

                            <span className="px-2 py-0.5 rounded-md bg-[#C5A47E]/10 text-[#C5A47E] font-medium border border-[#C5A47E]/20">
                              ⏱ {action.timeEstimate}
                            </span>

                            {linkedProject && (
                              <button
                                onClick={() => {
                                  setSelectedProjectId(linkedProject.id);
                                  setActiveTab('projects');
                                }}
                                className="text-gray-400 hover:text-[#C5A47E] flex items-center gap-1 font-medium group-hover:text-gray-300 transition-colors"
                              >
                                <Briefcase className="w-3 h-3 text-gray-500" />
                                <span className="truncate max-w-[180px]">{linkedProject.title}</span>
                              </button>
                            )}

                            {action.dueDate && (
                              <span className="text-rose-400 font-medium flex items-center gap-1 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {action.dueDate}</span>
                              </span>
                            )}

                            {hasNotes && (
                              <button
                                onClick={() => toggleNotes(action.id)}
                                className="text-[11px] text-gray-400 hover:text-[#C5A47E] flex items-center gap-1 font-medium underline cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>{isNotesOpen ? 'Hide Notes' : 'View Notes'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (Edit + Delete) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAction(action)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#C5A47E] rounded transition-opacity cursor-pointer"
                          title="Edit action"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteAction(action.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                          title="Delete action"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Recurring Streak & Completion Tracker Badge */}
                    {action.isRecurring && (
                      <div className="pt-2 border-t border-[#222222]">
                        <RecurringStreakBadge
                          action={action}
                          onToggleToday={() => logRecurringCompletion(action.id)}
                          showWeekDots={true}
                        />
                      </div>
                    )}

                    {/* Notes accordion content */}
                    {hasNotes && isNotesOpen && (
                      <div className="mt-2 pl-8 text-xs text-gray-400 bg-[#191919] p-2.5 rounded-lg border border-[#262626] whitespace-pre-wrap">
                        {action.notes}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: INBOX & CLARIFY WIZARD */}
      {subTab === 'inbox' && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] text-gray-200 rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#C5A47E] text-xs font-semibold">
                <Inbox className="w-4 h-4" />
                <span>GTD Clarify Phase</span>
              </div>
              <h2 className="text-xl font-bold font-serif text-white">
                Process Inbox to Zero
              </h2>
              <p className="text-xs text-gray-400">
                Transform captured thoughts into crisp physical next actions, delegated waiting items, or multi-step projects.
              </p>
            </div>

            <button
              onClick={() => setQuickCaptureOpen(true)}
              className="px-4 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              + Add to Inbox
            </button>
          </div>

          <div className="space-y-3">
            {inboxItems.length === 0 ? (
              <div className="bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
                <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white font-serif">
                  🎉 Inbox Zero!
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Every captured idea has been clarified and organized into its proper GTD container.
                </p>
              </div>
            ) : (
              inboxItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#262626] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E1E1E] text-gray-300 border border-[#262626] font-mono">
                      Captured Item
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAction(item)}
                      className="p-2 text-gray-400 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-xl transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setClarifyModalItem(item)}
                      className="px-4 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Clarify (GTD Wizard)</span>
                    </button>
                    <button
                      onClick={() => deleteAction(item.id)}
                      className="p-2 text-gray-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Trash item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: WAITING FOR RADAR */}
      {subTab === 'waiting' && (
        <div className="space-y-6">
          <div className="bg-amber-950/20 border border-amber-800/50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Delegated Commitments Radar</span>
              </div>
              <h2 className="text-xl font-bold font-serif text-amber-300 mt-1">
                Waiting For List ({waitingItems.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Track deliverable promises made by colleagues, clients, vendors, or institutions.
              </p>
            </div>

            <button
              onClick={() => setQuickCaptureOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              + Delegate New Task
            </button>
          </div>

          <div className="space-y-3">
            {waitingItems.length === 0 ? (
              <div className="bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
                <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-bold text-white font-serif">
                  No Outstanding Delegated Tasks
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  You are not waiting on deliverables from anyone right now.
                </p>
              </div>
            ) : (
              waitingItems.map((item) => {
                const linkedProject = projects.find((p) => p.id === actionToProject(item.projectId));

                return (
                  <div
                    key={item.id}
                    className="bg-[#141414] p-5 rounded-2xl border border-amber-900/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-mono">
                          Delegated to: {item.delegatedTo || 'Pending Person'}
                        </span>
                        {item.delegatedDate && (
                          <span className="text-[11px] text-gray-400">
                            Sent on: {item.delegatedDate}
                          </span>
                        )}
                        {item.followUpDate && (
                          <span className="text-[11px] text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                            Follow up: {item.followUpDate}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-gray-100 leading-snug">
                        {item.title}
                      </h4>

                      {item.notes && (
                        <p className="text-xs text-gray-400 bg-[#191919] p-2.5 rounded-lg border border-[#262626]">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAction(item)}
                        className="p-2 text-gray-400 hover:text-amber-300 hover:bg-amber-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Edit Delegation"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActionComplete(item.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Received / Done</span>
                      </button>

                      <button
                        onClick={() => deleteAction(item.id)}
                        className="p-2 text-gray-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: SOMEDAY / MAYBE INCUBATOR */}
      {subTab === 'someday' && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] text-gray-200 rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#C5A47E] text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Someday / Maybe Incubator</span>
              </div>
              <h2 className="text-xl font-bold font-serif text-white">
                Future Aspirations & Sparks ({somedayItems.length})
              </h2>
              <p className="text-xs text-gray-400">
                Ideas you may want to activate at a future date without cluttering your active next action lists.
              </p>
            </div>

            <button
              onClick={() => setQuickCaptureOpen(true)}
              className="px-4 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              + Add Someday Idea
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {somedayItems.length === 0 ? (
              <div className="col-span-full bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
                <Sparkles className="w-12 h-12 text-[#C5A47E] mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-bold text-white font-serif">
                  No Someday / Maybe Items
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Use Someday/Maybe to park books to read, trips to take, skills to learn, or future projects.
                </p>
              </div>
            ) : (
              somedayItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#141414] p-5 rounded-2xl border border-[#262626] shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E1E1E] text-[#C5A47E] border border-[#262626] font-mono">
                      Incubating
                    </span>
                    <h4 className="text-sm font-bold text-gray-100 leading-snug">
                      {item.title}
                    </h4>
                    {item.notes && (
                      <p className="text-xs text-gray-400 bg-[#191919] p-2.5 rounded-lg border border-[#262626]">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#262626] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          updateAction(item.id, { type: 'action' });
                          setSubTab('actions');
                        }}
                        className="px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#282828] text-[#C5A47E] border border-[#262626] hover:border-[#C5A47E]/40 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Promote to Active Action</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingAction(item)}
                        className="p-1.5 text-gray-400 hover:text-[#C5A47E] rounded-lg transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAction(item.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Action Edit Modal */}
      <ActionEditModal
        action={editingAction}
        isOpen={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
      />

    </div>
  );
};

function actionToProject(projId?: string) {
  return projId;
}
