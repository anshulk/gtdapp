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
  ChevronRight,
  Layers,
  Sparkle,
  RotateCcw,
  Flame,
  X,
  FolderKanban,
  CheckSquare,
  Tag
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { ActionType, GTDAction, RecurrencePeriod, GTDProject } from '../types/gtd';
import { RecurringStreakBadge } from './RecurringStreakBadge';
import { ActionEditModal } from './ActionEditModal';
import { formatRecurrenceLabel, getActionStreakInfo } from '../utils/streakUtils';
import { TagInput } from './TagInput';

interface NextActionsViewProps {
  initialSubTab?: 'actions' | 'inbox' | 'waiting' | 'someday';
}

export const NextActionsView: React.FC<NextActionsViewProps> = ({ initialSubTab = 'actions' }) => {
  const {
    actions = [],
    projects = [],
    horizonItems = [],
    allTags = [],
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
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [filterRecurringOnly, setFilterRecurringOnly] = useState<boolean>(false);
  const [search, setSearch] = useState('');

  // Filter panel state with tabs to save space
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'tags' | 'project-status'>('tags');

  // Group by project state
  const [groupByProject, setGroupByProject] = useState<boolean>(true);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(new Set());

  // Quick action bar inputs
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
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
      tags: newTags.length > 0 ? newTags : undefined,
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
    setNewTags([]);
    setIsRecurring(false);
  };

  // Filtered Actions
  const filteredActions = useMemo(() => {
    return actions.filter((act) => {
      if (act.type !== 'action') return false;
      if (filterRecurringOnly && !act.isRecurring) return false;
      if (!showCompleted && act.completed && !act.isRecurring) return false;
      if (showCompleted && !act.completed && !act.isRecurring) return false;
      if (selectedTag !== 'all') {
        if (selectedTag === 'untagged') {
          if (act.tags && act.tags.length > 0) return false;
        } else {
          if (!act.tags || !act.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
            return false;
          }
        }
      }
      if (selectedProjectFilter !== 'all' && act.projectId !== selectedProjectFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesNotes = act.notes?.toLowerCase().includes(q);
        const matchesTags = act.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNotes && !matchesTags) return false;
      }
      return true;
    });
  }, [actions, showCompleted, filterRecurringOnly, selectedTag, selectedProjectFilter, search]);

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTag !== 'all') count++;
    if (selectedProjectFilter !== 'all') count++;
    if (filterRecurringOnly) count++;
    if (showCompleted) count++;
    return count;
  }, [selectedTag, selectedProjectFilter, filterRecurringOnly, showCompleted]);

  const clearAllFilters = () => {
    setSelectedTag('all');
    setSelectedProjectFilter('all');
    setFilterRecurringOnly(false);
    setShowCompleted(false);
    setSearch('');
  };

  // Available tags with counts for action filter
  const actionTagsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    actions
      .filter((a) => a.type === 'action' && (!a.completed || showCompleted))
      .forEach((a) => {
        a.tags?.forEach((tag) => {
          counts.set(tag, (counts.get(tag) || 0) + 1);
        });
      });
    return counts;
  }, [actions, showCompleted]);

  // Group actions by Project
  interface ActionProjectGroup {
    id: string; // project.id or 'standalone'
    isStandalone: boolean;
    project?: GTDProject;
    title: string;
    actions: GTDAction[];
    areaTitle?: string;
    goalTitle?: string;
  }

  const actionProjectGroups = useMemo<ActionProjectGroup[]>(() => {
    const groupsMap = new Map<string, ActionProjectGroup>();

    filteredActions.forEach((act) => {
      const projId = act.projectId;
      const project = projId ? projects.find((p) => p.id === projId) : undefined;
      const groupId = project ? project.id : 'standalone';

      if (!groupsMap.has(groupId)) {
        if (project) {
          const linkedGoal = project.goalId ? horizonItems.find((h) => h.id === project.goalId) : undefined;
          const linkedArea = project.areaId ? horizonItems.find((h) => h.id === project.areaId) : undefined;
          groupsMap.set(groupId, {
            id: groupId,
            isStandalone: false,
            project,
            title: project.title,
            actions: [],
            areaTitle: linkedArea?.title,
            goalTitle: linkedGoal?.title,
          });
        } else {
          groupsMap.set('standalone', {
            id: 'standalone',
            isStandalone: true,
            title: 'Standalone Actions (No Project)',
            actions: [],
          });
        }
      }

      groupsMap.get(groupId)!.actions.push(act);
    });

    const list = Array.from(groupsMap.values());
    return list.sort((a, b) => {
      if (a.isStandalone) return 1;
      if (b.isStandalone) return -1;
      return a.title.localeCompare(b.title);
    });
  }, [filteredActions, projects, horizonItems]);

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const expandAllProjects = () => {
    setCollapsedProjectIds(new Set());
  };

  const collapseAllProjects = () => {
    const allIds = new Set(actionProjectGroups.map((g) => g.id));
    setCollapsedProjectIds(allIds);
  };

  const renderActionCard = (action: GTDAction, inProjectGroup = false) => {
    const linkedProject = projects.find((p) => p.id === action.projectId);
    const hasNotes = Boolean(action.notes);
    const isNotesOpen = expandedNotes[action.id];
    const streakInfo = action.isRecurring ? getActionStreakInfo(action) : null;
    const isCompletedToday = Boolean(streakInfo?.completedToday);
    const isActionDone = action.isRecurring ? isCompletedToday : Boolean(action.completed);

    return (
      <div
        key={action.id}
        className={`bg-[#141414] rounded-xl border transition-all p-3.5 sm:p-4 flex flex-col justify-between gap-3 group shadow-md hover:shadow-lg ${
          action.completed && !action.isRecurring
            ? 'border-[#202020] bg-[#111111]/80 opacity-70'
            : action.isRecurring
            ? 'border-amber-900/30 hover:border-amber-700/40 bg-[#161616]'
            : 'border-[#242424] hover:border-[#383838]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => toggleActionComplete(action.id)}
              className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                isActionDone
                  ? 'bg-[#C5A47E] border-[#C5A47E] text-black'
                  : 'border-neutral-600 hover:border-[#C5A47E] text-transparent hover:text-[#C5A47E]'
              }`}
              title={
                action.isRecurring
                  ? isCompletedToday
                    ? 'Completed today (click to undo)'
                    : 'Mark complete today'
                  : action.completed
                  ? 'Mark incomplete'
                  : 'Mark complete'
              }
            >
              <Check className="w-3.5 h-3.5" />
            </button>

            <div className="space-y-1.5 flex-1 min-w-0">
              <p
                onClick={() => setEditingAction(action)}
                className={`text-sm font-semibold leading-snug cursor-pointer transition-colors hover:text-[#C5A47E] break-words ${
                  action.completed && !action.isRecurring
                    ? 'line-through text-gray-500'
                    : 'text-gray-200'
                }`}
              >
                {action.title}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {action.tags && action.tags.length > 0 && action.tags.map((tag) => {
                  const isContextTag = tag.startsWith('@');
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(isSelected ? 'all' : tag);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#C5A47E] text-black font-bold border-[#C5A47E]'
                          : isContextTag
                          ? 'bg-[#C5A47E]/10 text-[#E0C7A8] border-[#C5A47E]/30 hover:border-[#C5A47E]'
                          : 'bg-[#1E1E1E] text-gray-300 border-[#2D2D2D] hover:border-gray-500'
                      }`}
                      title={`Filter by tag: ${tag}`}
                    >
                      <Tag className="w-2.5 h-2.5 opacity-60" />
                      <span>{tag}</span>
                    </button>
                  );
                })}

                {!inProjectGroup && linkedProject && (
                  <button
                    type="button"
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
                    type="button"
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
              className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-gray-400 hover:text-[#C5A47E] hover:bg-[#1f1f1f] rounded-lg transition-all cursor-pointer"
              title="Edit action"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deleteAction(action.id)}
              className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-gray-500 hover:text-rose-400 hover:bg-[#1f1f1f] rounded-lg transition-all cursor-pointer"
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
  };

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
      <div className="bg-[#141414] rounded-xl border border-[#262626] p-3.5 sm:p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-serif flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C5A47E]" />
              <span>Actions & Runway</span>
            </h1>
            <span className="text-[11px] font-mono text-[#C5A47E] px-2 py-0.5 rounded-md bg-[#C5A47E]/10 border border-[#C5A47E]/20">
              Runway • Ground Level
            </span>
          </div>

          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="px-3 py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
            title="Quick Capture (Inbox)"
            aria-label="Quick Capture"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Quick Capture</span>
          </button>
        </div>

        {/* Sub Navigation Ribbon */}
        <div className="mt-3 pt-3 border-t border-[#202020] flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => {
              setSubTab('actions');
              setActiveTab('actions');
            }}
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
            onClick={() => {
              setSubTab('inbox');
              setActiveTab('inbox');
            }}
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
            onClick={() => {
              setSubTab('waiting');
              setActiveTab('waiting');
            }}
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
            onClick={() => {
              setSubTab('someday');
              setActiveTab('someday');
            }}
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

            <div className="pt-1">
              <TagInput
                tags={newTags}
                onChange={setNewTags}
                suggestedTags={allTags}
                label=""
                placeholder="Add tags (optional, e.g. @computer, urgent, deep-work)..."
                helpText=""
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
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

          {/* Actions Toolbar: Search, Filter Toggle, Grouping, and Counts */}
          <div className="space-y-2.5">
            <div className="bg-[#141414] p-2.5 sm:p-3 rounded-xl border border-[#262626] flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
              
              {/* Left: Search, Filter Button, and Group Toggle */}
              <div className="flex items-center gap-2 flex-1 min-w-[240px] flex-wrap sm:flex-nowrap">
                {/* Search box */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search actions..."
                    className="w-full pl-8 pr-7 py-1.5 bg-[#181818] border border-[#282828] rounded-lg text-gray-300 text-xs focus:outline-hidden focus:border-[#C5A47E] placeholder-gray-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter Button */}
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isFilterPanelOpen || activeFilterCount > 0
                      ? 'bg-[#C5A47E]/15 border border-[#C5A47E]/50 text-[#C5A47E]'
                      : 'bg-[#191919] border border-[#282828] text-gray-300 hover:bg-[#222] hover:text-white'
                  }`}
                  title="Toggle Filter Options"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#C5A47E] text-black text-[10px] font-extrabold rounded-full font-mono">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Group by Project Toggle */}
                <div className="flex items-center rounded-lg bg-[#181818] border border-[#282828] p-0.5 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setGroupByProject(true)}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      groupByProject
                        ? 'bg-[#C5A47E] text-black shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title="Group actions by project"
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">By Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupByProject(false)}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !groupByProject
                        ? 'bg-[#C5A47E] text-black shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title="Flat list of actions"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flat List</span>
                  </button>
                </div>
              </div>

              {/* Right: Expand/Collapse & Actions Counter */}
              <div className="flex items-center gap-2 shrink-0">
                {groupByProject && actionProjectGroups.length > 1 && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <button
                      type="button"
                      onClick={expandAllProjects}
                      className="hover:text-white px-2 py-1 rounded bg-[#181818] border border-[#282828] hover:border-[#383838] transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllProjects}
                      className="hover:text-white px-2 py-1 rounded bg-[#181818] border border-[#282828] hover:border-[#383838] transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                )}

                <span className="text-[11px] font-mono text-gray-400 px-2.5 py-1 rounded-md bg-[#181818] border border-[#282828]">
                  {filteredActions.length} {filteredActions.length === 1 ? 'action' : 'actions'}
                </span>
              </div>
            </div>

            {/* Active Filter Chips Strip */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-1 py-0.5 text-xs">
                <span className="text-[11px] font-semibold text-gray-500">Active filters:</span>
                {selectedTag !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#C5A47E]/15 border border-[#C5A47E]/30 text-[#C5A47E] text-[11px]">
                    <Tag className="w-3 h-3" />
                    <span>{selectedTag === 'untagged' ? 'Untagged' : selectedTag}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTag('all')}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedProjectFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#C5A47E]/15 border border-[#C5A47E]/30 text-[#C5A47E] text-[11px]">
                    📁 {projects.find((p) => p.id === selectedProjectFilter)?.title || 'Project'}
                    <button
                      type="button"
                      onClick={() => setSelectedProjectFilter('all')}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterRecurringOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[11px]">
                    🔥 Routines only
                    <button
                      type="button"
                      onClick={() => setFilterRecurringOnly(false)}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {showCompleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[11px]">
                    ✓ Completed
                    <button
                      type="button"
                      onClick={() => setShowCompleted(false)}
                      className="hover:text-white cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] text-gray-400 hover:text-[#C5A47E] underline cursor-pointer ml-1"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* Filter Panel with Tabs to Save Space */}
            {isFilterPanelOpen && (
              <div className="bg-[#141414] p-3.5 sm:p-4 rounded-xl border border-[#C5A47E]/40 shadow-xl space-y-3">
                {/* Tabs header inside filter panel */}
                <div className="flex items-center justify-between border-b border-[#242424] pb-2 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('tags')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeFilterTab === 'tags'
                          ? 'bg-[#C5A47E] text-black shadow-xs'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f1f1f]'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Tags</span>
                      {selectedTag !== 'all' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveFilterTab('project-status')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeFilterTab === 'project-status'
                          ? 'bg-[#C5A47E] text-black shadow-xs'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f1f1f]'
                      }`}
                    >
                      <span>Project & Status</span>
                      {(selectedProjectFilter !== 'all' || filterRecurringOnly || showCompleted) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-[11px] text-gray-400 hover:text-rose-400 font-semibold cursor-pointer underline mr-1"
                      >
                        Reset All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsFilterPanelOpen(false)}
                      className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#252525] cursor-pointer"
                      title="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tab 1: Tags Filter */}
                {activeFilterTab === 'tags' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Filter by Tag:
                      </span>
                      {selectedTag !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedTag('all')}
                          className="text-[11px] text-[#C5A47E] hover:underline cursor-pointer"
                        >
                          Clear tag filter
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 max-h-48 overflow-y-auto no-scrollbar pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTag('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedTag === 'all'
                            ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                            : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                        }`}
                      >
                        All Actions
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTag('untagged')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedTag === 'untagged'
                            ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                            : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                        }`}
                      >
                        Untagged
                      </button>

                      {allTags.map((tag) => {
                        const count = actionTagsWithCounts.get(tag) || 0;
                        const isSelected = selectedTag === tag;
                        const isContextTag = tag.startsWith('@');
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSelectedTag(isSelected ? 'all' : tag)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                                : isContextTag
                                ? 'bg-[#1E1E1E] text-[#E0C7A8] hover:bg-[#26221E] border border-[#3D3328]'
                                : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                            }`}
                          >
                            <span>{tag}</span>
                            {count > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                  isSelected
                                    ? 'bg-black/30 text-black'
                                    : 'bg-[#292929] text-gray-400'
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 3: Project & Status Filter */}
                {activeFilterTab === 'project-status' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                        Filter Specific Project:
                      </div>
                      <select
                        value={selectedProjectFilter}
                        onChange={(e) => setSelectedProjectFilter(e.target.value)}
                        className="w-full sm:w-80 px-3 py-1.5 bg-[#191919] border border-[#282828] rounded-lg text-gray-300 text-xs focus:border-[#C5A47E] focus:outline-hidden"
                      >
                        <option value="all">All Projects</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            📁 {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                        Status & Types:
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFilterRecurringOnly(!filterRecurringOnly)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            filterRecurringOnly
                              ? 'bg-amber-400 text-black font-bold shadow-xs'
                              : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Routines & Streaks Only</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowCompleted(!showCompleted)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            showCompleted
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                              : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                          }`}
                        >
                          {showCompleted ? '✓ Showing Completed Actions' : 'Show Completed Actions'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action List Items: Grouped by Project or Flat List */}
          <div>
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
            ) : groupByProject ? (
              /* Grouped by Project Presentation */
              <div className="space-y-4">
                {actionProjectGroups.map((group) => {
                  const isCollapsed = collapsedProjectIds.has(group.id);
                  const activeCount = group.actions.filter((a) => !a.completed).length;
                  const completedCount = group.actions.filter((a) => a.completed).length;

                  return (
                    <div
                      key={group.id}
                      className="bg-[#121212] rounded-xl border border-[#242424] overflow-hidden transition-all shadow-sm"
                    >
                      {/* Group Header */}
                      <div
                        onClick={() => toggleProjectCollapse(group.id)}
                        className="px-4 py-3 bg-[#171717] hover:bg-[#1c1c1c] border-b border-[#222222] flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            className="text-gray-400 hover:text-white p-0.5 rounded transition-transform"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#C5A47E]" />
                            )}
                          </button>

                          <div className="p-1 rounded-md bg-[#222] border border-[#2a2a2a] text-[#C5A47E] shrink-0">
                            {group.isStandalone ? (
                              <CheckSquare className="w-3.5 h-3.5" />
                            ) : (
                              <Briefcase className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                                {group.title}
                              </span>

                              {/* Badges for Area or Goal */}
                              {group.goalTitle && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#C5A47E]/10 border border-[#C5A47E]/20 text-[#C5A47E] truncate max-w-[150px]">
                                  H3: {group.goalTitle}
                                </span>
                              )}
                              {group.areaTitle && !group.goalTitle && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/30 text-emerald-300 truncate max-w-[150px]">
                                  H2: {group.areaTitle}
                                </span>
                              )}

                              {group.project?.status && group.project.status !== 'active' && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#202020] text-gray-400 border border-[#2a2a2a]">
                                  {group.project.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action count and quick actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#202020] border border-[#2a2a2a] text-gray-300">
                            {group.actions.length} {group.actions.length === 1 ? 'action' : 'actions'}
                            {completedCount > 0 && ` (${completedCount} done)`}
                          </span>

                          {!group.isStandalone && group.project && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectId(group.project!.id);
                                setActiveTab('projects');
                              }}
                              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#C5A47E] hover:text-[#e4be92] px-2 py-0.5 rounded hover:bg-[#222] transition-colors cursor-pointer"
                              title="View project details"
                            >
                              <span>Project Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {!group.isStandalone && group.project && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewProjectId(group.project!.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1 text-gray-400 hover:text-[#C5A47E] hover:bg-[#242424] rounded transition-colors cursor-pointer"
                              title={`Add action to ${group.title}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Group Content */}
                      {!isCollapsed && (
                        <div className="p-3 sm:p-4 space-y-2.5 bg-[#0e0e0e]/50">
                          {group.actions.map((action) => renderActionCard(action, true))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat List Presentation */
              <div className="space-y-2.5">
                {filteredActions.map((action) => renderActionCard(action, false))}
              </div>
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
