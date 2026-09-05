import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  CheckCircle2, 
  Briefcase, 
  Compass, 
  Inbox, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Brain, 
  CalendarCheck, 
  Tag, 
  Check, 
  ChevronRight,
  Layers,
  Zap,
  CornerDownLeft,
  Filter,
  Eye,
  Target,
  ShieldCheck,
  Flame,
  FileSpreadsheet
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDAction, GTDProject, HorizonItem, ActiveTab } from '../types/gtd';

type SearchCategory = 'all' | 'actions' | 'projects' | 'horizons' | 'waiting' | 'inbox' | 'someday';

interface SearchResultItem {
  id: string;
  category: 'action' | 'project' | 'horizon' | 'waiting' | 'inbox' | 'someday';
  title: string;
  subtitle?: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  data: GTDAction | GTDProject | HorizonItem;
  targetTab: ActiveTab;
}

export const GlobalSearchModal: React.FC = () => {
  const {
    searchModalOpen,
    setSearchModalOpen,
    searchQuery,
    setSearchQuery,
    actions = [],
    projects = [],
    horizonItems = [],
    setActiveTab,
    setSelectedProjectId,
    setSelectedHorizonId,
    setQuickCaptureOpen,
    setMindSweepOpen,
    setWeeklyReviewOpen,
    setAuthModalOpen,
    toggleActionComplete,
    setClarifyModalItem,
  } = useGTD();

  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Hotkey handler (Cmd+K / Ctrl+K / '/' to open search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K / Ctrl+K or '/' (when not typing in an input)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
        return;
      }

      if (e.key === '/' && !searchModalOpen) {
        const activeEl = document.activeElement?.tagName?.toUpperCase();
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl || '')) {
          e.preventDefault();
          setSearchModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen, setSearchModalOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setSelectedIndex(0);
    }
  }, [searchModalOpen]);

  // Project lookup map for linking action -> project title
  const projectMap = useMemo(() => {
    const map = new Map<string, GTDProject>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Horizon level definitions
  const getHorizonBadge = (level: number) => {
    switch (level) {
      case 5: return { label: 'H5 Purpose', color: 'bg-amber-950/80 text-amber-300 border-amber-800/50' };
      case 4: return { label: 'H4 Vision', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/50' };
      case 3: return { label: 'H3 Goal', color: 'bg-sky-950/80 text-sky-300 border-sky-800/50' };
      case 2: return { label: 'H2 Area of Focus', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50' };
      default: return { label: `H${level}`, color: 'bg-neutral-800 text-gray-300 border-neutral-700' };
    }
  };

  // Build unified searchable items list
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    const results: SearchResultItem[] = [];

    // 1. Actions (Next Actions, Inbox, Waiting, Someday)
    actions.forEach((act) => {
      const proj = act.projectId ? projectMap.get(act.projectId) : undefined;
      const projTitle = proj?.title || '';
      
      const matches = !query || 
        act.title.toLowerCase().includes(query) ||
        (act.notes && act.notes.toLowerCase().includes(query)) ||
        (act.context && act.context.toLowerCase().includes(query)) ||
        (act.delegatedTo && act.delegatedTo.toLowerCase().includes(query)) ||
        projTitle.toLowerCase().includes(query);

      if (!matches) return;

      if (act.type === 'action') {
        results.push({
          id: act.id,
          category: 'action',
          title: act.title,
          subtitle: projTitle ? `Project: ${projTitle}` : act.context,
          badge: act.context || 'Action',
          badgeColor: act.completed 
            ? 'bg-neutral-800 text-gray-400 border-neutral-700' 
            : 'bg-amber-950/60 text-amber-300 border-amber-800/40',
          icon: <CheckCircle2 className={`w-4 h-4 ${act.completed ? 'text-gray-500' : 'text-amber-400'}`} />,
          data: act,
          targetTab: 'actions',
        });
      } else if (act.type === 'inbox') {
        results.push({
          id: act.id,
          category: 'inbox',
          title: act.title,
          subtitle: 'Unprocessed inbox item (needs clarifying)',
          badge: 'Inbox',
          badgeColor: 'bg-yellow-950/70 text-yellow-300 border-yellow-800/50',
          icon: <Inbox className="w-4 h-4 text-yellow-400" />,
          data: act,
          targetTab: 'actions',
        });
      } else if (act.type === 'waiting') {
        results.push({
          id: act.id,
          category: 'waiting',
          title: act.title,
          subtitle: act.delegatedTo ? `Delegated to: ${act.delegatedTo}${act.followUpDate ? ` (Follow up: ${act.followUpDate})` : ''}` : 'Waiting on third party',
          badge: 'Waiting For',
          badgeColor: 'bg-purple-950/70 text-purple-300 border-purple-800/50',
          icon: <Clock className="w-4 h-4 text-purple-400" />,
          data: act,
          targetTab: 'actions',
        });
      } else if (act.type === 'someday') {
        results.push({
          id: act.id,
          category: 'someday',
          title: act.title,
          subtitle: 'Someday / Maybe incubation list',
          badge: 'Someday',
          badgeColor: 'bg-sky-950/70 text-sky-300 border-sky-800/50',
          icon: <Sparkles className="w-4 h-4 text-sky-400" />,
          data: act,
          targetTab: 'actions',
        });
      }
    });

    // 2. Projects
    projects.forEach((proj) => {
      const matches = !query ||
        proj.title.toLowerCase().includes(query) ||
        (proj.desiredOutcome && proj.desiredOutcome.toLowerCase().includes(query)) ||
        (proj.lifeDomain && proj.lifeDomain.toLowerCase().includes(query)) ||
        proj.status.toLowerCase().includes(query);

      if (!matches) return;

      const statusBadge = proj.status === 'active' 
        ? { label: 'Active Project', color: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50' }
        : proj.status === 'completed'
        ? { label: 'Completed Project', color: 'bg-neutral-800 text-gray-400 border-neutral-700' }
        : { label: 'On-Hold Project', color: 'bg-yellow-950/70 text-yellow-300 border-yellow-800/50' };

      results.push({
        id: proj.id,
        category: 'project',
        title: proj.title,
        subtitle: proj.desiredOutcome ? `Outcome: ${proj.desiredOutcome}` : `Domain: ${proj.lifeDomain || 'Professional'}`,
        badge: statusBadge.label,
        badgeColor: statusBadge.color,
        icon: <Briefcase className="w-4 h-4 text-emerald-400" />,
        data: proj,
        targetTab: 'projects',
      });
    });

    // 3. Horizons of Focus (H5, H4, H3, H2)
    horizonItems.forEach((h) => {
      const matches = !query ||
        h.title.toLowerCase().includes(query) ||
        (h.description && h.description.toLowerCase().includes(query)) ||
        (h.lifeDomain && h.lifeDomain.toLowerCase().includes(query));

      if (!matches) return;

      const badgeInfo = getHorizonBadge(h.level);

      results.push({
        id: h.id,
        category: 'horizon',
        title: h.title,
        subtitle: h.description || `Horizon altitude: Level ${h.level}`,
        badge: badgeInfo.label,
        badgeColor: badgeInfo.color,
        icon: <Compass className="w-4 h-4 text-sky-400" />,
        data: h,
        targetTab: 'horizons',
      });
    });

    // Apply active category filter
    if (activeCategory === 'all') return results;
    return results.filter((item) => {
      if (activeCategory === 'actions') return item.category === 'action';
      if (activeCategory === 'projects') return item.category === 'project';
      if (activeCategory === 'horizons') return item.category === 'horizon';
      if (activeCategory === 'waiting') return item.category === 'waiting';
      if (activeCategory === 'inbox') return item.category === 'inbox';
      if (activeCategory === 'someday') return item.category === 'someday';
      return true;
    });
  }, [actions, projects, horizonItems, searchQuery, activeCategory, projectMap]);

  // Adjust selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults.length, activeCategory, searchQuery]);

  // Keyboard navigation within the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchModalOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : prev));
      scrollActiveItemIntoView(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
      scrollActiveItemIntoView(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && selectedIndex < searchResults.length) {
        handleSelectItem(searchResults[selectedIndex]);
      } else if (searchQuery.trim()) {
        // Quick Capture with current query
        setQuickCaptureOpen(true);
        setSearchModalOpen(false);
      }
    }
  };

  const scrollActiveItemIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-search-item]');
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    setActiveTab(item.targetTab);
    
    if (item.category === 'project') {
      setSelectedProjectId(item.id);
    } else if (item.category === 'horizon') {
      setSelectedHorizonId(item.id);
    } else if (item.category === 'inbox') {
      setClarifyModalItem(item.data as GTDAction);
    } else if (item.category === 'action' && (item.data as GTDAction).projectId) {
      setSelectedProjectId((item.data as GTDAction).projectId || null);
    }

    setSearchModalOpen(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-[#C5A47E]/30 text-[#E0C09E] px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!searchModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:pt-16 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSearchModalOpen(false);
      }}
    >
      <div 
        className="w-full max-w-2xl bg-[#121212] border border-[#2B2B2B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Box */}
        <div className="p-3.5 sm:p-4 border-b border-[#242424] flex items-center gap-3 bg-[#171717]/80">
          <div className="p-2 rounded-xl bg-[#202020] border border-[#333333] text-[#C5A47E] shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, projects, horizons of focus..."
              className="w-full bg-transparent text-base sm:text-lg text-white placeholder-gray-500 focus:outline-hidden font-medium"
            />
          </div>

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-[#222222] text-gray-400 border border-[#333333] rounded">
              ESC
            </kbd>
          </div>

          <button
            onClick={() => setSearchModalOpen(false)}
            className="sm:hidden p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope / Category Filter Chips */}
        <div className="px-3 sm:px-4 py-2 border-b border-[#202020] bg-[#141414] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1 hidden sm:inline">
            Filter:
          </span>
          {(
            [
              { id: 'all', label: 'All', icon: <Layers className="w-3 h-3" /> },
              { id: 'actions', label: 'Actions', icon: <CheckCircle2 className="w-3 h-3" /> },
              { id: 'projects', label: 'Projects', icon: <Briefcase className="w-3 h-3" /> },
              { id: 'horizons', label: 'Horizons', icon: <Compass className="w-3 h-3" /> },
              { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-3 h-3" /> },
              { id: 'waiting', label: 'Waiting', icon: <Clock className="w-3 h-3" /> },
              { id: 'someday', label: 'Someday', icon: <Sparkles className="w-3 h-3" /> },
            ] as const
          ).map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C5A47E] text-black font-semibold shadow-xs'
                    : 'bg-[#1C1C1C] text-gray-400 hover:text-gray-200 hover:bg-[#252525] border border-[#2B2B2B]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto max-h-[50vh] p-2 space-y-1">
          {searchResults.length > 0 ? (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isAction = item.category === 'action';
              const actionData = isAction ? (item.data as GTDAction) : null;

              return (
                <div
                  key={`${item.category}-${item.id}`}
                  data-search-item
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#1F1C18] border-[#C5A47E]/50 text-white shadow-md'
                      : 'bg-[#161616]/70 hover:bg-[#1C1C1C] border-transparent text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Action Complete Checkbox or Category Icon */}
                    {isAction && actionData ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActionComplete(actionData.id);
                        }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          actionData.completed
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-gray-500 hover:border-[#C5A47E] text-transparent hover:text-gray-400'
                        }`}
                        title={actionData.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-[#222222] border border-[#303030] shrink-0">
                        {item.icon}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${
                          isAction && actionData?.completed ? 'line-through text-gray-500' : 'text-gray-100 group-hover:text-white'
                        }`}>
                          {highlightMatch(item.title, searchQuery)}
                        </span>
                      </div>

                      {item.subtitle && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {highlightMatch(item.subtitle, searchQuery)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badge & Navigation Hint */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border font-mono ${item.badgeColor}`}>
                      {item.badge}
                    </span>

                    <ChevronRight className={`w-4 h-4 text-gray-500 group-hover:text-[#C5A47E] transition-transform ${
                      isSelected ? 'translate-x-0.5 text-[#C5A47E]' : ''
                    }`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-[#2B2B2B] flex items-center justify-center mx-auto text-gray-500">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-300">
                  {searchQuery ? `No results for "${searchQuery}"` : 'Type to search across everything'}
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Find Next Actions, Active Projects, H2 Areas of Focus, H3 Goals, Visions, Purpose, and Inbox items.
                </p>
              </div>

              {searchQuery.trim() && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setQuickCaptureOpen(true);
                      setSearchModalOpen(false);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C5A47E] hover:bg-[#b8946e] text-black font-semibold text-xs transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Quick Capture "{searchQuery}"</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Quick Tools & Keyboard Shortcuts Bar */}
        <div className="p-3 border-t border-[#222222] bg-[#121212] flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setSearchModalOpen(false);
              }}
              className="hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span>Cockpit</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('horizons');
                setSearchModalOpen(false);
              }}
              className="hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-gray-500" />
              <span>Horizons</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('projects');
                setSearchModalOpen(false);
              }}
              className="hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-gray-500" />
              <span>Projects</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('actions');
                setSearchModalOpen(false);
              }}
              className="hover:text-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
              <span>Actions</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500 font-mono">
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-[#202020] text-gray-300 border border-[#303030] rounded">↑</kbd>
              <kbd className="ml-1 px-1.5 py-0.5 bg-[#202020] text-gray-300 border border-[#303030] rounded">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[#202020] text-gray-300 border border-[#303030] rounded">↵</kbd> Select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
