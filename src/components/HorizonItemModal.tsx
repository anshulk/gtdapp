import React, { useState, useEffect, useMemo } from 'react';
import { X, Compass, Plus, Trash2, ShieldCheck, Target, Eye, Layers, Tag, Star } from 'lucide-react';
import { HorizonItem, HorizonLevel } from '../types/gtd';
import { useGTD } from '../context/GTDContext';
import { HORIZON_DEFINITIONS, LIFE_DOMAINS } from '../data/gtdData';

interface HorizonItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: HorizonItem | null;
  defaultLevel?: HorizonLevel;
  defaultParentId?: string;
}

export const HorizonItemModal: React.FC<HorizonItemModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  defaultLevel = 3,
  defaultParentId,
}) => {
  const { horizonItems, addHorizonItem, updateHorizonItem, deleteHorizonItem } = useGTD();

  const [level, setLevel] = useState<HorizonLevel>(defaultLevel);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lifeDomain, setLifeDomain] = useState<string>('Career & Craft');
  const [parentId, setParentId] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');
  const [keyResults, setKeyResults] = useState<string[]>(['']);
  const [progressRating, setProgressRating] = useState<number | undefined>(undefined);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const h2Areas = horizonItems.filter((h) => h.level === 2 && (!itemToEdit || h.id !== itemToEdit.id));
  const h4Visions = horizonItems.filter((h) => h.level === 4 && (!itemToEdit || h.id !== itemToEdit.id));
  const h5Purposes = horizonItems.filter((h) => h.level === 5 && (!itemToEdit || h.id !== itemToEdit.id));

  // Find linked ancestor H4 for displaying inherited domain
  const selectedH4ForH2 = useMemo(() => {
    if (level !== 2 || !parentId) return undefined;
    return horizonItems.find((h) => h.level === 4 && h.id === parentId);
  }, [level, parentId, horizonItems]);

  const selectedH2ForH3 = useMemo(() => {
    if (level !== 3 || !parentId) return undefined;
    return horizonItems.find((h) => h.level === 2 && h.id === parentId);
  }, [level, parentId, horizonItems]);

  const ancestorH4ForH3 = useMemo(() => {
    if (!selectedH2ForH3) return undefined;
    if (selectedH2ForH3.parentId) {
      return horizonItems.find((h) => h.level === 4 && h.id === selectedH2ForH3.parentId);
    }
    return undefined;
  }, [selectedH2ForH3, horizonItems]);

  useEffect(() => {
    setConfirmDelete(false);
    if (itemToEdit) {
      setLevel(itemToEdit.level);
      setTitle(itemToEdit.title);
      setDescription(itemToEdit.description || '');
      setLifeDomain(itemToEdit.lifeDomain || 'Career & Craft');
      setParentId(itemToEdit.parentId || '');
      setTargetDate(itemToEdit.targetDate || '');
      setKeyResults(itemToEdit.keyResults && itemToEdit.keyResults.length > 0 ? itemToEdit.keyResults : ['']);
      setProgressRating(itemToEdit.progressRating);
      setReviewNotes(itemToEdit.reviewNotes || '');
    } else {
      setLevel(defaultLevel);
      setTitle('');
      setDescription('');
      setLifeDomain('Career & Craft');
      // For level 3, default to defaultParentId or first H2 area if available
      const initialParent = defaultParentId || (defaultLevel === 3 && h2Areas.length > 0 ? h2Areas[0].id : '');
      setParentId(initialParent);
      setTargetDate('');
      setKeyResults(['']);
      setProgressRating(undefined);
      setReviewNotes('');
    }
  }, [itemToEdit, defaultLevel, defaultParentId, isOpen]);

  // When user changes level in form: if switching to level 3 and no parentId is set, default to first H2 area
  const handleLevelChange = (newLevel: HorizonLevel) => {
    setLevel(newLevel);
    if (newLevel === 3) {
      if (!parentId || !h2Areas.some((a) => a.id === parentId)) {
        setParentId(h2Areas.length > 0 ? h2Areas[0].id : '');
      }
    } else if (newLevel === 4 || newLevel === 2) {
      if (parentId && !h5Purposes.some((p) => p.id === parentId)) {
        setParentId('');
      }
    } else {
      setParentId('');
    }
  };

  if (!isOpen) return null;

  const handleAddKeyResult = () => {
    setKeyResults([...keyResults, '']);
  };

  const handleRemoveKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };

  const handleKeyResultChange = (index: number, val: string) => {
    const updated = [...keyResults];
    updated[index] = val;
    setKeyResults(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (level === 3 && !parentId && h2Areas.length > 0) {
      // Must select an H2 Area of Focus for H3 Goals
      return;
    }

    const filteredKeyResults = keyResults.map((k) => k.trim()).filter(Boolean);
    // Horizon 4 (3-5 Year Vision) is the sole authority for Life Domain
    const effectiveLifeDomain = level === 4 ? (lifeDomain || undefined) : undefined;

    if (itemToEdit) {
      updateHorizonItem(itemToEdit.id, {
        level,
        title: title.trim(),
        description: description.trim() || undefined,
        lifeDomain: effectiveLifeDomain,
        parentId: parentId || undefined,
        targetDate: targetDate || undefined,
        keyResults: filteredKeyResults.length > 0 ? filteredKeyResults : undefined,
        progressRating,
        reviewNotes: reviewNotes.trim() || undefined,
      });
    } else {
      addHorizonItem({
        level,
        title: title.trim(),
        description: description.trim() || undefined,
        lifeDomain: effectiveLifeDomain,
        parentId: parentId || undefined,
        targetDate: targetDate || undefined,
        keyResults: filteredKeyResults.length > 0 ? filteredKeyResults : undefined,
        status: 'active',
        progressRating,
        reviewNotes: reviewNotes.trim() || undefined,
      });
    }

    onClose();
  };

  const currentDef = HORIZON_DEFINITIONS[level];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-2xl shadow-2xl border border-[#262626] w-full max-w-xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262626] sticky top-0 bg-[#141414]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${currentDef.color.badge}`}>
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif">
                {itemToEdit ? 'Edit Horizon Focus' : 'Add New Horizon Focus'}
              </h2>
              <p className="text-xs text-gray-400">
                Altitude: {currentDef.altitude} • {currentDef.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Level Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Horizon Altitude Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[5, 4, 3, 2].map((lvl) => {
                const def = HORIZON_DEFINITIONS[lvl];
                const isSelected = level === lvl;
                return (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => handleLevelChange(lvl as HorizonLevel)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#C5A47E] bg-[#C5A47E]/10 ring-1 ring-[#C5A47E]/30 text-white'
                        : 'border-[#262626] hover:border-gray-600 bg-[#191919] text-gray-400'
                    }`}
                  >
                    <span className={`text-[10px] font-mono font-bold block ${isSelected ? 'text-[#C5A47E]' : 'text-gray-500'}`}>
                      H{lvl} ({def.altitude})
                    </span>
                    <span className="text-xs font-bold line-clamp-1">
                      {def.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Title / Declaration *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                level === 5
                  ? 'e.g., Live with uncompromising curiosity, deep presence, and craft mastery'
                  : level === 4
                  ? 'e.g., Lead an autonomous systems research laboratory & homestead'
                  : level === 3
                  ? 'e.g., Publish Distributed Systems Performance Handbook'
                  : 'e.g., Health & Physical Vitality'
              }
              className="w-full px-3.5 py-2.5 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-white font-medium placeholder-gray-500"
            />
          </div>

          {/* Life Domain Handling: H4 is the single decider, others inherit dynamically */}
          {level === 4 ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#C5A47E] uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C5A47E]" />
                  <span>Life Domain (H4 Authority)</span>
                </label>
                <span className="text-[10px] text-gray-400 font-medium">
                  Sets domain for all child levels
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {LIFE_DOMAINS.map((domain) => {
                  const isSelected = lifeDomain === domain;
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => setLifeDomain(domain)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#C5A47E]/20 text-[#C5A47E] border-[#C5A47E]/60 shadow-xs'
                          : 'bg-[#191919] text-gray-400 border-[#262626] hover:bg-[#202020] hover:text-gray-200'
                      }`}
                    >
                      {domain}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Horizon 4 (3-5 Year Vision) defines the Life Domain. All child Areas of Focus (H2), 1-2 Year Goals (H3), and Projects (H1) inherit this domain automatically.
              </p>
            </div>
          ) : level === 2 ? (
            <div className="bg-[#191919] border border-[#262626] rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#C5A47E]" />
                    <span>Inherited Life Domain</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {selectedH4ForH2 ? (
                      <>
                        Inherited from H4 Vision:{' '}
                        <strong className="text-white font-medium">{selectedH4ForH2.title}</strong>
                      </>
                    ) : (
                      'Select a Linked Horizon 4 Vision below to inherit its Life Domain.'
                    )}
                  </p>
                </div>
                {selectedH4ForH2?.lifeDomain ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#C5A47E]/20 text-[#C5A47E] border border-[#C5A47E]/40 whitespace-nowrap">
                    {selectedH4ForH2.lifeDomain}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400/90 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                    Domain Pending
                  </span>
                )}
              </div>
            </div>
          ) : level === 3 ? (
            <div className="bg-[#191919] border border-[#262626] rounded-xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#C5A47E]" />
                    <span>Inherited Life Domain</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {ancestorH4ForH3 ? (
                      <>
                        Inherited from H4 Vision:{' '}
                        <strong className="text-white font-medium">{ancestorH4ForH3.title}</strong>{' '}
                        via Area ({selectedH2ForH3?.title})
                      </>
                    ) : selectedH2ForH3 ? (
                      'Linked Area has no parent H4 Vision. Link an H4 Vision to that Area to inherit its Life Domain.'
                    ) : (
                      'Select a Linked H2 Area of Focus below to inherit its Life Domain from H4.'
                    )}
                  </p>
                </div>
                {ancestorH4ForH3?.lifeDomain ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#C5A47E]/20 text-[#C5A47E] border border-[#C5A47E]/40 whitespace-nowrap">
                    {ancestorH4ForH3.lifeDomain}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400/90 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                    Domain Pending
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#191919] border border-[#262626] rounded-xl p-3 flex items-center gap-2.5 text-xs text-gray-400">
              <Compass className="w-4 h-4 text-[#C5A47E] shrink-0" />
              <span>
                Horizon 5 represents overarching Purpose & Principles. Specific Life Domains are anchored at Horizon 4 (3-5 Year Vision).
              </span>
            </div>
          )}

          {/* Alignment Link: For H3 Goals -> H2 Area of Focus dropdown */}
          {level === 3 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Linked H2 Area of Focus *</span>
              </label>
              <select
                required
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:outline-hidden focus:border-[#C5A47E] text-gray-200"
              >
                <option value="" disabled>Select an H2 Area of Focus...</option>
                {h2Areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    H2: {area.title}
                  </option>
                ))}
              </select>
              {h2Areas.length === 0 ? (
                <p className="text-[11px] text-amber-400">
                  ⚠️ No H2 Areas of Focus created yet. Please create an Area of Focus (Horizon 2) first to anchor this goal.
                </p>
              ) : (
                <p className="text-[11px] text-gray-400">
                  Every 1-2 Year Goal directly anchors into an ongoing Area of Focus & Responsibility.
                </p>
              )}
            </div>
          )}

          {/* Alignment Link: For H2 Area of Focus -> H4 Vision */}
          {level === 2 && h4Visions.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>Linked Horizon 4 Vision (3-5 Years)</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:outline-hidden focus:border-[#C5A47E] text-gray-200"
              >
                <option value="">No specific H4 Vision link (general domain standard)</option>
                {h4Visions.map((v) => (
                  <option key={v.id} value={v.id}>
                    H4: {v.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Alignment Link: For H4 Vision -> H5 Purpose */}
          {level === 4 && h5Purposes.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Linked Horizon 5 Purpose (50,000+ ft)</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:outline-hidden focus:border-[#C5A47E] text-gray-200"
              >
                <option value="">No specific H5 Purpose linkage</option>
                {h5Purposes.map((p) => (
                  <option key={p.id} value={p.id}>
                    H5: {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Date for Horizon 3 / 4 */}
          {(level === 3 || level === 4) && (
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Target Horizon Timeline / Completion Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:outline-hidden focus:border-[#C5A47E] text-gray-200"
              />
            </div>
          )}

          {/* Description & Narrative */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Description & Detailed Narrative
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Elaborate on the standard of excellence, guiding philosophy, or what this looks like when manifested..."
              className="w-full px-3.5 py-2.5 text-sm bg-[#191919] border border-[#262626] rounded-xl focus:bg-[#1f1f1f] focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500"
            />
          </div>

          {/* Key Results / Operating Principles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                {level === 5 ? 'Guiding Principles & Standards' : 'Key Results & Success Metrics'}
              </label>
              <button
                type="button"
                onClick={handleAddKeyResult}
                className="text-xs text-[#C5A47E] font-semibold hover:text-[#e0c4a4] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>
            </div>

            <div className="space-y-2">
              {keyResults.map((kr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={kr}
                    onChange={(e) => handleKeyResultChange(idx, e.target.value)}
                    placeholder={`e.g. ${
                      level === 5 ? 'Daily 20m presence practice' : 'Reach sub-4hr marathon time'
                    }`}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#191919] border border-[#262626] rounded-lg focus:outline-hidden focus:border-[#C5A47E] text-gray-200 placeholder-gray-500"
                  />
                  {keyResults.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyResult(idx)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 rounded-md cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress / Health Rating & Review Notes */}
          <div className="p-3.5 bg-[#191919] border border-[#262626] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-[#C5A47E]" />
                <span>Status & Progress Rating (1 to 5)</span>
              </label>
              {progressRating && (
                <button
                  type="button"
                  onClick={() => setProgressRating(undefined)}
                  className="text-[11px] text-gray-500 hover:text-gray-300 underline cursor-pointer"
                >
                  Clear rating
                </button>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { score: 1, label: 'Stalled' },
                { score: 2, label: 'Slow' },
                { score: 3, label: 'On Track' },
                { score: 4, label: 'Strong' },
                { score: 5, label: 'Thriving' },
              ].map((btn) => {
                const isSelected = progressRating === btn.score;
                return (
                  <button
                    key={btn.score}
                    type="button"
                    onClick={() => setProgressRating(btn.score)}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#C5A47E] text-black border-[#C5A47E] shadow-sm font-bold'
                        : 'bg-[#141414] text-gray-300 border-[#262626] hover:bg-[#202020] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-0.5">
                      <Star className={`w-3 h-3 ${isSelected ? 'fill-black text-black' : 'text-gray-400'}`} />
                      <span className="text-xs font-bold">{btn.score}</span>
                    </div>
                    <span className={`text-[10px] ${isSelected ? 'text-black font-semibold' : 'text-gray-400'}`}>
                      {btn.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Evaluation & Reflection Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Wins, friction, or adjustments for upcoming weeks..."
                className="w-full px-3 py-2 text-xs bg-[#141414] border border-[#262626] rounded-lg text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E]"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#262626]">
            {itemToEdit ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400 font-medium">Confirm deletion?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteHorizonItem(itemToEdit.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Focus</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-black bg-[#C5A47E] hover:bg-[#b8946e] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {itemToEdit ? 'Save Changes' : 'Create Horizon Focus'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
