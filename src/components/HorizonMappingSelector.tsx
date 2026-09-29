import React, { useState, useMemo } from 'react';
import {
  Target,
  ShieldCheck,
  ArrowRight,
  X,
  Plus,
  Info,
  Check,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { HorizonItem } from '../types/gtd';
import { useGTD } from '../context/GTDContext';
import { getHorizonItemDomain } from '../utils/domainHierarchy';

export interface HorizonMappingSelectorProps {
  selectedGoalId?: string; // Horizon 3 Goal
  selectedAreaId?: string; // Horizon 2 Area of Focus
  onGoalChange: (goalId: string, autoAssociatedAreaId?: string, domain?: string) => void;
  onAreaChange: (areaId: string, domain?: string) => void;
  projectTitle?: string;
  compact?: boolean;
  onOpenCreateHorizon?: (level: 2 | 3, parentId?: string) => void;
}

export const HorizonMappingSelector: React.FC<HorizonMappingSelectorProps> = ({
  selectedGoalId = '',
  selectedAreaId = '',
  onGoalChange,
  onAreaChange,
  projectTitle = '',
  compact = false,
  onOpenCreateHorizon,
}) => {
  const { horizonItems } = useGTD();
  const [filterGoalsByArea, setFilterGoalsByArea] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Horizon 2 Areas and Horizon 3 Goals
  const areasOfFocus = useMemo(
    () => horizonItems.filter((h) => h.level === 2 && h.status !== 'archived'),
    [horizonItems]
  );

  const goals = useMemo(
    () => horizonItems.filter((h) => h.level === 3 && h.status !== 'archived'),
    [horizonItems]
  );

  // Active selected entities
  const currentGoal = useMemo(
    () => (selectedGoalId ? goals.find((g) => g.id === selectedGoalId) : undefined),
    [goals, selectedGoalId]
  );

  const currentArea = useMemo(
    () => (selectedAreaId ? areasOfFocus.find((a) => a.id === selectedAreaId) : undefined),
    [areasOfFocus, selectedAreaId]
  );

  // Goal's inherent parent area (if defined in GTD hierarchy)
  const goalParentArea = useMemo(() => {
    if (!currentGoal || !currentGoal.parentId) return undefined;
    return areasOfFocus.find((a) => a.id === currentGoal.parentId);
  }, [currentGoal, areasOfFocus]);

  // Filtered goals for selection
  const filteredGoals = useMemo(() => {
    if (!selectedAreaId || !filterGoalsByArea) return goals;
    return goals.filter((g) => g.parentId === selectedAreaId);
  }, [goals, selectedAreaId, filterGoalsByArea]);

  // Count goals belonging to each area
  const goalCountByArea = useMemo(() => {
    const map = new Map<string, number>();
    goals.forEach((g) => {
      if (g.parentId) {
        map.set(g.parentId, (map.get(g.parentId) || 0) + 1);
      }
    });
    return map;
  }, [goals]);

  // Alignment status
  const alignmentType = useMemo(() => {
    if (selectedGoalId && selectedAreaId) {
      if (currentGoal?.parentId && currentGoal.parentId === selectedAreaId) {
        return 'full-direct'; // Goal directly belongs to this area
      }
      return 'cross-aligned'; // Goal and Area are both selected
    }
    if (selectedAreaId) return 'area-only';
    if (selectedGoalId) return 'goal-only';
    return 'unanchored';
  }, [selectedGoalId, selectedAreaId, currentGoal]);

  const handleSelectGoal = (newGoalId: string) => {
    if (!newGoalId) {
      onGoalChange('', undefined, undefined);
      return;
    }
    const goal = goals.find((g) => g.id === newGoalId);
    let autoAreaId: string | undefined = undefined;
    if (goal && goal.parentId) {
      autoAreaId = goal.parentId;
    }
    const goalDomain = getHorizonItemDomain(goal, horizonItems);
    onGoalChange(newGoalId, autoAreaId, goalDomain);
  };

  const handleSelectArea = (newAreaId: string) => {
    if (!newAreaId) {
      onAreaChange('', undefined);
      return;
    }
    const area = areasOfFocus.find((a) => a.id === newAreaId);
    const areaDomain = getHorizonItemDomain(area, horizonItems);
    onAreaChange(newAreaId, areaDomain);
  };

  const handleClearAll = () => {
    onGoalChange('', undefined, undefined);
    onAreaChange('', undefined);
  };

  return (
    <div className="bg-[#171717] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Header with Title and Alignment Status */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Horizons Alignment (H3 / H2)
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-gray-500 hover:text-[#C5A47E] transition-colors cursor-pointer p-0.5"
                title="What is H3 / H2 Mapping?"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Anchor this project to a 1–2 Year Goal and an Area of Focus
            </p>
          </div>
        </div>

        {/* Alignment Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {alignmentType === 'full-direct' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 shadow-xs">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Direct H3 ➔ H2</span>
            </span>
          )}
          {alignmentType === 'cross-aligned' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950/70 text-sky-300 border border-sky-800/60 shadow-xs">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Aligned H3 & H2</span>
            </span>
          )}
          {alignmentType === 'area-only' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="w-3 h-3" />
              <span>H2 Area Only</span>
            </span>
          )}
          {alignmentType === 'goal-only' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950/50 text-sky-400 border border-sky-800/40">
              <Target className="w-3 h-3" />
              <span>H3 Goal Only</span>
            </span>
          )}
          {alignmentType === 'unanchored' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#222222] text-gray-400 border border-[#333333]">
              Unanchored
            </span>
          )}

          {(selectedGoalId || selectedAreaId) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] text-gray-500 hover:text-rose-400 underline transition-colors cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* GTD Altitude Guidance Tooltip / Info */}
      {showHelp && (
        <div className="p-3 bg-[#1D1B18] border border-[#C5A47E]/30 rounded-xl text-xs text-gray-300 space-y-1.5 animate-fadeIn">
          <div className="font-bold text-[#C5A47E] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GTD Horizons Altitude Hierarchy</span>
          </div>
          <p className="text-gray-300 leading-relaxed text-[11px]">
            In Getting Things Done®, multi-step outcomes (<span className="text-amber-300 font-semibold">Horizon 1: Projects</span>) don't float disconnected.
            They either fulfill a medium-term milestone (<span className="text-sky-300 font-semibold">Horizon 3: 1–2 Year Goal</span>),
            maintain an ongoing role (<span className="text-emerald-300 font-semibold">Horizon 2: Area of Focus</span>), or both.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-gray-400">
            <div className="p-2 rounded bg-black/40 border border-[#2D2820]">
              <span className="font-bold text-sky-400 block mb-0.5">Strategic Projects</span>
              Link to an <strong className="text-gray-200">H3 Goal</strong> (e.g. "Run Marathon") which inherits its <strong className="text-gray-200">H2 Area</strong> ("Health & Vitality").
            </div>
            <div className="p-2 rounded bg-black/40 border border-[#2D2820]">
              <span className="font-bold text-emerald-400 block mb-0.5">Operational Projects</span>
              Link directly to an <strong className="text-gray-200">H2 Area</strong> without a goal (e.g. "Taxes 2026", "Quarterly Maintenance").
            </div>
          </div>
        </div>
      )}

      {/* Cascade Breadcrumb Connection Diagram */}
      <div className="bg-[#121212] border border-[#252525] rounded-xl p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          
          {/* H3 Goal Node */}
          <div
            className={`flex-1 p-2.5 rounded-lg border transition-all ${
              currentGoal
                ? 'bg-sky-950/40 border-sky-800/50 text-sky-200'
                : 'bg-[#181818] border-dashed border-[#2E2E2E] text-gray-500'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/40">
                H3 • 30,000 ft Goal
              </span>
              {currentGoal && (
                <button
                  type="button"
                  onClick={() => onGoalChange('', undefined, undefined)}
                  className="text-gray-400 hover:text-rose-400 p-0.5 cursor-pointer"
                  title="Unlink H3 Goal"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="font-medium truncate text-xs">
              {currentGoal ? currentGoal.title : 'No Goal Linked (Optional)'}
            </div>
            {(() => {
              const goalDomain = getHorizonItemDomain(currentGoal, horizonItems);
              return goalDomain ? (
                <div className="text-[10px] text-sky-400/80 truncate mt-0.5">
                  {goalDomain}
                </div>
              ) : null;
            })()}
          </div>

          {/* Connector Arrow */}
          <div className="flex items-center justify-center text-gray-600 sm:rotate-0 rotate-90 py-1 sm:py-0">
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>

          {/* H2 Area Node */}
          <div
            className={`flex-1 p-2.5 rounded-lg border transition-all ${
              currentArea
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
                : 'bg-[#181818] border-dashed border-[#2E2E2E] text-gray-500'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
                H2 • 20,000 ft Area
              </span>
              {currentArea && (
                <button
                  type="button"
                  onClick={() => onAreaChange('', undefined)}
                  className="text-gray-400 hover:text-rose-400 p-0.5 cursor-pointer"
                  title="Unlink H2 Area"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="font-medium truncate text-xs">
              {currentArea ? currentArea.title : 'No Area Linked'}
            </div>
            {(() => {
              const areaDomain = getHorizonItemDomain(currentArea, horizonItems);
              return areaDomain ? (
                <div className="text-[10px] text-emerald-400/80 truncate mt-0.5">
                  {areaDomain}
                </div>
              ) : null;
            })()}
          </div>

          {/* Connector Arrow */}
          <div className="flex items-center justify-center text-gray-600 sm:rotate-0 rotate-90 py-1 sm:py-0">
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>

          {/* H1 Project (Target) Node */}
          <div className="flex-1 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/40">
                H1 • 10,000 ft Project
              </span>
            </div>
            <div className="font-medium truncate text-xs text-white">
              {projectTitle.trim() || 'This Project'}
            </div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">
              Target Outcome
            </div>
          </div>

        </div>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        
        {/* Horizon 2 (Area of Focus) Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Horizon 2: Area of Focus</span>
            </label>
            {onOpenCreateHorizon && (
              <button
                type="button"
                onClick={() => onOpenCreateHorizon(2)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Area</span>
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedAreaId}
              onChange={(e) => handleSelectArea(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[#191919] border border-[#2A2A2A] rounded-xl focus:outline-hidden focus:border-emerald-500 text-gray-200 cursor-pointer appearance-none pr-8"
            >
              <option value="">-- No Area of Focus (Direct Standalone) --</option>
              {areasOfFocus.map((area) => {
                const count = goalCountByArea.get(area.id) || 0;
                const domain = getHorizonItemDomain(area, horizonItems);
                return (
                  <option key={area.id} value={area.id}>
                    {area.title} {domain ? `• ${domain}` : ''} {count > 0 ? `(${count} goals)` : ''}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-[10px]">
              ▼
            </div>
          </div>

          {currentArea && (
            <div className="flex items-center justify-between text-[11px] text-emerald-400/90 px-1 pt-0.5">
              <span>{getHorizonItemDomain(currentArea, horizonItems) || 'Domain Pending'}</span>
              <span className="text-gray-500 font-mono">
                {goalCountByArea.get(currentArea.id) || 0} active goals
              </span>
            </div>
          )}
        </div>

        {/* Horizon 3 (1–2 Year Goal) Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-sky-400" />
              <span>Horizon 3: 1–2y Goal</span>
            </label>
            {onOpenCreateHorizon && (
              <button
                type="button"
                onClick={() => onOpenCreateHorizon(3, selectedAreaId || undefined)}
                className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Goal</span>
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedGoalId}
              onChange={(e) => handleSelectGoal(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-[#191919] border border-[#2A2A2A] rounded-xl focus:outline-hidden focus:border-sky-500 text-gray-200 cursor-pointer appearance-none pr-8"
            >
              <option value="">-- No H3 Goal Linked (Operational / Direct Area) --</option>
              {filteredGoals.map((goal) => {
                const parent = areasOfFocus.find((a) => a.id === goal.parentId);
                return (
                  <option key={goal.id} value={goal.id}>
                    {goal.title} {parent ? `[${parent.title}]` : ''}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-[10px]">
              ▼
            </div>
          </div>

          {/* Filter toggle if Area is selected */}
          {selectedAreaId && (
            <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
              <button
                type="button"
                onClick={() => setFilterGoalsByArea(!filterGoalsByArea)}
                className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <Filter className="w-3 h-3 text-[#C5A47E]" />
                <span>
                  {filterGoalsByArea ? 'Filtering to this area' : 'Showing all goals'}
                </span>
              </button>
              <span className="text-gray-500 text-[10px]">
                {filteredGoals.length} available
              </span>
            </div>
          )}

          {/* Goal Alignment feedback banner */}
          {currentGoal && goalParentArea && (
            <div className="flex items-center gap-1 text-[10px] text-sky-300/80 px-1 pt-0.5">
              <span>Goal Area:</span>
              <strong className="text-white font-medium">{goalParentArea.title}</strong>
              {selectedAreaId && selectedAreaId !== goalParentArea.id && (
                <button
                  type="button"
                  onClick={() => handleSelectArea(goalParentArea.id)}
                  className="ml-auto text-[#C5A47E] hover:underline cursor-pointer"
                >
                  Sync to this Area
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
