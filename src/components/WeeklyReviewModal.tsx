import React, { useState, useEffect } from 'react';
import { 
  X, 
  CalendarCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Inbox, 
  Brain, 
  Clock, 
  Briefcase, 
  Compass, 
  Target, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Plus, 
  PartyPopper,
  Calendar,
  Layers,
  ChevronRight,
  ListTodo,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGTD } from '../context/GTDContext';
import { GTDAction, GTDProject } from '../types/gtd';
import { MIND_SWEEP_TRIGGERS, HORIZON_DEFINITIONS } from '../data/gtdData';
import { ActionEditModal } from './ActionEditModal';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({ isOpen, onClose }) => {
  const {
    actions = [],
    projects = [],
    horizonItems = [],
    recordWeeklyReview,
    toggleActionComplete,
    addAction,
    deleteAction,
    updateProject,
    stalledProjects = [],
  } = useGTD();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [reflectionNotes, setReflectionNotes] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [reviewStartTime] = useState<number>(() => Date.now());
  const [editingAction, setEditingAction] = useState<GTDAction | null>(null);

  // Mind sweep capture input
  const [sweepInput, setSweepInput] = useState('');
  const [activeTriggerCategory, setActiveTriggerCategory] = useState(0);
  
  // Stalled project action input
  const [stalledInputs, setStalledInputs] = useState<{ [id: string]: string }>({});

  if (!isOpen) return null;

  const inboxItems = actions.filter((a) => a.type === 'inbox' && !a.completed);
  const waitingItems = actions.filter((a) => a.type === 'waiting-for' && !a.completed);
  const activeNextActions = actions.filter((a) => a.type === 'action' && !a.completed);
  const activeProjectsList = projects.filter((p) => p.status === 'active');
  const somedayItems = actions.filter((a) => a.type === 'someday-maybe' && !a.completed);

  const steps = [
    {
      phase: 'PHASE 1: GET CLEAR',
      title: '1.1 Collect Loose Papers & Physical Items',
      description: 'Gather all receipts, business cards, paper notes, physical mail, and voice memos into your Inbox container.',
      icon: <Layers className="w-5 h-5 text-indigo-600" />,
      type: 'checklist_physical',
    },
    {
      phase: 'PHASE 1: GET CLEAR',
      title: '1.2 Get "IN" to Zero',
      description: 'Process all loose inboxes completely. Decide: Actionable? 2-minute rule? Delegate? Defer? Project? Trash?',
      icon: <Inbox className="w-5 h-5 text-indigo-600" />,
      type: 'inbox_zero',
    },
    {
      phase: 'PHASE 1: GET CLEAR',
      title: '1.3 Empty Your Head (Mind Sweep)',
      description: 'Use the David Allen Incompletion Trigger List to sweep any uncaptured mental open loops from your mind.',
      icon: <Brain className="w-5 h-5 text-purple-600" />,
      type: 'mind_sweep',
    },
    {
      phase: 'PHASE 2: GET CURRENT',
      title: '2.1 Review Past Calendar (Last 14 Days)',
      description: 'Look back at the last 2 weeks on your calendar. Did any meeting spark an uncaptured next action or follow-up promise?',
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
      type: 'past_calendar',
    },
    {
      phase: 'PHASE 2: GET CURRENT',
      title: '2.2 Review Upcoming Calendar (Next 30 Days)',
      description: 'Look forward at upcoming appointments, travel, and deadlines. What actions need preparation now?',
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
      type: 'upcoming_calendar',
    },
    {
      phase: 'PHASE 2: GET CURRENT',
      title: '2.3 Review Waiting For Radar',
      description: 'Follow up on delegated commitments. Send gentle reminders or mark received deliverables as completed.',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      type: 'waiting_for',
    },
    {
      phase: 'PHASE 2: GET CURRENT',
      title: '2.4 Review Active Projects (Eliminate Stalls)',
      description: 'Review every single active project. Ensure EVERY project has at least ONE crisp physical next action defined.',
      icon: <Briefcase className="w-5 h-5 text-amber-600" />,
      type: 'projects_review',
    },
    {
      phase: 'PHASE 2: GET CURRENT',
      title: '2.5 Review Next Actions Lists',
      description: 'Mark off completed actions, remove obsolete tasks, and clarify next steps.',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      type: 'next_actions',
    },
    {
      phase: 'PHASE 3: GET CREATIVE',
      title: '3.1 Review Someday / Maybe Incubator',
      description: 'Review ideas parked for the future. Do any sparks deserve activation into current active projects this week?',
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      type: 'someday_maybe',
    },
    {
      phase: 'PHASE 3: GET CREATIVE',
      title: '3.2 Review Horizons 2 to 5 (Altitude Alignment)',
      description: 'Reflect on your Areas of Focus (H2), 1-2 Year Goals (H3), 3-5 Year Vision (H4), and Purpose (H5).',
      icon: <Compass className="w-5 h-5 text-indigo-600" />,
      type: 'horizons_review',
    },
    {
      phase: 'PHASE 3: GET CREATIVE',
      title: '3.3 Weekly Synthesis & Celebration',
      description: 'Set your focus intention for the upcoming week and record your weekly review completion.',
      icon: <PartyPopper className="w-5 h-5 text-emerald-600" />,
      type: 'complete',
    },
  ];

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleFinishReview();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSweepCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sweepInput.trim()) return;
    addAction({
      title: sweepInput.trim(),
      context: '@computer',
      energy: 'medium',
      timeEstimate: '15-30m',
      type: 'inbox',
      priority: 'medium',
    });
    setSweepInput('');
  };

  const handleFixStalledProject = (projId: string) => {
    const text = stalledInputs[projId]?.trim();
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
    setStalledInputs((prev) => ({ ...prev, [projId]: '' }));
  };

  const handleFinishReview = () => {
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - reviewStartTime) / 60000));

    recordWeeklyReview({
      completedAt: new Date().toISOString(),
      durationMinutes: elapsedMinutes,
      inboxItemsCleared: inboxItems.length,
      projectsReviewed: activeProjectsList.length,
      nextActionsReviewed: activeNextActions.length,
      newActionsCreated: 3,
      reflectionNotes: reflectionNotes.trim() || 'Weekly review completed with high clarity and altitude alignment.',
      focusAreasForUpcomingWeek: focusAreas.length > 0 ? focusAreas : ['Craft & Engineering', 'Health & Vitality'],
    });

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-2xl shadow-2xl border border-[#262626] w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#262626] bg-[#141414] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A47E]/10 border border-[#C5A47E]/20 flex items-center justify-center text-[#C5A47E]">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A47E] font-mono">
                {currentStep.phase}
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-serif">
                Guided GTD Weekly Review
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#1E1E1E] text-gray-300 border border-[#262626]">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer hover:bg-[#1E1E1E]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#191919] h-1">
          <div
            className="bg-[#C5A47E] h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Scrollable Step Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Step Banner */}
          <div className="bg-[#191919] p-5 rounded-2xl border border-[#262626] space-y-1.5">
            <div className="flex items-center gap-2 text-white">
              {currentStep.icon}
              <h3 className="text-base font-bold font-serif">{currentStep.title}</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* STEP CONTENT SWITCHER */}
          
          {/* 1.1 Physical Collection */}
          {currentStep.type === 'checklist_physical' && (
            <div className="space-y-4 text-xs text-gray-300">
              <div className="p-4 bg-[#191919] rounded-xl border border-[#262626] space-y-2">
                <p className="font-semibold text-white font-serif">
                  GTD Principle: "Your mind is for having ideas, not holding them."
                </p>
                <p className="text-gray-400">
                  Walk around your workspace and house. Empty receipts from your wallet, gather sticky notes from your monitor, collect mail from the entryway.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  'Clean physical desktop and workspace surface',
                  'Gather all paper notes, receipts, and business cards',
                  'Review phone camera roll or screenshots for saved info',
                  'Empty physical notebook or journal scratchpad',
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-[#191919] border border-[#262626] rounded-xl hover:bg-[#202020] cursor-pointer shadow-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[#C5A47E] rounded border-gray-600 focus:ring-[#C5A47E] cursor-pointer bg-[#141414]"
                    />
                    <span className="font-medium text-gray-200">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 1.2 Get IN to Zero */}
          {currentStep.type === 'inbox_zero' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Unprocessed Inbox Items ({inboxItems.length})
                </span>
                <span className="text-xs text-gray-400">
                  Process each item with 2-minute rule or assign container
                </span>
              </div>

              {inboxItems.length === 0 ? (
                <div className="p-8 bg-[#191919] border border-emerald-800/40 rounded-2xl text-center space-y-1">
                  <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-300 font-serif">🎉 Inbox is at Zero!</h4>
                  <p className="text-xs text-gray-400">All captured thoughts have been processed.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {inboxItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs group"
                    >
                      <span 
                        onClick={() => setEditingAction(item)}
                        className="font-semibold text-gray-200 truncate flex-1 cursor-pointer hover:text-[#C5A47E] transition-colors"
                        title="Click to edit item"
                      >
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAction(item)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#C5A47E] rounded cursor-pointer transition-opacity"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActionComplete(item.id)}
                          className="px-2.5 py-1 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 rounded-md font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          &lt;2 Min Done
                        </button>
                        <button
                          onClick={() => deleteAction(item.id)}
                          className="p-1 text-gray-500 hover:text-rose-400 rounded cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1.3 Mind Sweep */}
          {currentStep.type === 'mind_sweep' && (
            <div className="space-y-4">
              {/* Quick capture during sweep */}
              <form onSubmit={handleSweepCapture} className="flex gap-2">
                <input
                  type="text"
                  value={sweepInput}
                  onChange={(e) => setSweepInput(e.target.value)}
                  placeholder="Capture anything that comes to mind right now..."
                  className="flex-1 px-3.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-white font-medium placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Capture
                </button>
              </form>

              {/* Trigger List Tabs */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  David Allen Incompletion Trigger Prompts:
                </span>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-xs">
                  {MIND_SWEEP_TRIGGERS.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTriggerCategory(idx)}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
                        activeTriggerCategory === idx
                          ? 'bg-[#C5A47E] text-black font-bold'
                          : 'bg-[#191919] border border-[#262626] text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-[#191919] rounded-xl border border-[#262626] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                  {MIND_SWEEP_TRIGGERS[activeTriggerCategory].triggers.map((trigger, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSweepInput(trigger)}
                      className="text-left p-2 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#262626] text-gray-200 transition-colors flex items-center justify-between gap-2 shadow-xs group cursor-pointer"
                    >
                      <span className="text-[11px] font-medium leading-snug">{trigger}</span>
                      <Plus className="w-3 h-3 text-[#C5A47E] group-hover:scale-110 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2.1 & 2.2 Calendar Reviews */}
          {(currentStep.type === 'past_calendar' || currentStep.type === 'upcoming_calendar') && (
            <div className="space-y-4 text-xs text-gray-300">
              <div className="p-4 bg-[#191919] rounded-xl border border-[#262626] space-y-2">
                <p className="font-semibold text-white font-serif">
                  {currentStep.type === 'past_calendar'
                    ? 'Calendar Audit: Check previous 14 days for open commitments'
                    : 'Calendar Prep: Check upcoming 30 days for preparation actions'}
                </p>
                <p className="text-gray-400">
                  Open your Google Calendar, Outlook, or Apple Calendar in another tab. Ask yourself: "Is there anything here that triggered a follow-up action or needs early groundwork?"
                </p>
              </div>

              <form onSubmit={handleSweepCapture} className="flex gap-2">
                <input
                  type="text"
                  value={sweepInput}
                  onChange={(e) => setSweepInput(e.target.value)}
                  placeholder="Capture triggered next action from calendar..."
                  className="flex-1 px-3 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-white placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Capture
                </button>
              </form>
            </div>
          )}

          {/* 2.3 Waiting For */}
          {currentStep.type === 'waiting_for' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Outstanding Delegations ({waitingItems.length})
              </span>

              {waitingItems.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No waiting-for items on your radar.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {waitingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs group"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#C5A47E]">
                          {item.delegatedTo || 'Awaiting response'}
                        </span>
                        <p 
                          onClick={() => setEditingAction(item)}
                          className="font-semibold text-gray-200 cursor-pointer hover:text-amber-300 transition-colors truncate"
                          title="Click to edit item"
                        >
                          {item.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingAction(item)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-300 rounded cursor-pointer transition-opacity"
                          title="Edit Delegation"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActionComplete(item.id)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          Received
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2.4 Projects Review & Stalled Fixer */}
          {currentStep.type === 'projects_review' && (
            <div className="space-y-4">
              {stalledProjects.length > 0 && (
                <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Fix Stalled Projects ({stalledProjects.length} require a Next Action)</span>
                  </div>

                  {stalledProjects.map((proj) => (
                    <div key={proj.id} className="bg-[#191919] p-3 rounded-lg border border-[#262626] space-y-2 text-xs">
                      <div className="font-bold text-white font-serif">{proj.title}</div>
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={stalledInputs[proj.id] || ''}
                          onChange={(e) =>
                            setStalledInputs((prev) => ({ ...prev, [proj.id]: e.target.value }))
                          }
                          placeholder="Type immediate next action..."
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-[#141414] border border-[#262626] rounded-md text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E]"
                        />
                        <button
                          type="button"
                          onClick={() => handleFixStalledProject(proj.id)}
                          className="px-3 py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black rounded-md text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                        >
                          Add Action
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Active Projects List ({activeProjectsList.length})
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {activeProjectsList.map((proj) => {
                    const acts = actions.filter((a) => a.projectId === proj.id && a.type === 'action' && !a.isRecurring && !a.completed);
                    const recurringActs = actions.filter((a) => a.projectId === proj.id && a.type === 'action' && a.isRecurring);
                    const totalDrivers = acts.length + recurringActs.length;
                    return (
                      <div
                        key={proj.id}
                        className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{proj.title}</p>
                          <p className="text-[11px] text-gray-400">Outcome: {proj.desiredOutcome}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-[#262626] ${
                          totalDrivers === 0 ? 'bg-[#1E1E1E] text-[#C5A47E]' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                        }`}>
                          {acts.length > 0 && `${acts.length} Action${acts.length === 1 ? '' : 's'}`}
                          {acts.length > 0 && recurringActs.length > 0 && ' • '}
                          {recurringActs.length > 0 && `${recurringActs.length} Routine${recurringActs.length === 1 ? '' : 's'}`}
                          {totalDrivers === 0 && '0 Actions (Stalled)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2.5 Next Actions Review */}
          {currentStep.type === 'next_actions' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Current Next Actions ({activeNextActions.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeNextActions.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                      <button
                        onClick={() => toggleActionComplete(act.id)}
                        className="w-4 h-4 rounded border border-gray-600 hover:border-[#C5A47E] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      >
                        <Check className="w-3 h-3 text-transparent hover:text-[#C5A47E]" />
                      </button>
                      <span 
                        onClick={() => setEditingAction(act)}
                        className="font-semibold text-gray-200 truncate cursor-pointer hover:text-[#C5A47E] transition-colors"
                        title="Click to edit action"
                      >
                        {act.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingAction(act)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#C5A47E] rounded cursor-pointer transition-opacity"
                        title="Edit Action"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-[#C5A47E] bg-[#141414] border border-[#262626] px-1.5 py-0.5 rounded">
                        {act.context}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3.1 Someday / Maybe Review */}
          {currentStep.type === 'someday_maybe' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Someday / Maybe Incubator ({somedayItems.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {somedayItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-center justify-between text-xs group"
                  >
                    <span 
                      onClick={() => setEditingAction(item)}
                      className="font-semibold text-gray-200 flex-1 min-w-0 truncate cursor-pointer hover:text-[#C5A47E] transition-colors mr-2"
                      title="Click to edit item"
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingAction(item)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#C5A47E] rounded cursor-pointer transition-opacity"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          addAction({
                            title: item.title,
                            context: '@computer',
                            energy: 'medium',
                            timeEstimate: '1-2h',
                            type: 'action',
                            priority: 'medium',
                          });
                          deleteAction(item.id);
                        }}
                        className="px-2.5 py-1 bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/30 hover:bg-[#C5A47E]/20 rounded-md font-semibold text-[11px] cursor-pointer transition-colors"
                      >
                        Activate Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3.2 Horizons Review */}
          {currentStep.type === 'horizons_review' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#191919] rounded-xl border border-[#262626] space-y-1">
                <p className="font-bold text-white font-serif">High-Altitude Alignment Check</p>
                <p className="text-gray-400">
                  Review your 50k ft Life Purpose, 40k ft Vision, 30k ft Goals, and 20k ft Areas of Focus. Are your active projects serving your highest aspirations?
                </p>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {horizonItems.map((h) => {
                  const linkedArea = h.level === 3 && h.parentId ? horizonItems.find((a) => a.id === h.parentId) : null;
                  return (
                    <div
                      key={h.id}
                      className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-[#C5A47E] uppercase">
                            H{h.level} • {HORIZON_DEFINITIONS[h.level]?.shortName || 'Horizon'}
                          </span>
                          {linkedArea && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              (Area: {linkedArea.title})
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-white mt-0.5">{h.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3.3 Synthesis & Celebration */}
          {currentStep.type === 'complete' && (
            <div className="space-y-4">
              <div className="p-5 bg-[#191919] border border-[#262626] rounded-2xl space-y-2 text-center">
                <PartyPopper className="w-10 h-10 text-[#C5A47E] mx-auto" />
                <h4 className="text-base font-bold text-white font-serif">
                  You are 100% Clear, Current, and Aligned!
                </h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Your GTD system is now trusted, up to date, and frictionless. Record your weekly insights below.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Weekly Reflection & Operating Intentions
                </label>
                <textarea
                  rows={3}
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  placeholder="What went well this week? What are your top 2 priorities for next week?"
                  className="w-full px-3.5 py-2 text-xs bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-white placeholder-gray-500"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 sm:p-5 border-t border-[#262626] bg-[#141414] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentStepIndex === 0
                ? 'opacity-40 cursor-not-allowed text-gray-600'
                : 'text-gray-300 hover:text-white bg-[#191919] border border-[#262626] hover:bg-[#202020]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>{isLastStep ? 'Complete & Record Review 🎉' : 'Next Step'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
