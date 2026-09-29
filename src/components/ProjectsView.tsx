import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  Plus, 
  Filter, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Target, 
  ShieldCheck, 
  ArrowRight, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  CheckSquare,
  Check,
  Undo2,
  Zap,
  RotateCcw,
  Flame,
  X,
  Tag,
  ChevronDown,
  FolderTree,
  LayoutGrid
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDProject, ProjectStatus, GTDAction } from '../types/gtd';
import { LIFE_DOMAINS } from '../data/gtdData';
import { getProjectInheritedDomain, getHorizonItemDomain } from '../utils/domainHierarchy';
import { ProjectModal } from './ProjectModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ActionEditModal } from './ActionEditModal';
import { ProjectCard } from './ProjectCard';
import { isProjectStalled } from '../utils/projectUtils';

interface ProjectParentGroup {
  id: string;
  type: 'goal' | 'area' | 'unassigned';
  level: 3 | 2 | 0;
  title: string;
  description?: string;
  parentAreaTitle?: string;
  lifeDomain?: string;
  areaId?: string;
  goalId?: string;
  projects: GTDProject[];
}

export const ProjectsView: React.FC = () => {
  const {
    projects = [],
    actions = [],
    horizonItems = [],
    selectedProjectId,
    setSelectedProjectId,
    deleteProject,
    restoreProject,
    updateProject,
    addAction,
    toggleActionComplete,
    logRecurringCompletion,
  } = useGTD();

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<GTDProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<GTDProject | null>(null);
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

  // Grouping by parent state
  const [groupByParent, setGroupByParent] = useState<boolean>(true);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [defaultParentAreaId, setDefaultParentAreaId] = useState<string | undefined>(undefined);
  const [defaultParentGoalId, setDefaultParentGoalId] = useState<string | undefined>(undefined);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    project: GTDProject;
    linkedActionIds: string[];
    timer: number;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss undo toast after 6 seconds
  useEffect(() => {
    if (undoToast) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 6000);
    }
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, [undoToast]);

  const executeDeleteProject = (project: GTDProject) => {
    const linkedActionIds = actions
      .filter((a) => a.projectId === project.id)
      .map((a) => a.id);

    deleteProject(project.id);
    if (selectedProjectId === project.id) {
      setSelectedProjectId(null);
    }
    setProjectToDelete(null);

    // Trigger Undo Toast
    setUndoToast({
      project,
      linkedActionIds,
      timer: 6,
    });
  };

  const handleUndoDelete = () => {
    if (undoToast) {
      restoreProject(undoToast.project, undoToast.linkedActionIds);
      setUndoToast(null);
    }
  };

  const areasOfFocus = useMemo(() => horizonItems.filter((h) => h.level === 2), [horizonItems]);
  const goals = useMemo(() => horizonItems.filter((h) => h.level === 3), [horizonItems]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (areaFilter !== 'all' && p.areaId !== areaFilter) return false;
      if (goalFilter !== 'all' && p.goalId !== goalFilter) return false;
      if (domainFilter !== 'all') {
        const itemDomain = getProjectInheritedDomain(p, horizonItems);
        if (itemDomain !== domainFilter) return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchOutcome = p.desiredOutcome.toLowerCase().includes(query);
        if (!matchTitle && !matchOutcome) return false;
      }
      return true;
    });
  }, [projects, statusFilter, areaFilter, goalFilter, domainFilter, horizonItems, search]);

  const handleOpenAddModal = (defaultAreaId?: string, defaultGoalId?: string) => {
    setProjectToEdit(null);
    setDefaultParentAreaId(defaultAreaId);
    setDefaultParentGoalId(defaultGoalId);
    setModalOpen(true);
  };

  const projectGroups = useMemo(() => {
    const groupsMap = new Map<string, ProjectParentGroup>();

    filteredProjects.forEach((p) => {
      const linkedGoal = p.goalId ? goals.find((g) => g.id === p.goalId) : undefined;
      const linkedArea = p.areaId ? areasOfFocus.find((a) => a.id === p.areaId) : undefined;

      let groupId = 'unassigned';
      let type: 'goal' | 'area' | 'unassigned' = 'unassigned';
      let level: 3 | 2 | 0 = 0;
      let title = 'Independent Projects';
      let description: string | undefined = 'Projects with no higher horizon goal or area assigned';
      let parentAreaTitle: string | undefined = undefined;
      let lifeDomain: string | undefined = getProjectInheritedDomain(p, horizonItems);
      let areaId: string | undefined = undefined;
      let goalId: string | undefined = undefined;

      if (linkedGoal) {
        groupId = `goal-${linkedGoal.id}`;
        type = 'goal';
        level = 3;
        title = linkedGoal.title;
        description = linkedGoal.description;
        goalId = linkedGoal.id;
        areaId = p.areaId || linkedGoal.parentId;
        lifeDomain = getHorizonItemDomain(linkedGoal, horizonItems) || getProjectInheritedDomain(p, horizonItems);

        const goalParentArea = linkedArea || (linkedGoal.parentId ? areasOfFocus.find((a) => a.id === linkedGoal.parentId) : undefined);
        if (goalParentArea) {
          parentAreaTitle = goalParentArea.title;
        }
      } else if (linkedArea) {
        groupId = `area-${linkedArea.id}`;
        type = 'area';
        level = 2;
        title = linkedArea.title;
        description = linkedArea.description;
        areaId = linkedArea.id;
        lifeDomain = getHorizonItemDomain(linkedArea, horizonItems) || getProjectInheritedDomain(p, horizonItems);
      }

      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          id: groupId,
          type,
          level,
          title,
          description,
          parentAreaTitle,
          lifeDomain,
          areaId,
          goalId,
          projects: [],
        });
      }

      groupsMap.get(groupId)!.projects.push(p);
    });

    // Sort groups: Level 3 (Goals) first, then Level 2 (Areas), then Level 0 (Unassigned)
    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.level !== b.level) {
        return b.level - a.level;
      }
      return a.title.localeCompare(b.title);
    });
  }, [filteredProjects, goals, areasOfFocus]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    setCollapsedGroupIds(new Set());
  };

  const collapseAllGroups = () => {
    setCollapsedGroupIds(new Set(projectGroups.map((g) => g.id)));
  };

  const handleOpenEditModal = (proj: GTDProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(proj);
    setModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="bg-[#141414] rounded-xl border border-[#262626] p-3.5 sm:p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-serif flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#C5A47E]" />
              <span>Projects Matrix</span>
            </h1>
            <span className="text-[11px] font-mono text-[#C5A47E] px-2 py-0.5 rounded-md bg-[#C5A47E]/10 border border-[#C5A47E]/20">
              H1 • 10,000 ft
            </span>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Project</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-3 pt-3 border-t border-[#202020] flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-xs">
            {(['active', 'on-hold', 'completed', 'someday-maybe', 'all'] as const).map((st) => {
              const count = st === 'all' ? projects.length : projects.filter((p) => p.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all capitalize whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                      : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  <span>{st.replace('-', ' ')}</span>
                  <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === st ? 'bg-black/30 text-black' : 'bg-[#282828] text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Area, Goal & Life Domain dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded-xl text-gray-300 text-xs focus:bg-[#191919] focus:outline-hidden focus:border-[#C5A47E]"
            >
              <option value="all">All Life Domains</option>
              {LIFE_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded-xl text-gray-300 text-xs focus:bg-[#191919] focus:outline-hidden focus:border-[#C5A47E]"
            >
              <option value="all">All Areas of Focus (H2)</option>
              {areasOfFocus.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>

            <select
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded-xl text-gray-300 text-xs focus:bg-[#191919] focus:outline-hidden focus:border-[#C5A47E]"
            >
              <option value="all">All Goals (H3)</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Layout & Grouping Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#121212] border border-[#222222] p-2.5 sm:px-3 sm:py-2 rounded-xl">
        {/* Layout Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-400 font-medium">Layout:</span>
          <div className="bg-[#181818] border border-[#282828] p-0.5 rounded-lg flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGroupByParent(true)}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                groupByParent
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Group by Parent</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupByParent(false)}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                !groupByParent
                  ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Flat Grid</span>
            </button>
          </div>

          {groupByParent && (
            <span className="text-[11px] text-[#C5A47E] font-mono px-2 py-0.5 rounded bg-[#C5A47E]/10 border border-[#C5A47E]/20">
              {projectGroups.length} Parent {projectGroups.length === 1 ? 'Group' : 'Groups'}
            </span>
          )}
        </div>

        {/* Expand / Collapse all & Search */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {groupByParent && projectGroups.length > 1 && (
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <button
                type="button"
                onClick={expandAllGroups}
                className="hover:text-white px-2 py-1 rounded bg-[#181818] border border-[#262626] hover:border-[#383838] transition-colors cursor-pointer"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllGroups}
                className="hover:text-white px-2 py-1 rounded bg-[#181818] border border-[#262626] hover:border-[#383838] transition-colors cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-36 sm:w-48 pl-8 pr-6 py-1 bg-[#161616] border border-[#282828] rounded-lg text-gray-300 text-xs focus:outline-hidden focus:border-[#C5A47E] placeholder-gray-500"
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
        </div>
      </div>

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
          <Briefcase className="w-12 h-12 text-[#C5A47E] mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-white font-serif">
            No Projects Found
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            No projects match the selected filters. Create a new multi-step project to get moving!
          </p>
          <button
            onClick={() => handleOpenAddModal()}
            className="mt-4 px-4 py-2 bg-[#C5A47E] text-black font-bold rounded-xl text-xs shadow-xs hover:bg-[#b8946e] cursor-pointer"
          >
            Create Project
          </button>
        </div>
      ) : groupByParent ? (
        <div className="space-y-6">
          {projectGroups.map((group) => {
            const isCollapsed = collapsedGroupIds.has(group.id);
            const stalledCount = group.projects.filter((p) =>
              isProjectStalled(p, actions.filter((a) => a.projectId === p.id))
            ).length;

            return (
              <div
                key={group.id}
                className="bg-[#121212] border border-[#242424] rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                {/* Group Header */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="p-3.5 sm:p-4 bg-[#161616] hover:bg-[#191919] border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors select-none"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-white rounded-md transition-colors shrink-0 mt-0.5 sm:mt-0"
                      title={isCollapsed ? 'Expand group' : 'Collapse group'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90 text-gray-500' : 'text-[#C5A47E]'
                        }`}
                      />
                    </button>

                    {/* Altitude / Parent Icon */}
                    <div className="shrink-0">
                      {group.type === 'goal' ? (
                        <div className="p-2 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/50">
                          <Target className="w-4 h-4" />
                        </div>
                      ) : group.type === 'area' ? (
                        <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-neutral-800 text-gray-400 border border-neutral-700">
                          <Briefcase className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Title & Lineage */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {group.type === 'goal' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-950/70 text-sky-300 border border-sky-800/50 font-mono">
                            H3 • 30k ft Goal
                          </span>
                        )}
                        {group.type === 'area' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 font-mono">
                            H2 • 20k ft Area
                          </span>
                        )}
                        {group.type === 'unassigned' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-800 text-gray-400 border border-neutral-700 font-mono">
                            Independent / Standalone
                          </span>
                        )}

                        <h2 className="text-sm sm:text-base font-bold text-white font-serif truncate">
                          {group.title}
                        </h2>
                      </div>

                      {/* Sub-lineage and domain */}
                      <div className="flex items-center gap-2.5 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                        {group.parentAreaTitle && (
                          <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Area: {group.parentAreaTitle}</span>
                          </span>
                        )}
                        {group.lifeDomain && (
                          <span className="flex items-center gap-1 text-[#C5A47E]/90">
                            <Tag className="w-2.5 h-2.5 text-[#C5A47E]" />
                            <span>{group.lifeDomain}</span>
                          </span>
                        )}
                        {group.description && (
                          <span className="text-gray-500 hidden md:inline truncate max-w-xs">
                            • {group.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right stats & action button */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs"
                  >
                    {stalledCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>{stalledCount} Stalled</span>
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-full bg-[#1F1F1F] text-gray-300 border border-[#2E2E2E] text-[11px] font-medium font-mono">
                      {group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(group.areaId, group.goalId)}
                      className="px-2.5 py-1 bg-[#C5A47E]/15 hover:bg-[#C5A47E] text-[#C5A47E] hover:text-black border border-[#C5A47E]/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      title={`Add project under ${group.title}`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Project</span>
                    </button>
                  </div>
                </div>

                {/* Group Project Cards */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5 bg-[#101010]/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.projects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onEditProject={handleOpenEditModal}
                          onDeleteProject={executeDeleteProject}
                          onEditAction={(act) => setEditingAction(act)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEditProject={handleOpenEditModal}
              onDeleteProject={executeDeleteProject}
              onEditAction={(act) => setEditingAction(act)}
            />
          ))}
        </div>
      )}

      {/* Project Modal (Add/Edit) */}
      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projectToEdit={projectToEdit}
        defaultAreaId={defaultParentAreaId}
        defaultGoalId={defaultParentGoalId}
      />

      {/* Project Deep Dive Drawer Modal */}
      <ProjectDetailModal
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        onEditProject={(proj) => {
          setSelectedProjectId(null);
          setProjectToEdit(proj);
          setModalOpen(true);
        }}
      />

      {/* Action Edit Modal */}
      <ActionEditModal
        action={editingAction}
        isOpen={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
      />

      {/* Quick Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) {
            executeDeleteProject(projectToDelete);
          }
        }}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.title}"? Any linked next actions will be preserved as standalone actions.`}
        confirmLabel="Delete Project"
      />

      {/* Floating Undo Notification Toast */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-[#1C1C1C] text-white border border-[#333333] shadow-2xl rounded-2xl p-4 flex items-center gap-3.5 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold text-gray-200 truncate">
                Deleted &ldquo;{undoToast.project.title}&rdquo;
              </p>
              <p className="text-[11px] text-gray-400">
                {undoToast.linkedActionIds.length > 0
                  ? `${undoToast.linkedActionIds.length} actions unlinked`
                  : 'Project removed'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-3 py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoToast(null)}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
