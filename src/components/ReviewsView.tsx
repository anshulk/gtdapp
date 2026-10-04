import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Sparkles, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Briefcase, 
  Layers, 
  ArrowRight, 
  PartyPopper,
  Calendar,
  AlertTriangle,
  History,
  FileText,
  Trash2,
  Compass,
  Star
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { WeeklyReviewRecord } from '../types/gtd';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { trackButtonClick } from '../services/analytics';

export const ReviewsView: React.FC = () => {
  const {
    reviews: weeklyReviews = [],
    isReviewDue,
    daysSinceLastReview: daysSinceReview,
    setWeeklyReviewOpen,
    deleteReview,
    projects = [],
    actions = [],
    horizonItems = [],
  } = useGTD();

  const [reviewToDelete, setReviewToDelete] = useState<WeeklyReviewRecord | null>(null);

  const totalReviews = weeklyReviews.length;
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const activeActionsCount = actions.filter((a) => a.type === 'action' && !a.completed).length;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="bg-[#141414] rounded-xl border border-[#262626] p-3.5 sm:p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-serif flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#C5A47E]" />
              <span>Weekly Reviews & System Health</span>
            </h1>
            <span className="text-[11px] font-mono text-[#C5A47E] px-2 py-0.5 rounded-md bg-[#C5A47E]/10 border border-[#C5A47E]/20">
              GTD Review Ritual
            </span>
          </div>

          <button
            onClick={() => {
              trackButtonClick('reviews_launch_guided_review', 'reviews_header');
              setWeeklyReviewOpen(true);
            }}
            className="px-3 py-1.5 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Guided Review</span>
          </button>
        </div>

        {/* Status Callout Strip */}
        <div className="mt-3 pt-3 border-t border-[#202020] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#191919] border border-[#242424] flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Total Reviews
              </span>
              <span className="text-sm font-bold text-white font-serif">
                {totalReviews} Completed
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#191919] border border-[#242424] flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Last Review
              </span>
              <span className="text-sm font-bold text-white font-serif">
                {daysSinceReview !== null ? `${daysSinceReview}d ago` : 'None yet'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#191919] border border-[#242424] flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${isReviewDue ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'}`}>
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Review Cadence
              </span>
              <span className={`text-sm font-bold font-serif ${isReviewDue ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isReviewDue ? 'Review Due' : 'Up to Date'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#191919] border border-[#242424] flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-800 text-gray-300 border border-[#242424]">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Active Projects
              </span>
              <span className="text-sm font-bold text-white font-serif">
                {activeProjectsCount} Tracked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Due Banner if applicable */}
      {isReviewDue && (
        <div className="p-6 bg-amber-950/20 border border-amber-800/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-600 text-black rounded-xl shadow-xs shrink-0 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 font-serif">
                Weekly Review Recommended
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                It has been {daysSinceReview} days since your last comprehensive review. Take 20 minutes to empty your head, clear inboxes, and align your horizons.
              </p>
            </div>
          </div>

          <button
            onClick={() => setWeeklyReviewOpen(true)}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-black rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Start Review Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Review History List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
            <History className="w-5 h-5 text-[#C5A47E]" />
            <span>Weekly Review Archive & Retrospectives</span>
          </h2>
        </div>

        {weeklyReviews.length === 0 ? (
          <div className="bg-[#141414] rounded-2xl border border-dashed border-[#262626] p-12 text-center">
            <CalendarCheck className="w-12 h-12 text-[#C5A47E] mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold text-white font-serif">
              No Recorded Reviews Yet
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Run your first GTD Weekly Review to achieve Mind Like Water and start building your consistency streak.
            </p>
            <button
              onClick={() => setWeeklyReviewOpen(true)}
              className="mt-4 px-4 py-2 bg-[#C5A47E] text-black rounded-xl text-xs font-bold shadow-xs hover:bg-[#b8946e] cursor-pointer"
            >
              Start First Review
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {weeklyReviews.map((review) => {
              const formattedDate = new Date(review.completedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={review.id}
                  className="bg-[#141414] rounded-2xl border border-[#262626] p-6 shadow-md space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white font-serif">
                          Weekly Review on {formattedDate}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium">
                          Duration: {review.durationMinutes} minutes
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-[#1E1E1E] text-[#C5A47E] border border-[#262626] font-bold">
                        {review.projectsReviewed} Projects Audited
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold">
                        {review.nextActionsReviewed} Actions Refined
                      </span>
                      <button
                        onClick={() => {
                          trackButtonClick('reviews_prompt_delete', 'reviews_history_list', { review_id: review.id });
                          setReviewToDelete(review);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ml-1"
                        title="Delete Review Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reflection Notes */}
                  {review.reflectionNotes && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>Retrospective & Weekly Synthesis:</span>
                      </span>
                      <p className="text-xs text-gray-300 bg-[#191919] p-3 rounded-xl border border-[#262626] leading-relaxed whitespace-pre-wrap">
                        {review.reflectionNotes}
                      </p>
                    </div>
                  )}

                  {/* Focus Areas chosen for that week */}
                  {review.focusAreasForUpcomingWeek && review.focusAreasForUpcomingWeek.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Chosen Focus Areas:
                      </span>
                      {review.focusAreasForUpcomingWeek.map((fa, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#1E1E1E] text-[#C5A47E] border border-[#262626] font-medium text-[11px]"
                        >
                          {fa}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Horizon Altitude Evaluations */}
                  {review.horizonRatings && Object.keys(review.horizonRatings).length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#222]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#C5A47E]" />
                        <span>Horizon Progress Evaluations ({Object.keys(review.horizonRatings).length}):</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(Object.entries(review.horizonRatings) as [string, { rating: number; notes?: string; status?: string; title?: string; level?: number }][]).map(([hId, val]) => {
                          const horizon = horizonItems.find((h) => h.id === hId);
                          const title = val.title || horizon?.title || 'Horizon Item';
                          const level = val.level || horizon?.level || 2;
                          return (
                            <div
                              key={hId}
                              className="p-2.5 bg-[#191919] rounded-xl border border-[#262626] flex items-start justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-bold text-[#C5A47E]">
                                    H{level}
                                  </span>
                                  <span className="font-semibold text-gray-200 truncate">
                                    {title}
                                  </span>
                                </div>
                                {val.notes && (
                                  <p className="text-[11px] text-gray-400 mt-1 italic line-clamp-2">
                                    "{val.notes}"
                                  </p>
                                )}
                              </div>

                              {val.rating > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-950/40 text-amber-300 border border-amber-800/30 text-xs font-mono font-bold flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{val.rating}/5</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Delete Review Modal */}
      <ConfirmDeleteModal
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        onConfirm={() => {
          if (reviewToDelete) {
            deleteReview(reviewToDelete.id);
          }
        }}
        title="Delete Weekly Review Record"
        message={`Are you sure you want to delete this recorded Weekly Review from ${reviewToDelete ? new Date(reviewToDelete.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}? This action cannot be undone.`}
        confirmLabel="Delete Review"
      />

    </div>
  );
};
