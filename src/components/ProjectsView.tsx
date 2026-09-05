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
  Tag
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDProject, ProjectStatus, GTDAction } from '../types/gtd';
import { LIFE_DOMAINS } from '../data/gtdData';
import { ProjectModal } from './ProjectModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ActionEditModal } from './ActionEditModal';
import { isProjectStalled } from '../utils/projectUtils';

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
  const [quickConfirmId, setQuickConfirmId] = useState<string | null>(null);
  const [inlineNextAction, setInlineNextAction] = useState<{ [projId: string]: string }>({});
  const [addingActionForProj, setAddingActionForProj] = useState<{ [projId: string]: boolean }>({});
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

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
    setQuickConfirmId(null);
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
        const itemDomain = p.lifeDomain || horizonItems.find((h) => h.id === p.areaId)?.lifeDomain || horizonItems.find((h) => h.id === p.goalId)?.lifeDomain;
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

  const handleOpenAddModal = () => {
    setProjectToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (proj: GTDProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(proj);
    setModalOpen(true);
  };

  const handleAddInlineAction = (projId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = inlineNextAction[projId]?.trim();
    if (!text) return;

    addAction({
      title: text,
      projectId: projId,
      context: '@computer',
      energy: 'medium',
      timeEstimate: '15-30m',
      type: 'action',
      priority: 'high',
    });

    setInlineNextAction((prev) => ({ ...prev, [projId]: '' }));
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="bg-[#141414] rounded-2xl border border-[#262626] p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A47E]/10 text-[#C5A47E] text-xs font-bold border border-[#C5A47E]/20">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Horizon 1 • 10,000 ft</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
              Projects Matrix & Deliverables
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              In GTD, a project is any desired outcome requiring more than one action step to complete within 12 months. Every active project must have a clear physical next action.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-8 pt-6 border-t border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-xs">
            {(['active', 'on-hold', 'completed', 'someday-maybe', 'all'] as const).map((st) => {
              const count = st === 'all' ? projects.length : projects.filter((p) => p.status === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                      : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#282828] hover:text-gray-200 border border-[#262626]'
                  }`}
                >
                  <span>{st.replace('-', ' ')}</span>
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
            <Briefcase className="w-12 h-12 text-[#C5A47E] mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold text-white font-serif">
              No Projects Found
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              No projects match the selected filters. Create a new multi-step project to get moving!
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-[#C5A47E] text-black font-bold rounded-xl text-xs shadow-xs hover:bg-[#b8946e] cursor-pointer"
            >
              Create Project
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const projectActions = actions.filter((a) => a.projectId === project.id);
            const activeActions = projectActions.filter((a) => !a.isRecurring && !a.completed && a.type === 'action');
            const recurringActions = projectActions.filter((a) => a.isRecurring && a.type === 'action');
            const completedActions = projectActions.filter((a) => a.completed);
            const isStalled = isProjectStalled(project, projectActions);

            const linkedArea = horizonItems.find((h) => h.id === project.areaId);
            const linkedGoal = horizonItems.find((h) => h.id === project.goalId);

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`bg-[#141414] rounded-2xl border transition-all p-5 flex flex-col justify-between cursor-pointer group shadow-md hover:shadow-xl ${
                  isStalled
                    ? 'border-amber-700/80 ring-1 ring-amber-800/40'
                    : 'border-[#262626] hover:border-[#383838]'
                }`}
              >
                <div className="space-y-3.5">
                  
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        project.status === 'active'
                          ? 'bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/30'
                          : project.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                          : 'bg-neutral-800 text-gray-400 border border-[#262626]'
                      }`}>
                        {project.status}
                      </span>

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        project.priority === 'high'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                          : project.priority === 'medium'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                          : 'bg-neutral-800 text-gray-400'
                      }`}>
                        {project.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {quickConfirmId === project.id ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-lg text-xs animate-in fade-in"
                        >
                          <span className="text-[11px] text-rose-200 font-semibold">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              executeDeleteProject(project);
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickConfirmId(null);
                            }}
                            className="px-1.5 py-0.5 text-gray-400 hover:text-white text-[10px] rounded cursor-pointer transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(project, e)}
                            className="p-1.5 text-gray-500 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-lg cursor-pointer transition-colors"
                            title="Edit project"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.shiftKey) {
                                executeDeleteProject(project);
                              } else {
                                setQuickConfirmId(project.id);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors group/del"
                            title="Quick Delete (Click to confirm, or Shift+Click for instant delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5 group-hover/del:scale-110 transition-transform" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Project Title */}
                  <h3 className="text-base font-bold text-white font-serif leading-snug group-hover:text-[#C5A47E] transition-colors">
                    {project.title}
                  </h3>

                  {/* Desired Outcome */}
                  <div className="text-xs text-gray-300 bg-[#191919] p-2.5 rounded-xl border border-[#262626] space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Outcome / Finish Line:
                    </span>
                    <p className="line-clamp-2 leading-relaxed font-medium text-gray-200">
                      {project.desiredOutcome}
                    </p>
                  </div>

                  {/* Horizon Lineage Tags & Life Domain */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {project.lifeDomain && (
                      <span className="px-2 py-0.5 rounded bg-[#C5A47E]/15 text-[#C5A47E] border border-[#C5A47E]/30 font-medium flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{project.lifeDomain}</span>
                      </span>
                    )}
                    {linkedArea && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{linkedArea.title}</span>
                      </span>
                    )}
                    {linkedGoal && (
                      <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40 font-medium flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{linkedGoal.title}</span>
                      </span>
                    )}
                  </div>

                  {/* Stalled Alert & Inline Action Adder */}
                  {isStalled ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="bg-amber-950/30 p-2.5 sm:p-3 rounded-xl border border-amber-800/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Stalled: Missing Next Action</span>
                      </div>
                      <form onSubmit={(e) => handleAddInlineAction(project.id, e)} className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={inlineNextAction[project.id] || ''}
                          onChange={(e) =>
                            setInlineNextAction((prev) => ({ ...prev, [project.id]: e.target.value }))
                          }
                          placeholder="Type next physical step..."
                          className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-[#141414] border border-amber-700/60 text-gray-200 placeholder-gray-500 rounded-md focus:outline-hidden focus:border-amber-400"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black rounded-md text-[11px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* Active next action or recurring routine preview with interactive completion checkboxes */
                    (activeActions.length > 0 || recurringActions.length > 0) && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Active Actions ({activeActions.length + recurringActions.length})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAddingActionForProj((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                            }
                            className="text-[10px] text-gray-400 hover:text-[#C5A47E] flex items-center gap-0.5 cursor-pointer transition-colors"
                            title="Add another action to this project"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Action</span>
                          </button>
                        </div>

                        {/* Inline add action form when toggled */}
                        {addingActionForProj[project.id] && (
                          <form 
                            onSubmit={(e) => {
                              handleAddInlineAction(project.id, e);
                              setAddingActionForProj((prev) => ({ ...prev, [project.id]: false }));
                            }} 
                            className="flex items-center gap-1.5 w-full pb-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={inlineNextAction[project.id] || ''}
                              onChange={(e) =>
                                setInlineNextAction((prev) => ({ ...prev, [project.id]: e.target.value }))
                              }
                              placeholder="Add next physical step..."
                              className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-[#191919] border border-[#383838] text-gray-200 placeholder-gray-500 rounded-md focus:outline-hidden focus:border-[#C5A47E]"
                            />
                            <button
                              type="submit"
                              className="px-2.5 py-1 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-md text-[11px] font-bold shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingActionForProj((prev) => ({ ...prev, [project.id]: false }))}
                              className="p-1 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        )}

                        {/* Actions List */}
                        <div className="space-y-1.5">
                          {activeActions.slice(0, 2).map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center justify-between gap-2 text-gray-200 bg-[#191919] hover:bg-[#202020] p-2 rounded-lg border border-[#262626] hover:border-[#C5A47E]/40 transition-colors group/action"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActionComplete(act.id);
                                  }}
                                  className="w-4 h-4 rounded border border-neutral-600 hover:border-[#C5A47E] hover:bg-[#C5A47E]/15 flex items-center justify-center text-transparent hover:text-[#C5A47E] transition-all shrink-0 cursor-pointer group/chk"
                                  title="Mark action complete"
                                >
                                  <Check className="w-2.5 h-2.5 group-hover/chk:scale-110 transition-transform" />
                                </button>
                                <span 
                                  onClick={() => setEditingAction(act)}
                                  className="truncate font-medium cursor-pointer hover:text-[#C5A47E] transition-colors"
                                  title={act.title}
                                >
                                  {act.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-[#141414] text-gray-400 border border-[#242424]">
                                  {act.context}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingAction(act)}
                                  className="opacity-0 group-hover/action:opacity-100 p-0.5 text-gray-500 hover:text-[#C5A47E] rounded transition-opacity cursor-pointer"
                                  title="Edit action"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Active Recurring Routines */}
                          {recurringActions.slice(0, Math.max(1, 3 - activeActions.length)).map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center justify-between gap-2 text-gray-200 bg-[#191919] hover:bg-[#202020] p-2 rounded-lg border border-amber-900/30 hover:border-amber-700/40 transition-colors group/action"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    logRecurringCompletion(act.id);
                                  }}
                                  className="w-4 h-4 rounded border border-amber-800/60 hover:border-amber-400 hover:bg-amber-400/15 flex items-center justify-center text-amber-500/70 hover:text-amber-300 transition-all shrink-0 cursor-pointer group/chk"
                                  title="Log routine completion for today"
                                >
                                  <RotateCcw className="w-2.5 h-2.5 group-hover/chk:rotate-180 transition-transform duration-300" />
                                </button>
                                <span 
                                  onClick={() => setEditingAction(act)}
                                  className="truncate font-medium text-amber-200 cursor-pointer hover:text-amber-100 transition-colors"
                                  title={act.title}
                                >
                                  {act.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {act.recurrence?.label && (
                                  <span className="text-[9px] text-gray-400">
                                    {act.recurrence.label}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingAction(act)}
                                  className="opacity-0 group-hover/action:opacity-100 p-0.5 text-gray-500 hover:text-[#C5A47E] rounded transition-opacity cursor-pointer"
                                  title="Edit routine"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* More actions link if count exceeds displayed */}
                          {activeActions.length + recurringActions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setSelectedProjectId(project.id)}
                              className="text-[10px] text-gray-500 hover:text-[#C5A47E] pt-0.5 block w-full text-right cursor-pointer transition-colors"
                            >
                              +{Math.max(0, activeActions.length + recurringActions.length - 2)} more actions • View details →
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  )}

                </div>

                {/* Card Footer: Progress Bar */}
                <div className="mt-5 pt-3 border-t border-[#262626] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                    <span>
                      {completedActions.length} of {projectActions.length} Actions Done
                    </span>
                    {project.targetDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#C5A47E]" />
                        <span>{project.targetDate}</span>
                      </span>
                    )}
                  </div>

                  {/* Progress bar line */}
                  <div className="w-full bg-[#1E1E1E] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C5A47E] h-full transition-all duration-300"
                      style={{
                        width: `${
                          projectActions.length === 0
                            ? 0
                            : (completedActions.length / projectActions.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Project Modal (Add/Edit) */}
      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projectToEdit={projectToEdit}
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
