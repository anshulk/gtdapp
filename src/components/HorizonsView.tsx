import React, { useState, useMemo, useEffect } from 'react';
import { 
  Compass, 
  Eye, 
  Target, 
  ShieldCheck, 
  Briefcase, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Layers, 
  Link as LinkIcon, 
  Calendar, 
  GitBranch,
  Sparkles,
  ChevronRight,
  Filter,
  Network,
  Kanban,
  Tag,
  Star,
  X,
  Search,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS, LIFE_DOMAINS } from '../data/gtdData';
import { HorizonLevel, HorizonItem } from '../types/gtd';
import { getHorizonItemDomain } from '../utils/domainHierarchy';
import { HorizonItemModal } from './HorizonItemModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { HorizonsMap } from './HorizonsMap';
import { trackButtonClick, trackFilterChange, trackSubView } from '../services/analytics';

export const HorizonsView: React.FC = () => {
  const {
    horizonItems = [],
    projects = [],
    actions = [],
    deleteHorizonItem,
    setActiveTab,
    setSelectedProjectId,
    setQuickCaptureOpen,
  } = useGTD();

  const [selectedAltitude, setSelectedAltitude] = useState<number | 'all'>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedLifeDomain, setSelectedLifeDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<HorizonItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<HorizonItem | null>(null);
  const [defaultLevelForNew, setDefaultLevelForNew] = useState<HorizonLevel>(3);
  const [defaultParentIdForNew, setDefaultParentIdForNew] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'graph' | 'kanban' | 'cards'>('graph');

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    trackButtonClick('horizons_expand_all', 'horizons_header');
    setCollapsedNodes({});
  };

  const collapseAll = () => {
    trackButtonClick('horizons_collapse_all', 'horizons_header');
    const allCollapsed: Record<string, boolean> = {};
    horizonItems.forEach((h) => {
      allCollapsed[h.id] = true;
    });
    projects.forEach((p) => {
      allCollapsed[p.id] = true;
    });
    setCollapsedNodes(allCollapsed);
  };

  // Track sub-view engagement
  useEffect(() => {
    trackSubView('horizons', viewMode, {
      selected_altitude: selectedAltitude,
      selected_domain: selectedLifeDomain,
      total_items: horizonItems.length,
    });
  }, [viewMode]);

  const handleOpenAddModal = (level: HorizonLevel = 3, parentId?: string) => {
    trackButtonClick('horizons_add_focus_button', 'horizons_header', { level, parent_id: parentId });
    setItemToEdit(null);
    setDefaultLevelForNew(level);
    setDefaultParentIdForNew(parentId);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: HorizonItem) => {
    trackButtonClick('horizons_edit_focus_button', 'horizons_item', { item_id: item.id, level: item.level });
    setItemToEdit(item);
    setModalOpen(true);
  };

  const handleDeletePrompt = (item: HorizonItem) => {
    trackButtonClick('horizons_delete_focus_prompt', 'horizons_item', { item_id: item.id, level: item.level });
    setItemToDelete(item);
  };

  // H2 Areas of Focus list
  const areasOfFocus = useMemo(() => {
    return horizonItems.filter((h) => h.level === 2);
  }, [horizonItems]);

  // H5 Purpose items
  const purposeItems = useMemo(() => {
    return horizonItems.filter((h) => h.level === 5);
  }, [horizonItems]);

  // Filtered Horizon Items for cards view
  const filteredItems = useMemo(() => {
    return horizonItems.filter((item) => {
      if (selectedAltitude !== 'all' && item.level !== selectedAltitude) return false;
      if (selectedLifeDomain !== 'all' && getHorizonItemDomain(item, horizonItems) !== selectedLifeDomain) return false;
      if (selectedAreaId !== 'all') {
        if (item.level === 2 && item.id !== selectedAreaId) return false;
        if (item.level === 3 && item.parentId !== selectedAreaId) return false;
        if (item.level === 4 || item.level === 5) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const descMatch = item.description ? item.description.toLowerCase().includes(q) : false;
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  }, [horizonItems, selectedAltitude, selectedAreaId, selectedLifeDomain, searchQuery]);

  const activeFilterCount =
    (selectedAltitude !== 'all' ? 1 : 0) +
    (selectedLifeDomain !== 'all' ? 1 : 0) +
    (selectedAreaId !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner - Merged Top Card with View Mode, Graph Controls, Filter Button & Add Focus */}
      <div className="bg-[#141414] rounded-xl border border-[#262626] p-3 sm:p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-serif flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#C5A47E]" />
              <span>Horizons of Focus</span>
            </h1>
            <span className="text-[11px] font-mono text-[#C5A47E] px-2 py-0.5 rounded-md bg-[#C5A47E]/10 border border-[#C5A47E]/20 hidden sm:inline">
              50k Purpose ➔ Runway
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* View Mode Toggle */}
            <div className="bg-[#1E1E1E] border border-[#262626] p-0.5 rounded-lg flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => {
                  trackButtonClick('horizons_view_mode_graph', 'horizons_header');
                  setViewMode('graph');
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'graph'
                    ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Graph</span>
              </button>
              <button
                onClick={() => {
                  trackButtonClick('horizons_view_mode_kanban', 'horizons_header');
                  setViewMode('kanban');
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => {
                  trackButtonClick('horizons_view_mode_cards', 'horizons_header');
                  setViewMode('cards');
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Filter Toggle Button (Icon only) */}
            <button
              type="button"
              onClick={() => {
                trackButtonClick('horizons_toggle_filters', 'horizons_header', { open: !showFilters });
                setShowFilters((prev) => !prev);
              }}
              className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center relative transition-all cursor-pointer ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[#C5A47E]/15 border-[#C5A47E] text-[#C5A47E] shadow-xs'
                  : 'bg-[#1E1E1E] border-[#262626] text-gray-300 hover:text-white hover:bg-[#252525]'
              }`}
              title={showFilters ? "Hide Filters" : "Filter Horizons"}
              aria-label="Filter Horizons"
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#C5A47E] text-black font-bold text-[10px] flex items-center justify-center font-mono ring-2 ring-[#141414]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleOpenAddModal(3)}
              className="px-3 py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Focus</span>
            </button>
          </div>
        </div>

        {/* Second Row: Graph Controls (Collapse All, Expand All, Zoom) */}
        {viewMode === 'graph' && (
          <div className="mt-3 pt-3 border-t border-[#202020] flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fadeIn">
            {/* Left: Collapse All & Expand All */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mr-1">
                Branches:
              </span>
              <div className="flex items-center gap-1 bg-[#1E1E1E] border border-[#262626] p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2.5 py-1 hover:bg-[#282828] text-gray-300 hover:text-white rounded-md transition-colors cursor-pointer font-medium"
                  title="Collapse all branches"
                >
                  <span>Collapse All</span>
                </button>
                <span className="text-gray-600">|</span>
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2.5 py-1 hover:bg-[#282828] text-gray-300 hover:text-white rounded-md transition-colors cursor-pointer font-medium"
                  title="Expand all branches"
                >
                  <span>Expand All</span>
                </button>
              </div>
            </div>

            {/* Right: Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mr-1">
                Zoom:
              </span>
              <div className="flex items-center gap-0.5 bg-[#1E1E1E] border border-[#262626] rounded-lg p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(75, prev - 10))}
                  className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(100)}
                  className="text-[10px] font-mono px-1.5 text-gray-300 hover:text-[#C5A47E] min-w-[36px] text-center cursor-pointer"
                  title="Reset zoom to 100%"
                >
                  {zoomScale}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(125, prev + 10))}
                  className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Filter Panel on Top Card */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[#202020] animate-fadeIn flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Search Input & Life Domain Filter */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    viewMode === 'graph'
                      ? 'Filter graph nodes...'
                      : viewMode === 'kanban'
                      ? 'Filter Kanban items...'
                      : 'Filter horizon cards...'
                  }
                  className="pl-8 pr-7 py-1.5 bg-[#181818] border border-[#262626] rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E] w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#C5A47E]" />
                  <span>Domain:</span>
                </span>
                <select
                  value={selectedLifeDomain}
                  onChange={(e) => {
                    trackFilterChange('domain', e.target.value, 'horizons');
                    setSelectedLifeDomain(e.target.value);
                  }}
                  className="px-2.5 py-1 bg-[#181818] border border-[#262626] rounded-lg text-xs text-gray-200 focus:outline-hidden focus:border-[#C5A47E]"
                >
                  <option value="all">All Domains</option>
                  {LIFE_DOMAINS.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Altitude Selector & Reset */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mr-1">
                  Altitude:
                </span>
                <button
                  onClick={() => {
                    trackButtonClick('horizons_altitude_all', 'horizons_filter');
                    trackFilterChange('altitude', 'all', 'horizons');
                    setSelectedAltitude('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedAltitude === 'all'
                      ? 'bg-[#C5A47E] text-black shadow-xs'
                      : 'bg-[#181818] text-gray-400 hover:bg-[#202020] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  All
                </button>
                {([5, 4, 3, 2] as HorizonLevel[]).map((lvl) => {
                  const def = HORIZON_DEFINITIONS[lvl];
                  const count = horizonItems.filter((i) => i.level === lvl).length;
                  const isSelected = selectedAltitude === lvl;

                  return (
                    <button
                      key={lvl}
                      onClick={() => {
                        trackButtonClick(`horizons_altitude_h${lvl}`, 'horizons_filter', { level: lvl });
                        trackFilterChange('altitude', `H${lvl}`, 'horizons');
                        setSelectedAltitude(lvl);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? `${def.color.badge} shadow-xs font-extrabold ring-1 ring-[#C5A47E]`
                          : 'bg-[#181818] text-gray-400 hover:bg-[#202020] hover:text-gray-200 border border-[#262626]'
                      }`}
                    >
                      <span>H{lvl}</span>
                      <span className="text-[10px] opacity-70 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    trackButtonClick('horizons_clear_filters', 'horizons_filter');
                    setSelectedAltitude('all');
                    setSelectedLifeDomain('all');
                    setSelectedAreaId('all');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-800/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main View Display */}
      {viewMode === 'cards' ? (
        /* View Mode: Altitude Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const def = HORIZON_DEFINITIONS[item.level];
            const parentItem = horizonItems.find((h) => h.id === item.parentId);
            const linkedGoalsForArea = item.level === 2 ? horizonItems.filter((h) => h.level === 3 && h.parentId === item.id) : [];
            const areaGoalIds = new Set(linkedGoalsForArea.map((g) => g.id));
            const linkedProjects = item.level === 2
              ? projects.filter((p) => p.areaId === item.id || (p.goalId && areaGoalIds.has(p.goalId)))
              : projects.filter((p) => p.goalId === item.id || p.areaId === item.id);

            return (
              <div
                key={item.id}
                className="bg-[#141414] rounded-2xl border border-[#262626] hover:border-[#383838] shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  
                  {/* Top Altitude Badge & Area Link */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${def.color.badge} font-mono`}>
                      H{item.level} • {def.altitude}
                    </span>

                    {(() => {
                      const d = getHorizonItemDomain(item, horizonItems);
                      return d ? (
                        <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-[#C5A47E]" />
                          <span>{d}</span>
                        </span>
                      ) : null;
                    })()}

                    {item.level === 3 && parentItem && (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 truncate max-w-[160px]" title={parentItem.title}>
                        <ShieldCheck className="w-3 h-3 shrink-0" />
                        <span className="truncate">{parentItem.title}</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white font-serif leading-snug group-hover:text-[#C5A47E] transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  {/* Parent Link Indicator for H4/H5 */}
                  {item.level !== 3 && parentItem && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 bg-[#191919] p-2 rounded-lg border border-[#262626]">
                      <LinkIcon className="w-3 h-3 text-gray-500 shrink-0" />
                      <span className="font-medium truncate">
                        Aligned to: H{parentItem.level} {parentItem.title}
                      </span>
                    </div>
                  )}

                  {/* Key Results / Guiding Principles */}
                  {item.keyResults && item.keyResults.length > 0 && (
                    <div className="pt-2 border-t border-[#262626] space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {item.level === 5 ? 'Guiding Standards:' : 'Key Metrics / Milestones:'}
                      </span>
                      <ul className="space-y-1">
                        {item.keyResults.map((kr, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-gray-300 flex items-start gap-1.5"
                          >
                            <span className="text-[#C5A47E] mt-0.5">•</span>
                            <span className="leading-tight">{kr}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Linked Indicators */}
                  {item.level === 2 && (
                    <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">Linked Elements:</span>
                      <span className="font-bold px-2 py-0.5 rounded bg-neutral-800 text-gray-200">
                        {linkedGoalsForArea.length} Goals • {linkedProjects.length} Projects
                      </span>
                    </div>
                  )}

                  {item.level === 3 && (
                    <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">Supporting Projects:</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        linkedProjects.length === 0 ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' : 'bg-neutral-800 text-gray-200'
                      }`}>
                        {linkedProjects.length} Active Project{linkedProjects.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}

                  {/* Weekly Review Progress Rating & Notes */}
                  {(item.progressRating || item.reviewNotes) && (
                    <div className="pt-2 border-t border-[#262626] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#C5A47E]" />
                          <span>Review Progress:</span>
                        </span>
                        {item.progressRating && (
                          <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/30 text-[11px] font-mono font-bold flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span>{item.progressRating}/5</span>
                          </span>
                        )}
                      </div>
                      {item.reviewNotes && (
                        <p className="text-[11px] text-gray-300 italic bg-[#161616] p-2 rounded-lg border border-[#262626] leading-relaxed line-clamp-2">
                          "{item.reviewNotes}"
                        </p>
                      )}
                    </div>
                  )}

                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-[#262626] flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    {item.targetDate && (
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#C5A47E]" />
                        <span>{item.targetDate}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
                      title="Edit Horizon Focus"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(item)}
                      className="p-1.5 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Horizon Focus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <HorizonsMap
          activeLayout={viewMode === 'kanban' ? 'altitude-cascade' : 'graph-view'}
          onOpenAddModal={handleOpenAddModal}
          onOpenEditModal={handleOpenEditModal}
          onDeletePrompt={handleDeletePrompt}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedDomain={selectedLifeDomain}
          onSelectedDomainChange={setSelectedLifeDomain}
          collapsedNodes={collapsedNodes}
          onToggleCollapse={toggleCollapse}
          zoomScale={zoomScale}
          onZoomChange={setZoomScale}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />
      )}

      {/* Horizon Item Creation & Edit Modal */}
      <HorizonItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemToEdit={itemToEdit}
        defaultLevel={defaultLevelForNew}
        defaultParentId={defaultParentIdForNew}
      />

      {/* Confirmation Modal for Horizon Deletion */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            deleteHorizonItem(itemToDelete.id);
          }
        }}
        title={`Delete ${itemToDelete ? HORIZON_DEFINITIONS[itemToDelete.level].shortName : 'Horizon'}`}
        message={`Are you sure you want to delete "${itemToDelete?.title}"? Any linked sub-items or projects will have their parent horizon alignment cleared.`}
        confirmLabel="Delete Horizon Item"
      />

    </div>
  );
};
