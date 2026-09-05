import React, { useState } from 'react';
import { 
  X, 
  Briefcase, 
  CheckCircle2, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Check, 
  ShieldCheck, 
  Target, 
  AlertTriangle,
  FileText,
  Link as LinkIcon,
  Sparkles,
  Edit3,
  RotateCcw,
  Flame
} from 'lucide-react';
import { GTDProject, GTDAction, GTDContext, EnergyLevel, TimeEstimate, RecurrencePeriod } from '../types/gtd';
import { useGTD } from '../context/GTDContext';
import { GTD_CONTEXT_OPTIONS } from '../data/gtdData';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { RecurringStreakBadge } from './RecurringStreakBadge';
import { ActionEditModal } from './ActionEditModal';
import { getActionStreakInfo, formatRecurrenceLabel } from '../utils/streakUtils';
import { isProjectStalled } from '../utils/projectUtils';

interface ProjectDetailModalProps {
  projectId: string | null;
  onClose: () => void;
  onEditProject: (project: GTDProject) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectId,
  onClose,
  onEditProject,
}) => {
  const {
    projects = [],
    actions = [],
    horizonItems = [],
    addAction,
    deleteAction,
    toggleActionComplete,
    logRecurringCompletion,
    updateProject,
    deleteProject,
  } = useGTD();

  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionContext, setNewActionContext] = useState<GTDContext>('@computer');
  const [newActionEnergy, setNewActionEnergy] = useState<EnergyLevel>('medium');
  const [newActionTime, setNewActionTime] = useState<TimeEstimate>('15-30m');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(3);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('week');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

  if (!projectId) return null;

  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  const projectActions = actions.filter((a) => a.projectId === projectId);
  const recurringActions = projectActions.filter((a) => a.isRecurring && a.type === 'action');
  const activeActions = projectActions.filter((a) => !a.isRecurring && !a.completed && a.type === 'action');
  const completedActions = projectActions.filter((a) => !a.isRecurring && a.completed);
  const waitingActions = projectActions.filter((a) => a.type === 'waiting-for' && !a.completed);

  const linkedArea = horizonItems.find((h) => h.id === project.areaId);
  const linkedGoal = horizonItems.find((h) => h.id === project.goalId);
  const linkedVision = linkedGoal?.parentId
    ? horizonItems.find((h) => h.id === linkedGoal.parentId)
    : undefined;

  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    addAction({
      title: newActionTitle.trim(),
      projectId: project.id,
      context: newActionContext,
      energy: newActionEnergy,
      timeEstimate: newActionTime,
      type: 'action',
      priority: project.priority || 'medium',
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

    setNewActionTitle('');
    setIsRecurring(false);
  };

  const isStalled = isProjectStalled(project, projectActions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-2xl shadow-2xl border border-[#262626] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-[#262626] bg-[#141414] flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            
            {/* Horizon Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400 font-medium">
              {linkedVision && (
                <span className="px-2 py-0.5 rounded bg-[#1E1E1E] text-[#C5A47E] border border-[#262626] font-mono">
                  H4 Vision: {linkedVision.title.slice(0, 24)}...
                </span>
              )}
              {linkedGoal && (
                <span className="px-2 py-0.5 rounded bg-[#1E1E1E] text-blue-400 border border-[#262626] font-mono">
                  H3 Goal: {linkedGoal.title.slice(0, 24)}...
                </span>
              )}
              {linkedArea && (
                <span className="px-2 py-0.5 rounded bg-[#1E1E1E] text-emerald-400 border border-[#262626] font-mono">
                  H2 Area: {linkedArea.title}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white font-serif">
              {project.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#262626] ${
                project.status === 'active'
                  ? 'bg-[#1E1E1E] text-[#C5A47E]'
                  : project.status === 'completed'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                  : 'bg-[#1E1E1E] text-gray-400'
              }`}>
                {project.status}
              </span>

              <span className="text-[11px] text-gray-400 font-medium">
                {completedActions.length} of {projectActions.length} actions complete
              </span>

              {project.targetDate && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Target: {project.targetDate}</span>
                </span>
              )}
            </div>

          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditProject(project)}
              className="p-2 text-gray-400 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
              title="Edit Project Details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                if (e.shiftKey) {
                  deleteProject(project.id);
                  onClose();
                } else {
                  setShowDeleteConfirm(true);
                }
              }}
              className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Delete Project (Hold Shift for instant delete)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Stalled Warning */}
          {isStalled && (
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Warning:</strong> This active project has no physical Next Action defined. Add an action below to keep momentum flowing!
              </span>
            </div>
          )}

          {/* Desired Outcome Box */}
          <div className="p-4 bg-[#191919] border border-[#262626] rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-[#C5A47E] uppercase tracking-wider">
              Desired Outcome (Definition of Done):
            </span>
            <p className="text-sm font-semibold text-gray-200 leading-relaxed font-serif">
              {project.desiredOutcome}
            </p>
          </div>

          {/* Project Support Notes */}
          {project.notes && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Support Material & Reference Notes:</span>
              </span>
              <div className="p-3 bg-[#191919] border border-[#262626] rounded-xl text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                {project.notes}
              </div>
            </div>
          )}

          {/* Next Actions & Recurring Routines Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <CheckSquare className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Project Next Actions & Routines ({activeActions.length + recurringActions.length})</span>
              </h3>
            </div>

            {/* Quick Add Action for this Project */}
            <form onSubmit={handleAddAction} className="bg-[#191919] p-3.5 rounded-xl border border-[#262626] space-y-3">
              <input
                type="text"
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                placeholder="What is the physical action or routine? e.g., Strength workout, Call architect, Draft chapter 2..."
                className="w-full px-3 py-2 text-xs bg-[#141414] border border-[#262626] rounded-lg focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500"
              />
              
              {/* Context, Energy, Time, and Recurring Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={newActionContext}
                    onChange={(e) => setNewActionContext(e.target.value as GTDContext)}
                    className="px-2 py-1 text-[11px] bg-[#141414] border border-[#262626] text-gray-200 rounded-md font-mono focus:border-[#C5A47E] focus:outline-hidden"
                  >
                    {GTD_CONTEXT_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newActionEnergy}
                    onChange={(e) => setNewActionEnergy(e.target.value as EnergyLevel)}
                    className="px-2 py-1 text-[11px] bg-[#141414] border border-[#262626] text-gray-200 rounded-md focus:border-[#C5A47E] focus:outline-hidden"
                  >
                    <option value="low">Low Energy</option>
                    <option value="medium">Medium Energy</option>
                    <option value="high">High Energy</option>
                  </select>

                  <select
                    value={newActionTime}
                    onChange={(e) => setNewActionTime(e.target.value as TimeEstimate)}
                    className="px-2 py-1 text-[11px] bg-[#141414] border border-[#262626] text-gray-200 rounded-md focus:border-[#C5A47E] focus:outline-hidden"
                  >
                    <option value="<15m">&lt;15 min</option>
                    <option value="15-30m">15-30 min</option>
                    <option value="30-60m">30-60 min</option>
                    <option value="1-2h">1-2 hrs</option>
                    <option value="2h+">2h+</option>
                  </select>

                  {/* Recurring routine toggle */}
                  <label className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#141414] border border-[#262626] text-gray-300 hover:text-white cursor-pointer select-none text-[11px]">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded text-[#C5A47E] focus:ring-0 focus:ring-offset-0 bg-[#1E1E1E] border-gray-600 w-3.5 h-3.5 cursor-pointer"
                    />
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Recurring / Habit</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-3 py-1 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-md font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>{isRecurring ? 'Add Routine' : 'Add Action'}</span>
                </button>
              </div>

              {/* Recurring Target Minimum Requirement Configuration */}
              {isRecurring && (
                <div className="p-2.5 bg-[#141414] border border-amber-800/40 rounded-xl space-y-2 text-xs text-gray-300 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>Minimum Target Frequency & Streak Requirement:</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Target: {formatRecurrenceLabel(recurrenceCount, recurrencePeriod)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Presets */}
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
                              : 'bg-[#1E1E1E] text-gray-400 hover:text-gray-200 border border-[#282828]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#242424] text-[11px]">
                    <span className="text-gray-400">Custom Target:</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 px-2 py-0.5 bg-[#1C1C1C] border border-[#2E2E2E] rounded text-center text-gray-200 focus:outline-hidden focus:border-amber-400 font-bold"
                    />
                    <span className="text-gray-400">times per</span>
                    <select
                      value={recurrencePeriod}
                      onChange={(e) => setRecurrencePeriod(e.target.value as RecurrencePeriod)}
                      className="px-2 py-0.5 bg-[#1C1C1C] border border-[#2E2E2E] rounded text-gray-200 focus:outline-hidden focus:border-amber-400 text-[11px]"
                    >
                      <option value="week">Week</option>
                      <option value="day">Day</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                </div>
              )}
            </form>

            {/* Recurring Routines & Minimum Requirements Section */}
            {recurringActions.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Recurring Routines & Streak Requirements ({recurringActions.length})</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {recurringActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3.5 bg-[#181818] hover:bg-[#1C1C1C] border border-amber-900/30 hover:border-amber-700/40 rounded-xl space-y-2.5 transition-all shadow-xs group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-100">{action.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <span className="font-mono bg-[#141414] border border-[#262626] text-[#C5A47E] px-1.5 py-0.2 rounded">
                              {action.context}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{action.energy} energy</span>
                            <span>•</span>
                            <span>{action.timeEstimate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingAction(action)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#C5A47E] rounded transition-opacity cursor-pointer"
                            title="Edit routine"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAction(action.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 rounded transition-opacity cursor-pointer"
                            title="Delete routine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Streak and Completion Tracker Widget */}
                      <RecurringStreakBadge
                        action={action}
                        onToggleToday={() => logRecurringCompletion(action.id)}
                        showWeekDots={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Next Actions List */}
            <div className="space-y-2 pt-1">
              {recurringActions.length > 0 && activeActions.length > 0 && (
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Atomic Next Actions ({activeActions.length}):
                </span>
              )}

              {activeActions.length === 0 && recurringActions.length === 0 && waitingActions.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-3 text-center">
                  No active next actions or recurring routines queued.
                </p>
              ) : (
                <>
                  {activeActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 bg-[#191919] hover:bg-[#202020] border border-[#262626] rounded-xl flex items-start justify-between gap-3 text-xs shadow-xs group transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <button
                          onClick={() => toggleActionComplete(action.id)}
                          className="mt-0.5 w-4 h-4 rounded border border-gray-600 hover:border-[#C5A47E] flex items-center justify-center text-transparent hover:text-[#C5A47E] transition-colors shrink-0 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p 
                            onClick={() => setEditingAction(action)}
                            className="font-semibold text-gray-200 leading-snug cursor-pointer hover:text-[#C5A47E] transition-colors"
                          >
                            {action.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                            <span className="font-mono bg-[#141414] border border-[#262626] text-[#C5A47E] px-1.5 py-0.2 rounded">
                              {action.context}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{action.energy} energy</span>
                            <span>•</span>
                            <span>{action.timeEstimate}</span>
                          </div>
                        </div>
                      </div>

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
                  ))}

                  {/* Waiting For Items for this project */}
                  {waitingActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 bg-[#191919] border border-amber-800/40 rounded-xl flex items-start justify-between gap-3 text-xs group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50 uppercase">
                          Waiting For: {action.delegatedTo}
                        </span>
                        <p 
                          onClick={() => setEditingAction(action)}
                          className="font-semibold text-gray-200 cursor-pointer hover:text-amber-200 transition-colors"
                        >
                          {action.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAction(action)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-300 rounded transition-opacity cursor-pointer"
                          title="Edit delegation"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActionComplete(action.id)}
                          className="px-2 py-0.5 bg-[#141414] border border-[#262626] text-[10px] font-semibold text-gray-300 hover:bg-emerald-950 hover:text-emerald-300 rounded transition-colors cursor-pointer"
                        >
                          Received
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Completed Actions collapsed */}
              {completedActions.length > 0 && (
                <div className="pt-3 border-t border-[#262626] space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Completed Actions ({completedActions.length}):
                  </span>
                  {completedActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-2 bg-[#191919]/50 border border-[#262626]/50 rounded-lg flex items-center justify-between text-xs text-gray-500 group"
                    >
                      <div className="flex items-center gap-2 line-through flex-1 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span 
                          onClick={() => setEditingAction(action)}
                          className="truncate cursor-pointer hover:text-gray-300"
                        >
                          {action.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAction(action)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-white cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActionComplete(action.id)}
                          className="text-[10px] text-gray-500 hover:text-gray-300 underline cursor-pointer"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#262626] bg-[#141414] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Project</span>
          </button>

          <div className="flex items-center gap-2">
            {project.status !== 'completed' ? (
              <button
                onClick={() => {
                  updateProject(project.id, { status: 'completed' });
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Mark Project Completed 🎉
              </button>
            ) : (
              <button
                onClick={() => {
                  updateProject(project.id, { status: 'active' });
                }}
                className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#252525] border border-[#262626] text-white rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Reopen Project
              </button>
            )}
          </div>
        </div>

      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          deleteProject(project.id);
          setShowDeleteConfirm(false);
          onClose();
        }}
        title="Delete Project"
        message={`Are you sure you want to delete project "${project.title}"? Any linked next actions will be preserved as standalone actions.`}
        confirmLabel="Delete Project"
      />

      <ActionEditModal
        action={editingAction}
        isOpen={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
      />
    </div>
  );
};
