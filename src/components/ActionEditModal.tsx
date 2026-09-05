import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  Zap,
  Tag,
  AlertCircle,
  FileText,
  RotateCcw,
  Flame,
  UserCheck,
  Sparkles,
  Inbox,
  Hourglass,
  Layers
} from 'lucide-react';
import {
  GTDAction,
  GTDContext,
  EnergyLevel,
  TimeEstimate,
  ActionType,
  RecurrencePeriod,
} from '../types/gtd';
import { useGTD } from '../context/GTDContext';
import { GTD_CONTEXT_OPTIONS } from '../data/gtdData';
import { formatRecurrenceLabel, getActionStreakInfo } from '../utils/streakUtils';

interface ActionEditModalProps {
  action: GTDAction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActionEditModal: React.FC<ActionEditModalProps> = ({
  action,
  isOpen,
  onClose,
}) => {
  const { projects = [], updateAction, deleteAction } = useGTD();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ActionType>('action');
  const [context, setContext] = useState<GTDContext>('@computer');
  const [customContext, setCustomContext] = useState('');
  const [isCustomContext, setIsCustomContext] = useState(false);
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate>('15-30m');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [projectId, setProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [delegatedTo, setDelegatedTo] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState(false);

  // Recurrence settings
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(3);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('week');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (action) {
      setTitle(action.title || '');
      setType(action.type || 'action');
      
      const isKnownContext = GTD_CONTEXT_OPTIONS.some((c) => c.value === action.context);
      if (isKnownContext) {
        setContext(action.context);
        setIsCustomContext(false);
        setCustomContext('');
      } else if (action.context) {
        setContext('@custom');
        setIsCustomContext(true);
        setCustomContext(action.context);
      } else {
        setContext('@computer');
        setIsCustomContext(false);
        setCustomContext('');
      }

      setEnergy(action.energy || 'medium');
      setTimeEstimate(action.timeEstimate || '15-30m');
      setPriority(action.priority || 'medium');
      setProjectId(action.projectId || '');
      setDueDate(action.dueDate || '');
      setScheduledDate(action.scheduledDate || '');
      setDelegatedTo(action.delegatedTo || '');
      setFollowUpDate(action.followUpDate || '');
      setNotes(action.notes || '');
      setCompleted(Boolean(action.completed));

      setIsRecurring(Boolean(action.isRecurring));
      if (action.recurrence) {
        setRecurrenceCount(action.recurrence.targetCount || 3);
        setRecurrencePeriod(action.recurrence.period || 'week');
      } else {
        setRecurrenceCount(3);
        setRecurrencePeriod('week');
      }
      setShowDeleteConfirm(false);
    }
  }, [action, isOpen]);

  if (!isOpen || !action) return null;

  const streakInfo = getActionStreakInfo(action);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    const resolvedContext = isCustomContext && customContext.trim() 
      ? (customContext.startsWith('@') ? customContext.trim() : `@${customContext.trim()}`)
      : context;

    updateAction(action.id, {
      title: title.trim(),
      type,
      context: resolvedContext,
      energy,
      timeEstimate,
      priority,
      projectId: projectId || undefined,
      dueDate: dueDate || undefined,
      scheduledDate: scheduledDate || undefined,
      delegatedTo: type === 'waiting-for' ? (delegatedTo.trim() || undefined) : undefined,
      followUpDate: type === 'waiting-for' ? (followUpDate || undefined) : undefined,
      notes: notes.trim() || undefined,
      completed,
      isRecurring,
      recurrence: isRecurring
        ? {
            targetCount: recurrenceCount,
            period: recurrencePeriod,
            label: formatRecurrenceLabel(recurrenceCount, recurrencePeriod),
          }
        : undefined,
    });

