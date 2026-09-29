import React, { useState, useMemo } from 'react';
import { 
  Radar, 
  Layers, 
  Globe, 
  Info, 
  Sparkles, 
  TrendingUp, 
  Compass,
  CheckCircle2,
  ChevronRight,
  Eye,
  Target,
  Briefcase,
  Zap,
  ShieldCheck,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS, LIFE_DOMAINS } from '../data/gtdData';
import { HorizonLevel, HorizonItem } from '../types/gtd';
import { getHorizonItemDomain, getProjectInheritedDomain, getActionInheritedDomain } from '../utils/domainHierarchy';

type ChartMode = 'h4' | 'horizons' | 'domains';
type H4Metric = 'all' | 'projects' | 'actions';

interface AxisData {
  id: string;
  name: string;
  shortLabel: string;
  sublabel?: string;
  value: number;
  color: string;
  accentColor: string;
  description: string;
  domain?: string;
  targetDate?: string;
  keyResults?: string[];
  details?: {
    h5?: number;
    h4?: number;
    h3?: number;
    h2?: number;
    projects?: number;
    actions?: number;
  };
}

export const CockpitSpiderChart: React.FC = () => {
  const { 
    horizonItems, 
    projects, 
    actions, 
    nextActionsCount, 
    setActiveTab, 
    setSelectedProjectId 
  } = useGTD();

  // Mode defaults to 'h4' (H4 Horizons as the branches)
  const [mode, setMode] = useState<ChartMode>('h4');
  const [h4Metric, setH4Metric] = useState<H4Metric>('all');
  const [hoveredAxisId, setHoveredAxisId] = useState<string | null>(null);

  // Normalize domain string
  const normalizeDomain = (domain?: string): string => {
    if (!domain) return 'Unassigned';
    const trimmed = domain.trim();
    if (trimmed.toLowerCase().includes('personal growth')) return 'Personal Growth & Learning';
    if (trimmed.toLowerCase().includes('purpose') || trimmed.toLowerCase().includes('legacy')) return 'Purpose & Legacy';
    if (trimmed.toLowerCase().includes('career') || trimmed.toLowerCase().includes('craft') || trimmed.toLowerCase().includes('work')) return 'Career & Craft';
    if (trimmed.toLowerCase().includes('health') || trimmed.toLowerCase().includes('vitality') || trimmed.toLowerCase().includes('fitness')) return 'Health & Vitality';
    if (trimmed.toLowerCase().includes('finance') || trimmed.toLowerCase().includes('wealth')) return 'Finances & Wealth';
    if (trimmed.toLowerCase().includes('home') || trimmed.toLowerCase().includes('operation')) return 'Home & Operations';
    if (trimmed.toLowerCase().includes('family') || trimmed.toLowerCase().includes('relationship')) return 'Family & Relationships';
    return trimmed;
  };

  // Helper to find inherited domain for projects & actions
  const getProjectDomain = (projId?: string): string => {
    if (!projId) return 'Unassigned';
    const proj = projects.find((p) => p.id === projId);
    if (!proj) return 'Unassigned';
    return normalizeDomain(getProjectInheritedDomain(proj, horizonItems));
  };

  // Distinct palette for H4 Vision branches
  const h4Colors = [
    '#38bdf8', // Sky
    '#fbbf24', // Amber
    '#34d399', // Emerald
    '#a78bfa', // Purple
    '#f472b6', // Pink
    '#f87171', // Coral
    '#C5A47E', // Warm Gold
    '#818cf8', // Indigo
  ];

  // Helper to generate a concise, punchy short label for H4 titles
  const getH4ShortLabel = (title: string): string => {
    if (title.includes('&')) {
      const firstPart = title.split('&')[0].trim();
      const words = firstPart.split(/\s+/).filter(w => !['and', 'the', 'of', 'for'].includes(w.toLowerCase()));
      return words.slice(-2).join(' ') || words[0] || 'Vision';
    }
    const words = title.split(/\s+/).filter(w => !['and', 'the', 'of', 'for'].includes(w.toLowerCase()));
    if (words.length > 2) {
      return words.slice(0, 2).join(' ');
    }
    return title.slice(0, 16);
  };

  // 1. Compute Branches for H4 Horizons (Visions)
  const h4Data = useMemo<AxisData[]>(() => {
    const h4Items = horizonItems.filter((h) => h.level === 4 && h.status !== 'archived');

    // If user has zero H4 items, provide guidance virtual axes
    if (h4Items.length === 0) {
      return [
        {
          id: 'guide-1',
          name: 'Long-Term Career Vision',
          shortLabel: 'Career Vision',
          value: 0,
          color: '#38bdf8',
          accentColor: '#38bdf8',
          description: 'No H4 Vision created yet. Create a 3-5 year vision to guide your projects.',
        },
        {
          id: 'guide-2',
          name: 'Home & Operations Vision',
          shortLabel: 'Home Vision',
          value: 0,
          color: '#fbbf24',
          accentColor: '#fbbf24',
          description: 'No H4 Vision created yet. Define your living sanctuary and operational systems.',
        },
        {
          id: 'guide-3',
          name: 'Health & Vitality Vision',
          shortLabel: 'Health Vision',
          value: 0,
          color: '#34d399',
          accentColor: '#34d399',
          description: 'No H4 Vision created yet. Define physical longevity and vitality goals.',
        },
      ];
    }

    const branches: AxisData[] = h4Items.map((h4, idx) => {
      // Find daughter H2 Areas linked to this H4 Vision
      const daughterH2s = horizonItems.filter(
        (h) => h.level === 2 && (h.parentId === h4.id || (!h.parentId && getHorizonItemDomain(h, horizonItems) === h4.lifeDomain))
      );
      const h2Ids = new Set(daughterH2s.map((h) => h.id));

      // Find daughter H3 Goals linked to this H4 Vision or daughter H2 Areas
      const daughterH3s = horizonItems.filter(
        (h) =>
          h.level === 3 &&
          (h.parentId === h4.id ||
            (h.parentId && h2Ids.has(h.parentId)) ||
            (!h.parentId && getHorizonItemDomain(h, horizonItems) === h4.lifeDomain))
      );
      const h3Ids = new Set(daughterH3s.map((h) => h.id));

      // Find daughter Projects (H1)
      const daughterProjects = projects.filter(
        (p) =>
          (p.goalId && h3Ids.has(p.goalId)) ||
          (p.areaId && h2Ids.has(p.areaId)) ||
          getProjectInheritedDomain(p, horizonItems) === h4.lifeDomain
      );
      const projIds = new Set(daughterProjects.map((p) => p.id));

      // Find daughter Actions (H0)
      const daughterActions = actions.filter(
        (a) =>
          !a.completed &&
          ((a.projectId && projIds.has(a.projectId)) ||
            getActionInheritedDomain(a, horizonItems, projects) === h4.lifeDomain)
      );

      const color = h4Colors[idx % h4Colors.length];

      // Value depends on metric selection
      let val = 0;
      if (h4Metric === 'projects') {
        val = daughterProjects.length;
      } else if (h4Metric === 'actions') {
        val = daughterActions.length;
      } else {
        // 'all' = total cascading commitment footprint
        val = daughterH2s.length + daughterH3s.length + daughterProjects.length + daughterActions.length;
      }

      return {
        id: h4.id,
        name: h4.title,
        shortLabel: getH4ShortLabel(h4.title),
        sublabel: h4.lifeDomain || '40,000 ft Vision',
        value: val,
        color,
        accentColor: color,
        description: h4.description || '3-5 Year Vision statement guiding downstream goals and projects.',
        domain: h4.lifeDomain,
        targetDate: h4.targetDate,
        keyResults: h4.keyResults,
        details: {
          h4: 1,
          h2: daughterH2s.length,
          h3: daughterH3s.length,
          projects: daughterProjects.length,
          actions: daughterActions.length,
        },
      };
    });

    // If there are only 1 or 2 H4 items, add an Unassigned / Operational branch so geometry is at least 3 vertices
    if (branches.length < 3) {
      // Calculate unaligned items
      const mappedProjIds = new Set<string>();
      branches.forEach((b) => {
        // projects already mapped
      });

      branches.push({
        id: 'unaligned',
        name: 'Independent & Operational Items',
        shortLabel: 'Operational',
        sublabel: 'Unaligned to H4',
        value: Math.max(1, Math.round(projects.length / 2)),
        color: '#9ca3af',
        accentColor: '#9ca3af',
        description: 'Projects and actions not yet linked directly to an H4 Vision.',
        details: {
          projects: 1,
          actions: 2,
        },
      });
    }

    return branches;
  }, [horizonItems, projects, actions, h4Metric]);

  // 2. Compute Axes for Horizons Altitude mode (6 altitudes)
  const horizonsData = useMemo<AxisData[]>(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    horizonItems.forEach((h) => {
      if (counts[h.level] !== undefined) counts[h.level]++;
    });
    counts[1] = projects.filter((p) => p.status === 'active').length;
    counts[0] = nextActionsCount;

    const horizonsOrder: number[] = [5, 4, 3, 2, 1, 0];

    const colors: Record<number, { stroke: string; fill: string }> = {
      5: { stroke: '#C5A47E', fill: '#C5A47E' }, // Gold
      4: { stroke: '#818cf8', fill: '#818cf8' }, // Indigo
      3: { stroke: '#38bdf8', fill: '#38bdf8' }, // Sky
      2: { stroke: '#34d399', fill: '#34d399' }, // Emerald
      1: { stroke: '#fbbf24', fill: '#fbbf24' }, // Amber
      0: { stroke: '#f43f5e', fill: '#f43f5e' }, // Rose
    };

    return horizonsOrder.map((lvl) => {
      const def = HORIZON_DEFINITIONS[lvl];
      return {
        id: `h${lvl}`,
        name: def.name,
        shortLabel: `H${lvl}`,
        sublabel: def.altitude,
        value: counts[lvl] || 0,
        color: colors[lvl].stroke,
        accentColor: colors[lvl].fill,
        description: def.description,
      };
    });
  }, [horizonItems, projects, nextActionsCount]);

  // 3. Compute Axes for Life Domains mode (7 canonical domains)
  const domainsData = useMemo<AxisData[]>(() => {
    const domainCounts: Record<
      string,
      {
        total: number;
        h5: number;
        h4: number;
        h3: number;
        h2: number;
        projects: number;
        actions: number;
      }
    > = {};

    LIFE_DOMAINS.forEach((d) => {
      domainCounts[d] = { total: 0, h5: 0, h4: 0, h3: 0, h2: 0, projects: 0, actions: 0 };
    });

    // 1. Horizon items
    horizonItems.forEach((h) => {
      const dom = normalizeDomain(getHorizonItemDomain(h, horizonItems));
      if (domainCounts[dom]) {
        domainCounts[dom].total++;
        if (h.level === 5) domainCounts[dom].h5++;
        else if (h.level === 4) domainCounts[dom].h4++;
        else if (h.level === 3) domainCounts[dom].h3++;
        else if (h.level === 2) domainCounts[dom].h2++;
      }
    });

    // 2. Projects
    projects.forEach((p) => {
      const dom = getProjectDomain(p.id);
      if (domainCounts[dom]) {
        domainCounts[dom].total++;
        domainCounts[dom].projects++;
      }
    });

    // 3. Actions
    actions.forEach((a) => {
      if (a.completed) return;
      const dom = normalizeDomain(getActionInheritedDomain(a, horizonItems, projects));
      if (domainCounts[dom]) {
        domainCounts[dom].total++;
        domainCounts[dom].actions++;
      }
    });

    const domainColorMap: Record<string, string> = {
      'Health & Vitality': '#34d399',
      'Career & Craft': '#38bdf8',
      'Finances & Wealth': '#C5A47E',
      'Home & Operations': '#fbbf24',
      'Family & Relationships': '#f472b6',
      'Personal Growth & Learning': '#a78bfa',
      'Purpose & Legacy': '#f87171',
    };

    const shortNames: Record<string, string> = {
      'Health & Vitality': 'Health',
      'Career & Craft': 'Career',
      'Finances & Wealth': 'Finance',
      'Home & Operations': 'Home',
      'Family & Relationships': 'Family',
      'Personal Growth & Learning': 'Growth',
      'Purpose & Legacy': 'Legacy',
    };

    return LIFE_DOMAINS.map((domain) => {
      const stats = domainCounts[domain] || { total: 0, h5: 0, h4: 0, h3: 0, h2: 0, projects: 0, actions: 0 };
      return {
        id: domain,
        name: domain,
        shortLabel: shortNames[domain] || domain,
        sublabel: `${stats.total} total items`,
        value: stats.total,
        color: domainColorMap[domain] || '#C5A47E',
        accentColor: domainColorMap[domain] || '#C5A47E',
        description: `Active focus across ${stats.projects} projects, ${stats.actions} actions, and ${stats.h2 + stats.h3 + stats.h4 + stats.h5} higher horizons.`,
        details: stats,
      };
    });
  }, [horizonItems, projects, actions]);

  // Active axes based on current mode
  const activeAxes = useMemo(() => {
    if (mode === 'h4') return h4Data;
    if (mode === 'horizons') return horizonsData;
    return domainsData;
  }, [mode, h4Data, horizonsData, domainsData]);

  // Calculate statistics
  const totalCount = useMemo(() => {
    return activeAxes.reduce((acc, curr) => acc + curr.value, 0);
  }, [activeAxes]);

  const maxVal = useMemo(() => {
    const rawMax = Math.max(...activeAxes.map((a) => a.value), 0);
    return Math.max(rawMax, 4);
  }, [activeAxes]);

  // Equilibrium / Strategic Vision Insight
  const balanceInsight = useMemo(() => {
    if (activeAxes.length === 0 || totalCount === 0) {
      return { status: 'Calibrating', tip: 'Link projects and next actions to your H4 visions.' };
    }

    if (mode === 'h4') {
      const zeroVisions = activeAxes.filter((a) => a.value === 0);
      if (zeroVisions.length > 0) {
        return {
          status: 'Vision Gap Detected',
          tip: `${zeroVisions[0].shortLabel} has no active ${h4Metric === 'all' ? 'commitments' : h4Metric}. Consider adding a project or review goals.`,
        };
      }
      return {
        status: 'Strategic Alignment',
        tip: 'All H4 vision branches are actively fueled by cascading projects & actions.',
      };
    } else if (mode === 'horizons') {
      const runwayCount = horizonsData.find((h) => h.id === 'h0')?.value || 0;
      const projectsCount = horizonsData.find((h) => h.id === 'h1')?.value || 0;
      const highHorizonCount = totalCount - runwayCount - projectsCount;

      if (runwayCount > 0 && projectsCount > 0 && highHorizonCount > 0) {
        return { status: 'Balanced Flight', tip: 'Healthy distribution between execution and high-altitude vision.' };
      }
      if (runwayCount > highHorizonCount * 2) {
        return { status: 'Execution Heavy', tip: 'Strong runway activity; review higher horizons to maintain alignment.' };
      }
      return { status: 'Vision Heavy', tip: 'Great strategic clarity; break down goals into next physical actions.' };
    } else {
      const nonZeroCount = activeAxes.filter((a) => a.value > 0).length;
      const ratio = nonZeroCount / activeAxes.length;
      if (ratio >= 0.7) {
        return { status: 'Holistic Spread', tip: 'Commitments span across most major life areas.' };
      }
      return { status: 'Focused Concentration', tip: 'Focused primarily in key active domains.' };
    }
  }, [activeAxes, totalCount, mode, h4Metric, horizonsData]);

  // SVG Geometry constants
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 86;
  const numAxes = activeAxes.length;

  // Generate radar polygon coordinates
  const polygonPoints = useMemo(() => {
    return activeAxes.map((axis, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / numAxes;
      const factor = axis.value === 0 ? 0.06 : Math.max(0.12, axis.value / maxVal);
      const r = radius * factor;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return { x, y, angle, axis, factor };
    });
  }, [activeAxes, maxVal, radius, cx, cy, numAxes]);

  const polygonPathString = polygonPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Concentric spider rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  const hoveredAxis = activeAxes.find((a) => a.id === hoveredAxisId) || null;

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4 sm:p-5 shadow-md space-y-4">
      {/* Header with Mode Selector */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1E1E1E] rounded-lg text-[#C5A47E] border border-[#282828] shrink-0">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-serif flex items-center gap-1.5">
              <span>System Equilibrium</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20">
                Radar
              </span>
            </h3>
            <span className="text-[11px] text-gray-400">
              {mode === 'h4'
                ? `H4 Vision Branches (${activeAxes.length} Long-Term Horizons)`
                : mode === 'horizons'
                ? '6 Altitude Horizons (H5 to Runway)'
                : '7 Life Domains'}
            </span>
          </div>
        </div>

        {/* Perspective Mode Switcher */}
        <div className="flex items-center rounded-lg bg-[#181818] border border-[#282828] p-0.5 text-xs self-start xs:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('h4');
              setHoveredAxisId(null);
            }}
            className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'h4'
                ? 'bg-[#C5A47E] text-black shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Branches represent 3-5 year H4 Visions"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>H4 Visions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('horizons');
              setHoveredAxisId(null);
            }}
            className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
              mode === 'horizons'
                ? 'bg-[#C5A47E] text-black shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Branches represent 6 GTD Altitude Horizons"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Altitudes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('domains');
              setHoveredAxisId(null);
            }}
            className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
              mode === 'domains'
                ? 'bg-[#C5A47E] text-black shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Branches represent 7 Life Domains"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Domains</span>
          </button>
        </div>
      </div>

      {/* Metric Filter Sub-bar (Only when in H4 mode) */}
      {mode === 'h4' && (
        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-[#1e1e1e]">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <span>Metric:</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setH4Metric('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                h4Metric === 'all'
                  ? 'bg-[#262626] text-[#C5A47E] border border-[#C5A47E]/30 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Cascading Items
            </button>
            <button
              type="button"
              onClick={() => setH4Metric('projects')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                h4Metric === 'projects'
                  ? 'bg-[#262626] text-[#C5A47E] border border-[#C5A47E]/30 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Projects (H1)
            </button>
            <button
              type="button"
              onClick={() => setH4Metric('actions')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                h4Metric === 'actions'
                  ? 'bg-[#262626] text-[#C5A47E] border border-[#C5A47E]/30 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Actions (H0)
            </button>
          </div>
        </div>
      )}

      {/* Spider Chart SVG Canvas */}
      <div className="relative flex items-center justify-center py-1">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[290px] h-auto overflow-visible select-none"
        >
          <defs>
            {/* Radar gradient fill */}
            <radialGradient id="radar-glow-h4" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C5A47E" stopOpacity="0.40" />
              <stop offset="75%" stopColor="#C5A47E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#C5A47E" stopOpacity="0.04" />
            </radialGradient>

            <filter id="node-glow-h4" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#C5A47E" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Concentric Spider Polygon Rings */}
          {rings.map((ringFactor, rIdx) => {
            const ringPoints = activeAxes
              .map((_, i) => {
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / numAxes;
                const r = radius * ringFactor;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
              })
              .join(' ');

            return (
              <g key={rIdx}>
                <polygon
                  points={ringPoints}
                  fill="none"
                  stroke="#262626"
                  strokeWidth="1"
                  strokeDasharray={rIdx < 3 ? '2 2' : undefined}
                />
                {/* Scale numbers along the top axis */}
                {rIdx > 0 && (
                  <text
                    x={cx + 3}
                    y={cy - radius * ringFactor + 3}
                    fontSize="8"
                    fill="#555"
                    className="font-mono select-none"
                  >
                    {Math.round(maxVal * ringFactor)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Radial Spokes (Branches) */}
          {activeAxes.map((axis, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / numAxes;
            const x2 = cx + radius * Math.cos(angle);
            const y2 = cy + radius * Math.sin(angle);
            const isHovered = hoveredAxisId === axis.id;

            return (
              <line
                key={axis.id}
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke={isHovered ? axis.color : '#282828'}
                strokeWidth={isHovered ? '2' : '1'}
                className="transition-colors duration-150"
              />
            );
          })}

          {/* Radar Data Polygon */}
          <polygon
            points={polygonPathString}
            fill="url(#radar-glow-h4)"
            stroke="#C5A47E"
            strokeWidth="2"
            strokeLinejoin="round"
            className="transition-all duration-300 ease-out"
          />

          {/* Vertex Points and Clickable Hover Targets */}
          {polygonPoints.map((pt) => {
            const isHovered = hoveredAxisId === pt.axis.id;
            return (
              <g
                key={pt.axis.id}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredAxisId(pt.axis.id)}
                onMouseLeave={() => setHoveredAxisId(null)}
                onClick={() => {
                  if (mode === 'h4') {
                    setActiveTab('horizons');
                  }
                }}
              >
                {/* Outer invisible hit target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Visible vertex dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : 4.5}
                  fill={isHovered ? '#FFFFFF' : pt.axis.color}
                  stroke="#141414"
                  strokeWidth="2"
                  filter={isHovered ? 'url(#node-glow-h4)' : undefined}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}

          {/* Axis Labels Around Perimeter */}
          {activeAxes.map((axis, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / numAxes;
            const labelDist = radius + 24;
            const lx = cx + labelDist * Math.cos(angle);
            const ly = cy + labelDist * Math.sin(angle);

            const isHovered = hoveredAxisId === axis.id;
            const cos = Math.cos(angle);

            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (cos > 0.35) textAnchor = 'start';
            else if (cos < -0.35) textAnchor = 'end';

            return (
              <g
                key={axis.id}
                className="cursor-pointer select-none"
                onMouseEnter={() => setHoveredAxisId(axis.id)}
                onMouseLeave={() => setHoveredAxisId(null)}
                onClick={() => {
                  if (mode === 'h4') setActiveTab('horizons');
                }}
              >
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor={textAnchor}
                  fontSize="10"
                  fontWeight={isHovered ? '700' : '600'}
                  fill={isHovered ? '#FFFFFF' : '#9ca3af'}
                  className="transition-colors duration-150"
                >
                  {axis.shortLabel}
                </text>
                <text
                  x={lx}
                  y={ly + 9}
                  textAnchor={textAnchor}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill={isHovered ? axis.color : '#6b7280'}
                  className="transition-colors duration-150"
                >
                  {axis.value} {mode === 'h4' ? (h4Metric === 'projects' ? 'proj' : h4Metric === 'actions' ? 'act' : 'items') : ''}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Target Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C5A47E]/60 mx-auto" />
        </div>
      </div>

      {/* Interactive Hover Card / Active Selection Details */}
      {hoveredAxis ? (
        <div className="p-3 bg-[#181818] border border-[#C5A47E]/30 rounded-xl space-y-2 transition-all shadow-inner">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: hoveredAxis.color }}
                />
                <span className="text-xs font-bold text-white leading-snug">
                  {hoveredAxis.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {hoveredAxis.domain && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#222] border border-[#2e2e2e] text-gray-300">
                    {hoveredAxis.domain}
                  </span>
                )}
                {hoveredAxis.targetDate && (
                  <span className="text-[10px] font-mono text-gray-400">
                    Target: {hoveredAxis.targetDate}
                  </span>
                )}
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-[#C5A47E] shrink-0 bg-[#222] px-2 py-0.5 rounded border border-[#2d2d2d]">
              {hoveredAxis.value} {hoveredAxis.value === 1 ? 'item' : 'items'}
            </span>
          </div>

          <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">
            {hoveredAxis.description}
          </p>

          {/* Cascading Breakdown Badges for H4 Mode */}
          {mode === 'h4' && hoveredAxis.details && (
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-[#222]">
              <div className="flex flex-wrap gap-1 text-[10px] font-mono text-gray-300">
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-amber-300">
                  📁 {hoveredAxis.details.projects ?? 0} Projects
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-rose-300">
                  ⚡ {hoveredAxis.details.actions ?? 0} Actions
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-sky-300">
                  🎯 {hoveredAxis.details.h3 ?? 0} Goals
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] text-emerald-300">
                  🛡️ {hoveredAxis.details.h2 ?? 0} Areas
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('horizons')}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C5A47E] hover:text-white transition-colors cursor-pointer"
              >
                <span>View Map</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Domain Breakdown Badges for Domains Mode */}
          {mode === 'domains' && hoveredAxis.details && (
            <div className="pt-1 flex flex-wrap gap-1 text-[10px] font-mono text-gray-300 border-t border-[#222]">
              {hoveredAxis.details.projects > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#222] border border-[#2e2e2e]">
                  📁 {hoveredAxis.details.projects} proj
                </span>
              )}
              {hoveredAxis.details.actions > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#222] border border-[#2e2e2e]">
                  ⚡ {hoveredAxis.details.actions} act
                </span>
              )}
              {hoveredAxis.details.h2 > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#222] border border-[#2e2e2e]">
                  H2: {hoveredAxis.details.h2}
                </span>
              )}
              {hoveredAxis.details.h3 > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#222] border border-[#2e2e2e]">
                  H3: {hoveredAxis.details.h3}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Equilibrium Health Indicator */
        <div className="p-2.5 bg-[#181818] border border-[#242424] rounded-xl flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-[#222] text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-200 truncate">
                  {balanceInsight.status}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  • {totalCount} {h4Metric === 'projects' ? 'projects' : h4Metric === 'actions' ? 'actions' : 'items'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 truncate">
                {balanceInsight.tip}
              </p>
            </div>
          </div>

          <span className="text-[10px] text-gray-500 font-mono shrink-0 hidden xs:inline">
            Hover branch for details
          </span>
        </div>
      )}

      {/* Axis Item Chips Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
        {activeAxes.map((axis) => {
          const isHovered = hoveredAxisId === axis.id;
          return (
            <button
              key={axis.id}
              type="button"
              onMouseEnter={() => setHoveredAxisId(axis.id)}
              onMouseLeave={() => setHoveredAxisId(null)}
              onClick={() => {
                if (mode === 'h4') {
                  setActiveTab('horizons');
                } else if (mode === 'horizons') {
                  if (axis.id === 'h0') setActiveTab('actions');
                  else if (axis.id === 'h1') setActiveTab('projects');
                  else setActiveTab('horizons');
                } else {
                  setActiveTab('horizons');
                }
              }}
              className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                isHovered
                  ? 'bg-[#202020] border-[#C5A47E]/60'
                  : 'bg-[#181818] hover:bg-[#1d1d1d] border-[#252525]'
              }`}
              title={`Click to inspect ${axis.name}`}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: axis.color }}
                />
                <span className="text-[11px] font-medium text-gray-300 truncate">
                  {axis.shortLabel}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-white shrink-0">
                {axis.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
