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
  Trash2
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { WeeklyReviewRecord } from '../types/gtd';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const ReviewsView: React.FC = () => {
  const {
    reviews: weeklyReviews = [],
    isReviewDue,
    daysSinceLastReview: daysSinceReview,
    setWeeklyReviewOpen,
    deleteReview,
    projects = [],
    actions = [],
  } = useGTD();

  const [reviewToDelete, setReviewToDelete] = useState<WeeklyReviewRecord | null>(null);

  const totalReviews = weeklyReviews.length;
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const activeActionsCount = actions.filter((a) => a.type === 'action' && !a.completed).length;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="bg-[#141414] rounded-2xl border border-[#262626] p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A47E]/10 text-[#C5A47E] text-xs font-bold border border-[#C5A47E]/20">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>GTD Weekly Review Ritual</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
              Weekly Reviews & System Health
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              "The Weekly Review is the master key to maintaining a trusted GTD system. Without it, the brain stops trusting the lists and slips back into anxiety." — David Allen
            </p>
          </div>

          <button
            onClick={() => setWeeklyReviewOpen(true)}
            className="px-5 py-3 bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] text-black text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Guided Review</span>
          </button>
        </div>

        {/* Status Callout Strip */}
        <div className="mt-8 pt-6 border-t border-[#262626] grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#191919] border border-[#262626] flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C5A47E]/10 text-[#C5A47E] border border-[#C5A47E]/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Total Reviews
              </span>
              <span className="text-lg font-bold text-white font-serif">
                {totalReviews} Completed
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#191919] border border-[#262626] flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Last Review
              </span>
              <span className="text-lg font-bold text-white font-serif">
                {daysSinceReview !== null ? `${daysSinceReview}d ago` : 'None yet'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#191919] border border-[#262626] flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isReviewDue ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Review Cadence
              </span>
              <span className={`text-lg font-bold font-serif ${isReviewDue ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isReviewDue ? 'Review Due Now' : 'Up to Date'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#191919] border border-[#262626] flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-neutral-800 text-gray-300 border border-[#262626]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Active Projects
              </span>
              <span className="text-lg font-bold text-white font-serif">
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
                        onClick={() => setReviewToDelete(review)}
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
