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
  ChevronsDown,
  ChevronsUp,
  CheckSquare,
  Layers,
  Edit3,
  Tag,
  Search,
  Flame,
  X
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS } from '../data/gtdData';
import { GTDAction, GTDProject } from '../types/gtd';
import { getActionStreakInfo, formatDateKey } from '../utils/streakUtils';
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
  const [activeAddProjectId, setActiveAddProjectId] = useState<string | null>(null);
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

  // Filtered Next Actions for the "What to do right now" engine (including recurring actions)
  const actionableItems = useMemo(() => {
    return actions.filter((act) => {
      const isAction = act.type === 'action' || Boolean(act.isRecurring);
      if (!isAction) return false;

      // Regular actions hide when completed; recurring routines remain visible in cockpit
      if (act.completed && !act.isRecurring) return false;

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
    const isActActive = (a: GTDAction) =>
      (a.type === 'action' || Boolean(a.isRecurring)) && (!a.completed || Boolean(a.isRecurring));

    const totalActive = actions.filter(isActActive).length;
    const untaggedCount = actions.filter(
      (a) => isActActive(a) && (!a.tags || a.tags.length === 0)
    ).length;

    // Calculate count per tag from active next actions
    const tagCountMap = new Map<string, number>();
    actions.forEach((a) => {
      if (isActActive(a) && a.tags) {
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

  // Collapsed project IDs state for the Cockpit
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
    setActiveAddProjectId(null);

    // Auto-expand this project so user immediately sees their new action
    if (!isStandalone) {
      setCollapsedProjectIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
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
        
        {/* Left 2 Cols: Runway Project Actions */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Controls Bar Before Project Cards: Filter by Tag & Summary / Expand Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-0.5">
            <div className="flex items-center gap-2 relative" ref={tagDropdownRef}>
              {/* Filter by Tag Button */}
              <button
                type="button"
                onClick={() => setIsTagDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  selectedTag !== 'all'
                    ? 'bg-[#C5A47E]/15 border-[#C5A47E]/50 text-[#E0C7A8]'
                    : 'bg-[#161616] hover:bg-[#1E1E1E] border-[#2A2A2A] text-gray-300 hover:text-white'
                }`}
                title="Filter actions by tag or context"
              >
                <Tag className={`w-3.5 h-3.5 ${selectedTag !== 'all' ? 'text-[#C5A47E]' : 'text-gray-400'}`} />
                <span>
                  {selectedTag === 'all'
                    ? 'Filter by Tag'
                    : selectedTag === 'untagged'
                    ? 'Untagged'
                    : selectedTag.startsWith('@')
                    ? selectedTag
                    : `#${selectedTag}`}
                </span>
                {selectedTag !== 'all' ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearTagFilter();
                    }}
                    className="ml-1 p-0.5 hover:bg-[#C5A47E]/30 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Clear tag filter"
                  >
                    <X className="w-3 h-3" />
                  </span>
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                )}
              </button>

              {/* Tag Dropdown Popover */}
              {isTagDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-[#161616] border border-[#2D2D2D] rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-[#222222]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        value={tagSearchQuery}
                        onChange={(e) => {
                          setTagSearchQuery(e.target.value);
                          setHighlightedTagIndex(0);
                        }}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Search tags (@computer, #urgent)..."
                        className="w-full text-xs pl-8 pr-7 py-1.5 bg-[#121212] border border-[#282828] focus:border-[#C5A47E] focus:outline-hidden rounded-md text-gray-200 placeholder-gray-500"
                      />
                      {tagSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTagSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto no-scrollbar p-1 space-y-0.5">
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
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
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-[#111111] text-gray-400 border border-[#242424]">
                              {sug.count}
                            </span>
                            {isCurrentlySelected && (
                              <Check className="w-3 h-3 text-[#C5A47E]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer inside popover: Show tags on action cards toggle */}
                  <div className="px-2.5 py-2 bg-[#121212] border-t border-[#222222] flex items-center justify-between text-[11px] text-gray-400">
                    <span>Tags on cards</span>
                    <button
                      type="button"
                      onClick={() => setShowTags((prev) => !prev)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        showTags
                          ? 'bg-[#C5A47E]/15 border-[#C5A47E]/50 text-[#C5A47E]'
                          : 'bg-[#181818] border-[#2A2A2A] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {showTags ? (
                        <>
                          <Eye className="w-3 h-3 text-[#C5A47E]" />
                          <span>Shown</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-gray-500" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Count indicator */}
              <span className="text-xs text-gray-400 hidden sm:inline">
                <strong className="text-gray-200">{actionableItems.length}</strong> {actionableItems.length === 1 ? 'action' : 'actions'}
                {cockpitProjectGroups.length > 0 && (
                  <> across <strong className="text-gray-200">{cockpitProjectGroups.length}</strong> {cockpitProjectGroups.length === 1 ? 'project' : 'projects'}</>
                )}
              </span>
            </div>

            {/* Right Controls: Expand/Collapse All Icons + New Action (+) Icon */}
            <div className="flex items-center gap-1.5">
              {cockpitProjectGroups.length > 1 && (
                <div className="flex items-center gap-1 mr-0.5">
                  <button
                    type="button"
                    onClick={expandAllProjects}
                    className="p-1.5 rounded-lg bg-[#161616] hover:bg-[#1E1E1E] border border-[#2A2A2A] hover:border-[#C5A47E]/40 text-gray-400 hover:text-[#C5A47E] transition-colors cursor-pointer"
                    title="Expand all projects"
                    aria-label="Expand all projects"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllProjects}
                    className="p-1.5 rounded-lg bg-[#161616] hover:bg-[#1E1E1E] border border-[#2A2A2A] hover:border-[#C5A47E]/40 text-gray-400 hover:text-[#C5A47E] transition-colors cursor-pointer"
                    title="Collapse all projects"
                    aria-label="Collapse all projects"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setQuickCaptureOpen(true)}
                className="p-1.5 rounded-lg text-xs font-bold bg-[#1C1C1C] hover:bg-[#252525] text-[#C5A47E] hover:text-[#E0C7A8] border border-[#2B2B2B] hover:border-[#C5A47E]/40 transition-colors flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                title="Quick Capture New Action (Press C)"
                aria-label="New Action"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Action List Display (Grouped by Project) */}
          <div className="space-y-3">
            {actionableItems.length === 0 ? (
              <div className="bg-[#121212] rounded-xl border border-dashed border-[#242424] p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-200 font-serif">
                  No Actions Matching Current Filter
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Adjust your tag filter or capture a new next action for your active projects.
                </p>
                {selectedTag !== 'all' && (
                  <button
                    type="button"
                    onClick={handleClearTagFilter}
                    className="mt-3 px-3 py-1.5 text-xs font-bold bg-[#1C1C1C] border border-[#2E2E2E] hover:border-[#444] text-[#C5A47E] rounded-lg transition-colors cursor-pointer"
                  >
                    Reset Filter to All
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {cockpitProjectGroups.map((group) => {
                  const isCollapsed = collapsedProjectIds.has(group.id);

                  return (
                    <div
                      key={group.id}
                      className="bg-[#121212] rounded-lg border border-[#242424] overflow-hidden transition-all shadow-xs"
                    >
                      {/* Project Header */}
                      <div
                        onClick={() => toggleProjectCollapse(group.id)}
                        className="px-3 py-2 bg-[#161616] hover:bg-[#1a1a1a] border-b border-[#222222] flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            className="text-gray-400 hover:text-white p-0.5 rounded transition-transform shrink-0"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#C5A47E]" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                              {group.title}
                            </span>

                            {group.goalTitle && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#C5A47E]/10 border border-[#C5A47E]/20 text-[#C5A47E] truncate max-w-[140px]">
                                H3: {group.goalTitle}
                              </span>
                            )}
                            {group.areaTitle && !group.goalTitle && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/30 text-emerald-300 truncate max-w-[140px]">
                                H2: {group.areaTitle}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Add Action (+) Icon on Project Header */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollapsedProjectIds((prev) => {
                              const next = new Set(prev);
                              next.delete(group.id);
                              return next;
                            });
                            setActiveAddProjectId((prev) => (prev === group.id ? null : group.id));
                          }}
                          className={`p-1 rounded-md transition-all cursor-pointer shrink-0 border ${
                            activeAddProjectId === group.id
                              ? 'bg-[#C5A47E] text-black border-[#C5A47E]'
                              : 'text-[#C5A47E] hover:text-black bg-[#C5A47E]/10 hover:bg-[#C5A47E] border-[#C5A47E]/30'
                          }`}
                          title={`Add action to ${group.title}`}
                          aria-label={`Add action to ${group.title}`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Action Cards under Project */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-1.5 bg-[#121212]">
                          {/* Dynamic Add Action Input (only shown when clicking + icon on project header) */}
                          {activeAddProjectId === group.id && (
                            <div className="p-1.5 rounded-lg bg-[#181818] border border-[#C5A47E]/40 flex items-center gap-1.5 shadow-sm">
                              <input
                                type="text"
                                autoFocus
                                value={newActionInput[group.id] || ''}
                                onChange={(e) =>
                                  setNewActionInput((prev) => ({ ...prev, [group.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newActionInput[group.id]?.trim()) {
                                      handleAddProjectNextAction(group.id, group.isStandalone);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setActiveAddProjectId(null);
                                  }
                                }}
                                placeholder={`+ Next action for ${group.isStandalone ? 'standalone' : group.title}...`}
                                className="flex-1 text-xs px-2.5 py-1.5 bg-[#141414] border border-[#2B2B2B] hover:border-[#444] focus:border-[#C5A47E] focus:outline-hidden rounded-md text-gray-200 placeholder-gray-500 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddProjectNextAction(group.id, group.isStandalone)}
                                disabled={!newActionInput[group.id]?.trim()}
                                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  newActionInput[group.id]?.trim()
                                    ? 'bg-[#C5A47E] text-black hover:bg-[#d4b48d] cursor-pointer shadow-xs'
                                    : 'bg-[#1C1C1C] text-gray-500 cursor-not-allowed border border-[#242424]'
                                }`}
                                title="Add Action"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveAddProjectId(null)}
                                className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#252525] transition-colors cursor-pointer"
                                title="Cancel (Esc)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {group.actions.map((action) => {
                            const streak = action.isRecurring ? getActionStreakInfo(action) : null;
                            const isCompletedToday = Boolean(streak?.completedToday);
                            const isDone = action.isRecurring ? isCompletedToday : Boolean(action.completed);

                            return (
                              <div
                                key={action.id}
                                className={`py-1.5 px-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 group ${
                                  action.isRecurring
                                    ? isDone
                                      ? 'bg-[#151515] border-[#222222] opacity-80'
                                      : 'bg-[#161616] border-amber-900/30 hover:border-amber-700/50'
                                    : 'bg-[#151515] hover:bg-[#181818] border-[#222222] hover:border-[#333333]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleActionComplete(action.id)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                      isDone
                                        ? 'bg-[#C5A47E] border-[#C5A47E] text-black'
                                        : 'border-neutral-600 hover:border-[#C5A47E] text-transparent hover:text-[#C5A47E]'
                                    }`}
                                    title={
                                      action.isRecurring
                                        ? isCompletedToday
                                          ? 'Completed today (click to undo)'
                                          : 'Log completion for today'
                                        : 'Mark complete'
                                    }
                                  >
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </button>

                                  <span
                                    onClick={() => setEditingAction(action)}
                                    className={`text-xs sm:text-sm font-medium leading-tight truncate hover:text-[#C5A47E] cursor-pointer transition-colors ${
                                      isDone ? 'text-gray-400' : 'text-gray-200'
                                    }`}
                                    title={action.title}
                                  >
                                    {action.title}
                                  </span>

                                  {/* Compact Streak/Recurring indicator */}
                                  {action.isRecurring && streak && (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                                        isCompletedToday
                                          ? 'bg-emerald-950/40 border-emerald-800/30 text-emerald-400'
                                          : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                      }`}
                                      title={`Target: ${action.recurrence?.label || 'Recurring routine'}`}
                                    >
                                      <Flame className="w-2.5 h-2.5 text-orange-400 fill-orange-400/20" />
                                      <span>
                                        {streak.currentStreak > 0
                                          ? `${streak.currentStreak}d`
                                          : action.recurrence?.label || 'Recurring'}
                                      </span>
                                      {isCompletedToday && <span className="text-[9px] font-bold">✓</span>}
                                    </span>
                                  )}

                                  {/* Compact Due Date indicator */}
                                  {action.dueDate && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-800/30 text-rose-300 shrink-0">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{action.dueDate}</span>
                                    </span>
                                  )}

                                  {/* Tags only shown when showTags toggle is active */}
                                  {showTags && action.tags && action.tags.length > 0 && (
                                    <div className="flex items-center gap-1 shrink-0 overflow-hidden">
                                      {action.tags.slice(0, 3).map((tag) => (
                                        <span
                                          key={tag}
                                          className="text-[10px] px-1.5 py-0.2 rounded bg-[#1e1e1e] border border-[#2b2b2b] text-gray-400"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setEditingAction(action)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-[#C5A47E] rounded transition-opacity cursor-pointer shrink-0"
                                  title="Edit Action"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}

                          {group.actions.length === 0 && activeAddProjectId !== group.id && (
                            <div className="py-1 px-2 text-[11px] text-gray-500 italic text-center">
                              No active actions
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
