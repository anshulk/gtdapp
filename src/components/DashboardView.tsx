import React, { useState, useMemo } from 'react';
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
  Filter, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS } from '../data/gtdData';
import { EnergyLevel, TimeEstimate, GTDContext, GTDAction } from '../types/gtd';
import { ActionEditModal } from './ActionEditModal';
import { Edit3 } from 'lucide-react';

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
  } = useGTD();

  // Instant Action Finder Filters
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [selectedEnergy, setSelectedEnergy] = useState<string>('all');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [newActionInput, setNewActionInput] = useState<{ [projectId: string]: string }>({});
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

  // Filtered Next Actions for the "What to do right now" engine
  const actionableItems = useMemo(() => {
    return actions.filter((act) => {
      if (act.type !== 'action' || act.completed) return false;
      if (selectedContext !== 'all' && act.context !== selectedContext) return false;
      if (selectedEnergy !== 'all' && act.energy !== selectedEnergy) return false;
      if (selectedTime !== 'all' && act.timeEstimate !== selectedTime) return false;
      return true;
    });
  }, [actions, selectedContext, selectedEnergy, selectedTime]);

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

  const handleAddProjectNextAction = (projectId: string) => {
    const text = newActionInput[projectId]?.trim();
    if (!text) return;
    addAction({
      title: text,
      projectId,
      context: '@computer',
      energy: 'medium',
      timeEstimate: '15-30m',
      type: 'action',
      priority: 'high',
    });
    setNewActionInput((prev) => ({ ...prev, [projectId]: '' }));
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Cockpit Header & Altitude Barometer */}
      <div className="bg-[#121212] border border-[#242424] text-gray-200 rounded-2xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#C5A47E]/4 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C5A47E]/10 text-[#C5A47E] text-[11px] font-semibold border border-[#C5A47E]/20">
              <Compass className="w-3 h-3 text-[#C5A47E]" />
              <span>GTD Horizons of Focus System</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-serif text-white">
              Flight Control Cockpit
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Maintain complete vertical alignment from 50,000 ft Purpose down to Runway Next Actions.
            </p>
          </div>

          {/* Quick Review Status Box */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-4 flex items-center justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                <CalendarCheck className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Weekly Review</span>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  isReviewDue ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                }`}>
                  {isReviewDue ? 'Due' : 'On Track'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {daysSinceLastReview === 999
                  ? 'No reviews logged'
                  : `Last review: ${daysSinceLastReview}d ago`}
              </p>
            </div>

            <button
              onClick={() => setWeeklyReviewOpen(true)}
              className="py-1.5 px-3 text-xs font-bold bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isReviewDue ? 'Review' : 'Check'}</span>
            </button>
          </div>
        </div>

        {/* 6 Horizons Altitude Barometer Overview */}
        <div className="mt-6 pt-5 border-t border-[#222222] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
                className="bg-[#171717] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#C5A47E]/40 rounded-xl p-3 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium mb-1">
                  <span className="font-bold text-gray-300">H{lvl}</span>
                  <span className="font-mono text-[#C5A47E]">{def.altitude}</span>
                </div>
                <div className="font-bold text-white text-xs sm:text-sm group-hover:text-[#C5A47E] transition-colors truncate">
                  {def.shortName}
                </div>
                <div className="mt-1.5 text-xs flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-white">{count}</span>
                  <span className="text-[10px] text-gray-500">
                    {lvl === 1 ? 'Projects' : lvl === 0 ? 'Actions' : 'Items'}
                  </span>
                </div>
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
                <Zap className="w-4 h-4 text-[#C5A47E]" />
                <h2 className="text-base sm:text-lg font-bold text-white font-serif">
                  Contextual Next Action Finder
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Filter actions by physical context, available energy, and time window.
              </p>
            </div>

            <button
              onClick={() => setQuickCaptureOpen(true)}
              className="w-8 h-8 flex items-center justify-center bg-[#1C1C1C] hover:bg-[#252525] text-[#C5A47E] border border-[#2B2B2B] hover:border-[#C5A47E]/40 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Quick Capture Action (Press C)"
              aria-label="Capture Action"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Filter Bar Chips */}
          <div className="bg-[#121212] p-3.5 sm:p-4 rounded-xl border border-[#242424] shadow-xs space-y-3">
            {/* Context filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1">
                Context:
              </span>
              {['all', '@computer', '@calls', '@errands', '@home', '@office', '@read-review', '@deep-work'].map((ctx) => (
                <button
                  key={ctx}
                  onClick={() => setSelectedContext(ctx)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    selectedContext === ctx
                      ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                      : 'bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  {ctx === 'all' ? 'All' : ctx}
                </button>
              ))}
            </div>

            {/* Energy and Time filters */}
            <div className="flex flex-wrap items-center gap-4 pt-2.5 border-t border-[#202020] text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Energy:
                </span>
                {['all', 'low', 'medium', 'high'].map((eng) => (
                  <button
                    key={eng}
                    onClick={() => setSelectedEnergy(eng)}
                    className={`px-2 py-0.5 rounded-md capitalize text-xs font-medium transition-colors cursor-pointer ${
                      selectedEnergy === eng
                        ? 'bg-[#C5A47E] text-black font-bold'
                        : 'bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-gray-200 border border-[#262626]'
                    }`}
                  >
                    {eng}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Time:
                </span>
                {['all', '<15m', '15-30m', '30-60m', '1-2h'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      selectedTime === t
                        ? 'bg-[#C5A47E] text-black font-bold'
                        : 'bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-gray-200 border border-[#262626]'
                    }`}
                  >
                    {t === 'all' ? 'Any' : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action List Display */}
          <div className="space-y-2">
            {actionableItems.length === 0 ? (
              <div className="bg-[#121212] rounded-2xl border border-dashed border-[#242424] p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-200 font-serif">
                  No Actions Matching Current Filter
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Adjust your context/energy filters or capture a new next action for your active projects.
                </p>
              </div>
            ) : (
              actionableItems.map((action) => {
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
                          <span className="px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300 font-mono font-medium border border-[#282828]">
                            {action.context}
                          </span>

                          <span className={`px-2 py-0.5 rounded font-medium capitalize ${
                            action.energy === 'high'
                              ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                              : action.energy === 'medium'
                              ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                              : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                          }`}>
                            {action.energy} energy
                          </span>

                          <span className="px-2 py-0.5 rounded bg-[#C5A47E]/10 text-[#C5A47E] font-medium border border-[#C5A47E]/20">
                            ⏱ {action.timeEstimate}
                          </span>

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
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick GTD Triage & Side Panels */}
        <div className="space-y-6">
          
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

          {/* Quick Altitude Links Guide */}
          <div className="bg-[#141414] rounded-2xl border border-[#262626] p-5 space-y-3">
            <h4 className="text-xs font-bold text-[#C5A47E] uppercase tracking-wider">
              The 6 Altitudes of GTD
            </h4>
            <ul className="text-xs space-y-2 text-gray-300">
              <li className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
                <span className="font-semibold text-white">H5 • 50,000+ ft:</span>
                <span className="text-gray-400">Life Purpose & Principles</span>
              </li>
              <li className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
                <span className="font-semibold text-white">H4 • 40,000 ft:</span>
                <span className="text-gray-400">3-5 Year Vision</span>
              </li>
              <li className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
                <span className="font-semibold text-white">H3 • 30,000 ft:</span>
                <span className="text-gray-400">1-2 Year Goals</span>
              </li>
              <li className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
                <span className="font-semibold text-white">H2 • 20,000 ft:</span>
                <span className="text-gray-400">Areas of Focus</span>
              </li>
              <li className="flex items-center justify-between pb-1.5 border-b border-[#262626]">
                <span className="font-semibold text-white">H1 • 10,000 ft:</span>
                <span className="text-gray-400">Current Projects</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-semibold text-white">Ground • Runway:</span>
                <span className="text-gray-400">Next Physical Actions</span>
              </li>
            </ul>

            <button
              onClick={() => setActiveTab('horizons')}
              className="w-full mt-2 py-2 text-xs font-bold text-[#C5A47E] bg-[#1E1E1E] hover:bg-[#262626] border border-[#262626] hover:border-[#C5A47E]/40 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Explore Horizon Alignment Tree</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