    onClose();
  };

  const handleDelete = () => {
    deleteAction(action.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-[#141414] rounded-2xl shadow-2xl border border-[#282828] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#242424] bg-[#161616] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white font-serif tracking-tight truncate">
                Edit Action
              </h2>
              <p className="text-xs text-gray-400">
                Update action parameters, context, timing, project link, or recurrence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#202020] rounded-xl transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Action Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Action Title / Task *</span>
              <span className="text-[11px] text-gray-500 font-normal">Physical Next Step</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call Marcus to review draft specifications"
              className="w-full px-3.5 py-2.5 text-sm bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-white placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E] focus:ring-1 focus:ring-[#C5A47E]"
              autoFocus
            />
          </div>

          {/* Action Type Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              List Category / Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'action' as ActionType, label: 'Next Action', icon: CheckCircle2 },
                { value: 'inbox' as ActionType, label: 'Inbox Item', icon: Inbox },
                { value: 'waiting-for' as ActionType, label: 'Waiting For', icon: Hourglass },
                { value: 'someday-maybe' as ActionType, label: 'Someday / Maybe', icon: Sparkles },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = type === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setType(tab.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#C5A47E] text-black border-[#C5A47E] font-bold shadow-xs'
                        : 'bg-[#181818] text-gray-400 hover:text-gray-200 border-[#262626] hover:bg-[#202020]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context, Energy, Time, Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Context Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Physical Context</span>
              </label>
              <select
                value={isCustomContext ? '@custom' : context}
                onChange={(e) => {
                  if (e.target.value === '@custom') {
                    setIsCustomContext(true);
                  } else {
                    setIsCustomContext(false);
                    setContext(e.target.value as GTDContext);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-gray-200 focus:outline-hidden focus:border-[#C5A47E]"
              >
                {GTD_CONTEXT_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
                <option value="@custom">Custom Context...</option>
              </select>

              {isCustomContext && (
                <input
                  type="text"
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="e.g. @studio or @kitchen"
                  className="mt-1.5 w-full px-3 py-1.5 text-xs bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg text-gray-200 font-mono focus:outline-hidden focus:border-[#C5A47E]"
                />
              )}
            </div>

            {/* Project Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Associated Project</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-gray-200 focus:outline-hidden focus:border-[#C5A47E]"
              >
                <option value="">No Project (Standalone Action)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Energy Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Required Energy</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'low' as EnergyLevel, label: 'Low', color: 'text-emerald-400' },
                  { value: 'medium' as EnergyLevel, label: 'Medium', color: 'text-amber-400' },
                  { value: 'high' as EnergyLevel, label: 'High', color: 'text-rose-400' },
                ].map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEnergy(e.value)}
                    className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      energy === e.value
                        ? 'bg-[#222222] border-[#C5A47E] text-white shadow-xs'
                        : 'bg-[#181818] border-[#262626] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className={energy === e.value ? e.color : ''}>{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Estimate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Time Estimate</span>
              </label>
              <select
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(e.target.value as TimeEstimate)}
                className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-gray-200 focus:outline-hidden focus:border-[#C5A47E]"
              >
                <option value="<15m">⚡ Less than 15 mins</option>
                <option value="15-30m">⏱ 15 - 30 mins</option>
                <option value="30-60m">⏱ 30 - 60 mins</option>
                <option value="1-2h">⏱ 1 - 2 hours</option>
                <option value="2h+">⏱ 2+ hours</option>
              </select>
            </div>

          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'low' as const, label: 'Low' },
                  { value: 'medium' as const, label: 'Medium' },
                  { value: 'high' as const, label: 'High' },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      priority === p.value
                        ? 'bg-[#222222] border-[#C5A47E] text-white shadow-xs'
                        : 'bg-[#181818] border-[#262626] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hard Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                <span>Hard Due Date</span>
                <span className="text-[10px] text-gray-500 font-normal">Only for real deadlines</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-gray-200 focus:outline-hidden focus:border-[#C5A47E]"
              />
            </div>
          </div>

          {/* Delegated fields if waiting-for */}
          {type === 'waiting-for' && (
            <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase">
                <UserCheck className="w-4 h-4" />
                <span>Delegation Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Delegated To (Person / Entity)</label>
                  <input
                    type="text"
                    value={delegatedTo}
                    onChange={(e) => setDelegatedTo(e.target.value)}
                    placeholder="e.g. John Miller, Vendor Support"
                    className="w-full px-3 py-1.5 text-xs bg-[#141414] border border-[#2E2E2E] rounded-lg text-gray-200 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Follow-up By Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#141414] border border-[#2E2E2E] rounded-lg text-gray-200 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recurring Routines & Streaks Section */}
          <div className="p-4 bg-[#181818] border border-[#282828] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A47E] bg-[#141414] border-gray-600 focus:ring-0 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recurring Habit / Routine Tracking</span>
                </div>
              </label>

              {isRecurring && action.streakCount !== undefined && action.streakCount > 0 && (
                <div className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-800/40">
                  <Flame className="w-3.5 h-3.5 fill-orange-400" />
                  <span>Current Streak: {action.streakCount}</span>
                </div>
              )}
            </div>

            {isRecurring && (
              <div className="pt-2 border-t border-[#262626] space-y-3 animate-in fade-in text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Frequency Target:</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {formatRecurrenceLabel(recurrenceCount, recurrencePeriod)}
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
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
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

                <div className="flex items-center gap-2 pt-1 text-[11px]">
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
          </div>

          {/* Notes / Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#C5A47E]" />
              <span>Notes & Support Reference</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add links, phone numbers, sub-steps, or key context..."
              className="w-full px-3.5 py-2.5 text-xs bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E] leading-relaxed"
            />
          </div>

          {/* Completion status toggle */}
          <div className="pt-2 border-t border-[#242424] flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-[#141414] border-gray-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-300">
                Mark as Completed {action.completedAt ? `(completed at ${action.completedAt.split('T')[0]})` : ''}
              </span>
            </label>

            {action.createdAt && (
              <span className="text-[11px] text-gray-500 font-mono">
                Created: {action.createdAt}
              </span>
            )}
          </div>

        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#242424] bg-[#161616] flex items-center justify-between gap-3">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-800/80 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-rose-200 font-semibold">Delete this action?</span>
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-gray-400 hover:text-white text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-gray-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Action</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
