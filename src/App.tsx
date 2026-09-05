import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GTDProvider, useGTD } from './context/GTDContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { HorizonsView } from './components/HorizonsView';
import { ProjectsView } from './components/ProjectsView';
import { NextActionsView } from './components/NextActionsView';
import { ReviewsView } from './components/ReviewsView';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { ClarifyModal } from './components/ClarifyModal';
import { MindSweepModal } from './components/MindSweepModal';
import { WeeklyReviewModal } from './components/WeeklyReviewModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { 
  LayoutDashboard, 
  Layers, 
  Briefcase, 
  CheckCircle2, 
  FileSpreadsheet,
  Plus 
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    user,
    authModalOpen,
    setAuthModalOpen,
    installModalOpen,
    setInstallModalOpen,
    activeTab,
    setActiveTab,
    mindSweepOpen,
    setMindSweepOpen,
    weeklyReviewOpen,
    setWeeklyReviewOpen,
    setQuickCaptureOpen,
    nextActionsCount,
    stalledProjects,
    syncConflictNotice,
    dismissSyncConflict,
  } = useGTD();

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-gray-300 flex flex-col font-sans selection:bg-[#C5A47E] selection:text-black">
      {/* Top Main Navigation Header */}
      <Navbar />

      {/* Multi-Device Safe Sync Conflict / Merge Notification */}
      {syncConflictNotice && (
        <div className="bg-[#1C1710] border-b border-[#593E22] px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C5A47E] shrink-0" />
              <span>
                <strong className="text-white font-semibold">Multi-Device Update:</strong> {syncConflictNotice.message} (Synced at {syncConflictNotice.remoteTime})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="text-[11px] font-semibold text-[#C5A47E] hover:underline cursor-pointer"
              >
                View Sheets Hub
              </button>
              <button
                onClick={dismissSyncConflict}
                className="text-gray-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-28 md:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'horizons' && <HorizonsView />}
            {activeTab === 'projects' && <ProjectsView />}
            {(activeTab === 'actions' || activeTab === 'inbox' || activeTab === 'waiting' || activeTab === 'someday') && (
              <NextActionsView initialSubTab={activeTab === 'actions' ? 'actions' : activeTab} />
            )}
            {activeTab === 'reviews' && <ReviewsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile-Only Bottom Navigation Bar (Clean, clutter-free, thumb-accessible) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F0F0F]/95 backdrop-blur-xl border-t border-[#262626] px-2 py-1.5 flex items-center justify-around shadow-2xl safe-bottom">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] font-bold cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'text-[#C5A47E]' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-[#C5A47E]' : 'text-gray-400'}`} />
          <span>Cockpit</span>
        </button>

        <button
          onClick={() => setActiveTab('horizons')}
          className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] font-bold cursor-pointer transition-colors ${
            activeTab === 'horizons' ? 'text-[#C5A47E]' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Layers className={`w-5 h-5 mb-0.5 ${activeTab === 'horizons' ? 'text-[#C5A47E]' : 'text-gray-400'}`} />
          <span>Horizons</span>
        </button>

        {/* Center Minimal Quick Capture CTA */}
        <div className="flex-1 flex items-center justify-center py-0.5">
          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#C5A47E] text-black flex items-center justify-center shadow-xs cursor-pointer hover:bg-[#b8946e] active:scale-95 transition-all"
            title="Quick Capture (Inbox)"
            aria-label="Quick Capture"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] font-bold cursor-pointer transition-colors relative ${
            activeTab === 'projects' ? 'text-[#C5A47E]' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Briefcase className={`w-5 h-5 mb-0.5 ${activeTab === 'projects' ? 'text-[#C5A47E]' : 'text-gray-400'}`} />
          <span>Projects</span>
          {stalledProjects.length > 0 && (
            <span className="absolute top-0.5 right-3 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0F0F0F]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`flex-1 flex flex-col items-center justify-center py-1 text-[10px] font-bold cursor-pointer transition-colors relative ${
            (activeTab === 'actions' || activeTab === 'inbox' || activeTab === 'waiting' || activeTab === 'someday')
              ? 'text-[#C5A47E]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <CheckCircle2 className={`w-5 h-5 mb-0.5 ${(activeTab === 'actions' || activeTab === 'inbox' || activeTab === 'waiting' || activeTab === 'someday') ? 'text-[#C5A47E]' : 'text-gray-400'}`} />
          <span>Actions</span>
          {nextActionsCount > 0 && (
            <span className="absolute top-0.5 right-2 px-1 py-0.2 text-[9px] font-bold bg-[#C5A47E] text-black rounded-full min-w-[14px] text-center">
              {nextActionsCount}
            </span>
          )}
        </button>
      </nav>

      {/* Global Modals & Wizards */}
      <GlobalSearchModal />
      <QuickCaptureModal />
      <ClarifyModal />
      <MindSweepModal
        isOpen={mindSweepOpen}
        onClose={() => setMindSweepOpen(false)}
      />
      <WeeklyReviewModal
        isOpen={weeklyReviewOpen}
        onClose={() => setWeeklyReviewOpen(false)}
      />
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
      <PWAInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <GTDProvider>
      <MainAppContent />
    </GTDProvider>
  );
}
