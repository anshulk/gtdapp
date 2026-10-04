import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Target, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Check, 
  RotateCcw, 
  Tag, 
  Plus, 
  X 
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDProject, GTDAction } from '../types/gtd';
import { isProjectStalled } from '../utils/projectUtils';
import { trackButtonClick } from '../services/analytics';

interface ProjectCardProps {
  project: GTDProject;
  onEditProject: (project: GTDProject, e: React.MouseEvent) => void;
  onDeleteProject: (project: GTDProject) => void;
  onEditAction: (action: GTDAction) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEditProject,
  onDeleteProject,
  onEditAction,
}) => {
  const {
    actions = [],
    horizonItems = [],
    setSelectedProjectId,
    toggleActionComplete,
    logRecurringCompletion,
    addAction,
  } = useGTD();

  const [quickConfirm, setQuickConfirm] = useState(false);
  const [inlineAction, setInlineAction] = useState('');
  const [isAddingAction, setIsAddingAction] = useState(false);

  const projectActions = actions.filter((a) => a.projectId === project.id);
  const activeActions = projectActions.filter((a) => !a.isRecurring && !a.completed && a.type === 'action');
  const recurringActions = projectActions.filter((a) => a.isRecurring && a.type === 'action');
  const completedActions = projectActions.filter((a) => a.completed);
  const isStalled = isProjectStalled(project, projectActions);

  const linkedArea = horizonItems.find((h) => h.id === project.areaId);
  const linkedGoal = horizonItems.find((h) => h.id === project.goalId);

  const handleAddInline = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inlineAction.trim();
    if (!text) return;

    trackButtonClick('project_card_add_action', 'project_card', { project_id: project.id });
    addAction({
      title: text,
      projectId: project.id,
      type: 'action',
      priority: 'high',
    });

    setInlineAction('');
    setIsAddingAction(false);
  };

  return (
    <div
      onClick={() => {
        trackButtonClick('project_card_open_detail', 'project_card', { project_id: project.id });
        setSelectedProjectId(project.id);
      }}
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
            {quickConfirm ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-lg text-xs animate-in fade-in"
              >
                <span className="text-[11px] text-rose-200 font-semibold">Delete?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project);
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickConfirm(false);
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
                  onClick={(e) => {
                    trackButtonClick('project_card_edit_project', 'project_card', { project_id: project.id });
                    onEditProject(project, e);
                  }}
                  className="p-1.5 text-gray-500 hover:text-[#C5A47E] hover:bg-[#1E1E1E] rounded-lg cursor-pointer transition-colors"
                  title="Edit project"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    trackButtonClick('project_card_delete_project', 'project_card', { project_id: project.id });
                    if (e.shiftKey) {
                      onDeleteProject(project);
                    } else {
                      setQuickConfirm(true);
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
            <form onSubmit={handleAddInline} className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={inlineAction}
                onChange={(e) => setInlineAction(e.target.value)}
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
                  onClick={() => {
                    trackButtonClick('project_card_toggle_inline_action', 'project_card', { project_id: project.id });
                    setIsAddingAction((prev) => !prev);
                  }}
                  className="text-[10px] text-gray-400 hover:text-[#C5A47E] flex items-center gap-0.5 cursor-pointer transition-colors"
                  title="Add another action to this project"
                >
                  <Plus className="w-3 h-3" />
                  <span>Action</span>
                </button>
              </div>

              {/* Inline add action form when toggled */}
              {isAddingAction && (
                <form 
                  onSubmit={handleAddInline} 
                  className="flex items-center gap-1.5 w-full pb-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={inlineAction}
                    onChange={(e) => setInlineAction(e.target.value)}
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
                    onClick={() => setIsAddingAction(false)}
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
                          trackButtonClick('project_card_complete_action', 'project_card', { action_id: act.id, project_id: project.id });
                          toggleActionComplete(act.id);
                        }}
                        className="w-4 h-4 rounded border border-neutral-600 hover:border-[#C5A47E] hover:bg-[#C5A47E]/15 flex items-center justify-center text-transparent hover:text-[#C5A47E] transition-all shrink-0 cursor-pointer group/chk"
                        title="Mark action complete"
                      >
                        <Check className="w-2.5 h-2.5 group-hover/chk:scale-110 transition-transform" />
                      </button>
                      <span 
                        onClick={() => {
                          trackButtonClick('project_card_action_click', 'project_card', { action_id: act.id, project_id: project.id });
                          onEditAction(act);
                        }}
                        className="truncate font-medium cursor-pointer hover:text-[#C5A47E] transition-colors"
                        title={act.title}
                      >
                        {act.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {act.tags && act.tags.length > 0 && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#141414] text-[#C5A47E] border border-[#242424]">
                          {act.tags[0]}
                          {act.tags.length > 1 ? ` +${act.tags.length - 1}` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          trackButtonClick('project_card_edit_action', 'project_card', { action_id: act.id, project_id: project.id });
                          onEditAction(act);
                        }}
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
                          trackButtonClick('project_card_log_routine', 'project_card', { action_id: act.id, project_id: project.id });
                          logRecurringCompletion(act.id);
                        }}
                        className="w-4 h-4 rounded border border-amber-800/60 hover:border-amber-400 hover:bg-amber-400/15 flex items-center justify-center text-amber-500/70 hover:text-amber-300 transition-all shrink-0 cursor-pointer group/chk"
                        title="Log routine completion for today"
                      >
                        <RotateCcw className="w-2.5 h-2.5 group-hover/chk:rotate-180 transition-transform duration-300" />
                      </button>
                      <span 
                        onClick={() => {
                          trackButtonClick('project_card_routine_click', 'project_card', { action_id: act.id, project_id: project.id });
                          onEditAction(act);
                        }}
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
                        onClick={() => {
                          trackButtonClick('project_card_edit_routine', 'project_card', { action_id: act.id, project_id: project.id });
                          onEditAction(act);
                        }}
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
                    onClick={() => {
                      trackButtonClick('project_card_view_more_actions', 'project_card', { project_id: project.id });
                      setSelectedProjectId(project.id);
                    }}
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
};
