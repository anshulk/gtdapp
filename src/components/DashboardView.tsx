import React, { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { 
  Compass, 
  Target, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Inbox, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  CalendarCheck, 
  Plus, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Filter, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  FolderKanban,
  CheckSquare,
  Layers,
  Edit3,
  Tag,
  Search,
  X
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS } from '../data/gtdData';
import { GTDAction, GTDProject } from '../types/gtd';
import { ActionEditModal } from './ActionEditModal';
import { CockpitSpiderChart } from './CockpitSpiderChart';

export const DashboardView: React.FC = () => {
  const {
    horizonItems = [],
    projects = [],
    actions = [],
    reviews = [],
    stalledProjects = [],
    nextActionsCount = 0,
    inboxCount = 0,
    waitingForCount = 0,
    somedayCount = 0,
    daysSinceLastReview = 999,
    isReviewDue = false,
    setActiveTab,
    setQuickCaptureOpen,
    setWeeklyReviewOpen,
    setClarifyModalItem,
    setSelectedProjectId,
    toggleActionComplete,
    addAction,
    allTags = [],
  } = useGTD();

  // Instant Action Finder Filters & Tag Visibility
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showTags, setShowTags] = useState<boolean>(false); // Don't show tags by default
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState<boolean>(false);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState<number>(0);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const [newActionInput, setNewActionInput] = useState<{ [projectId: string]: string }>({});
  const [flatSelectedProjectId, setFlatSelectedProjectId] = useState<string>('');
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

  // Close tag suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered Next Actions for the "What to do right now" engine
  const actionableItems = useMemo(() => {
    return actions.filter((act) => {
      if (act.type !== 'action' || act.completed) return false;
      if (selectedTag !== 'all') {
        if (selectedTag === 'untagged') {
          if (act.tags && act.tags.length > 0) return false;
        } else {
          if (!act.tags || !act.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
            return false;
          }
        }
      }
      return true;
    });
  }, [actions, selectedTag]);

  // Autocomplete Suggestions for the Single Tag Search Box
  interface TagSuggestion {
    key: string;
    type: 'all' | 'untagged' | 'tag';
    name: string;
    count: number;
  }

  const tagSuggestions = useMemo<TagSuggestion[]>(() => {
    const q = tagSearchQuery.trim().toLowerCase();
    const totalActive = actions.filter((a) => a.type === 'action' && !a.completed).length;
    const untaggedCount = actions.filter(
      (a) => a.type === 'action' && !a.completed && (!a.tags || a.tags.length === 0)
    ).length;

    // Calculate count per tag from active next actions
    const tagCountMap = new Map<string, number>();
    actions.forEach((a) => {
      if (a.type === 'action' && !a.completed && a.tags) {
        a.tags.forEach((t) => {
          const lower = t.toLowerCase();
          tagCountMap.set(lower, (tagCountMap.get(lower) || 0) + 1);
        });
      }
    });

    const suggestions: TagSuggestion[] = [];

    // Offer "All Actions"
    if (!q || 'all actions'.includes(q) || 'all'.includes(q)) {
      suggestions.push({
        key: 'suggestion-all',
        type: 'all',
        name: 'All Actions',
        count: totalActive,
      });
    }

    // Offer "Untagged"
    if (!q || 'untagged'.includes(q) || 'none'.includes(q) || 'no tags'.includes(q)) {
      suggestions.push({
        key: 'suggestion-untagged',
        type: 'untagged',
        name: 'Untagged',
        count: untaggedCount,
      });
    }

    // Unique tag list
    const uniqueTags: string[] = Array.from(new Set<string>(allTags.map((t) => t.trim()))).filter((t): t is string => Boolean(t));

    // Matching tags based on query
    const matchingTags = uniqueTags.filter((t) => {
      if (!q) return true;
      return t.toLowerCase().includes(q);
    });

    // Sort matching tags: actions count descending, then relevance
    matchingTags.sort((a, b) => {
      const countA = tagCountMap.get(a.toLowerCase()) || 0;
      const countB = tagCountMap.get(b.toLowerCase()) || 0;
      if (countA !== countB) return countB - countA;
      if (q) {
        const startsA = a.toLowerCase().startsWith(q);
        const startsB = b.toLowerCase().startsWith(q);
        if (startsA && !startsB) return -1;
        if (!startsA && startsB) return 1;
      }
      return a.localeCompare(b);
    });

    matchingTags.forEach((t) => {
      const count = tagCountMap.get(t.toLowerCase()) || 0;
      suggestions.push({
        key: `tag-${t}`,
        type: 'tag',
        name: t,
        count,
      });
    });

    return suggestions;
  }, [tagSearchQuery, actions, allTags]);

  const handleSelectTagSuggestion = (sug: TagSuggestion) => {
    if (sug.type === 'all') {
      setSelectedTag('all');
      setTagSearchQuery('');
    } else if (sug.type === 'untagged') {
      setSelectedTag('untagged');
      setTagSearchQuery('');
    } else {
      setSelectedTag(sug.name);
      setTagSearchQuery(sug.name);
    }
    setIsTagDropdownOpen(false);
  };

  const handleClearTagFilter = () => {
    setSelectedTag('all');
    setTagSearchQuery('');
    setIsTagDropdownOpen(false);
  };

  const handleTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isTagDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsTagDropdownOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedTagIndex((prev) => (prev + 1) % tagSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedTagIndex((prev) => (prev - 1 + tagSuggestions.length) % tagSuggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (tagSuggestions.length > 0 && tagSuggestions[highlightedTagIndex]) {
        handleSelectTagSuggestion(tagSuggestions[highlightedTagIndex]);
      } else if (tagSearchQuery.trim()) {
        setSelectedTag(tagSearchQuery.trim());
        setIsTagDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsTagDropdownOpen(false);
    }
  };

  // Group by Project state for the Cockpit
  const [groupByProject, setGroupByProject] = useState<boolean>(true);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(new Set());

  interface CockpitProjectGroup {
    id: string; // project.id or 'standalone'
    isStandalone: boolean;
    project?: GTDProject;
    title: string;
    actions: GTDAction[];
    areaTitle?: string;
    goalTitle?: string;
  }

  // Group actionable items by Project, including active projects when viewing all
  const cockpitProjectGroups = useMemo<CockpitProjectGroup[]>(() => {
    const groupsMap = new Map<string, CockpitProjectGroup>();

    // When showing all actions, ensure all active projects appear in the Cockpit so actions can be added to them
    if (selectedTag === 'all') {
      projects
        .filter((p) => p.status === 'active')
        .forEach((project) => {
          const linkedGoal = project.goalId ? horizonItems.find((h) => h.id === project.goalId) : undefined;
          const linkedArea = project.areaId ? horizonItems.find((h) => h.id === project.areaId) : undefined;
          groupsMap.set(project.id, {
            id: project.id,
            isStandalone: false,
            project,
            title: project.title,
            actions: [],
            areaTitle: linkedArea?.title,
            goalTitle: linkedGoal?.title,
          });
        });
    }

    actionableItems.forEach((act) => {
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
    const filteredList = selectedTag === 'all'
      ? list.filter((g) => !g.isStandalone || g.actions.length > 0)
      : list.filter((g) => g.actions.length > 0);

    return filteredList.sort((a, b) => {
      if (a.isStandalone) return 1;
      if (b.isStandalone) return -1;
      // Stalled active projects (0 actions) at top to encourage adding next action
      if (a.actions.length === 0 && b.actions.length > 0) return -1;
      if (b.actions.length === 0 && a.actions.length > 0) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [actionableItems, projects, horizonItems, selectedTag]);

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
    const allIds = new Set(cockpitProjectGroups.map((g) => g.id));
    setCollapsedProjectIds(allIds);
  };

  // Horizons breakdown counts
  const horizonCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    horizonItems.forEach((h) => {
      if (counts[h.level] !== undefined) counts[h.level]++;
    });
    counts[1] = projects.filter((p) => p.status === 'active').length;
    counts[0] = nextActionsCount;
    return counts;
  }, [horizonItems, projects, nextActionsCount]);

  // Waiting For items needing attention
  const urgentWaitingFor = useMemo(() => {
    return actions
      .filter((act) => act.type === 'waiting-for' && !act.completed)
      .slice(0, 3);
  }, [actions]);

  // Unprocessed Inbox items preview
  const inboxItems = useMemo(() => {
    return actions.filter((act) => act.type === 'inbox' && !act.completed).slice(0, 4);
  }, [actions]);

  const handleAddProjectNextAction = (projectId: string, isStandalone = false) => {
    const rawText = newActionInput[projectId]?.trim();
    if (!rawText) return;

    // Parse inline tags like @computer or #urgent from title
    const tagMatches = rawText.match(/[@#][\w-]+/g);
    const inlineTags = tagMatches ? tagMatches.map((t) => (t.startsWith('#') ? t.slice(1) : t)) : [];
    const filterTag = selectedTag !== 'all' && selectedTag !== 'untagged' ? [selectedTag] : [];
    const combinedTags = Array.from(new Set([...filterTag, ...inlineTags]));

    // Clean title by removing inline #tags (keeping @context intact or removing trailing #tags)
    const cleanedTitle = rawText.replace(/#[\w-]+/g, '').trim() || rawText;

    addAction({
      title: cleanedTitle,
      projectId: isStandalone ? undefined : projectId,
      tags: combinedTags.length > 0 ? combinedTags : undefined,
      type: 'action',
      priority: 'medium',
    });

    setNewActionInput((prev) => ({ ...prev, [projectId]: '' }));

    // Auto-expand this project so user immediately sees their new action
    if (!isStandalone) {
      setCollapsedProjectIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  const handleAddFlatAction = () => {
    const rawText = newActionInput['flat-quick-add']?.trim();
    if (!rawText) return;

    const targetProjId = flatSelectedProjectId || undefined;
    const tagMatches = rawText.match(/[@#][\w-]+/g);
    const inlineTags = tagMatches ? tagMatches.map((t) => (t.startsWith('#') ? t.slice(1) : t)) : [];
    const filterTag = selectedTag !== 'all' && selectedTag !== 'untagged' ? [selectedTag] : [];
    const combinedTags = Array.from(new Set([...filterTag, ...inlineTags]));
    const cleanedTitle = rawText.replace(/#[\w-]+/g, '').trim() || rawText;

    addAction({
      title: cleanedTitle,
      projectId: targetProjId,
      tags: combinedTags.length > 0 ? combinedTags : undefined,
      type: 'action',
      priority: 'medium',
    });

    setNewActionInput((prev) => ({ ...prev, 'flat-quick-add': '' }));
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Cockpit Header & Altitude Barometer */}
      <div className="bg-[#121212] border border-[#242424] text-gray-200 rounded-xl p-3.5 sm:p-4 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight font-serif text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#C5A47E]" />
              <span>Flight Control Cockpit</span>
            </h1>
            <span className="text-[11px] font-mono text-[#C5A47E] px-2 py-0.5 rounded-md bg-[#C5A47E]/10 border border-[#C5A47E]/20">
              50,000 ft ➔ Runway
            </span>
          </div>

          {/* Quick Review Status Box */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 text-xs text-gray-300 bg-[#181818] border border-[#282828] px-2.5 py-1 rounded-lg">
              <CalendarCheck className="w-3.5 h-3.5 text-[#C5A47E]" />
              <span className="hidden xs:inline text-[11px] text-gray-400">
                {daysSinceLastReview === 999 ? 'No reviews' : `${daysSinceLastReview}d ago`}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                isReviewDue ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
              }`}>
                {isReviewDue ? 'Review Due' : 'On Track'}
              </span>
            </div>

            <button
              onClick={() => setWeeklyReviewOpen(true)}
              className="py-1 px-2.5 text-xs font-bold bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isReviewDue ? 'Review' : 'Check'}</span>
            </button>
          </div>
        </div>

        {/* Minimized 6 Horizons Altitude Barometer */}
        <div className="mt-2.5 pt-2.5 border-t border-[#202020] grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {[5, 4, 3, 2, 1, 0].map((lvl) => {
            const def = HORIZON_DEFINITIONS[lvl];
            const count = horizonCounts[lvl] || 0;
            return (
              <button
                key={lvl}
                onClick={() => {
                  if (lvl === 1) setActiveTab('projects');
                  else if (lvl === 0) setActiveTab('actions');
                  else setActiveTab('horizons');
                }}
                className="bg-[#161616] hover:bg-[#1E1E1E] border border-[#242424] hover:border-[#C5A47E]/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-left transition-all group cursor-pointer"
                title={`${def.altitude}: ${def.name}`}
              >
                <div className="flex items-center gap-1 min-w-0 pr-1">
                  <span className="font-bold text-[#C5A47E] text-[10px]">H{lvl}</span>
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-200 transition-colors truncate">
                    {def.shortName}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-white shrink-0 group-hover:text-[#C5A47E] transition-colors">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Critical Attention: Stalled Projects Alert */}
      {stalledProjects.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-3.5 sm:p-5 shadow-md">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="p-2 bg-amber-900/50 rounded-xl text-amber-400 shrink-0 border border-amber-700/40 hidden sm:block">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-bold text-amber-300 font-serif flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 sm:hidden shrink-0" />
                  <span>{stalledProjects.length} Active Project{stalledProjects.length === 1 ? '' : 's'} Stalled</span>
                </h3>
                <span className="text-[11px] sm:text-xs text-amber-400/90 font-medium">
                  GTD Rule: Every active project requires a Next Action.
                </span>
              </div>
              
              <div className="mt-3 space-y-3">
                {stalledProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="bg-[#191919] p-3 sm:p-3.5 rounded-xl border border-amber-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-100 truncate">{proj.title}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50 shrink-0">
                          Needs Next Action
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        Outcome: {proj.desiredOutcome}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <input
                        type="text"
                        value={newActionInput[proj.id] || ''}
                        onChange={(e) =>
                          setNewActionInput((prev) => ({ ...prev, [proj.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddProjectNextAction(proj.id);
                        }}
                        placeholder="Type immediate physical next action..."
                        className="text-xs px-3 py-1.5 bg-[#141414] border border-[#262626] text-gray-200 placeholder-gray-500 rounded-lg flex-1 min-w-0 lg:w-64 focus:bg-[#181818] focus:outline-hidden focus:ring-1 focus:ring-[#C5A47E] focus:border-[#C5A47E]"
                      />
                      <button
                        onClick={() => handleAddProjectNextAction(proj.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        Add Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: "What Should I Do Right Now?" Action Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Contextual Next Action Engine */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121212] p-4 sm:p-5 rounded-2xl border border-[#242424] shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#C5A47E]" />
                <h2 className="text-base sm:text-lg font-bold text-white font-serif">
                  Action Finder
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Filter next actions by tags or group by project.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Group By Project Toggle */}
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
                  <span>By Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGroupByProject(false)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    !groupByProject
                      ? 'bg-[#C5A47E] text-black shadow-xs'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  title="Flat action list"
                >
                  <span>Flat List</span>
                </button>
              </div>

              <button
                onClick={() => setQuickCaptureOpen(true)}
                className="px-2.5 py-1 text-xs font-bold bg-[#1C1C1C] hover:bg-[#252525] text-[#C5A47E] border border-[#2B2B2B] hover:border-[#C5A47E]/40 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                title="Quick Capture New Action (Press C)"
                aria-label="New Action"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Action</span>
              </button>
            </div>
          </div>

          {/* Filter by Tag Card with Single Search Box & Autocomplete + Show Tags Toggle */}
          <div className="bg-[#121212] p-4 rounded-xl border border-[#242424] shadow-xs space-y-3">
            {/* Header: Title & Show Tags Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-[#1C1C1C] border border-[#2B2B2B] text-[#C5A47E]">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Filter by Tag
                  </span>
                  <span className="ml-2 text-[11px] text-gray-500 hidden sm:inline">
                    Search and autocomplete tags
                  </span>
                </div>
              </div>

              {/* Toggle to show/hide tags on action cards (default: hidden) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Tags on cards:
                </span>
                <button
                  type="button"
                  onClick={() => setShowTags((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    showTags
                      ? 'bg-[#C5A47E]/15 border-[#C5A47E]/50 text-[#C5A47E]'
                      : 'bg-[#181818] border-[#2A2A2A] text-gray-400 hover:text-gray-200'
                  }`}
                  title={showTags ? 'Click to hide tag pills on actions' : 'Click to show tag pills on actions'}
                >
                  {showTags ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-[#C5A47E]" />
                      <span>Shown</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Single Search Box with Autocomplete Dropdown */}
            <div className="relative" ref={tagDropdownRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => {
                      setTagSearchQuery(e.target.value);
                      setIsTagDropdownOpen(true);
                      setHighlightedTagIndex(0);
                    }}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Search tags (e.g. @computer, deep-work, urgent)..."
                    className="w-full text-xs pl-8.5 pr-8 py-2 bg-[#171717] border border-[#282828] hover:border-[#383838] focus:border-[#C5A47E] focus:outline-hidden rounded-lg text-gray-200 placeholder-gray-500 transition-colors"
                  />
                  {(tagSearchQuery || selectedTag !== 'all') && (
                    <button
                      type="button"
                      onClick={handleClearTagFilter}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                      title="Clear tag search and reset filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {selectedTag !== 'all' && (
                  <button
                    type="button"
                    onClick={handleClearTagFilter}
                    className="px-2.5 py-2 text-xs font-bold bg-[#1C1C1C] border border-[#2E2E2E] hover:border-[#444] text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown Suggestions */}
              {isTagDropdownOpen && tagSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#161616] border border-[#2D2D2D] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
                  <div className="p-1.5 space-y-0.5">
                    {tagSuggestions.map((sug, idx) => {
                      const isHighlighted = highlightedTagIndex === idx;
                      const isCurrentlySelected =
                        (sug.type === 'all' && selectedTag === 'all') ||
                        (sug.type === 'untagged' && selectedTag === 'untagged') ||
                        (sug.type === 'tag' && selectedTag.toLowerCase() === sug.name.toLowerCase());

                      return (
                        <button
                          key={sug.key}
                          type="button"
                          onClick={() => handleSelectTagSuggestion(sug)}
                          onMouseEnter={() => setHighlightedTagIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                            isHighlighted
                              ? 'bg-[#222222] text-white'
                              : 'text-gray-300 hover:bg-[#1E1E1E]'
                          } ${isCurrentlySelected ? 'border border-[#C5A47E]/40 font-semibold' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag className={`w-3 h-3 ${isCurrentlySelected ? 'text-[#C5A47E]' : 'text-gray-500'}`} />
                            <span className="truncate">
                              {sug.type === 'all'
                                ? 'All Actions'
                                : sug.type === 'untagged'
                                ? 'Untagged Actions'
                                : sug.name.startsWith('@')
                                ? sug.name
                                : `#${sug.name}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#111111] text-gray-400 border border-[#242424]">
                              {sug.count} {sug.count === 1 ? 'action' : 'actions'}
                            </span>
                            {isCurrentlySelected && (
                              <Check className="w-3.5 h-3.5 text-[#C5A47E]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Filter Status & Indicator */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                {selectedTag === 'all' ? (
                  <span>Showing all next actions ({actionableItems.length})</span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Active Filter:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#C5A47E]/15 border border-[#C5A47E]/40 text-[#E0C7A8] font-bold text-xs">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{selectedTag === 'untagged' ? 'Untagged' : selectedTag}</span>
                    </span>
                    <span className="text-gray-500 font-mono">({actionableItems.length} matching)</span>
                  </div>
                )}

                {selectedTag !== 'all' && (
                  <button
                    type="button"
                    onClick={handleClearTagFilter}
                    className="text-[#C5A47E] hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action List Display */}
          <div className="space-y-3">
            {actionableItems.length === 0 ? (
              <div className="bg-[#121212] rounded-2xl border border-dashed border-[#242424] p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-200 font-serif">
                  No Actions Matching Current Filter
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Adjust your tag filter or capture a new next action for your active projects.
                </p>
              </div>
            ) : groupByProject ? (
              /* Grouped By Project View */
              <div className="space-y-3">
                {/* Summary bar when multiple projects exist */}
                {cockpitProjectGroups.length > 1 && (
                  <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                    <span>
                      <strong className="text-gray-200">{actionableItems.length}</strong> {actionableItems.length === 1 ? 'action' : 'actions'} across <strong className="text-gray-200">{cockpitProjectGroups.length}</strong> {cockpitProjectGroups.length === 1 ? 'project' : 'projects'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={expandAllProjects}
                        className="hover:text-[#C5A47E] transition-colors cursor-pointer"
                      >
                        Expand All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={collapseAllProjects}
                        className="hover:text-[#C5A47E] transition-colors cursor-pointer"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>
                )}

                {cockpitProjectGroups.map((group) => {
                  const isCollapsed = collapsedProjectIds.has(group.id);

                  return (
                    <div
                      key={group.id}
                      className="bg-[#121212] rounded-xl border border-[#242424] overflow-hidden transition-all shadow-xs"
                    >
                      {/* Project Header */}
                      <div
                        onClick={() => toggleProjectCollapse(group.id)}
                        className="px-3.5 py-2.5 bg-[#171717] hover:bg-[#1c1c1c] border-b border-[#222222] flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors"
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
                            </div>
                          </div>
                        </div>

                        {/* Count & Details link & Add Action CTA */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#202020] border border-[#2a2a2a] text-gray-300">
                            {group.actions.length} {group.actions.length === 1 ? 'action' : 'actions'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedProjectIds((prev) => {
                                const next = new Set(prev);
                                next.delete(group.id);
                                return next;
                              });
                              setTimeout(() => {
                                const el = document.getElementById(`project-action-input-${group.id}`);
                                el?.focus();
                              }, 50);
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#C5A47E] hover:text-black bg-[#C5A47E]/10 hover:bg-[#C5A47E] border border-[#C5A47E]/30 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                            title={`Add action to ${group.title}`}
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>Action</span>
                          </button>

                          {!group.isStandalone && group.project && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectId(group.project!.id);
                                setActiveTab('projects');
                              }}
                              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-[#C5A47E] px-2 py-0.5 rounded hover:bg-[#222] transition-colors cursor-pointer"
                              title="View project details"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action Cards under Project */}
                      {!isCollapsed && (
                        <div className="p-2.5 sm:p-3 space-y-2.5 bg-[#121212]">
                          {group.actions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400 bg-[#161616] rounded-lg border border-dashed border-[#262626]">
                              No active next actions for this project. Add an immediate physical action below to keep it moving.
                            </div>
                          ) : (
                            group.actions.map((action) => {
                              const linkedProject = projects.find((p) => p.id === action.projectId);
                              return (
                                <div
                                  key={action.id}
                                  className="bg-[#141414] p-3.5 rounded-xl border border-[#242424] hover:border-[#333333] shadow-xs transition-all flex items-start justify-between gap-3 group"
                                >
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <button
                                      onClick={() => toggleActionComplete(action.id)}
                                      className="mt-0.5 w-4.5 h-4.5 rounded-md border border-neutral-600 hover:border-[#C5A47E] flex items-center justify-center text-transparent hover:text-[#C5A47E] transition-colors shrink-0 cursor-pointer"
                                      title="Mark Next Action Complete"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>

                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <p 
                                        onClick={() => setEditingAction(action)}
                                        className="text-sm font-semibold text-gray-200 leading-snug break-words cursor-pointer hover:text-[#C5A47E] transition-colors"
                                      >
                                        {action.title}
                                      </p>

                                      {/* Tags only shown when showTags toggle is active */}
                                      {showTags && action.tags && action.tags.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                          {action.tags.map((tag) => {
                                            const isContextTag = tag.startsWith('@');
                                            const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                                            return (
                                              <button
                                                key={tag}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (isSelected) {
                                                    setSelectedTag('all');
                                                    setTagSearchQuery('');
                                                  } else {
                                                    setSelectedTag(tag);
                                                    setTagSearchQuery(tag);
                                                  }
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
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setEditingAction(action)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-lg transition-all cursor-pointer shrink-0"
                                    title="Edit Action"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}

                          {/* Inline Add Action Row for this Project */}
                          <div className="pt-2 border-t border-[#1F1F1F] flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                id={`project-action-input-${group.id}`}
                                type="text"
                                value={newActionInput[group.id] || ''}
                                onChange={(e) =>
                                  setNewActionInput((prev) => ({ ...prev, [group.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddProjectNextAction(group.id, group.isStandalone);
                                  }
                                }}
                                placeholder={`+ Add next action for ${group.isStandalone ? 'standalone' : group.title}...`}
                                className="w-full text-xs px-3 py-2 bg-[#161616] border border-[#262626] hover:border-[#383838] focus:border-[#C5A47E] focus:outline-hidden rounded-lg text-gray-200 placeholder-gray-500 transition-colors"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddProjectNextAction(group.id, group.isStandalone)}
                              disabled={!newActionInput[group.id]?.trim()}
                              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                newActionInput[group.id]?.trim()
                                  ? 'bg-[#C5A47E] text-black hover:bg-[#d4b48d] cursor-pointer shadow-xs'
                                  : 'bg-[#1C1C1C] text-gray-500 cursor-not-allowed border border-[#262626]'
                              }`}
                              title="Add Action"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat Action List View */
              <div className="space-y-2.5">
                {actionableItems.map((action) => {
                  const linkedProject = projects.find((p) => p.id === action.projectId);
                  return (
                    <div
                      key={action.id}
                      className="bg-[#141414] p-3.5 rounded-xl border border-[#242424] hover:border-[#333333] shadow-xs transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => toggleActionComplete(action.id)}
                          className="mt-0.5 w-4.5 h-4.5 rounded-md border border-neutral-600 hover:border-[#C5A47E] flex items-center justify-center text-transparent hover:text-[#C5A47E] transition-colors shrink-0 cursor-pointer"
                          title="Mark Next Action Complete"
                        >
                          <Check className="w-3 h-3" />
                        </button>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p 
                            onClick={() => setEditingAction(action)}
                            className="text-sm font-semibold text-gray-200 leading-snug break-words cursor-pointer hover:text-[#C5A47E] transition-colors"
                          >
                            {action.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {/* Tags only shown when showTags toggle is active */}
                            {showTags && action.tags && action.tags.length > 0 && action.tags.map((tag) => {
                              const isContextTag = tag.startsWith('@');
                              const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isSelected) {
                                      setSelectedTag('all');
                                      setTagSearchQuery('');
                                    } else {
                                      setSelectedTag(tag);
                                      setTagSearchQuery(tag);
                                    }
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

                            {linkedProject && (
                              <button
                                onClick={() => {
                                  setSelectedProjectId(linkedProject.id);
                                  setActiveTab('projects');
                                }}
                                className="text-gray-400 hover:text-[#C5A47E] flex items-center gap-1 font-medium group-hover:text-gray-300 transition-colors truncate max-w-[160px]"
                              >
                                <Briefcase className="w-3 h-3 text-gray-500 shrink-0" />
                                <span className="truncate">{linkedProject.title}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingAction(action)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-lg transition-all cursor-pointer shrink-0"
                        title="Edit Action"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* Quick add action at the bottom of flat list view */}
                <div className="bg-[#121212] p-3 rounded-xl border border-[#242424] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newActionInput['flat-quick-add'] || ''}
                      onChange={(e) =>
                        setNewActionInput((prev) => ({ ...prev, 'flat-quick-add': e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFlatAction();
                        }
                      }}
                      placeholder="+ Add action for project or standalone..."
                      className="w-full text-xs px-3 py-2 bg-[#161616] border border-[#262626] hover:border-[#383838] focus:border-[#C5A47E] focus:outline-hidden rounded-lg text-gray-200 placeholder-gray-500 transition-colors"
                    />
                  </div>

                  <select
                    value={flatSelectedProjectId}
                    onChange={(e) => setFlatSelectedProjectId(e.target.value)}
                    className="text-xs px-2.5 py-2 bg-[#161616] border border-[#262626] rounded-lg text-gray-300 focus:border-[#C5A47E] focus:outline-hidden cursor-pointer"
                    title="Assign to project"
                  >
                    <option value="">No Project (Standalone)</option>
                    {projects
                      .filter((p) => p.status === 'active')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          📁 {p.title}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddFlatAction}
                    disabled={!newActionInput['flat-quick-add']?.trim()}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shrink-0 ${
                      newActionInput['flat-quick-add']?.trim()
                        ? 'bg-[#C5A47E] text-black hover:bg-[#d4b48d] cursor-pointer shadow-xs'
                        : 'bg-[#1C1C1C] text-gray-500 cursor-not-allowed border border-[#262626]'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick GTD Triage & Side Panels */}
        <div className="space-y-6">
          
          {/* System Equilibrium Spider Radar (Horizons vs Life Domains) */}
          <CockpitSpiderChart />

          {/* Inbox Processing Quick Card */}
          <div className="bg-[#141414] rounded-2xl border border-[#262626] p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#1E1E1E] rounded-lg text-[#C5A47E] border border-[#262626]">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif">
                    Inbox / Unclarified ({inboxCount})
                  </h3>
                  <span className="text-[11px] text-gray-500">Process to Zero</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('inbox')}
                className="text-xs font-semibold text-[#C5A47E] hover:text-[#e0c29d] flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {inboxItems.length === 0 ? (
              <div className="p-4 bg-[#191919] rounded-xl text-center text-xs text-gray-400 font-medium border border-[#262626]">
                🎉 Inbox Zero! No unclarified items.
              </div>
            ) : (
              <div className="space-y-2">
                {inboxItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#191919] hover:bg-[#202020] rounded-xl border border-[#262626] flex items-center justify-between gap-2 text-xs transition-colors group"
                  >
                    <span 
                      onClick={() => setEditingAction(item)}
                      className="font-medium text-gray-300 truncate flex-1 cursor-pointer hover:text-[#C5A47E] transition-colors"
                      title="Click to edit item"
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingAction(item)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#C5A47E] rounded transition-opacity cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setClarifyModalItem(item)}
                        className="px-2.5 py-1 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
                      >
                        Clarify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waiting For Radar */}
          <div className="bg-[#141414] rounded-2xl border border-[#262626] p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-950/60 rounded-lg text-amber-400 border border-amber-800/40">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif">
                    Waiting For Radar ({waitingForCount})
                  </h3>
                  <span className="text-[11px] text-gray-500">Delegated Commitments</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('waiting')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {urgentWaitingFor.length === 0 ? (
              <div className="p-4 bg-[#191919] rounded-xl text-center text-xs text-gray-400 font-medium border border-[#262626]">
                No outstanding delegated items.
              </div>
            ) : (
              <div className="space-y-2">
                {urgentWaitingFor.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-amber-950/20 rounded-xl border border-amber-900/50 space-y-1.5 text-xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span 
                        onClick={() => setEditingAction(item)}
                        className="font-semibold text-gray-200 leading-snug cursor-pointer hover:text-amber-300 transition-colors"
                        title="Click to edit item"
                      >
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAction(item)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-300 rounded transition-opacity cursor-pointer"
                          title="Edit delegation"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => toggleActionComplete(item.id)}
                          className="text-[10px] font-bold px-2 py-0.5 bg-[#1E1E1E] hover:bg-emerald-950 text-gray-300 hover:text-emerald-300 border border-[#262626] rounded shrink-0 transition-colors cursor-pointer"
                          title="Mark received / completed"
                        >
                          Received
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>👤 {item.delegatedTo || 'Awaiting response'}</span>
                      {item.followUpDate && <span>Follow up: {item.followUpDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Action Edit Modal */}
      <ActionEditModal
        action={editingAction}
        isOpen={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
      />

    </div>
  );
};
