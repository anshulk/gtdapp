import React, { useState } from 'react';
import { X, Brain, Plus, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { MIND_SWEEP_TRIGGERS } from '../data/gtdData';

interface MindSweepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MindSweepModal: React.FC<MindSweepModalProps> = ({ isOpen, onClose }) => {
  const { addAction, deleteAction, actions } = useGTD();
  const [activeCategory, setActiveCategory] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [addedTriggerMap, setAddedTriggerMap] = useState<{ [trigger: string]: string }>({});

  if (!isOpen) return null;

  // Toggle trigger selection: if already added, remove it; if not added, add it
  const handleToggleTrigger = (triggerText: string) => {
    const existingActionId = addedTriggerMap[triggerText];

    if (existingActionId) {
      // Remove from GTD inbox actions
      deleteAction(existingActionId);
      setAddedTriggerMap((prev) => {
        const next = { ...prev };
        delete next[triggerText];
        return next;
      });
    } else {
      // Check if there is already an active inbox action with this title in current state
      const matchingExisting = actions.find(
        (a) => a.type === 'inbox' && !a.completed && a.title.trim().toLowerCase() === triggerText.trim().toLowerCase()
      );

      if (matchingExisting) {
        // Toggle off if matching inbox item already exists
        deleteAction(matchingExisting.id);
        setAddedTriggerMap((prev) => {
          const next = { ...prev };
          delete next[triggerText];
          return next;
        });
      } else {
        // Add new inbox item
        const newId = addAction({
          title: triggerText,
          context: '@computer',
          energy: 'medium',
          timeEstimate: '15-30m',
          type: 'inbox',
          priority: 'medium',
        });

        setAddedTriggerMap((prev) => ({ ...prev, [triggerText]: newId }));
      }
    }
  };

  const handleCustomCapture = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;

    const newId = addAction({
      title: trimmed,
      context: '@computer',
      energy: 'medium',
      timeEstimate: '15-30m',
      type: 'inbox',
      priority: 'medium',
    });

    setAddedTriggerMap((prev) => ({ ...prev, [trimmed]: newId }));
    setCustomInput('');
  };

  // Derive captured count directly from number of active swept items
  const capturedCount = Object.keys(addedTriggerMap).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-2xl shadow-2xl border border-[#262626] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-[#262626] bg-[#141414] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A47E] font-mono">
                  GTD Mental Exhale
                </span>
                {capturedCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    +{capturedCount} swept to inbox
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold font-serif">
                David Allen Incompletion Trigger Sweep
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Quick sweep input */}
          <form onSubmit={handleCustomCapture} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="What else just surfaced in your mind? Capture it..."
              className="flex-1 px-4 py-2.5 text-xs bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-white font-semibold placeholder-gray-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#C5A47E] hover:bg-[#b8946e] text-black text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors"
            >
              Sweep to Inbox
            </button>
          </form>

          {/* Category Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {MIND_SWEEP_TRIGGERS.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(idx)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === idx
                      ? 'bg-[#C5A47E] text-black shadow-xs'
                      : 'bg-[#191919] border border-[#262626] text-gray-400 hover:text-white hover:bg-[#202020]'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* Prompt Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {MIND_SWEEP_TRIGGERS[activeCategory].triggers.map((trigger, idx) => {
                const isAdded =
                  Boolean(addedTriggerMap[trigger]) ||
                  actions.some(
                    (a) =>
                      a.type === 'inbox' &&
                      !a.completed &&
                      a.title.trim().toLowerCase() === trigger.trim().toLowerCase()
                  );

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleTrigger(trigger)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 shadow-xs group cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-[#191919] hover:bg-[#202020] hover:border-[#C5A47E]/40 border-[#262626] text-gray-200'
                    }`}
                  >
                    <span className="font-semibold leading-snug">{trigger}</span>
                    {isAdded ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#C5A47E] group-hover:scale-110 transition-transform shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#141414] flex items-center justify-between text-xs">
          <span className="text-gray-400 font-medium">
            Items added will be placed in your GTD Inbox ready for clarifying.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#C5A47E] text-black rounded-xl font-bold shadow-xs hover:bg-[#b8946e] cursor-pointer transition-colors"
          >
            Done Sweeping
          </button>
        </div>

      </div>
    </div>
  );
};
