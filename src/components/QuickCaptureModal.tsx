import React, { useState, useEffect } from 'react';
import { X, Plus, Inbox, CheckCircle2, Briefcase, Clock, Sparkles, Zap, RotateCcw, Flame } from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDContext, EnergyLevel, TimeEstimate, ActionType, RecurrencePeriod } from '../types/gtd';
import { GTD_CONTEXT_OPTIONS } from '../data/gtdData';
import { formatRecurrenceLabel } from '../utils/streakUtils';

export const QuickCaptureModal: React.FC = () => {
  const {
    quickCaptureOpen,
    setQuickCaptureOpen,
    addAction,
    addProject,
    projects,
    horizonItems,
  } = useGTD();

  const [captureType, setCaptureType] = useState<ActionType | 'project'>('inbox');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  
  // Action specific fields
  const [context, setContext] = useState<GTDContext>('@computer');
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate>('15-30m');
  const [projectId, setProjectId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceCount, setRecurrenceCount] = useState<number>(3);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('week');

  // Waiting For specific fields
  const [delegatedTo, setDelegatedTo] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Project specific fields
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [initialNextAction, setInitialNextAction] = useState('');
  const [areaId, setAreaId] = useState('');
  const [goalId, setGoalId] = useState('');

  useEffect(() => {
    if (quickCaptureOpen) {
      setTitle('');
      setNotes('');
      setDesiredOutcome('');
      setInitialNextAction('');
      setDelegatedTo('');
      setFollowUpDate('');
      setIsRecurring(false);
    }
  }, [quickCaptureOpen]);

  // Global hotkey 'c' / 'C' listener to trigger quick capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if already typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (document.activeElement?.tagName || '').toUpperCase()
        )
      ) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setQuickCaptureOpen]);

  if (!quickCaptureOpen) return null;

  const areasOfFocus = horizonItems.filter((h) => h.level === 2);
  const goals = horizonItems.filter((h) => h.level === 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (captureType === 'project') {
      addProject(
        {
          title: title.trim(),
          desiredOutcome: desiredOutcome.trim() || title.trim(),
          areaId: areaId || undefined,
          goalId: goalId || undefined,
          status: 'active',
          priority: 'medium',
          notes: notes.trim() || undefined,
        },
        initialNextAction.trim() || undefined
      );
    } else {
      addAction({
        title: title.trim(),
        projectId: projectId || undefined,
        context: captureType === 'action' ? context : '@computer',
        energy: captureType === 'action' ? energy : 'medium',
        timeEstimate: captureType === 'action' ? timeEstimate : '15-30m',
        type: captureType,
        isRecurring: captureType === 'action' ? isRecurring : false,
        recurrence:
          captureType === 'action' && isRecurring
            ? {
                targetCount: recurrenceCount,
                period: recurrencePeriod,
                label: formatRecurrenceLabel(recurrenceCount, recurrencePeriod),
              }
            : undefined,
        completionHistory: captureType === 'action' && isRecurring ? [] : undefined,
        delegatedTo: captureType === 'waiting-for' ? delegatedTo.trim() || undefined : undefined,
        delegatedDate:
          captureType === 'waiting-for' ? new Date().toISOString().split('T')[0] : undefined,
        followUpDate: captureType === 'waiting-for' ? followUpDate || undefined : undefined,
        notes: notes.trim() || undefined,
        priority: 'medium',
      });
    }

    setQuickCaptureOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-3xl shadow-2xl border border-[#262626] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626] bg-[#141414] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-serif">
                Universal Quick Capture
              </h2>
              <p className="text-xs text-gray-400">
                Instantly empty your mind into trusted GTD containers
              </p>
            </div>
          </div>
          <button
            onClick={() => setQuickCaptureOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capture Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Container Type Selector */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-[#1E1E1E] border border-[#262626] rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCaptureType('inbox')}
              className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                captureType === 'inbox'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureType('action')}
              className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                captureType === 'action'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Action</span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureType('project')}
              className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                captureType === 'project'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Project</span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureType('waiting-for')}
              className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                captureType === 'waiting-for'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Waiting</span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureType('someday-maybe')}
              className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                captureType === 'someday-maybe'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Someday</span>
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              {captureType === 'project' ? 'Project Title *' : 'Thought / Next Action Title *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                captureType === 'inbox'
                  ? 'Capture anything on your mind...'
                  : captureType === 'action'
                  ? 'Physical next step (e.g. Call accountant, Draft proposal)'
                  : captureType === 'project'
                  ? 'Project Title (e.g. Launch Product Redesign)'
                  : captureType === 'waiting-for'
                  ? 'Deliverable you are waiting for...'
                  : 'Someday aspirational idea...'
              }
              className="w-full px-3.5 py-2.5 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500 font-medium"
            />
          </div>

          {/* Action Context, Energy, Time */}
          {captureType === 'action' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Context
                </label>
                <select
                  value={context}
                  onChange={(e) => setContext(e.target.value as GTDContext)}
                  className="w-full px-2.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl font-mono text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
                >
                  {GTD_CONTEXT_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Energy
                </label>
                <select
                  value={energy}
                  onChange={(e) => setEnergy(e.target.value as EnergyLevel)}
                  className="w-full px-2.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
                >
                  <option value="low">Low Energy</option>
                  <option value="medium">Medium Energy</option>
                  <option value="high">High Energy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Time
                </label>
                <select
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(e.target.value as TimeEstimate)}
                  className="w-full px-2.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
                >
                  <option value="<15m">&lt;15 mins</option>
                  <option value="15-30m">15-30 mins</option>
                  <option value="30-60m">30-60 mins</option>
                  <option value="1-2h">1-2 hrs</option>
                  <option value="2h+">2h+</option>
                </select>
              </div>
            </div>
          )}

          {/* Project Link & Recurring Options for Actions */}
          {captureType === 'action' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Link to Active Project (Optional)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
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
              </div>

              {/* Recurring Routine Toggle */}
              <div className="p-3 bg-[#191919] border border-[#262626] rounded-xl space-y-2">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Recurring Routine / Habit Tracker</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded text-[#C5A47E] focus:ring-0 focus:ring-offset-0 bg-[#141414] border-gray-600 w-4 h-4 cursor-pointer"
                  />
                </label>

                {isRecurring && (
                  <div className="pt-2 border-t border-[#262626] space-y-2 text-xs text-gray-300 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span>Minimum Streak Target:</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatRecurrenceLabel(recurrenceCount, recurrencePeriod)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '3x / week (Workout)', count: 3, period: 'week' as RecurrencePeriod },
                        { label: 'Daily (1x / day)', count: 1, period: 'day' as RecurrencePeriod },
                        { label: '5x / week (Workdays)', count: 5, period: 'week' as RecurrencePeriod },
                        { label: '2x / week', count: 2, period: 'week' as RecurrencePeriod },
                      ].map((preset) => {
                        const isActive =
                          recurrenceCount === preset.count && recurrencePeriod === preset.period;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setRecurrenceCount(preset.count);
                              setRecurrencePeriod(preset.period);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Specific Fields */}
          {captureType === 'project' && (
            <div className="space-y-3 bg-[#191919] p-3.5 rounded-2xl border border-[#262626]">
              <div>
                <label className="block text-xs font-bold text-[#C5A47E] uppercase tracking-wider mb-1">
                  Desired Outcome (Definition of Done) *
                </label>
                <textarea
                  rows={2}
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder="What does finished look like in physical reality?"
                  className="w-full px-3 py-1.5 text-xs bg-[#141414] border border-[#262626] rounded-xl text-gray-200 placeholder-gray-500 focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#C5A47E] uppercase tracking-wider mb-1">
                  First Next Action (Prevents Stalls)
                </label>
                <input
                  type="text"
                  value={initialNextAction}
                  onChange={(e) => setInitialNextAction(e.target.value)}
                  placeholder="Very first physical action you can take right now..."
                  className="w-full px-3 py-1.5 text-xs bg-[#141414] border border-[#262626] rounded-xl text-gray-200 placeholder-gray-500 focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Waiting For Specific Fields */}
          {captureType === 'waiting-for' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#191919] p-3.5 rounded-2xl border border-[#262626]">
              <div>
                <label className="block text-xs font-bold text-[#C5A47E] uppercase tracking-wider mb-1">
                  Delegated To (Person / Vendor) *
                </label>
                <input
                  type="text"
                  required
                  value={delegatedTo}
                  onChange={(e) => setDelegatedTo(e.target.value)}
                  placeholder="e.g. Elena, City Inspector, Sarah"
                  className="w-full px-3 py-1.5 text-xs bg-[#141414] border border-[#262626] rounded-xl text-gray-200 placeholder-gray-500 font-medium focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#C5A47E] uppercase tracking-wider mb-1">
                  Follow-Up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#141414] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Notes & Details (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional background, URLs, or details..."
              className="w-full px-3.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] text-gray-200 placeholder-gray-500 focus:border-[#C5A47E] focus:outline-hidden"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={() => setQuickCaptureOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Capture to GTD</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
