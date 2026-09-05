import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Link as LinkIcon, 
  Calendar, 
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Tag,
  CheckSquare,
  Clock,
  AlertCircle,
  ExternalLink,
  Zap,
  Network,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS, LIFE_DOMAINS } from '../data/gtdData';
import { HorizonLevel, HorizonItem, GTDProject, GTDAction } from '../types/gtd';
import { ProjectModal } from './ProjectModal';
import { ActionEditModal } from './ActionEditModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface HorizonsMapProps {
  onOpenAddModal: (level: HorizonLevel, parentId?: string) => void;
  onOpenEditModal: (item: HorizonItem) => void;
  onDeletePrompt: (item: HorizonItem) => void;
}

export const HorizonsMap: React.FC<HorizonsMapProps> = ({
  onOpenAddModal,
  onOpenEditModal,
  onDeletePrompt,
}) => {
  const {
    horizonItems = [],
    projects = [],
    actions = [],
    setActiveTab,
    setSelectedProjectId,
    setQuickCaptureOpen,
    toggleActionComplete,
    deleteProject,
    addAction,
  } = useGTD();

  // Layout switcher: Graph View (Central H5 Node Tree Graph) vs Linear Cascade
  const [mapLayout, setMapLayout] = useState<'graph-view' | 'altitude-cascade'>('graph-view');

  // Filters & State
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedH5Id, setSelectedH5Id] = useState<string>('all');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [zoomScale, setZoomScale] = useState<number>(100);

  // Cascade View Selection & Hover State for Focus Filter & Connecting Lines
  const [selectedCascadeItem, setSelectedCascadeItem] = useState<{
    id: string;
    type: 'h5' | 'h4' | 'h2' | 'h3' | 'project';
  } | null>(null);

  const [hoveredCascadeItemId, setHoveredCascadeItemId] = useState<string | null>(null);
  const [mobileCascadeTab, setMobileCascadeTab] = useState<'all' | 'h5-h4' | 'h2' | 'h3' | 'projects'>('all');
  const cascadeContainerRef = useRef<HTMLDivElement>(null);

  const handleCascadeItemClick = (id: string, type: 'h5' | 'h4' | 'h2' | 'h3' | 'project') => {
    if (selectedCascadeItem?.id === id) {
      setSelectedCascadeItem(null); // Unhighlight & restore all
    } else {
      setSelectedCascadeItem({ id, type });
    }
  };

  // Project / Action Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<GTDProject | null>(null);
  const [defaultAreaForProject, setDefaultAreaForProject] = useState<string | undefined>(undefined);
  const [defaultGoalForProject, setDefaultGoalForProject] = useState<string | undefined>(undefined);

  // Action Edit Modal
  const [actionToEdit, setActionToEdit] = useState<GTDAction | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // Quick Action Input State per Project (for in-place addition)
  const [quickActionInput, setQuickActionInput] = useState<{ projectId: string; title: string } | null>(null);

  // Delete project confirmation
  const [projectToDelete, setProjectToDelete] = useState<GTDProject | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setCollapsedNodes({});
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    horizonItems.forEach((h) => {
      allCollapsed[h.id] = true;
    });
    projects.forEach((p) => {
      allCollapsed[p.id] = true;
    });
    setCollapsedNodes(allCollapsed);
  };

  // Group horizons by level
  const h5Purposes = useMemo(() => horizonItems.filter((h) => h.level === 5), [horizonItems]);
  const h4Visions = useMemo(() => horizonItems.filter((h) => h.level === 4), [horizonItems]);
  const h3Goals = useMemo(() => horizonItems.filter((h) => h.level === 3), [horizonItems]);
  const h2Areas = useMemo(() => horizonItems.filter((h) => h.level === 2), [horizonItems]);

  // Search match evaluator
  const matchesSearch = (text?: string, extra?: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const tMatch = text ? text.toLowerCase().includes(q) : false;
    const eMatch = extra ? extra.toLowerCase().includes(q) : false;
    return tMatch || eMatch;
  };

  // Build the hierarchical Graph View Model
  // Central Node: H5
  // Daughter Nodes: H4 Visions
  // Daughter Nodes of H4: H2 Areas
  // Daughter Nodes of H2: H3 Goals AND/OR Direct H1 Projects
  // Daughter Nodes of H3 Goals: H1 Projects
  // Daughter Nodes of H1 Projects: Next Actions (Leaf Nodes)
  const graphData = useMemo(() => {
    // If no H5 purposes exist, create a fallback virtual root
    const rootPurposes = h5Purposes.length > 0 ? h5Purposes : [
      {
        id: 'virtual-h5',
        level: 5 as HorizonLevel,
        title: 'Core Purpose, Values & Guiding Ethos',
        description: 'Define your ultimate 50,000+ ft life purpose and personal operating principles.',
        lifeDomain: 'Purpose & Legacy',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
      }
    ];

    const filteredRoots = selectedH5Id === 'all' 
      ? rootPurposes 
      : rootPurposes.filter((p) => p.id === selectedH5Id);

    return filteredRoots.map((h5) => {
      // Find daughter H4 Visions linked to this H5 Purpose
      const daughterH4s = h4Visions.filter((h4) => {
        if (h4.parentId === h5.id) return true;
        if (!h4.parentId && (h5Purposes.length <= 1 || h4.lifeDomain === h5.lifeDomain)) return true;
        if (h5.id === 'virtual-h5') return true;
        return false;
      }).filter((h4) => {
        if (selectedDomain !== 'all' && h4.lifeDomain !== selectedDomain) return false;
        return true;
      });

      // Build each H4 daughter branch
      const h4Branches = daughterH4s.map((h4) => {
        // Find daughter H2 Areas linked to this H4 Vision
        const daughterH2s = h2Areas.filter((h2) => {
          if (h2.parentId === h4.id) return true;
          if (h2.parentId === h5.id && h2.lifeDomain === h4.lifeDomain) return true;
          if (!h2.parentId && h2.lifeDomain === h4.lifeDomain) return true;
          return false;
        }).filter((h2) => {
          if (selectedDomain !== 'all' && h2.lifeDomain !== selectedDomain) return false;
          return true;
        });

        // Build each H2 daughter branch
        const h2Branches = daughterH2s.map((h2) => {
          // Daughter H3 Goals under this H2 Area
          const daughterH3Goals = h3Goals.filter((g) => {
            if (g.parentId === h2.id) return true;
            if (!g.parentId && g.lifeDomain === h2.lifeDomain) return true;
            return false;
          });

          // Build H3 Goal branches with their daughter Projects & Actions
          const h3Branches = daughterH3Goals.map((goal) => {
            // Projects linked to this goal
            const goalProjects = projects.filter((p) => p.goalId === goal.id);

            const projectBranches = goalProjects.map((project) => {
              // Next Actions linked to this project
              const projectActions = actions.filter(
                (a) => a.projectId === project.id && a.type === 'action'
              );
              return {
                project,
                actions: projectActions,
              };
            });

            return {
              goal,
              projects: projectBranches,
            };
          });

          // Direct Projects under this H2 Area (not linked to any H3 goal)
          const directProjects = projects.filter((p) => {
            if (p.areaId !== h2.id) return false;
            // Only direct if not already linked to an H3 goal that sits under this H2
            if (p.goalId && h3Goals.some((g) => g.id === p.goalId)) return false;
            return true;
          });

          const directProjectBranches = directProjects.map((project) => {
            const projectActions = actions.filter(
              (a) => a.projectId === project.id && a.type === 'action'
            );
            return {
              project,
              actions: projectActions,
            };
          });

          return {
            area: h2,
            goals: h3Branches,
            directProjects: directProjectBranches,
          };
        });

        return {
          vision: h4,
          areas: h2Branches,
        };
      });

      return {
        purpose: h5,
        visions: h4Branches,
      };
    });
  }, [h5Purposes, h4Visions, h3Goals, h2Areas, projects, actions, selectedH5Id, selectedDomain]);

  // Handler for adding a new project
  const handleOpenAddProject = (areaId?: string, goalId?: string) => {
    setProjectToEdit(null);
    setDefaultAreaForProject(areaId);
    setDefaultGoalForProject(goalId);
    setProjectModalOpen(true);
  };

  // Handler for quick adding a next action directly to a project
  const handleQuickAddAction = (projectId: string) => {
    if (!quickActionInput || quickActionInput.projectId !== projectId || !quickActionInput.title.trim()) {
      setQuickActionInput({ projectId, title: '' });
      return;
    }

    addAction({
      title: quickActionInput.title.trim(),
      type: 'action',
      projectId,
      context: '@computer',
      energy: 'medium',
      timeEstimate: '15-30m',
    });

    setQuickActionInput(null);
  };

  // Compute filtered dataset for Altitude Cascade view when an item is selected
  // When an item is selected, we highlight it and only show its downstream children
  const cascadeFilteredData = useMemo(() => {
    // Base filtered items by life domain & search query
    const baseH5s = h5Purposes.filter((p) => {
      if (selectedDomain !== 'all' && p.lifeDomain !== selectedDomain) return false;
      return matchesSearch(p.title, p.description);
    });

    const baseH4s = h4Visions.filter((v) => {
      if (selectedDomain !== 'all' && v.lifeDomain !== selectedDomain) return false;
      return matchesSearch(v.title, v.description);
    });

    const baseH2s = h2Areas.filter((a) => {
      if (selectedDomain !== 'all' && a.lifeDomain !== selectedDomain) return false;
      return matchesSearch(a.title, a.description);
    });

    const baseH3s = h3Goals.filter((g) => {
      if (selectedDomain !== 'all' && g.lifeDomain !== selectedDomain) return false;
      return matchesSearch(g.title, g.description);
    });

    const baseProjects = projects.filter((p) => {
      return matchesSearch(p.title, p.desiredOutcome);
    });

    if (!selectedCascadeItem) {
      return {
        h5s: baseH5s,
        h4s: baseH4s,
        h2s: baseH2s,
        h3s: baseH3s,
        projects: baseProjects,
        selectedItem: null,
      };
    }

    const { id: selId, type: selType } = selectedCascadeItem;

    if (selType === 'h5') {
      const selectedH5 = h5Purposes.find((p) => p.id === selId);
      // Children H4 Visions:
      const childrenH4s = h4Visions.filter((v) =>
        v.parentId === selId || (!v.parentId && (h5Purposes.length <= 1 || v.lifeDomain === selectedH5?.lifeDomain))
      );
      const h4Ids = new Set(childrenH4s.map((v) => v.id));

      // Children H2 Areas:
      const childrenH2s = h2Areas.filter((a) =>
        (a.parentId && h4Ids.has(a.parentId)) ||
        a.parentId === selId ||
        (!a.parentId && selectedH5?.lifeDomain && a.lifeDomain === selectedH5.lifeDomain)
      );
      const h2Ids = new Set(childrenH2s.map((a) => a.id));

      // Children H3 Goals:
      const childrenH3s = h3Goals.filter((g) => g.parentId && h2Ids.has(g.parentId));
      const h3Ids = new Set(childrenH3s.map((g) => g.id));

      // Children Projects:
      const childrenProjects = projects.filter((p) =>
        (p.goalId && h3Ids.has(p.goalId)) || (p.areaId && h2Ids.has(p.areaId))
      );

      return {
        h5s: baseH5s.filter((p) => p.id === selId),
        h4s: childrenH4s,
        h2s: childrenH2s,
        h3s: childrenH3s,
        projects: childrenProjects,
        selectedItem: {
          id: selId,
          type: 'H5 Purpose',
          title: selectedH5?.title || 'H5 Purpose',
          color: '#C5A47E',
        },
      };
    }

    if (selType === 'h4') {
      const selectedH4 = h4Visions.find((v) => v.id === selId);
      const parentH5s = h5Purposes.filter((p) => p.id === selectedH4?.parentId || (selectedH4?.lifeDomain && p.lifeDomain === selectedH4.lifeDomain));

      // Children H2 Areas:
      const childrenH2s = h2Areas.filter((a) =>
        a.parentId === selId || (!a.parentId && selectedH4?.lifeDomain && a.lifeDomain === selectedH4.lifeDomain)
      );
      const h2Ids = new Set(childrenH2s.map((a) => a.id));

      // Children H3 Goals:
      const childrenH3s = h3Goals.filter((g) => g.parentId && h2Ids.has(g.parentId));
      const h3Ids = new Set(childrenH3s.map((g) => g.id));

      // Children Projects:
      const childrenProjects = projects.filter((p) =>
        (p.goalId && h3Ids.has(p.goalId)) || (p.areaId && h2Ids.has(p.areaId))
      );

      return {
        h5s: parentH5s.length > 0 ? parentH5s : baseH5s,
        h4s: baseH4s.filter((v) => v.id === selId),
        h2s: childrenH2s,
        h3s: childrenH3s,
        projects: childrenProjects,
        selectedItem: {
          id: selId,
          type: 'H4 Vision',
          title: selectedH4?.title || 'H4 Vision',
          color: '#818cf8',
        },
      };
    }

    if (selType === 'h2') {
      const selectedH2 = h2Areas.find((a) => a.id === selId);
      const parentH4s = h4Visions.filter((v) => v.id === selectedH2?.parentId || (selectedH2?.lifeDomain && v.lifeDomain === selectedH2.lifeDomain));
      const parentH5s = h5Purposes.filter((p) => selectedH2?.lifeDomain && p.lifeDomain === selectedH2.lifeDomain);

      // Children H3 Goals:
      const childrenH3s = h3Goals.filter((g) => g.parentId === selId);
      const h3Ids = new Set(childrenH3s.map((g) => g.id));

      // Children Projects (under this Area or under this Area's Goals):
      const childrenProjects = projects.filter((p) =>
        p.areaId === selId || (p.goalId && h3Ids.has(p.goalId))
      );

      return {
        h5s: parentH5s.length > 0 ? parentH5s : baseH5s,
        h4s: parentH4s.length > 0 ? parentH4s : baseH4s,
        h2s: baseH2s.filter((a) => a.id === selId),
        h3s: childrenH3s,
        projects: childrenProjects,
        selectedItem: {
          id: selId,
          type: 'H2 Area of Focus',
          title: selectedH2?.title || 'H2 Area of Focus',
          color: '#34d399',
        },
      };
    }

    if (selType === 'h3') {
      const selectedH3 = h3Goals.find((g) => g.id === selId);
      const parentH2s = h2Areas.filter((a) => a.id === selectedH3?.parentId);
      const parentH4s = h4Visions.filter((v) => parentH2s.some((a) => a.parentId === v.id || (a.lifeDomain && a.lifeDomain === v.lifeDomain)));
      const parentH5s = h5Purposes.filter((p) => selectedH3?.lifeDomain && p.lifeDomain === selectedH3.lifeDomain);

      // Children Projects (specifically linked to this H3 Goal):
      const childrenProjects = projects.filter((p) => p.goalId === selId);

      return {
        h5s: parentH5s.length > 0 ? parentH5s : baseH5s,
        h4s: parentH4s.length > 0 ? parentH4s : baseH4s,
        h2s: parentH2s.length > 0 ? parentH2s : baseH2s,
        h3s: baseH3s.filter((g) => g.id === selId),
        projects: childrenProjects,
        selectedItem: {
          id: selId,
          type: 'H3 Goal',
          title: selectedH3?.title || 'H3 Goal',
          color: '#38bdf8',
        },
      };
    }

    if (selType === 'project') {
      const selectedProj = projects.find((p) => p.id === selId);
      const parentH3s = h3Goals.filter((g) => g.id === selectedProj?.goalId);
      const parentH2s = h2Areas.filter((a) => a.id === selectedProj?.areaId || parentH3s.some((g) => g.parentId === a.id));
      const parentH4s = h4Visions.filter((v) => parentH2s.some((a) => a.parentId === v.id));

      return {
        h5s: baseH5s,
        h4s: parentH4s.length > 0 ? parentH4s : baseH4s,
        h2s: parentH2s.length > 0 ? parentH2s : baseH2s,
        h3s: parentH3s.length > 0 ? parentH3s : baseH3s,
        projects: baseProjects.filter((p) => p.id === selId),
        selectedItem: {
          id: selId,
          type: 'H1 Project',
          title: selectedProj?.title || 'H1 Project',
          color: '#fbbf24',
        },
      };
    }

    return {
      h5s: baseH5s,
      h4s: baseH4s,
      h2s: baseH2s,
      h3s: baseH3s,
      projects: baseProjects,
      selectedItem: null,
    };
  }, [selectedCascadeItem, h5Purposes, h4Visions, h2Areas, h3Goals, projects, selectedDomain, searchQuery]);

  // Active Cascade Highlight ID (hover takes precedence, fallback to selected focus item)
  const activeCascadeId = hoveredCascadeItemId || selectedCascadeItem?.id || null;

  // Active Connection Links across the 4 Cascade Columns on hover/highlight
  const { activeLinks, activeConnectedIds } = useMemo(() => {
    const links: Array<{
      id: string;
      fromId: string;
      toId: string;
      gradientId: string;
      color: string;
      startColor: string;
      endColor: string;
      isDirect?: boolean;
    }> = [];
    const connectedIds = new Set<string>();

    if (!activeCascadeId) {
      return { activeLinks: links, activeConnectedIds: connectedIds };
    }

    connectedIds.add(activeCascadeId);

    const isH5 = h5Purposes.some((p) => p.id === activeCascadeId);
    const isH4 = h4Visions.some((v) => v.id === activeCascadeId);
    const isH2 = h2Areas.some((a) => a.id === activeCascadeId);
    const isH3 = h3Goals.some((g) => g.id === activeCascadeId);
    const isProj = projects.some((p) => p.id === activeCascadeId);

    // 1. If H5 is active
    if (isH5) {
      const curH5 = h5Purposes.find((p) => p.id === activeCascadeId);
      const childH4s = h4Visions.filter(
        (v) => v.parentId === activeCascadeId || (!v.parentId && (h5Purposes.length <= 1 || v.lifeDomain === curH5?.lifeDomain))
      );
      childH4s.forEach((v) => {
        connectedIds.add(v.id);
        links.push({
          id: `${activeCascadeId}->${v.id}`,
          fromId: activeCascadeId,
          toId: v.id,
          gradientId: 'cascade-grad-gold',
          color: '#C5A47E',
          startColor: '#C5A47E',
          endColor: '#818cf8',
        });

        const childH2s = h2Areas.filter(
          (a) => a.parentId === v.id || (!a.parentId && v.lifeDomain && a.lifeDomain === v.lifeDomain)
        );
        childH2s.forEach((a) => {
          connectedIds.add(a.id);
          links.push({
            id: `${v.id}->${a.id}`,
            fromId: v.id,
            toId: a.id,
            gradientId: 'cascade-grad-indigo-emerald',
            color: '#818cf8',
            startColor: '#818cf8',
            endColor: '#34d399',
          });

          const childH3s = h3Goals.filter((g) => g.parentId === a.id);
          childH3s.forEach((g) => {
            connectedIds.add(g.id);
            links.push({
              id: `${a.id}->${g.id}`,
              fromId: a.id,
              toId: g.id,
              gradientId: 'cascade-grad-emerald-sky',
              color: '#34d399',
              startColor: '#34d399',
              endColor: '#38bdf8',
            });

            const childProjs = projects.filter((p) => p.goalId === g.id);
            childProjs.forEach((p) => {
              connectedIds.add(p.id);
              links.push({
                id: `${g.id}->${p.id}`,
                fromId: g.id,
                toId: p.id,
                gradientId: 'cascade-grad-sky-amber',
                color: '#38bdf8',
                startColor: '#38bdf8',
                endColor: '#fbbf24',
              });
            });
          });

          const directProjs = projects.filter(
            (p) => p.areaId === a.id && (!p.goalId || !h3Goals.some((g) => g.id === p.goalId))
          );
          directProjs.forEach((p) => {
            connectedIds.add(p.id);
            links.push({
              id: `${a.id}->${p.id}`,
              fromId: a.id,
              toId: p.id,
              gradientId: 'cascade-grad-emerald-amber',
              color: '#34d399',
              startColor: '#34d399',
              endColor: '#fbbf24',
              isDirect: true,
            });
          });
        });
      });
    }

    // 2. If H4 is active
    if (isH4) {
      const curH4 = h4Visions.find((v) => v.id === activeCascadeId);
      const parentH5 = h5Purposes.find(
        (p) => p.id === curH4?.parentId || (curH4?.lifeDomain && p.lifeDomain === curH4.lifeDomain)
      );
      if (parentH5) {
        connectedIds.add(parentH5.id);
        links.push({
          id: `${parentH5.id}->${activeCascadeId}`,
          fromId: parentH5.id,
          toId: activeCascadeId,
          gradientId: 'cascade-grad-gold',
          color: '#C5A47E',
          startColor: '#C5A47E',
          endColor: '#818cf8',
        });
      }

      const childH2s = h2Areas.filter(
        (a) => a.parentId === activeCascadeId || (!a.parentId && curH4?.lifeDomain && a.lifeDomain === curH4.lifeDomain)
      );
      childH2s.forEach((a) => {
        connectedIds.add(a.id);
        links.push({
          id: `${activeCascadeId}->${a.id}`,
          fromId: activeCascadeId,
          toId: a.id,
          gradientId: 'cascade-grad-indigo-emerald',
          color: '#818cf8',
          startColor: '#818cf8',
          endColor: '#34d399',
        });

        const childH3s = h3Goals.filter((g) => g.parentId === a.id);
        childH3s.forEach((g) => {
          connectedIds.add(g.id);
          links.push({
            id: `${a.id}->${g.id}`,
            fromId: a.id,
            toId: g.id,
            gradientId: 'cascade-grad-emerald-sky',
            color: '#34d399',
            startColor: '#34d399',
            endColor: '#38bdf8',
          });

          const childProjs = projects.filter((p) => p.goalId === g.id);
          childProjs.forEach((p) => {
            connectedIds.add(p.id);
            links.push({
              id: `${g.id}->${p.id}`,
              fromId: g.id,
              toId: p.id,
              gradientId: 'cascade-grad-sky-amber',
              color: '#38bdf8',
              startColor: '#38bdf8',
              endColor: '#fbbf24',
            });
          });
        });

        const directProjs = projects.filter(
          (p) => p.areaId === a.id && (!p.goalId || !h3Goals.some((g) => g.id === p.goalId))
        );
        directProjs.forEach((p) => {
          connectedIds.add(p.id);
          links.push({
            id: `${a.id}->${p.id}`,
            fromId: a.id,
            toId: p.id,
            gradientId: 'cascade-grad-emerald-amber',
            color: '#34d399',
            startColor: '#34d399',
            endColor: '#fbbf24',
            isDirect: true,
          });
        });
      });
    }

    // 3. If H2 is active
    if (isH2) {
      const curH2 = h2Areas.find((a) => a.id === activeCascadeId);
      const parentH4 = h4Visions.find(
        (v) => v.id === curH2?.parentId || (curH2?.lifeDomain && v.lifeDomain === curH2.lifeDomain)
      );
      if (parentH4) {
        connectedIds.add(parentH4.id);
        links.push({
          id: `${parentH4.id}->${activeCascadeId}`,
          fromId: parentH4.id,
          toId: activeCascadeId,
          gradientId: 'cascade-grad-indigo-emerald',
          color: '#818cf8',
          startColor: '#818cf8',
          endColor: '#34d399',
        });

        const parentH5 = h5Purposes.find(
          (p) => p.id === parentH4.parentId || (parentH4.lifeDomain && p.lifeDomain === parentH4.lifeDomain)
        );
        if (parentH5) {
          connectedIds.add(parentH5.id);
          links.push({
            id: `${parentH5.id}->${parentH4.id}`,
            fromId: parentH5.id,
            toId: parentH4.id,
            gradientId: 'cascade-grad-gold',
            color: '#C5A47E',
            startColor: '#C5A47E',
            endColor: '#818cf8',
          });
        }
      }

      const childH3s = h3Goals.filter((g) => g.parentId === activeCascadeId);
      childH3s.forEach((g) => {
        connectedIds.add(g.id);
        links.push({
          id: `${activeCascadeId}->${g.id}`,
          fromId: activeCascadeId,
          toId: g.id,
          gradientId: 'cascade-grad-emerald-sky',
          color: '#34d399',
          startColor: '#34d399',
          endColor: '#38bdf8',
        });

        const childProjs = projects.filter((p) => p.goalId === g.id);
        childProjs.forEach((p) => {
          connectedIds.add(p.id);
          links.push({
            id: `${g.id}->${p.id}`,
            fromId: g.id,
            toId: p.id,
            gradientId: 'cascade-grad-sky-amber',
            color: '#38bdf8',
            startColor: '#38bdf8',
            endColor: '#fbbf24',
          });
        });
      });

      const directProjs = projects.filter(
        (p) => p.areaId === activeCascadeId && (!p.goalId || !h3Goals.some((g) => g.id === p.goalId))
      );
      directProjs.forEach((p) => {
        connectedIds.add(p.id);
        links.push({
          id: `${activeCascadeId}->${p.id}`,
          fromId: activeCascadeId,
          toId: p.id,
          gradientId: 'cascade-grad-emerald-amber',
          color: '#34d399',
          startColor: '#34d399',
          endColor: '#fbbf24',
          isDirect: true,
        });
      });
    }

    // 4. If H3 is active
    if (isH3) {
      const curH3 = h3Goals.find((g) => g.id === activeCascadeId);
      const parentH2 = h2Areas.find((a) => a.id === curH3?.parentId);
      if (parentH2) {
        connectedIds.add(parentH2.id);
        links.push({
          id: `${parentH2.id}->${activeCascadeId}`,
          fromId: parentH2.id,
          toId: activeCascadeId,
          gradientId: 'cascade-grad-emerald-sky',
          color: '#34d399',
          startColor: '#34d399',
          endColor: '#38bdf8',
        });

        const parentH4 = h4Visions.find(
          (v) => v.id === parentH2.parentId || (parentH2.lifeDomain && v.lifeDomain === parentH2.lifeDomain)
        );
        if (parentH4) {
          connectedIds.add(parentH4.id);
          links.push({
            id: `${parentH4.id}->${parentH2.id}`,
            fromId: parentH4.id,
            toId: parentH2.id,
            gradientId: 'cascade-grad-indigo-emerald',
            color: '#818cf8',
            startColor: '#818cf8',
            endColor: '#34d399',
          });

          const parentH5 = h5Purposes.find(
            (p) => p.id === parentH4.parentId || (parentH4.lifeDomain && p.lifeDomain === parentH4.lifeDomain)
          );
          if (parentH5) {
            connectedIds.add(parentH5.id);
            links.push({
              id: `${parentH5.id}->${parentH4.id}`,
              fromId: parentH5.id,
              toId: parentH4.id,
              gradientId: 'cascade-grad-gold',
              color: '#C5A47E',
              startColor: '#C5A47E',
              endColor: '#818cf8',
            });
          }
        }
      }

      const childProjs = projects.filter((p) => p.goalId === activeCascadeId);
      childProjs.forEach((p) => {
        connectedIds.add(p.id);
        links.push({
          id: `${activeCascadeId}->${p.id}`,
          fromId: activeCascadeId,
          toId: p.id,
          gradientId: 'cascade-grad-sky-amber',
          color: '#38bdf8',
          startColor: '#38bdf8',
          endColor: '#fbbf24',
        });
      });
    }

    // 5. If Project is active
    if (isProj) {
      const curProj = projects.find((p) => p.id === activeCascadeId);
      if (curProj?.goalId) {
        const parentH3 = h3Goals.find((g) => g.id === curProj.goalId);
        if (parentH3) {
          connectedIds.add(parentH3.id);
          links.push({
            id: `${parentH3.id}->${activeCascadeId}`,
            fromId: parentH3.id,
            toId: activeCascadeId,
            gradientId: 'cascade-grad-sky-amber',
            color: '#38bdf8',
            startColor: '#38bdf8',
            endColor: '#fbbf24',
          });

          const parentH2 = h2Areas.find((a) => a.id === parentH3.parentId);
          if (parentH2) {
            connectedIds.add(parentH2.id);
            links.push({
              id: `${parentH2.id}->${parentH3.id}`,
              fromId: parentH2.id,
              toId: parentH3.id,
              gradientId: 'cascade-grad-emerald-sky',
              color: '#34d399',
              startColor: '#34d399',
              endColor: '#38bdf8',
            });

            const parentH4 = h4Visions.find(
              (v) => v.id === parentH2.parentId || (parentH2.lifeDomain && v.lifeDomain === parentH2.lifeDomain)
            );
            if (parentH4) {
              connectedIds.add(parentH4.id);
              links.push({
                id: `${parentH4.id}->${parentH2.id}`,
                fromId: parentH4.id,
                toId: parentH2.id,
                gradientId: 'cascade-grad-indigo-emerald',
                color: '#818cf8',
                startColor: '#818cf8',
                endColor: '#34d399',
              });

              const parentH5 = h5Purposes.find(
                (p) => p.id === parentH4.parentId || (parentH4.lifeDomain && p.lifeDomain === parentH4.lifeDomain)
              );
              if (parentH5) {
                connectedIds.add(parentH5.id);
                links.push({
                  id: `${parentH5.id}->${parentH4.id}`,
                  fromId: parentH5.id,
                  toId: parentH4.id,
                  gradientId: 'cascade-grad-gold',
                  color: '#C5A47E',
                  startColor: '#C5A47E',
                  endColor: '#818cf8',
                });
              }
            }
          }
        }
      } else if (curProj?.areaId) {
        const parentH2 = h2Areas.find((a) => a.id === curProj.areaId);
        if (parentH2) {
          connectedIds.add(parentH2.id);
          links.push({
            id: `${parentH2.id}->${activeCascadeId}`,
            fromId: parentH2.id,
            toId: activeCascadeId,
            gradientId: 'cascade-grad-emerald-amber',
            color: '#34d399',
            startColor: '#34d399',
            endColor: '#fbbf24',
            isDirect: true,
          });

          const parentH4 = h4Visions.find(
            (v) => v.id === parentH2.parentId || (parentH2.lifeDomain && v.lifeDomain === parentH2.lifeDomain)
          );
          if (parentH4) {
            connectedIds.add(parentH4.id);
            links.push({
              id: `${parentH4.id}->${parentH2.id}`,
              fromId: parentH4.id,
              toId: parentH2.id,
              gradientId: 'cascade-grad-indigo-emerald',
              color: '#818cf8',
              startColor: '#818cf8',
              endColor: '#34d399',
            });

            const parentH5 = h5Purposes.find(
              (p) => p.id === parentH4.parentId || (parentH4.lifeDomain && p.lifeDomain === parentH4.lifeDomain)
            );
            if (parentH5) {
              connectedIds.add(parentH5.id);
              links.push({
                id: `${parentH5.id}->${parentH4.id}`,
                fromId: parentH5.id,
                toId: parentH4.id,
                gradientId: 'cascade-grad-gold',
                color: '#C5A47E',
                startColor: '#C5A47E',
                endColor: '#818cf8',
              });
            }
          }
        }
      }
    }

    return { activeLinks: links, activeConnectedIds: connectedIds };
  }, [activeCascadeId, h5Purposes, h4Visions, h2Areas, h3Goals, projects]);

  // Position state for SVG connecting paths in Altitude Cascade
  const [computedLines, setComputedLines] = useState<Array<{
    id: string;
    d: string;
    gradientId: string;
    color: string;
    startColor: string;
    endColor: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isDirect?: boolean;
  }>>([]);

  useEffect(() => {
    if (mapLayout !== 'altitude-cascade' || activeLinks.length === 0 || !cascadeContainerRef.current) {
      setComputedLines([]);
      return;
    }

    const updateLinePositions = () => {
      const container = cascadeContainerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const newLines: Array<{
        id: string;
        d: string;
        gradientId: string;
        color: string;
        startColor: string;
        endColor: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        isDirect?: boolean;
      }> = [];

      activeLinks.forEach((link) => {
        const fromEl = container.querySelector<HTMLElement>(`[data-cascade-id="${link.fromId}"]`);
        const toEl = container.querySelector<HTMLElement>(`[data-cascade-id="${link.toId}"]`);

        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        let startX = 0;
        let startY = fromRect.top + fromRect.height / 2 - cRect.top;
        let endX = 0;
        let endY = toRect.top + toRect.height / 2 - cRect.top;

        if (fromRect.left < toRect.left) {
          // Left-to-right columns (tucked slightly under cards)
          startX = fromRect.right - cRect.left - 4;
          endX = toRect.left - cRect.left + 4;
        } else if (fromRect.left > toRect.left) {
          // Right-to-left
          startX = fromRect.left - cRect.left + 4;
          endX = toRect.right - cRect.left - 4;
        } else {
          // Same column (H5 to H4 in Col 1)
          startX = fromRect.right - cRect.left - 16;
          startY = fromRect.bottom - cRect.top - 4;
          endX = toRect.right - cRect.left - 16;
          endY = toRect.top - cRect.top + 4;
        }

        const dx = Math.max(20, Math.abs(endX - startX) * 0.45);
        const d = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

        newLines.push({
          id: link.id,
          d,
          gradientId: link.gradientId,
          color: link.color,
          startColor: link.startColor,
          endColor: link.endColor,
          startX,
          startY,
          endX,
          endY,
          isDirect: link.isDirect,
        });
      });

      setComputedLines(newLines);
    };

    const frameId = requestAnimationFrame(updateLinePositions);

    const handleResize = () => {
      updateLinePositions();
    };

    const handleRecompute = () => {
      updateLinePositions();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    window.addEventListener('cascade-recompute-lines', handleRecompute);

    const observer = new ResizeObserver(handleResize);
    if (cascadeContainerRef.current) {
      observer.observe(cascadeContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      window.removeEventListener('cascade-recompute-lines', handleRecompute);
      observer.disconnect();
    };
  }, [activeLinks, mapLayout, cascadeFilteredData, hoveredCascadeItemId, selectedCascadeItem]);

  // Auto-scroll connected items into view in their respective scrollable column containers
  useEffect(() => {
    if (mapLayout !== 'altitude-cascade' || !activeCascadeId || !cascadeContainerRef.current) return;

    const container = cascadeContainerRef.current;
    const targetIds = Array.from(activeConnectedIds);
    if (targetIds.length === 0) return;

    targetIds.forEach((id) => {
      const el = container.querySelector<HTMLElement>(`[data-cascade-id="${id}"]`);
      if (el) {
        const scrollParent = el.closest('.cascade-scroll-container') as HTMLElement | null;
        if (scrollParent) {
          const parentRect = scrollParent.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();

          const isAbove = elRect.top < parentRect.top + 16;
          const isBelow = elRect.bottom > parentRect.bottom - 16;

          if (isAbove || isBelow) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'nearest'
            });
          }
        }
      }
    });

    // Smoothly recompute SVG connecting line paths during scrolling animation
    let animStart = performance.now();
    let animFrame: number;

    const tick = (now: number) => {
      window.dispatchEvent(new CustomEvent('cascade-recompute-lines'));
      if (now - animStart < 400) {
        animFrame = requestAnimationFrame(tick);
      }
    };
    animFrame = requestAnimationFrame(tick);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [activeCascadeId, activeConnectedIds, mapLayout]);

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Control Panel Toolbar */}
      <div className="bg-[#141414] rounded-2xl border border-[#262626] p-3 sm:p-5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: View Modes & Collapse */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
          
          {/* Graph View / Cascade Selector */}
          <div className="bg-[#1E1E1E] border border-[#262626] p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setMapLayout('graph-view')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                mapLayout === 'graph-view'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="sm:hidden">Graph</span>
              <span className="hidden sm:inline">Horizon Graph (H5 Central)</span>
            </button>
            <button
              onClick={() => setMapLayout('altitude-cascade')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                mapLayout === 'altitude-cascade'
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="sm:hidden">Cascade</span>
              <span className="hidden sm:inline">Altitude Cascade</span>
            </button>
          </div>

          <div className="h-5 w-px bg-[#262626] hidden sm:block" />

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={expandAll}
              className="px-2 sm:px-2.5 py-1.5 bg-[#191919] hover:bg-[#222] border border-[#262626] rounded-xl text-gray-300 text-xs font-medium transition-colors cursor-pointer"
              title="Expand all branches"
            >
              <span className="sm:hidden">Expand</span>
              <span className="hidden sm:inline">Expand All</span>
            </button>
            <button
              onClick={collapseAll}
              className="px-2 sm:px-2.5 py-1.5 bg-[#191919] hover:bg-[#222] border border-[#262626] rounded-xl text-gray-300 text-xs font-medium transition-colors cursor-pointer"
              title="Collapse all branches"
            >
              <span className="sm:hidden">Collapse</span>
              <span className="hidden sm:inline">Collapse All</span>
            </button>
          </div>

        </div>

        {/* Right: Filters & Zoom */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter graph nodes..."
              className="pl-8 pr-3 py-1.5 bg-[#191919] border border-[#262626] rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E] w-full sm:w-44 md:w-52"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {/* Life Domain Filter Dropdown */}
            <div className="flex items-center gap-1.5 text-xs flex-1 sm:flex-initial">
              <Tag className="w-3.5 h-3.5 text-[#C5A47E] shrink-0" />
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="px-2.5 sm:px-3 py-1.5 bg-[#191919] border border-[#262626] rounded-xl text-xs text-gray-200 focus:outline-hidden focus:border-[#C5A47E] w-full sm:w-auto"
              >
                <option value="all">All Domains</option>
                {LIFE_DOMAINS.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-[#191919] border border-[#262626] rounded-xl p-0.5 text-xs shrink-0">
              <button
                onClick={() => setZoomScale((prev) => Math.max(75, prev - 10))}
                className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1 text-gray-400 min-w-[28px] sm:min-w-[32px] text-center">
                {zoomScale}%
              </span>
              <button
                onClick={() => setZoomScale((prev) => Math.min(125, prev + 10))}
                className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Altitude Legend Banner - Streamlined & Horizontal Scroll on Mobile */}
      <div className="bg-[#141414] rounded-2xl border border-[#262626] p-2.5 sm:px-5 sm:py-3 text-xs overflow-hidden">
        {/* Mobile Horizontal Scrollable Ribbon */}
        <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap text-[10px] font-semibold">
          <span className="text-gray-500 uppercase tracking-wider font-mono text-[9px] mr-0.5 shrink-0">Hierarchy:</span>
          
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#C5A47E]/10 border border-[#C5A47E]/30 text-[#C5A47E] shrink-0">
            <Compass className="w-2.5 h-2.5" />
            <span>H5 Purpose</span>
          </div>

          <span className="text-gray-600 shrink-0">→</span>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 shrink-0">
            <Eye className="w-2.5 h-2.5 text-indigo-400" />
            <span>H4 Vision</span>
          </div>

          <span className="text-gray-600 shrink-0">→</span>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 shrink-0">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>H2 Area</span>
          </div>

          <span className="text-gray-600 shrink-0">→</span>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-700/40 text-sky-300 shrink-0">
            <Target className="w-2.5 h-2.5 text-sky-400" />
            <span>H3 Goal</span>
          </div>

          <span className="text-gray-600 shrink-0">→</span>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/40 text-amber-300 shrink-0">
            <Briefcase className="w-2.5 h-2.5 text-amber-400" />
            <span>H1 Project</span>
          </div>

          <span className="text-gray-600 shrink-0">→</span>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-gray-200 shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span>Runway</span>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] font-semibold">
            <span className="text-gray-500 uppercase tracking-wider font-mono text-[10px]">Hierarchy:</span>
            
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#C5A47E]/10 border border-[#C5A47E]/30 text-[#C5A47E]">
              <Compass className="w-3 h-3" />
              <span>H5 Central Purpose</span>
            </div>

            <span className="text-gray-600">→</span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-700/40 text-indigo-300">
              <Eye className="w-3 h-3 text-indigo-400" />
              <span>H4 Vision</span>
            </div>

            <span className="text-gray-600">→</span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>H2 Area of Focus</span>
            </div>

            <span className="text-gray-600">→</span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-950/60 border border-sky-700/40 text-sky-300">
              <Target className="w-3 h-3 text-sky-400" />
              <span>H3 Goal</span>
            </div>

            <span className="text-gray-600">→</span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-700/40 text-amber-300">
              <Briefcase className="w-3 h-3 text-amber-400" />
              <span>H1 Project</span>
            </div>

            <span className="text-gray-600">→</span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 text-gray-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Runway Action</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-[#1f1f1f] border border-[#2a2a2a] text-gray-300">
              Full Continuum Active
            </span>
          </div>
        </div>
      </div>

      {/* GRAPH VIEW: CENTRAL H5 NODE GRAPH */}
      {mapLayout === 'graph-view' ? (
        <div 
          className="space-y-6 sm:space-y-12 transition-transform origin-top-left"
          style={{ transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : undefined }}
        >
          {graphData.map(({ purpose, visions }) => {
            const isH5Collapsed = collapsedNodes[purpose.id];
            const h5Matched = matchesSearch(purpose.title, purpose.description);

            return (
              <div
                key={purpose.id}
                className="bg-[#121212] rounded-2xl sm:rounded-3xl border border-[#262626] p-3 sm:p-8 shadow-xl relative overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#C5A47E]/5 rounded-full blur-3xl pointer-events-none opacity-30 sm:opacity-100" />

                {/* ==================================================================== */}
                {/* CENTRAL ROOT NODE: HORIZON 5 PURPOSE & PRINCIPLES (50,000+ FT)       */}
                {/* ==================================================================== */}
                <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto mb-4 sm:mb-10">
                  
                  {/* Central Node Card */}
                  <div
                    className={`w-full max-w-2xl bg-[#181818] rounded-xl sm:rounded-2xl border-2 p-3 sm:p-6 shadow-xl transition-all ${
                      h5Matched
                        ? 'border-[#C5A47E] shadow-[#C5A47E]/10'
                        : 'border-[#333] opacity-60'
                    }`}
                  >
                    {/* Top Altitude Badge & Controls (Clickable header blank space toggles collapse) */}
                    <div 
                      onClick={() => toggleCollapse(purpose.id)}
                      className="flex items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 cursor-pointer select-none group/h5header hover:opacity-90 transition-opacity"
                      title="Click header to collapse / expand tree"
                    >
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#C5A47E]/15 border border-[#C5A47E]/40 text-[#C5A47E] text-[9px] sm:text-xs font-extrabold uppercase font-mono tracking-wider">
                        <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse shrink-0" />
                        <span className="sm:hidden">H5 • Purpose (50k+ ft)</span>
                        <span className="hidden sm:inline">Central Root • Horizon 5 • Purpose & Principles (50,000+ ft)</span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {purpose.id !== 'virtual-h5' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEditModal(purpose);
                              }}
                              className="p-1 sm:p-1.5 text-gray-400 hover:text-[#C5A47E] hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                              title="Edit H5 Purpose"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePrompt(purpose);
                              }}
                              className="p-1 sm:p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete H5 Purpose"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(purpose.id);
                          }}
                          className="p-1 sm:p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                          title={isH5Collapsed ? 'Expand Tree' : 'Collapse Tree'}
                        >
                          {isH5Collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* H5 Title */}
                    <h2 className="text-base sm:text-2xl font-black text-white font-serif tracking-tight leading-snug">
                      {purpose.title}
                    </h2>

                    {/* H5 Description */}
                    {purpose.description && (
                      <p className="text-xs sm:text-sm text-gray-400 mt-1.5 sm:mt-2.5 leading-relaxed line-clamp-3 sm:line-clamp-none">
                        {purpose.description}
                      </p>
                    )}

                    {/* H5 Guiding Key Results / Principles */}
                    {purpose.keyResults && purpose.keyResults.length > 0 && (
                      <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-[#262626] text-left">
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#C5A47E] uppercase tracking-wider font-mono">
                          Guiding Core Principles:
                        </span>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
                          {purpose.keyResults.map((kr, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-[#141414] border border-[#282828] text-gray-300"
                            >
                              ✦ {kr}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Root Action Footer: Add H4 Daughter */}
                    <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono text-[9px] sm:text-[11px]">
                        {visions.length} Vision{visions.length === 1 ? '' : 's'} (H4)
                      </span>
                      <button
                        onClick={() => onOpenAddModal(4, purpose.id)}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black font-bold rounded-lg sm:rounded-xl flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs transition-all cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="sm:hidden">Vision</span>
                        <span className="hidden sm:inline">Add H4 Vision Node</span>
                      </button>
                    </div>

                  </div>

                  {/* Vertical Trunk Line from H5 to H4 Visions */}
                  {!isH5Collapsed && visions.length > 0 && (
                    <div className="flex flex-col items-center mt-2 sm:mt-3 -mb-3 sm:-mb-4">
                      <div className="w-0.5 h-5 sm:h-8 bg-gradient-to-b from-[#C5A47E] to-indigo-500" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-500 shadow-sm" />
                    </div>
                  )}

                </div>

                {/* ==================================================================== */}
                {/* LEVEL 1 DAUGHTER NODES: HORIZON 4 VISIONS (40,000 FT)                */}
                {/* ==================================================================== */}
                {!isH5Collapsed && (
                  <div className="space-y-4 sm:space-y-12">
                    {visions.length === 0 ? (
                      <div className="text-center py-5 sm:py-8 bg-[#161616] rounded-xl sm:rounded-2xl border border-dashed border-[#282828] max-w-lg mx-auto p-3 sm:p-4">
                        <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 mx-auto opacity-50 mb-1.5 sm:mb-2" />
                        <p className="text-xs text-gray-400">No Horizon 4 Visions anchored to this purpose yet.</p>
                        <button
                          onClick={() => onOpenAddModal(4, purpose.id)}
                          className="mt-2.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 rounded-lg sm:rounded-xl text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add H4 Vision (3-5 Years)</span>
                        </button>
                      </div>
                    ) : (
                      visions.map(({ vision, areas }) => {
                        const isH4Collapsed = collapsedNodes[vision.id];
                        const h4Matched = matchesSearch(vision.title, vision.description);

                        return (
                          <div
                            key={vision.id}
                            className="bg-[#161616] rounded-xl sm:rounded-2xl border border-indigo-950/80 p-2.5 sm:p-6 relative shadow-lg"
                          >
                            {/* H4 Vision Node Card Header (Clickable blank space toggles collapse) */}
                            <div 
                              onClick={() => toggleCollapse(vision.id)}
                              className="flex flex-col md:flex-row md:items-start justify-between gap-2.5 sm:gap-4 pb-2.5 sm:pb-4 border-b border-[#242424] cursor-pointer select-none group/h4header hover:bg-white/[0.02] -m-2.5 sm:-m-6 p-2.5 sm:p-6 mb-0 rounded-t-xl sm:rounded-t-2xl transition-colors"
                              title="Click header blank space to expand / collapse H4 Vision"
                            >
                              <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-[9px] sm:text-[10px] font-extrabold font-mono uppercase tracking-wider flex items-center gap-1">
                                    <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                    <span className="sm:hidden">H4 • 40k ft</span>
                                    <span className="hidden sm:inline">H4 Daughter Node • 40,000 ft Vision</span>
                                  </span>

                                  {vision.lifeDomain && (
                                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] text-gray-300 text-[9px] sm:text-[10px] flex items-center gap-1 font-medium">
                                      <Tag className="w-2.5 h-2.5 text-[#C5A47E]" />
                                      <span>{vision.lifeDomain}</span>
                                    </span>
                                  )}

                                  {vision.targetDate && (
                                    <span className="text-[9px] sm:text-[10px] text-indigo-300/80 font-mono flex items-center gap-1">
                                      <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
                                      <span>{vision.targetDate}</span>
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-sm sm:text-lg font-bold text-white font-serif">
                                  {vision.title}
                                </h3>

                                {vision.description && (
                                  <p className="text-xs text-gray-400 max-w-3xl leading-relaxed line-clamp-2 sm:line-clamp-none">
                                    {vision.description}
                                  </p>
                                )}

                                {vision.keyResults && vision.keyResults.length > 0 && (
                                  <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
                                    {vision.keyResults.map((kr, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/30 text-indigo-200"
                                      >
                                        • {kr}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* H4 Controls & Daughter Add Button */}
                              <div className="flex items-center justify-between md:justify-start gap-1 sm:gap-2 shrink-0 pt-0.5 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenAddModal(2, vision.id);
                                  }}
                                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
                                  title="Add H2 Area daughter node"
                                >
                                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span className="sm:hidden">Area</span>
                                  <span className="hidden sm:inline">Add H2 Area</span>
                                </button>

                                <div className="flex items-center gap-0.5 sm:gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenEditModal(vision);
                                    }}
                                    className="p-1 sm:p-1.5 text-gray-400 hover:text-indigo-300 hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                                    title="Edit H4 Vision"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeletePrompt(vision);
                                    }}
                                    className="p-1 sm:p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Delete H4 Vision"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCollapse(vision.id);
                                    }}
                                    className="p-1 sm:p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors cursor-pointer"
                                    title={isH4Collapsed ? 'Expand H2 Areas' : 'Collapse H2 Areas'}
                                  >
                                    {isH4Collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* ==================================================================== */}
                            {/* LEVEL 2 DAUGHTER NODES: HORIZON 2 AREAS OF FOCUS (20,000 FT)        */}
                            {/* ==================================================================== */}
                            {!isH4Collapsed && (
                              <div className="mt-3 sm:mt-5 space-y-3 sm:space-y-6">
                                {areas.length === 0 ? (
                                  <div className="text-center py-4 sm:py-6 bg-[#141414] rounded-xl border border-dashed border-[#242424]">
                                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400/50 mx-auto mb-1.5" />
                                    <p className="text-xs text-gray-500">No H2 Areas of Focus assigned to this vision.</p>
                                    <button
                                      onClick={() => onOpenAddModal(2, vision.id)}
                                      className="mt-1.5 text-xs text-emerald-400 hover:underline font-bold"
                                    >
                                      + Add H2 Area of Focus
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-3 sm:gap-6">
                                    {areas.map(({ area, goals, directProjects }) => {
                                      const isH2Collapsed = collapsedNodes[area.id];
                                      const h2Matched = matchesSearch(area.title, area.description);

                                      return (
                                        <div
                                          key={area.id}
                                          className="bg-[#131313] rounded-xl border border-emerald-950/70 p-2.5 sm:p-5 relative shadow-md"
                                        >
                                          {/* H2 Area Node Header (Clickable blank space toggles collapse) */}
                                          <div 
                                            onClick={() => toggleCollapse(area.id)}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-[#222] cursor-pointer select-none group/h2header hover:bg-white/[0.02] -m-2.5 sm:-m-5 p-2.5 sm:p-5 mb-0 rounded-t-xl transition-colors"
                                            title="Click header blank space to expand / collapse H2 Area"
                                          >
                                            <div className="space-y-1">
                                              {(() => {
                                                const totalAreaProjects = directProjects.length + goals.reduce((acc, g) => acc + g.projects.length, 0);
                                                return (
                                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-[9px] sm:text-[10px] font-extrabold font-mono uppercase tracking-wider flex items-center gap-1">
                                                      <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                      <span className="sm:hidden">H2 • 20k ft</span>
                                                      <span className="hidden sm:inline">H2 Area • 20,000 ft</span>
                                                    </span>
                                                    {area.lifeDomain && (
                                                      <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#2c2c2c]">
                                                        {area.lifeDomain}
                                                      </span>
                                                    )}
                                                    <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-neutral-800/80 border border-neutral-700/50 text-gray-300 text-[9px] sm:text-[10px] font-mono flex items-center gap-1">
                                                      <span>{goals.length} {goals.length === 1 ? 'goal' : 'goals'}</span>
                                                      <span>·</span>
                                                      <span>{totalAreaProjects} {totalAreaProjects === 1 ? 'proj' : 'projects'}</span>
                                                    </span>
                                                  </div>
                                                );
                                              })()}

                                              <h4 className="text-sm sm:text-base font-bold text-white font-serif">
                                                {area.title}
                                              </h4>

                                              {area.description && (
                                                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
                                                  {area.description}
                                                </p>
                                              )}
                                            </div>

                                            {/* H2 Actions & Add Goal/Project */}
                                            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 pt-1 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                              <div className="flex items-center gap-1">
                                                {/* Add H3 Goal Button */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenAddModal(3, area.id);
                                                  }}
                                                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/50 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                  title="Add H3 Goal (1-2y) under this Area"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span className="sm:hidden">Goal</span>
                                                  <span className="hidden sm:inline">Add H3 Goal</span>
                                                </button>

                                                {/* Add H1 Direct Project Button */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAddProject(area.id, undefined);
                                                  }}
                                                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/50 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                  title="Add Direct Project under this Area"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span className="sm:hidden">Proj</span>
                                                  <span className="hidden sm:inline">Add Project</span>
                                                </button>
                                              </div>

                                              <div className="flex items-center gap-0.5 sm:gap-1">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenEditModal(area);
                                                  }}
                                                  className="p-1 sm:p-1.5 text-gray-400 hover:text-emerald-300 hover:bg-[#202020] rounded-lg transition-colors cursor-pointer"
                                                  title="Edit H2 Area"
                                                >
                                                  <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                </button>

                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeletePrompt(area);
                                                  }}
                                                  className="p-1 sm:p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                  title="Delete H2 Area"
                                                >
                                                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                </button>

                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCollapse(area.id);
                                                  }}
                                                  className="p-1 sm:p-1.5 text-gray-400 hover:text-white hover:bg-[#202020] rounded-lg transition-colors cursor-pointer"
                                                  title={isH2Collapsed ? 'Expand Area Daughters' : 'Collapse Area Daughters'}
                                                >
                                                  {isH2Collapsed ? <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* ==================================================================== */}
                                          {/* LEVEL 3 DAUGHTER NODES: H3 GOALS & H1 DIRECT PROJECTS                */}
                                          {/* ==================================================================== */}
                                          {!isH2Collapsed && (
                                            <div className="mt-2.5 sm:mt-4 space-y-2.5 sm:space-y-4">
                                              
                                              {/* 1. H3 GOALS SECTION */}
                                              {goals.map(({ goal, projects: goalProjects }) => {
                                                const isGoalCollapsed = collapsedNodes[goal.id];
                                                const goalMatched = matchesSearch(goal.title, goal.description);

                                                return (
                                                  <div
                                                    key={goal.id}
                                                    className="bg-[#161616] rounded-lg sm:rounded-xl border border-sky-950/70 p-2.5 sm:p-4 ml-1 sm:ml-4 border-l-2 sm:border-l-4 border-l-sky-500 shadow-xs"
                                                  >
                                                    {/* Goal Node Header (Clickable blank space toggles collapse) */}
                                                    <div 
                                                      onClick={() => toggleCollapse(goal.id)}
                                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-1.5 sm:pb-2 border-b border-[#222] cursor-pointer select-none group/goalheader hover:bg-white/[0.02] -m-2.5 sm:-m-4 p-2.5 sm:p-4 mb-0 rounded-t-lg sm:rounded-t-xl transition-colors"
                                                      title="Click header blank space to expand / collapse H3 Goal"
                                                    >
                                                      <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                                          <span className="px-1.5 sm:px-2 py-0.5 rounded bg-sky-950/90 border border-sky-700/50 text-sky-300 text-[9px] sm:text-[10px] font-bold font-mono uppercase flex items-center gap-1">
                                                            <Target className="w-2.5 h-2.5" />
                                                            <span className="sm:hidden">H3 • 30k ft</span>
                                                            <span className="hidden sm:inline">H3 Goal • 30,000 ft</span>
                                                          </span>
                                                          {goal.targetDate && (
                                                            <span className="text-[9px] sm:text-[10px] text-sky-400/80 font-mono">
                                                              {goal.targetDate}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <h5 className="text-xs sm:text-sm font-bold text-white font-serif">
                                                          {goal.title}
                                                        </h5>
                                                        {goal.description && (
                                                          <p className="text-[10px] sm:text-[11px] text-gray-400 line-clamp-1 sm:line-clamp-2">
                                                            {goal.description}
                                                          </p>
                                                        )}
                                                      </div>

                                                      {/* Goal Action Controls */}
                                                      <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 shrink-0 pt-0.5 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenAddProject(area.id, goal.id);
                                                          }}
                                                          className="px-2 py-0.5 sm:py-1 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-700/40 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                          title="Add Project under this Goal"
                                                        >
                                                          <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                          <span className="sm:hidden">Proj</span>
                                                          <span className="hidden sm:inline">Add Project</span>
                                                        </button>

                                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onOpenEditModal(goal);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-sky-300 rounded cursor-pointer"
                                                            title="Edit Goal"
                                                          >
                                                            <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                          </button>

                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onDeletePrompt(goal);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-rose-400 rounded cursor-pointer"
                                                            title="Delete Goal"
                                                          >
                                                            <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                          </button>

                                                          {goalProjects.length > 0 && (
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleCollapse(goal.id);
                                                              }}
                                                              className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                                                            >
                                                              {isGoalCollapsed ? <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* ==================================================================== */}
                                                    {/* LEVEL 4 DAUGHTER NODES: H1 PROJECTS UNDER GOAL                       */}
                                                    {/* ==================================================================== */}
                                                    {!isGoalCollapsed && (
                                                      <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3 pl-1 sm:pl-4 border-l border-[#262626]">
                                                        {goalProjects.length === 0 ? (
                                                          <div className="text-[10px] sm:text-[11px] text-gray-500 italic py-0.5">
                                                            No active projects linked to this goal.
                                                          </div>
                                                        ) : (
                                                          goalProjects.map(({ project, actions: projActions }) => {
                                                            const isProjCollapsed = collapsedNodes[project.id];
                                                            const completedCount = projActions.filter((a) => a.completed).length;

                                                            return (
                                                              <div
                                                                key={project.id}
                                                                className="bg-[#121212] rounded-lg sm:rounded-xl border border-amber-950/60 p-2 sm:p-3 relative shadow-xs"
                                                              >
                                                                {/* Project Node Card Header (Clickable blank space toggles collapse) */}
                                                                <div 
                                                                  onClick={() => toggleCollapse(project.id)}
                                                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 cursor-pointer select-none group/projheader hover:bg-white/[0.02] -m-2 sm:-m-3 p-2 sm:p-3 mb-0 rounded-lg sm:rounded-xl transition-colors"
                                                                  title="Click header blank space to expand / collapse Project Actions"
                                                                >
                                                                  <div className="space-y-0.5 sm:space-y-1">
                                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                                      <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/40 text-amber-300 text-[9px] sm:text-[10px] font-bold font-mono uppercase flex items-center gap-1">
                                                                        <Briefcase className="w-2.5 h-2.5" />
                                                                        <span className="sm:hidden">H1 • 10k ft</span>
                                                                        <span className="hidden sm:inline">H1 Project • 10,000 ft</span>
                                                                      </span>
                                                                      <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono">
                                                                        {completedCount}/{projActions.length} Actions
                                                                      </span>
                                                                    </div>
                                                                    <h6 className="text-[11px] sm:text-xs font-bold text-gray-200">
                                                                      {project.title}
                                                                    </h6>
                                                                    {project.desiredOutcome && (
                                                                      <p className="text-[9px] sm:text-[10px] text-gray-400 italic line-clamp-1">
                                                                        Outcome: {project.desiredOutcome}
                                                                      </p>
                                                                    )}
                                                                  </div>

                                                                  {/* Project Actions & Add Next Action */}
                                                                  <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 shrink-0 pt-0.5 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                      onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setQuickActionInput({ projectId: project.id, title: '' });
                                                                      }}
                                                                      className="px-1.5 sm:px-2 py-0.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40 rounded text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                                      title="Add Next Action Leaf Node"
                                                                    >
                                                                      <Plus className="w-2.5 h-2.5" />
                                                                      <span className="sm:hidden">Act</span>
                                                                      <span className="hidden sm:inline">Add Action</span>
                                                                    </button>

                                                                    <div className="flex items-center gap-0.5">
                                                                      <button
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          setProjectToEdit(project);
                                                                          setProjectModalOpen(true);
                                                                        }}
                                                                        className="p-1 text-gray-400 hover:text-amber-300 rounded cursor-pointer"
                                                                        title="Edit Project"
                                                                      >
                                                                        <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                                      </button>

                                                                      <button
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          setProjectToDelete(project);
                                                                        }}
                                                                        className="p-1 text-gray-400 hover:text-rose-400 rounded cursor-pointer"
                                                                        title="Delete Project"
                                                                      >
                                                                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                                      </button>

                                                                      {projActions.length > 0 && (
                                                                        <button
                                                                          onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleCollapse(project.id);
                                                                          }}
                                                                          className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                                                                        >
                                                                          {isProjCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                        </button>
                                                                      )}
                                                                    </div>
                                                                  </div>
                                                                </div>

                                                                {/* Quick Action Input field (if triggered) */}
                                                                {quickActionInput?.projectId === project.id && (
                                                                  <div className="mt-2 p-1.5 sm:p-2 bg-[#181818] rounded-lg border border-emerald-800/40 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                    <input
                                                                      type="text"
                                                                      autoFocus
                                                                      value={quickActionInput.title}
                                                                      onChange={(e) => setQuickActionInput({ projectId: project.id, title: e.target.value })}
                                                                      onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleQuickAddAction(project.id);
                                                                        if (e.key === 'Escape') setQuickActionInput(null);
                                                                      }}
                                                                      placeholder="Enter next physical action..."
                                                                      className="flex-1 px-2 py-1 bg-[#101010] border border-[#282828] rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-400"
                                                                    />
                                                                    <button
                                                                      onClick={() => handleQuickAddAction(project.id)}
                                                                      className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded transition-colors cursor-pointer"
                                                                    >
                                                                      Save
                                                                    </button>
                                                                    <button
                                                                      onClick={() => setQuickActionInput(null)}
                                                                      className="px-1.5 py-1 text-gray-400 hover:text-gray-200 text-xs cursor-pointer"
                                                                    >
                                                                      Cancel
                                                                    </button>
                                                                  </div>
                                                                )}

                                                                {/* ==================================================================== */}
                                                                {/* LEVEL 5 DAUGHTER NODES: NEXT ACTIONS (RUNWAY LEAF NODES)             */}
                                                                {/* ==================================================================== */}
                                                                {!isProjCollapsed && projActions.length > 0 && (
                                                                  <div className="mt-2 pt-1.5 border-t border-[#1e1e1e] space-y-1 pl-1 sm:pl-2">
                                                                    {projActions.map((action) => (
                                                                      <div
                                                                        key={action.id}
                                                                        className={`flex items-center justify-between gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-md sm:rounded-lg border transition-all ${
                                                                          action.completed
                                                                            ? 'bg-[#151515] border-[#222] opacity-50'
                                                                            : 'bg-[#181818] border-[#282828] hover:border-[#383838]'
                                                                        }`}
                                                                      >
                                                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                                          {/* Action Completion Checkbox */}
                                                                          <button
                                                                            onClick={() => toggleActionComplete(action.id)}
                                                                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                                                                              action.completed
                                                                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                                                                : 'border-gray-500 hover:border-emerald-400'
                                                                            }`}
                                                                            title={action.completed ? 'Mark incomplete' : 'Mark complete'}
                                                                          >
                                                                            {action.completed && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />}
                                                                          </button>

                                                                          <span
                                                                            className={`text-[11px] sm:text-xs truncate ${
                                                                              action.completed ? 'line-through text-gray-500' : 'text-gray-300'
                                                                            }`}
                                                                          >
                                                                            {action.title}
                                                                          </span>
                                                                        </div>

                                                                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                                                          {action.context && (
                                                                            <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-neutral-800 text-gray-400 font-mono">
                                                                              {action.context}
                                                                            </span>
                                                                          )}
                                                                          <button
                                                                            onClick={() => {
                                                                              setActionToEdit(action);
                                                                              setActionModalOpen(true);
                                                                            }}
                                                                            className="p-0.5 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
                                                                            title="Edit action details"
                                                                          >
                                                                            <Edit3 className="w-2.5 h-2.5" />
                                                                          </button>
                                                                        </div>
                                                                      </div>
                                                                    ))}
                                                                  </div>
                                                                )}

                                                              </div>
                                                            );
                                                          })
                                                        )}
                                                      </div>
                                                    )}

                                                  </div>
                                                );
                                              })}

                                              {/* 2. DIRECT H1 PROJECTS (Under H2 Area without a goal) */}
                                              {directProjects.length > 0 && (
                                                <div className="space-y-2 sm:space-y-3 pl-1 sm:pl-4 border-l-2 border-amber-800/40">
                                                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                                                    <Briefcase className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    <span>Direct Area Projects:</span>
                                                  </span>

                                                  {directProjects.map(({ project, actions: projActions }) => {
                                                    const isProjCollapsed = collapsedNodes[project.id];
                                                    const completedCount = projActions.filter((a) => a.completed).length;

                                                    return (
                                                      <div
                                                        key={project.id}
                                                        className="bg-[#141414] rounded-lg sm:rounded-xl border border-amber-950/60 p-2 sm:p-3 relative shadow-xs"
                                                      >
                                                        {/* Project Card Header (Clickable blank space toggles collapse) */}
                                                        <div 
                                                          onClick={() => toggleCollapse(project.id)}
                                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 cursor-pointer select-none group/projheader hover:bg-white/[0.02] -m-2 sm:-m-3 p-2 sm:p-3 mb-0 rounded-lg sm:rounded-xl transition-colors"
                                                          title="Click header blank space to expand / collapse Project Actions"
                                                        >
                                                          <div className="space-y-0.5 sm:space-y-1">
                                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/40 text-amber-300 text-[9px] sm:text-[10px] font-bold font-mono uppercase flex items-center gap-1">
                                                                <Briefcase className="w-2.5 h-2.5" />
                                                                <span className="sm:hidden">H1 • 10k ft</span>
                                                                <span className="hidden sm:inline">H1 Direct Project • 10,000 ft</span>
                                                              </span>
                                                              <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono">
                                                                {completedCount}/{projActions.length} Actions
                                                              </span>
                                                            </div>
                                                            <h6 className="text-[11px] sm:text-xs font-bold text-gray-200">
                                                              {project.title}
                                                            </h6>
                                                            {project.desiredOutcome && (
                                                              <p className="text-[9px] sm:text-[10px] text-gray-400 italic line-clamp-1">
                                                                Outcome: {project.desiredOutcome}
                                                              </p>
                                                            )}
                                                          </div>

                                                          {/* Project Controls */}
                                                          <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 shrink-0 pt-0.5 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                setQuickActionInput({ projectId: project.id, title: '' });
                                                              }}
                                                              className="px-1.5 sm:px-2 py-0.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40 rounded text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                              title="Add Next Action Leaf Node"
                                                            >
                                                              <Plus className="w-2.5 h-2.5" />
                                                              <span className="sm:hidden">Act</span>
                                                              <span className="hidden sm:inline">Add Action</span>
                                                            </button>

                                                            <div className="flex items-center gap-0.5">
                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setProjectToEdit(project);
                                                                  setProjectModalOpen(true);
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-amber-300 rounded cursor-pointer"
                                                                title="Edit Project"
                                                              >
                                                                <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                              </button>

                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setProjectToDelete(project);
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-rose-400 rounded cursor-pointer"
                                                                title="Delete Project"
                                                              >
                                                                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                              </button>

                                                              {projActions.length > 0 && (
                                                                <button
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleCollapse(project.id);
                                                                  }}
                                                                  className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                                                                >
                                                                  {isProjCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                </button>
                                                              )}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        {/* Quick Action Input field (if triggered) */}
                                                        {quickActionInput?.projectId === project.id && (
                                                          <div className="mt-2 p-1.5 sm:p-2 bg-[#181818] rounded-lg border border-emerald-800/40 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                              type="text"
                                                              autoFocus
                                                              value={quickActionInput.title}
                                                              onChange={(e) => setQuickActionInput({ projectId: project.id, title: e.target.value })}
                                                              onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleQuickAddAction(project.id);
                                                                if (e.key === 'Escape') setQuickActionInput(null);
                                                              }}
                                                              placeholder="Enter next physical action..."
                                                              className="flex-1 px-2 py-1 bg-[#101010] border border-[#282828] rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-400"
                                                            />
                                                            <button
                                                              onClick={() => handleQuickAddAction(project.id)}
                                                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded transition-colors cursor-pointer"
                                                            >
                                                              Save
                                                            </button>
                                                            <button
                                                              onClick={() => setQuickActionInput(null)}
                                                              className="px-1.5 py-1 text-gray-400 hover:text-gray-200 text-xs cursor-pointer"
                                                            >
                                                              Cancel
                                                            </button>
                                                          </div>
                                                        )}

                                                        {/* Leaf Next Actions */}
                                                        {!isProjCollapsed && projActions.length > 0 && (
                                                          <div className="mt-2 pt-1.5 border-t border-[#1e1e1e] space-y-1 pl-1 sm:pl-2">
                                                            {projActions.map((action) => (
                                                              <div
                                                                key={action.id}
                                                                className={`flex items-center justify-between gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-md sm:rounded-lg border transition-all ${
                                                                  action.completed
                                                                    ? 'bg-[#151515] border-[#222] opacity-50'
                                                                    : 'bg-[#181818] border-[#282828] hover:border-[#383838]'
                                                                }`}
                                                              >
                                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                                  <button
                                                                    onClick={() => toggleActionComplete(action.id)}
                                                                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                                                                      action.completed
                                                                        ? 'bg-emerald-500 border-emerald-500 text-black'
                                                                        : 'border-gray-500 hover:border-emerald-400'
                                                                    }`}
                                                                    title={action.completed ? 'Mark incomplete' : 'Mark complete'}
                                                                  >
                                                                    {action.completed && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />}
                                                                  </button>
                                                                  <span
                                                                    className={`text-[11px] sm:text-xs truncate ${
                                                                      action.completed ? 'line-through text-gray-500' : 'text-gray-300'
                                                                    }`}
                                                                  >
                                                                    {action.title}
                                                                  </span>
                                                                </div>

                                                                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                                                  {action.context && (
                                                                    <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-neutral-800 text-gray-400 font-mono">
                                                                      {action.context}
                                                                    </span>
                                                                  )}
                                                                  <button
                                                                    onClick={() => {
                                                                      setActionToEdit(action);
                                                                      setActionModalOpen(true);
                                                                    }}
                                                                    className="p-0.5 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
                                                                  >
                                                                    <Edit3 className="w-2.5 h-2.5" />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}

                                                      </div>
                                                    );
                                                  })}
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
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* ALTITUDE CASCADE VIEW (LINEAR STACK WITH FOCUS MODE & CONNECTING LINES) */
        <div className="space-y-4">
          {/* Focus Filter Active Notification Header */}
          {selectedCascadeItem && cascadeFilteredData.selectedItem && (
            <div className="bg-[#181818] border border-[#C5A47E]/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#C5A47E]/20 text-[#C5A47E] border border-[#C5A47E]/40">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Focus Mode Active:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#262626] text-[#C5A47E] font-bold font-mono border border-[#383838]">
                      {cascadeFilteredData.selectedItem.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium">
                    Showing only downstream children of <span className="text-white font-bold underline decoration-[#C5A47E]">"{cascadeFilteredData.selectedItem.title}"</span>. Click item again or reset below.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCascadeItem(null)}
                className="px-3 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-gray-200 border border-[#3a3a3a] hover:border-gray-500 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Clear Focus Filter (Show All)
              </button>
            </div>
          )}

          {/* 4-Column Cascade Layout with Active Connecting SVG Overlay */}
          <div ref={cascadeContainerRef} className="relative grid grid-cols-1 lg:grid-cols-4 gap-6 isolate">
            
            {/* SVG Connecting Lines Overlay - Rendered under cards (z-0) */}
            {computedLines.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible hidden lg:block">
                <defs>
                  <linearGradient id="cascade-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C5A47E" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="cascade-grad-indigo-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="cascade-grad-gold-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C5A47E" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="cascade-grad-emerald-sky" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="cascade-grad-sky-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="cascade-grad-emerald-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="cascade-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {computedLines.map((line) => (
                  <g key={line.id}>
                    {/* Subtler outer ambient glow */}
                    <path
                      d={line.d}
                      fill="none"
                      stroke={'url(#' + line.gradientId + ')'}
                      strokeWidth="3.5"
                      strokeOpacity="0.12"
                      filter="url(#cascade-line-glow)"
                      strokeLinecap="round"
                    />
                    {/* Solid, thinner, refined core connecting line */}
                    <path
                      d={line.d}
                      fill="none"
                      stroke={'url(#' + line.gradientId + ')'}
                      strokeWidth="1.25"
                      strokeOpacity="0.75"
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                    {/* Subtle terminal origin node dot */}
                    <circle cx={line.startX} cy={line.startY} r="2.5" fill={line.startColor} fillOpacity="0.85" />
                    {/* Subtle terminal target node dot */}
                    <circle cx={line.endX} cy={line.endY} r="2.5" fill={line.endColor} fillOpacity="0.85" />
                  </g>
                ))}
              </svg>
            )}

            {/* Column 1: Horizon 5 & 4 */}
            <div className="space-y-3 flex flex-col">
              <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4 flex items-center justify-between shadow-md shrink-0 relative z-20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#C5A47E]/20 text-[#C5A47E] border border-[#C5A47E]/30">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-serif uppercase tracking-wider">
                      H5 Purpose & H4 Vision
                    </h3>
                    <span className="text-[10px] text-[#C5A47E] font-mono">50k+ & 40k ft</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenAddModal(4)}
                  className="p-1 text-gray-400 hover:text-[#C5A47E] rounded cursor-pointer"
                  title="Add Vision"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="cascade-scroll-container no-scrollbar space-y-3 max-h-[620px] overflow-y-auto scroll-smooth">
                {cascadeFilteredData.h5s.map((p) => {
                  const isSelected = selectedCascadeItem?.id === p.id && selectedCascadeItem.type === 'h5';
                  const isHovered = hoveredCascadeItemId === p.id;
                  const isConnected = activeConnectedIds.has(p.id);

                  return (
                    <div
                      key={p.id}
                      data-cascade-id={p.id}
                      onMouseEnter={() => setHoveredCascadeItemId(p.id)}
                      onMouseLeave={() => setHoveredCascadeItemId(null)}
                      onClick={() => handleCascadeItemClick(p.id, 'h5')}
                      className={'rounded-2xl p-4 space-y-2 cursor-pointer transition-all duration-200 relative z-20 ' + (
                        isSelected
                          ? 'bg-[#1a1714] border-2 border-[#C5A47E] shadow-lg shadow-[#C5A47E]/15 ring-2 ring-[#C5A47E]/30'
                          : isHovered
                          ? 'bg-[#181612] border-2 border-[#C5A47E] shadow-md shadow-[#C5A47E]/10'
                          : isConnected
                          ? 'bg-[#161410] border-2 border-[#C5A47E]/80 shadow-xs'
                          : 'bg-[#141414] border border-[#262626] hover:border-[#C5A47E]/60'
                      )}
                      title={isSelected ? 'Click to unselect / show all' : 'Click to isolate and show only its children'}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#C5A47E] uppercase font-mono">
                        <span className="flex items-center gap-1.5">
                          {(isSelected || isHovered || isConnected) && <span className="w-2 h-2 rounded-full bg-[#C5A47E] animate-pulse" />}
                          <span>{isSelected ? '✓ Selected H5' : isConnected ? '🔗 Linked H5' : 'H5 Purpose'}</span>
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => onOpenEditModal(p)} className="p-1 text-gray-400 hover:text-white rounded">
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-white font-serif">{p.title}</h4>
                      {p.description && <p className="text-[11px] text-gray-400 line-clamp-2">{p.description}</p>}
                      <div className="text-[10px] text-gray-500 pt-1 flex items-center justify-between border-t border-[#222]">
                        <span>{isSelected ? 'Showing linked visions & areas' : 'Click to isolate children'}</span>
                        <ArrowRight className={'w-3 h-3 text-[#C5A47E] transition-transform ' + (isSelected || isHovered ? 'translate-x-1' : '')} />
                      </div>
                    </div>
                  );
                })}

                {cascadeFilteredData.h4s.map((v) => {
                  const isSelected = selectedCascadeItem?.id === v.id && selectedCascadeItem.type === 'h4';
                  const isHovered = hoveredCascadeItemId === v.id;
                  const isConnected = activeConnectedIds.has(v.id);

                  return (
                    <div
                      key={v.id}
                      data-cascade-id={v.id}
                      onMouseEnter={() => setHoveredCascadeItemId(v.id)}
                      onMouseLeave={() => setHoveredCascadeItemId(null)}
                      onClick={() => handleCascadeItemClick(v.id, 'h4')}
                      className={'rounded-2xl p-4 space-y-2 cursor-pointer transition-all duration-200 relative z-20 ' + (
                        isSelected
                          ? 'bg-[#141624] border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                          : isHovered
                          ? 'bg-[#121528] border-2 border-indigo-400 shadow-md shadow-indigo-500/10'
                          : isConnected
                          ? 'bg-[#111320] border-2 border-indigo-500/80 shadow-xs'
                          : 'bg-[#141414] border border-indigo-950/60 hover:border-indigo-700/60'
                      )}
                      title={isSelected ? 'Click to unselect / show all' : 'Click to isolate and show only its children'}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-indigo-400 uppercase font-mono">
                        <span className="flex items-center gap-1.5">
                          {(isSelected || isHovered || isConnected) && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                          <span>{isSelected ? '✓ Selected H4' : isConnected ? '🔗 Linked H4' : 'H4 Vision'}</span>
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => onOpenEditModal(v)} className="p-1 text-gray-400 hover:text-white rounded">
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-white font-serif">{v.title}</h4>
                      {v.targetDate && <span className="text-[10px] text-indigo-300/80 font-mono block">Target: {v.targetDate}</span>}
                      <div className="text-[10px] text-gray-500 pt-1 flex items-center justify-between border-t border-[#222]">
                        <span>{isSelected ? 'Showing linked areas & goals' : 'Click to isolate children'}</span>
                        <ArrowRight className={'w-3 h-3 text-indigo-400 transition-transform ' + (isSelected || isHovered ? 'translate-x-1' : '')} />
                      </div>
                    </div>
                  );
                })}

                {cascadeFilteredData.h5s.length === 0 && cascadeFilteredData.h4s.length === 0 && (
                  <div className="p-4 bg-[#141414] rounded-2xl border border-dashed border-[#262626] text-center text-xs text-gray-500">
                    No H5 Purposes or H4 Visions matching filter.
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Horizon 2 (Areas of Focus) */}
            <div className="space-y-3 flex flex-col">
              <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4 flex items-center justify-between shadow-md shrink-0 relative z-20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-serif uppercase tracking-wider">
                      H2 • Areas of Focus
                    </h3>
                    <span className="text-[10px] text-emerald-400/90 font-mono">20,000 ft Roles</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenAddModal(2)}
                  className="p-1 text-gray-400 hover:text-emerald-400 rounded cursor-pointer"
                  title="Add Area of Focus"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="cascade-scroll-container no-scrollbar space-y-3 max-h-[620px] overflow-y-auto scroll-smooth">
                {cascadeFilteredData.h2s.length === 0 ? (
                  <div className="p-4 bg-[#141414] rounded-2xl border border-dashed border-[#262626] text-center text-xs text-gray-500">
                    {selectedCascadeItem ? 'No linked H2 Areas found under selected item.' : 'No H2 Areas of Focus found.'}
                  </div>
                ) : (
                  cascadeFilteredData.h2s.map((area) => {
                    const isSelected = selectedCascadeItem?.id === area.id && selectedCascadeItem.type === 'h2';
                    const isHovered = hoveredCascadeItemId === area.id;
                    const isConnected = activeConnectedIds.has(area.id);

                    const linkedGoals = cascadeFilteredData.h3s.filter((g) => g.parentId === area.id);
                    const linkedGoalIds = new Set(linkedGoals.map((g) => g.id));
                    const linkedProjects = cascadeFilteredData.projects.filter(
                      (p) => p.areaId === area.id || (p.goalId && linkedGoalIds.has(p.goalId))
                    );

                    return (
                      <div
                        key={area.id}
                        data-cascade-id={area.id}
                        onMouseEnter={() => setHoveredCascadeItemId(area.id)}
                        onMouseLeave={() => setHoveredCascadeItemId(null)}
                        onClick={() => handleCascadeItemClick(area.id, 'h2')}
                        className={'rounded-2xl p-4 space-y-2.5 cursor-pointer transition-all duration-200 relative z-20 ' + (
                          isSelected
                            ? 'bg-[#121c16] border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                            : isHovered
                            ? 'bg-[#101a14] border-2 border-emerald-400 shadow-md shadow-emerald-500/10'
                            : isConnected
                            ? 'bg-[#0f1712] border-2 border-emerald-500/80 shadow-xs'
                            : 'bg-[#141414] border border-[#262626] hover:border-emerald-700/60'
                        )}
                        title={isSelected ? 'Click to unselect / show all' : 'Click to isolate and show only its children'}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 uppercase font-mono">
                          <span className="flex items-center gap-1.5">
                            {(isSelected || isHovered || isConnected) && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            <span>{isSelected ? '✓ Selected H2 Area' : isConnected ? '🔗 Linked H2' : 'Horizon 2 Area'}</span>
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onOpenEditModal(area)} className="p-1 text-gray-400 hover:text-white rounded">
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <h4 className="text-xs font-bold text-white font-serif leading-snug">{area.title}</h4>
                        
                        {/* Area Life Domain & Counts for Goals + Projects */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#222]">
                          <span className="text-gray-400 font-medium truncate">{area.lifeDomain || 'General Area'}</span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-sky-950/90 border border-sky-800/50 text-sky-300 flex items-center gap-1" title="H3 Goals under this Area">
                              <Target className="w-2.5 h-2.5" />
                              <span>{linkedGoals.length} {linkedGoals.length === 1 ? 'Goal' : 'Goals'}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-800/50 text-amber-300 flex items-center gap-1" title="H1 Projects under this Area">
                              <Briefcase className="w-2.5 h-2.5" />
                              <span>{linkedProjects.length} {linkedProjects.length === 1 ? 'Proj' : 'Projs'}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-500 pt-0.5 flex items-center justify-between border-t border-[#1e1e1e]">
                          <span>{isSelected ? 'Showing linked goals & projects' : 'Click to isolate children'}</span>
                          <ArrowRight className={'w-3 h-3 text-emerald-400 transition-transform ' + (isSelected || isHovered ? 'translate-x-1' : '')} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: Horizon 3 (Goals) */}
            <div className="space-y-3 flex flex-col">
              <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4 flex items-center justify-between shadow-md shrink-0 relative z-20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800/40">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-serif uppercase tracking-wider">
                      H3 • 1-2y Goals
                    </h3>
                    <span className="text-[10px] text-sky-300/90 font-mono">30,000 ft Targets</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenAddModal(3)}
                  className="p-1 text-gray-400 hover:text-sky-300 rounded cursor-pointer"
                  title="Add Goal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="cascade-scroll-container no-scrollbar space-y-3 max-h-[620px] overflow-y-auto scroll-smooth">
                {cascadeFilteredData.h3s.length === 0 ? (
                  <div className="p-4 bg-[#141414] rounded-2xl border border-dashed border-[#262626] text-center text-xs text-gray-500">
                    {selectedCascadeItem ? 'No linked H3 Goals found under selected item.' : 'No H3 Goals found.'}
                  </div>
                ) : (
                  cascadeFilteredData.h3s.map((goal) => {
                    const isSelected = selectedCascadeItem?.id === goal.id && selectedCascadeItem.type === 'h3';
                    const isHovered = hoveredCascadeItemId === goal.id;
                    const isConnected = activeConnectedIds.has(goal.id);

                    const parentArea = h2Areas.find((a) => a.id === goal.parentId);
                    const goalProjects = cascadeFilteredData.projects.filter((p) => p.goalId === goal.id);

                    return (
                      <div
                        key={goal.id}
                        data-cascade-id={goal.id}
                        onMouseEnter={() => setHoveredCascadeItemId(goal.id)}
                        onMouseLeave={() => setHoveredCascadeItemId(null)}
                        onClick={() => handleCascadeItemClick(goal.id, 'h3')}
                        className={'rounded-2xl p-4 space-y-2 cursor-pointer transition-all duration-200 relative z-20 ' + (
                          isSelected
                            ? 'bg-[#101a24] border-2 border-sky-500 shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/30'
                            : isHovered
                            ? 'bg-[#0f1722] border-2 border-sky-400 shadow-md shadow-sky-500/10'
                            : isConnected
                            ? 'bg-[#0e1520] border-2 border-sky-500/80 shadow-xs'
                            : 'bg-[#141414] border border-[#262626] hover:border-sky-700/60'
                        )}
                        title={isSelected ? 'Click to unselect / show all' : 'Click to isolate and show only its children'}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-sky-400 uppercase font-mono">
                          <span className="flex items-center gap-1.5">
                            {(isSelected || isHovered || isConnected) && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
                            <span>{isSelected ? '✓ Selected H3 Goal' : isConnected ? '🔗 Linked H3' : 'H3 Goal'}</span>
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onOpenEditModal(goal)} className="p-1 text-gray-400 hover:text-white rounded">
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-white font-serif leading-snug">{goal.title}</h4>
                        {parentArea && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{parentArea.title}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                          <span>{goal.targetDate || ''}</span>
                          <span className="font-mono text-amber-400 font-bold">{goalProjects.length} {goalProjects.length === 1 ? 'Project' : 'Projects'}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 pt-1 flex items-center justify-between border-t border-[#222]">
                          <span>{isSelected ? 'Showing linked projects' : 'Click to isolate children'}</span>
                          <ArrowRight className={'w-3 h-3 text-sky-400 transition-transform ' + (isSelected || isHovered ? 'translate-x-1' : '')} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 4: H1 Projects & Runway */}
            <div className="space-y-3 flex flex-col">
              <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4 flex items-center justify-between shadow-md shrink-0 relative z-20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/40">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-serif uppercase tracking-wider">
                      H1 Projects & Runway
                    </h3>
                    <span className="text-[10px] text-amber-300/90 font-mono">10k ft & Ground</span>
                  </div>
                </div>
                <button
                  onClick={() => setQuickCaptureOpen(true)}
                  className="p-1 text-gray-400 hover:text-amber-300 rounded cursor-pointer"
                  title="Quick Capture Project / Action"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="cascade-scroll-container no-scrollbar space-y-3 max-h-[620px] overflow-y-auto scroll-smooth">
                {cascadeFilteredData.projects.length === 0 ? (
                  <div className="p-4 bg-[#141414] rounded-2xl border border-dashed border-[#262626] text-center text-xs text-gray-500">
                    {selectedCascadeItem ? 'No linked H1 Projects found under selected item.' : 'No H1 Projects found.'}
                  </div>
                ) : (
                  cascadeFilteredData.projects.map((proj) => {
                    const isSelected = selectedCascadeItem?.id === proj.id && selectedCascadeItem.type === 'project';
                    const isHovered = hoveredCascadeItemId === proj.id;
                    const isConnected = activeConnectedIds.has(proj.id);
                    const projActions = actions.filter((a) => a.projectId === proj.id && a.type === 'action' && !a.completed);

                    return (
                      <div
                        key={proj.id}
                        data-cascade-id={proj.id}
                        onMouseEnter={() => setHoveredCascadeItemId(proj.id)}
                        onMouseLeave={() => setHoveredCascadeItemId(null)}
                        onClick={() => handleCascadeItemClick(proj.id, 'project')}
                        className={'rounded-2xl p-3.5 space-y-2 cursor-pointer transition-all duration-200 relative z-20 ' + (
                          isSelected
                            ? 'bg-[#1e1710] border-2 border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30'
                            : isHovered
                            ? 'bg-[#1c150e] border-2 border-amber-400 shadow-md shadow-amber-500/10'
                            : isConnected
                            ? 'bg-[#18120c] border-2 border-amber-500/80 shadow-xs'
                            : 'bg-[#141414] border border-[#262626] hover:border-amber-700/60'
                        )}
                        title={isSelected ? 'Click to unselect / show all' : 'Click to isolate actions'}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <h4 className="text-xs font-bold text-gray-200 truncate">
                              {proj.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedProjectId(proj.id);
                                setActiveTab('projects');
                              }}
                              className="p-1 text-gray-400 hover:text-amber-300 rounded"
                              title="Go to Project view"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {projActions.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-[#222]" onClick={(e) => e.stopPropagation()}>
                            {projActions.slice(0, 3).map((a) => (
                              <div key={a.id} className="text-[11px] text-gray-300 flex items-center justify-between gap-1.5 group/act">
                                <div className="flex items-center gap-1.5 truncate">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleActionComplete(a.id);
                                    }}
                                    className="w-3.5 h-3.5 rounded border border-neutral-600 hover:border-amber-400 hover:bg-amber-400/15 flex items-center justify-center text-transparent hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                                    title="Mark action complete"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="truncate">{a.title}</span>
                                </div>
                              </div>
                            ))}
                            {projActions.length > 3 && (
                              <span className="text-[10px] text-gray-500 block">+{projActions.length - 3} more actions</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        projectToEdit={projectToEdit}
        defaultAreaId={defaultAreaForProject}
        defaultGoalId={defaultGoalForProject}
      />

      {/* Action Edit Modal */}
      <ActionEditModal
        action={actionToEdit}
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setActionToEdit(null);
        }}
      />

      {/* Confirm Delete Project Modal */}
      <ConfirmDeleteModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) {
            deleteProject(projectToDelete.id);
            setProjectToDelete(null);
          }
        }}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.title}"? All associated actions will be deleted.`}
        confirmLabel="Delete Project"
      />

    </div>
  );
};
