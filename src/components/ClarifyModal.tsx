import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Briefcase, 
  Timer, 
  ArrowRight, 
  Check, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { GTDContext, EnergyLevel, TimeEstimate, GTDAction } from '../types/gtd';
import { GTD_CONTEXT_OPTIONS } from '../data/gtdData';

export const ClarifyModal: React.FC = () => {
  const {
    clarifyModalItem,
    setClarifyModalItem,
    convertInboxItem,
    deleteAction,
    projects,
    horizonItems,
  } = useGTD();

  const [decisionStep, setDecisionStep] = useState<
    'initial' | 'non_actionable' | 'two_minute' | 'delegate' | 'defer_action' | 'create_project'
  >('initial');

  // 2-minute timer state
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [timerRunning, setTimerRunning] = useState(false);

  // Form states for conversion
  const [actionTitle, setActionTitle] = useState('');
  const [context, setContext] = useState<GTDContext>('@computer');
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate>('15-30m');
  const [targetProjectId, setTargetProjectId] = useState('');

  // Delegate states
  const [delegatedTo, setDelegatedTo] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // New Project states
  const [projectTitle, setProjectTitle] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [areaId, setAreaId] = useState('');
  const [goalId, setGoalId] = useState('');

  useEffect(() => {
    if (clarifyModalItem) {
      setDecisionStep('initial');
      setActionTitle(clarifyModalItem.title);
      setProjectTitle(clarifyModalItem.title);
      setDesiredOutcome('');
      setDelegatedTo('');
      setFollowUpDate('');
      setTimerSeconds(120);
      setTimerRunning(false);
    }
  }, [clarifyModalItem]);

  // 2-minute countdown timer effect
  useEffect(() => {
    let interval: any;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  if (!clarifyModalItem) return null;

  const areasOfFocus = horizonItems.filter((h) => h.level === 2);
  const goals = horizonItems.filter((h) => h.level === 3);

  const handleClose = () => {
    setClarifyModalItem(null);
  };

  const handleTrash = () => {
    deleteAction(clarifyModalItem.id);
    handleClose();
  };

  const handleSomedayMaybe = () => {
    convertInboxItem(clarifyModalItem.id, {
      type: 'someday-maybe',
      title: actionTitle.trim() || clarifyModalItem.title,
    });
    handleClose();
  };

  const handleDoneTwoMinutes = () => {
    // Marked done immediately
    convertInboxItem(clarifyModalItem.id, {
      type: 'action',
      title: actionTitle.trim() || clarifyModalItem.title,
    });
    deleteAction(clarifyModalItem.id);
    handleClose();
  };

  const handleConfirmDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatedTo.trim()) return;

    convertInboxItem(clarifyModalItem.id, {
      type: 'waiting-for',
      title: actionTitle.trim() || clarifyModalItem.title,
      projectId: targetProjectId || undefined,
      delegatedTo: delegatedTo.trim(),
      delegatedDate: new Date().toISOString().split('T')[0],
      followUpDate: followUpDate || undefined,
    });
    handleClose();
  };

  const handleConfirmNextAction = (e: React.FormEvent) => {
    e.preventDefault();
    convertInboxItem(clarifyModalItem.id, {
      type: 'action',
      title: actionTitle.trim() || clarifyModalItem.title,
      projectId: targetProjectId || undefined,
      context,
      energy,
      timeEstimate,
    });
    handleClose();
  };

  const handleConfirmProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !desiredOutcome.trim()) return;

    convertInboxItem(clarifyModalItem.id, {
      type: 'action',
      title: actionTitle.trim() || `First step for ${projectTitle}`,
      context,
      energy,
      timeEstimate,
      newProjectData: {
        title: projectTitle.trim(),
        desiredOutcome: desiredOutcome.trim(),
        areaId: areaId || undefined,
        goalId: goalId || undefined,
      },
    });
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-3xl shadow-2xl border border-[#262626] w-full max-w-xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-[#262626] bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-serif">
                GTD Clarifying Matrix
              </h2>
              <p className="text-xs text-gray-400">
                David Allen's standard workflow to process thoughts to zero
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Captured Item Card Banner */}
          <div className="p-4 bg-[#191919] rounded-2xl border border-[#262626] space-y-1">
            <span className="text-[10px] font-bold text-[#C5A47E] uppercase tracking-wider font-mono">
              Raw Captured Item:
            </span>
            <p className="text-sm font-bold text-white leading-snug font-serif">
              "{clarifyModalItem.title}"
            </p>
            {clarifyModalItem.notes && (
              <p className="text-xs text-gray-400 mt-1">{clarifyModalItem.notes}</p>
            )}
          </div>

          {/* STEP 1: IS IT ACTIONABLE? */}
          {decisionStep === 'initial' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white font-serif text-center">
                Is this item actionable?
              </h3>
              <p className="text-xs text-gray-400 text-center max-w-sm mx-auto">
                Does this require a physical action step to be executed in the physical world?
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionStep('non_actionable')}
                  className="p-4 bg-[#191919] hover:bg-[#222222] border border-[#262626] rounded-2xl text-center space-y-1 transition-all cursor-pointer group"
                >
                  <span className="text-base font-bold text-gray-200 group-hover:text-white block font-serif">
                    No
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    Trash, Someday/Maybe, or Reference Info
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionStep('two_minute')}
                  className="p-4 bg-[#C5A47E]/10 hover:bg-[#C5A47E]/20 border border-[#C5A47E]/40 rounded-2xl text-center space-y-1 transition-all cursor-pointer group"
                >
                  <span className="text-base font-bold text-[#C5A47E] group-hover:text-white block font-serif">
                    Yes (Actionable)
                  </span>
                  <span className="text-[11px] text-gray-300 block">
                    Define Next Action, Delegate, or Project
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: NON-ACTIONABLE ROUTE */}
          {decisionStep === 'non_actionable' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white font-serif text-center">
                What would you like to do with it?
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleTrash}
                  className="p-4 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-800/50 rounded-2xl text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Trash2 className="w-4 h-4" />
                    <span>Trash / Delete</span>
                  </div>
                  <p className="text-[11px] text-rose-300/80">No longer needed or irrelevant.</p>
                </button>

                <button
                  type="button"
                  onClick={handleSomedayMaybe}
                  className="p-4 bg-[#1E1E1E] hover:bg-[#252525] border border-[#262626] rounded-2xl text-left space-y-1 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-[#C5A47E] font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Someday / Maybe</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Park in future ideas incubator.</p>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setDecisionStep('initial')}
                  className="text-xs text-gray-500 hover:text-gray-300 underline cursor-pointer"
                >
                  ← Back to question
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: 2-MINUTE RULE CHECK */}
          {decisionStep === 'two_minute' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-white font-serif">
                  Will it take less than 2 minutes?
                </h3>
                <p className="text-xs text-gray-400">
                  GTD Golden Rule: If it takes under 2 minutes, do it right now!
                </p>
              </div>

              {/* 2-Minute Timer Widget */}
              <div className="p-5 bg-[#191919] rounded-2xl border border-[#262626] text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-2xl font-black font-mono text-[#C5A47E]">
                  <Timer className="w-6 h-6 text-[#C5A47E]" />
                  <span>
                    {Math.floor(timerSeconds / 60)}:
                    {(timerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTimerRunning(!timerRunning)}
                    className="px-3.5 py-1.5 bg-[#1E1E1E] hover:bg-[#282828] border border-[#262626] text-gray-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {timerRunning ? 'Pause Timer' : 'Start 2-Min Timer'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDoneTwoMinutes}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ✓ Done in &lt;2 Mins!
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#262626] space-y-2">
                <span className="text-xs font-bold text-gray-400 text-center block">
                  Takes longer than 2 minutes?
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionStep('defer_action')}
                    className="p-3 bg-[#1E1E1E] hover:bg-[#282828] border border-[#262626] rounded-xl text-center text-xs font-bold text-gray-200 cursor-pointer"
                  >
                    Defer Next Action
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionStep('delegate')}
                    className="p-3 bg-[#1E1E1E] hover:bg-[#282828] border border-[#262626] rounded-xl text-center text-xs font-bold text-amber-400 cursor-pointer"
                  >
                    Delegate (Waiting)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionStep('create_project')}
                    className="p-3 bg-[#1E1E1E] hover:bg-[#282828] border border-[#262626] rounded-xl text-center text-xs font-bold text-[#C5A47E] cursor-pointer"
                  >
                    Multi-Step Project
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DEFER AS NEXT ACTION FORM */}
          {decisionStep === 'defer_action' && (
            <form onSubmit={handleConfirmNextAction} className="space-y-4">
              <h3 className="text-sm font-bold text-white font-serif">
                Define Specific Next Action
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Physical Next Action *
                </label>
                <input
                  type="text"
                  required
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 font-semibold focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Context
                  </label>
                  <select
                    value={context}
                    onChange={(e) => setContext(e.target.value as GTDContext)}
                    className="w-full px-2 py-1.5 bg-[#191919] border border-[#262626] rounded-lg font-mono text-gray-200 text-xs focus:border-[#C5A47E] focus:outline-hidden"
                  >
                    {GTD_CONTEXT_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Energy
                  </label>
                  <select
                    value={energy}
                    onChange={(e) => setEnergy(e.target.value as EnergyLevel)}
                    className="w-full px-2 py-1.5 bg-[#191919] border border-[#262626] rounded-lg text-gray-200 text-xs focus:border-[#C5A47E] focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Time
                  </label>
                  <select
                    value={timeEstimate}
                    onChange={(e) => setTimeEstimate(e.target.value as TimeEstimate)}
                    className="w-full px-2 py-1.5 bg-[#191919] border border-[#262626] rounded-lg text-gray-200 text-xs focus:border-[#C5A47E] focus:outline-hidden"
                  >
                    <option value="<15m">&lt;15m</option>
                    <option value="15-30m">15-30m</option>
                    <option value="30-60m">30-60m</option>
                    <option value="1-2h">1-2h</option>
                    <option value="2h+">2h+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Link to Project (Optional)
                </label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-lg text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
                >
                  <option value="">No Project (Standalone Next Action)</option>
                  {projects
                    .filter((p) => p.status === 'active')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setDecisionStep('two_minute')}
                  className="text-xs text-gray-500 hover:text-gray-300 underline cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Next Action
                </button>
              </div>
            </form>
          )}

          {/* DELEGATE FORM */}
          {decisionStep === 'delegate' && (
            <form onSubmit={handleConfirmDelegate} className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 font-serif">
                Delegate & Add to Waiting For List
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Delegated To (Person / Organization) *
                </label>
                <input
                  type="text"
                  required
                  value={delegatedTo}
                  onChange={(e) => setDelegatedTo(e.target.value)}
                  placeholder="e.g. Elena Rostova, Marcus, City Permitting"
                  className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 placeholder-gray-500 font-semibold focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Follow-Up Reminder Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setDecisionStep('two_minute')}
                  className="text-xs text-gray-500 hover:text-gray-300 underline cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Track in Waiting For
                </button>
              </div>
            </form>
          )}

          {/* CREATE PROJECT FORM */}
          {decisionStep === 'create_project' && (
            <form onSubmit={handleConfirmProject} className="space-y-4">
              <h3 className="text-sm font-bold text-white font-serif">
                Create Multi-Step Project & First Action
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 font-semibold focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Desired Outcome (Definition of Done) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={desiredOutcome}
                  onChange={(e) => setDesiredOutcome(e.target.value)}
                  placeholder="What does completed look like physically?"
                  className="w-full px-3 py-1.5 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 placeholder-gray-500 focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  First Physical Next Action
                </label>
                <input
                  type="text"
                  required
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder="Immediate first action..."
                  className="w-full px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl text-gray-200 placeholder-gray-500 focus:border-[#C5A47E] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setDecisionStep('two_minute')}
                  className="text-xs text-gray-500 hover:text-gray-300 underline cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Create Project & Action
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
