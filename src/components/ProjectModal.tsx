import React, { useState, useEffect, useMemo } from 'react';
import { X, Briefcase, Plus, Trash2, Link as LinkIcon, Target, ShieldCheck, CheckSquare, Tag } from 'lucide-react';
import { GTDProject, ProjectStatus, HorizonLevel } from '../types/gtd';
import { useGTD } from '../context/GTDContext';
import { getAncestorH4ForProject } from '../utils/domainHierarchy';
import { HorizonMappingSelector } from './HorizonMappingSelector';
import { HorizonItemModal } from './HorizonItemModal';
import { trackButtonClick, trackProjectEvent } from '../services/analytics';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: GTDProject | null;
  defaultAreaId?: string;
  defaultGoalId?: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  defaultAreaId,
  defaultGoalId,
}) => {
  const { horizonItems, addProject, updateProject, deleteProject } = useGTD();

  const [title, setTitle] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [areaId, setAreaId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [priority, setPriority] = useState<GTDProject['priority']>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [initialNextAction, setInitialNextAction] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [horizonModalOpen, setHorizonModalOpen] = useState(false);
  const [horizonModalLevel, setHorizonModalLevel] = useState<HorizonLevel>(3);
  const [horizonModalParentId, setHorizonModalParentId] = useState<string | undefined>(undefined);

  const areasOfFocus = horizonItems.filter((h) => h.level === 2);
  const goals = horizonItems.filter((h) => h.level === 3);

  // Derive ancestor H4 Vision and inherited domain dynamically
  const ancestorH4 = useMemo(() => {
    return getAncestorH4ForProject({ goalId, areaId } as GTDProject, horizonItems);
  }, [goalId, areaId, horizonItems]);

  const inheritedDomain = ancestorH4?.lifeDomain;

  useEffect(() => {
    setConfirmDelete(false);
    if (projectToEdit) {
      setTitle(projectToEdit.title);
      setDesiredOutcome(projectToEdit.desiredOutcome);
      setAreaId(projectToEdit.areaId || '');
      setGoalId(projectToEdit.goalId || '');
      setStatus(projectToEdit.status);
      setPriority(projectToEdit.priority);
      setTargetDate(projectToEdit.targetDate || '');
      setNotes(projectToEdit.notes || '');
      setInitialNextAction('');
    } else {
      setTitle('');
      setDesiredOutcome('');
      setAreaId(defaultAreaId || '');
      setGoalId(defaultGoalId || '');
      setStatus('active');
      setPriority('medium');
      setTargetDate('');
      setNotes('');
      setInitialNextAction('');
    }
  }, [projectToEdit, defaultAreaId, defaultGoalId, isOpen]);

  if (!isOpen) return null;

  const handleGoalChange = (newGoalId: string) => {
    setGoalId(newGoalId);
    if (newGoalId) {
      const selectedGoal = goals.find((g) => g.id === newGoalId);
      if (selectedGoal && selectedGoal.parentId) {
        setAreaId(selectedGoal.parentId);
      }
    }
  };

  const handleAreaChange = (newAreaId: string) => {
    setAreaId(newAreaId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desiredOutcome.trim()) return;

    trackButtonClick(projectToEdit ? 'project_modal_save' : 'project_modal_create', 'project_modal', {
      project_id: projectToEdit?.id,
      status,
      priority,
    });
    trackProjectEvent(projectToEdit ? 'edit' : 'create', {
      id: projectToEdit?.id,
      title: title.trim(),
      status,
    });

    if (projectToEdit) {
      updateProject(projectToEdit.id, {
        title: title.trim(),
        desiredOutcome: desiredOutcome.trim(),
        areaId: areaId || undefined,
        goalId: goalId || undefined,
        lifeDomain: undefined,
        status,
        priority,
        targetDate: targetDate || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addProject(
        {
          title: title.trim(),
          desiredOutcome: desiredOutcome.trim(),
          areaId: areaId || undefined,
          goalId: goalId || undefined,
          lifeDomain: undefined,
          status,
          priority,
          targetDate: targetDate || undefined,
          notes: notes.trim() || undefined,
        },
        initialNextAction.trim() || undefined
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-2xl shadow-2xl border border-[#262626] w-full max-w-xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626] sticky top-0 bg-[#141414]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif">
                {projectToEdit ? 'Edit GTD Project' : 'Create New GTD Project'}
              </h2>
              <p className="text-xs text-gray-400">
                Horizon 1 • 10,000 ft (Multi-step outcome completed in &lt;1 year)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              trackButtonClick('project_modal_close', 'project_modal', { project_id: projectToEdit?.id });
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Project Title */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch Open Source GTD Toolkit, Install Rooftop Solar, Run Marathon"
              className="w-full px-3.5 py-2.5 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-white font-semibold placeholder-gray-500"
            />
          </div>

          {/* Desired Outcome (GTD Standard) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Desired Outcome (Definition of Done) *
              </label>
              <span className="text-[11px] text-[#C5A47E] font-medium">GTD Core Metric</span>
            </div>
            <textarea
              required
              rows={2}
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              placeholder="What does 'finished' look like physically in the real world? e.g. Contract signed, permit approved, and dates on calendar."
              className="w-full px-3.5 py-2 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500"
            />
          </div>

          {/* Initial Next Action (For New Projects) */}
          {!projectToEdit && (
            <div className="bg-[#191919] border border-[#262626] p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-[#C5A47E] text-xs font-bold">
                <CheckSquare className="w-4 h-4 text-[#C5A47E]" />
                <span>First Physical Next Action (Prevents Stalled Projects)</span>
              </div>
              <input
                type="text"
                value={initialNextAction}
                onChange={(e) => setInitialNextAction(e.target.value)}
                placeholder="What is the very first physical action you can take right now? (e.g. Call contractor, Draft outline)"
                className="w-full px-3 py-2 text-xs bg-[#141414] border border-[#262626] rounded-lg focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500"
              />
            </div>
          )}

          {/* Horizon Links: H3 / H2 Mapping Selector */}
          <HorizonMappingSelector
            selectedGoalId={goalId}
            selectedAreaId={areaId}
            projectTitle={title}
            onGoalChange={(newGoalId, autoAreaId) => {
              setGoalId(newGoalId);
              if (autoAreaId) {
                setAreaId(autoAreaId);
              }
            }}
            onAreaChange={(newAreaId) => {
              setAreaId(newAreaId);
            }}
            onOpenCreateHorizon={(level, parentId) => {
              setHorizonModalLevel(level);
              setHorizonModalParentId(parentId);
              setHorizonModalOpen(true);
            }}
          />

          {/* Inherited Life Domain Display (H4 Authority) */}
          <div className="bg-[#191919] border border-[#262626] rounded-xl p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C5A47E]" />
                  <span>Inherited Life Domain</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {inheritedDomain ? (
                    <>
                      Inherited from H4 Vision:{' '}
                      <strong className="text-white font-medium">{ancestorH4?.title}</strong>
                    </>
                  ) : (
                    'Link to a Goal (H3) or Area (H2) anchored to an H4 Vision to inherit its Life Domain.'
                  )}
                </p>
              </div>
              {inheritedDomain ? (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#C5A47E]/20 text-[#C5A47E] border border-[#C5A47E]/40 whitespace-nowrap">
                  {inheritedDomain}
                </span>
              ) : (
                <span className="text-[11px] text-amber-400/90 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 whitespace-nowrap">
                  Domain Pending
                </span>
              )}
            </div>
          </div>

          {/* Status, Priority, Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
              >
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="someday-maybe">Someday / Maybe</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GTDProject['priority'])}
                className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Project Support Notes & Reference */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Project Support Notes & Brainstorming
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Background context, stakeholder contacts, links, or brainstorming ideas..."
              className="w-full px-3.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#262626]">
            {projectToEdit ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400 font-medium">Delete project?</span>
                  <button
                    type="button"
                    onClick={() => {
                      trackButtonClick('project_modal_delete_confirm', 'project_modal', { project_id: projectToEdit.id });
                      trackProjectEvent('delete', { id: projectToEdit.id, title: projectToEdit.title });
                      deleteProject(projectToEdit.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackButtonClick('project_modal_delete_cancel', 'project_modal');
                      setConfirmDelete(false);
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    trackButtonClick('project_modal_delete_prompt', 'project_modal');
                    setConfirmDelete(true);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trackButtonClick('project_modal_cancel', 'project_modal');
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-black bg-[#C5A47E] hover:bg-[#b8946e] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {projectToEdit ? 'Save Project' : 'Create Project'}
              </button>
            </div>
          </div>

        </form>
      </div>

      {horizonModalOpen && (
        <HorizonItemModal
          isOpen={horizonModalOpen}
          onClose={() => setHorizonModalOpen(false)}
          defaultLevel={horizonModalLevel}
          defaultParentId={horizonModalParentId}
        />
      )}
    </div>
  );
};
