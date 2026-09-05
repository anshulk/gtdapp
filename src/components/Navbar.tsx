import React, { useState } from 'react';
import { 
  Compass, 
  Layers, 
  Briefcase, 
  CheckCircle2, 
  Inbox, 
  Clock, 
  Sparkles, 
  CalendarCheck, 
  Plus, 
  Search, 
  RotateCcw, 
  Download, 
  Upload, 
  Brain, 
  AlertTriangle,
  ChevronDown,
  X,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  LogOut,
  User,
  ShieldCheck,
  MonitorDown,
  Smartphone
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { ActiveTab } from '../types/gtd';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const Navbar: React.FC = () => {
  const {
    user,
    isSyncing,
    lastSyncTime,
    sheetUrl,
    setAuthModalOpen,
    setInstallModalOpen,
    syncNow,
    signOut,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    searchModalOpen,
    setSearchModalOpen,
    setQuickCaptureOpen,
    setWeeklyReviewOpen,
    setMindSweepOpen,
    resetToDefaults,
    exportData,
    importData,
    projects = [],
    inboxCount,
    waitingForCount,
    somedayCount,
    nextActionsCount,
    stalledProjects,
    isReviewDue,
    daysSinceLastReview,
  } = useGTD();

  const { isInstalled } = usePWAInstall();
  const [menuOpen, setMenuOpen] = useState(false);
  const [importError, setImportError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const success = importData(content);
        if (!success) {
          setImportError(true);
          setTimeout(() => setImportError(false), 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; alert?: boolean }[] = [
    { id: 'dashboard', label: 'Cockpit', icon: <Layers className="w-4 h-4" /> },
    { id: 'horizons', label: 'Horizons of Focus', icon: <Compass className="w-4 h-4" /> },
    { 
      id: 'projects', 
      label: 'Projects', 
      icon: <Briefcase className="w-4 h-4" />,
      badge: projects.filter(p => p.status === 'active').length,
      alert: stalledProjects.length > 0
    },
    { 
      id: 'actions', 
      label: 'Actions & Lists', 
      icon: <CheckCircle2 className="w-4 h-4" />, 
      badge: nextActionsCount,
      alert: inboxCount > 5
    },
    { 
      id: 'reviews', 
      label: 'Weekly Review', 
      icon: <CalendarCheck className="w-4 h-4" />,
      alert: isReviewDue
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#262626] shadow-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          
          {/* Logo & Brand with Compass Icon */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#171512] border border-[#C5A47E]/40 p-1 flex items-center justify-center shadow-md group-hover:border-[#C5A47E] group-hover:scale-105 transition-all">
                <img src="/icon.svg" alt="GTD Compass Icon" className="w-full h-full object-contain" />
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-serif">
                GTD App
              </span>
            </button>
          </div>

          {/* Center: Search Bar & Mind Sweep Trigger */}
          <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
            <div 
              onClick={() => setSearchModalOpen(true)}
              className="relative w-full cursor-pointer group"
            >
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#C5A47E] transition-colors" />
              <input
                type="text"
                readOnly
                value={searchQuery}
                onFocus={() => setSearchModalOpen(true)}
                placeholder="Search actions, projects, horizons..."
                className="w-full pl-9 pr-14 py-1.5 text-xs sm:text-sm bg-[#141414] group-hover:bg-[#1A1A1A] border border-[#262626] group-hover:border-[#383838] rounded-lg text-gray-200 placeholder-gray-500 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#C5A47E] focus:border-[#C5A47E] transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#202020] text-gray-400 border border-[#303030] rounded group-hover:text-gray-300">
                  ⌘K
                </kbd>
              </div>
            </div>

            <button
              onClick={() => setMindSweepOpen(true)}
              title="David Allen Mind Sweep Trigger List"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#C5A47E] bg-[#191919] hover:bg-[#222222] border border-[#262626] rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 text-[#C5A47E]" />
              <span>Mind Sweep</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className={`md:hidden p-2 rounded-lg border transition-colors cursor-pointer ${
                searchModalOpen || searchQuery
                  ? 'bg-[#C5A47E]/15 text-[#C5A47E] border-[#C5A47E]/40'
                  : 'text-gray-400 hover:text-gray-200 bg-[#141414] border-[#262626]'
              }`}
              title="Search (⌘K)"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile Mind Sweep Trigger Button */}
            <button
              onClick={() => setMindSweepOpen(true)}
              className="md:hidden p-2 text-[#C5A47E] bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] rounded-lg transition-colors cursor-pointer"
              title="Mind Sweep Trigger List"
              aria-label="Mind Sweep"
            >
              <Brain className="w-4 h-4" />
            </button>

            {/* Quick Capture Button (Minimal + button) */}
            <button
              onClick={() => setQuickCaptureOpen(true)}
              className="flex items-center justify-center w-8 h-8 text-black bg-[#C5A47E] hover:bg-[#b8946e] active:bg-[#a8845e] rounded-lg shadow-xs transition-all cursor-pointer"
              title="Quick Capture (Press C)"
              aria-label="Quick Capture"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* User & Settings Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 p-1.5 sm:p-2 text-gray-400 hover:text-gray-200 hover:bg-[#1A1A1A] rounded-lg border border-[#262626] transition-colors cursor-pointer"
                title="Account, Sync & Settings"
              >
                {user?.picture ? (
                  <div className="relative">
                    <img
                      src={user.picture}
                      alt={user.name}
                      className={`w-5 h-5 rounded-full border ${user.isExpired ? 'border-amber-400' : 'border-[#C5A47E]'}`}
                      referrerPolicy="no-referrer"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                      user.isExpired ? 'bg-amber-400' : isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`} />
                  </div>
                ) : (
                  <div className="relative">
                    <User className="w-4 h-4" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-neutral-600" />
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-[#141414] rounded-xl shadow-2xl border border-[#262626] py-1.5 z-50 text-xs text-gray-200">
                    
                    {/* User Profile Header */}
                    <div className="px-3.5 py-2.5 border-b border-[#262626]">
                      {user ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white truncate">{user.name}</span>
                            {user.isExpired ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                                Expired
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                                Sheets Sync
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                          {lastSyncTime && (
                            <p className="text-[10px] text-gray-500 font-mono">
                              Synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">Guest Session</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-gray-400">
                              Local Only
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">Sign in to save to Google Sheets</p>
                        </div>
                      )}
                    </div>

                    {/* Expired Session Reconnect Trigger */}
                    {user?.isExpired && (
                      <button
                        onClick={() => {
                          setAuthModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-left font-semibold border-b border-amber-800/40 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Session Expired • Reconnect</span>
                      </button>
                    )}

                    {/* Google Sheets Sync Actions */}
                    <button
                      onClick={() => {
                        setAuthModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-emerald-400 hover:bg-emerald-950/30 text-left font-medium cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>{user ? 'Google Sheets Sync Settings' : 'Connect Google Sheets...'}</span>
                    </button>

                    {user && sheetUrl && (
                      <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-300 hover:bg-[#1E1E1E] text-left font-medium cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-[#C5A47E]" />
                        <span>Open Sheet in Google Drive</span>
                      </a>
                    )}

                    {/* Mobile Quick Action Triggers */}
                    <div className="md:hidden border-t border-[#262626] my-1" />
                    <button
                      onClick={() => {
                        setMindSweepOpen(true);
                        setMenuOpen(false);
                      }}
                      className="md:hidden w-full flex items-center gap-2.5 px-3.5 py-2 text-[#DFCAAC] hover:bg-[#1E1E1E] text-left font-medium cursor-pointer"
                    >
                      <Brain className="w-4 h-4 text-[#C5A47E]" />
                      <span>Mind Sweep Trigger List</span>
                    </button>

                    <button
                      onClick={() => {
                        setWeeklyReviewOpen(true);
                        setMenuOpen(false);
                      }}
                      className="md:hidden w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-300 hover:bg-[#1E1E1E] text-left font-medium cursor-pointer"
                    >
                      <CalendarCheck className="w-4 h-4 text-amber-400" />
                      <span>Start Weekly Review</span>
                    </button>

                    <button
                      onClick={() => {
                        setInstallModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#DFCAAC] hover:bg-[#1E1E1E] text-left font-medium cursor-pointer"
                    >
                      <MonitorDown className="w-4 h-4 text-[#C5A47E]" />
                      <span>{isInstalled ? 'App is Installed (Standalone)' : 'Install GTD App'}</span>
                    </button>

                    <div className="my-1 border-t border-[#262626]" />
                    <div className="px-3.5 py-1 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                      Backup & Operations
                    </div>
                    
                    <button
                      onClick={() => {
                        exportData();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-300 hover:bg-[#1E1E1E] text-left font-medium cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                      <span>Export GTD Data (JSON)</span>
                    </button>

                    <label className="w-full flex items-center gap-2.5 px-3.5 py-2 text-gray-300 hover:bg-[#1E1E1E] text-left font-medium cursor-pointer">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span>Import GTD Backup</span>
                      <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <button
                      onClick={() => {
                        setShowResetConfirm(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-amber-400 hover:bg-amber-950/30 text-left font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                      <span>Reset to Sample Template</span>
                    </button>

                    {user && (
                      <>
                        <div className="my-1 border-t border-[#262626]" />
                        <button
                          onClick={() => {
                            signOut();
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:bg-rose-950/40 text-left font-medium cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400" />
                          <span>Sign Out / Switch User</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Navigation Tabs (Desktop only - mobile uses bottom navbar exclusively) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <nav className="hidden md:flex space-x-1 overflow-x-auto no-scrollbar py-1 border-t border-[#262626] text-xs font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C5A47E] text-black font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <span className={isActive ? 'text-black' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>

                {/* Badge count */}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isActive 
                        ? 'bg-black/20 text-black' 
                        : 'bg-neutral-800 text-gray-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Alert indicator */}
                {item.alert && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-black' : 'bg-amber-400 ring-2 ring-[#0F0F0F]'
                    }`}
                    title="Needs attention"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Import error banner */}
      {importError && (
        <div className="bg-rose-950/60 border-b border-rose-800/80 px-4 py-2 text-center text-xs text-rose-300 font-medium">
          Invalid GTD JSON backup file. Please ensure it follows the GTD Hub schema.
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetToDefaults();
          setShowResetConfirm(false);
        }}
        title="Reset to Sample GTD Template"
        message="Are you sure you want to reset all GTD data? Your current custom horizons, projects, next actions, and weekly reviews will be replaced with the default template."
        confirmLabel="Reset All Data"
      />
    </header>
  );
};
