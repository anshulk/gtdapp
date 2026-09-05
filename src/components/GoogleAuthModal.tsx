import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  ShieldCheck, 
  Users, 
  RefreshCw, 
  ExternalLink, 
  LogOut, 
  Sparkles, 
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  PlusCircle,
  Link2,
  Settings2,
  ChevronRight,
  Database,
  ArrowRightLeft,
  Check,
  Search
} from 'lucide-react';
import { useGTD } from '../context/GTDContext';
import { DriveSpreadsheetItem } from '../types/gtd';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'status' | 'selector' | 'create' | 'connect';

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    isAuthLoading,
    authError,
    sheetUrl,
    sheetId,
    sheetTitle,
    lastSyncTime,
    isSyncing,
    syncError,
    availableSheets,
    isFetchingSheets,
    autoSyncEnabled,
    setAutoSyncEnabled,
    refreshAvailableSheets,
    switchSpreadsheet,
    createNewSpreadsheet,
    connectExistingSpreadsheet,
    reloadFromSheet,
    signInWithGoogle,
    signOut,
    syncNow,
    continueAsGuest,
  } = useGTD();

  const [activeTab, setActiveTab] = useState<ModalTab>('status');
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [connectUrlOrId, setConnectUrlOrId] = useState('');
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Load sheets from Drive when modal opens if user is signed in
  useEffect(() => {
    if (isOpen && user?.accessToken && !user.isExpired) {
      refreshAvailableSheets();
    }
  }, [isOpen, user?.accessToken, user?.isExpired, refreshAvailableSheets]);

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleSwitchSheet = async (sheet: DriveSpreadsheetItem) => {
    setIsProcessingAction(true);
    try {
      await switchSpreadsheet(sheet.id, sheet.name);
      showSuccess(`Switched to "${sheet.name}" successfully.`);
      setActiveTab('status');
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCreateNewSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim()) return;

    setIsProcessingAction(true);
    try {
      await createNewSpreadsheet(newSheetTitle.trim());
      showSuccess(`Created and connected "${newSheetTitle.trim()}"!`);
      setNewSheetTitle('');
      setActiveTab('status');
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectUrlOrId.trim()) return;

    setIsProcessingAction(true);
    try {
      await connectExistingSpreadsheet(connectUrlOrId.trim());
      showSuccess('Connected to Google Sheet successfully!');
      setConnectUrlOrId('');
      setActiveTab('status');
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredSheets = availableSheets.filter((s) =>
    s.name.toLowerCase().includes(sheetSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-2xl shadow-2xl border border-[#262626] w-full max-w-xl overflow-hidden text-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A47E] font-mono">
                Google Workspace Storage
              </span>
              <h2 className="text-lg font-bold font-serif text-white">
                Google Sheets Hub & Multi-Device Sync
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (if logged in) */}
        {user && !user.isExpired && (
          <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#262626] bg-[#111111] overflow-x-auto">
            <button
              onClick={() => setActiveTab('status')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'status'
                  ? 'border-[#C5A47E] text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Current Sheet & Sync</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('selector');
                refreshAvailableSheets();
              }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'selector'
                  ? 'border-[#C5A47E] text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Select Sheet ({availableSheets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'create'
                  ? 'border-[#C5A47E] text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Custom Sheet</span>
            </button>
            <button
              onClick={() => setActiveTab('connect')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'connect'
                  ? 'border-[#C5A47E] text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link URL / ID</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Action Success Toast Banner */}
          {actionSuccessMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {/* Sync / API Error Banner */}
          {syncError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-rose-200">Google Sync Notice</span>
                <p className="text-[11px] leading-relaxed">{syncError}</p>
              </div>
            </div>
          )}

          {user ? (
            /* Logged In Views */
            <>
              {/* TAB 1: STATUS & CURRENT ACTIVE SHEET */}
              {activeTab === 'status' && (
                <div className="space-y-4">
                  {/* User Profile Card */}
                  <div className="p-4 bg-[#191919] rounded-xl border border-[#262626] flex items-center gap-3.5">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className={`w-12 h-12 rounded-full border-2 ${user.isExpired ? 'border-amber-400 opacity-80' : 'border-[#C5A47E]'}`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#C5A47E] text-black font-bold flex items-center justify-center text-lg">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{user.name}</span>
                        {user.isExpired ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono">
                            Session Expired
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Expired Token Alert */}
                  {user.isExpired && (
                    <div className="p-4 bg-[#231A10] rounded-xl border border-amber-700/60 space-y-2.5 text-xs text-amber-200">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-100 block">Google Session Expired</span>
                          <p className="text-[11px] text-amber-200/90 leading-relaxed">
                            Google security tokens expire periodically. Click below to reconnect and resume automatic syncing with your Google Sheet.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => signInWithGoogle(false)}
                        disabled={isAuthLoading}
                        className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAuthLoading ? 'animate-spin' : ''}`} />
                        <span>{isAuthLoading ? 'Reconnecting to Google...' : 'Reconnect Google Account (1-Click)'}</span>
                      </button>
                    </div>
                  )}

                  {/* Active Sheet Card */}
                  <div className="p-4 bg-[#191919] rounded-xl border border-[#262626] space-y-3.5 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Active Google Spreadsheet
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {sheetTitle || 'GTD Horizon & Review Hub'}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 shrink-0">
                        6-Altitude Structure
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#262626]">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-gray-400">Sync Status:</span>
                        <p className="font-medium text-white flex items-center gap-1.5">
                          {user.isExpired ? (
                            <span className="text-amber-400">Session Expired</span>
                          ) : isSyncing ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Active & Synced
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[11px] text-gray-400">Last Timestamp:</span>
                        <p className="font-mono text-gray-300">
                          {lastSyncTime
                            ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'Not synced yet'}
                        </p>
                      </div>
                    </div>

                    {/* Multi-Device Protection Feature Badge */}
                    <div className="p-3 bg-[#141414] rounded-lg border border-[#2B2B2B] flex items-start gap-2.5 text-[11px]">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-gray-300">
                        <span className="font-semibold text-white block">Safe Multi-Device Timestamp Checks: Active</span>
                        <p className="text-gray-400 leading-relaxed text-[10.5px]">
                          Automatic 3-way item timestamp comparison verifies remote modification times before saving to guarantee zero data loss or overwrite collisions across devices.
                        </p>
                      </div>
                    </div>

                    {/* Auto-Sync Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
                      <div>
                        <span className="font-semibold text-white text-xs block">Continuous Background Auto-Sync</span>
                        <span className="text-[10.5px] text-gray-400">Automatically sync changes when actions or projects are modified</span>
                      </div>
                      <button
                        onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          autoSyncEnabled ? 'bg-emerald-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-[#262626] flex items-center justify-between gap-2 flex-wrap">
                      {sheetUrl && (
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#202020] border border-[#262626] rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#C5A47E]" />
                          <span>Open in Google Sheets</span>
                        </a>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => reloadFromSheet()}
                          disabled={isSyncing || isProcessingAction}
                          title="Force reload all data from Google Sheet into app"
                          className="px-3 py-2 bg-[#1C1C1C] hover:bg-[#242424] text-gray-300 rounded-lg text-xs font-semibold border border-[#2D2D2D] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Reload from Sheet
                        </button>

                        <button
                          onClick={() => syncNow()}
                          disabled={isSyncing || isProcessingAction}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => signInWithGoogle(true)}
                      className="text-xs text-gray-400 hover:text-[#C5A47E] transition-colors cursor-pointer"
                    >
                      Switch Account / Re-authenticate
                    </button>

                    <button
                      onClick={signOut}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: SHEET SELECTOR (DRIVE LIST) */}
              {activeTab === 'selector' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Select a Google Sheet from Drive</h3>
                      <p className="text-xs text-gray-400">Choose an existing spreadsheet in your Google Drive to connect.</p>
                    </div>
                    <button
                      onClick={() => refreshAvailableSheets()}
                      disabled={isFetchingSheets}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1E1E1E] rounded-lg transition-colors cursor-pointer"
                      title="Refresh sheet list"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetchingSheets ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Search filter */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={sheetSearchQuery}
                      onChange={(e) => setSheetSearchQuery(e.target.value)}
                      placeholder="Filter sheets by title..."
                      className="w-full pl-9 pr-4 py-2 bg-[#191919] border border-[#262626] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E]"
                    />
                  </div>

                  {/* Sheets List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {isFetchingSheets && availableSheets.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#C5A47E]" />
                        <span>Searching Google Drive for your spreadsheets...</span>
                      </div>
                    ) : filteredSheets.length === 0 ? (
                      <div className="p-6 bg-[#191919] rounded-xl border border-[#262626] text-center text-xs text-gray-400 space-y-2">
                        <p>No spreadsheets found matching your query.</p>
                        <button
                          onClick={() => setActiveTab('create')}
                          className="px-3 py-1.5 bg-[#262626] hover:bg-[#333] text-[#C5A47E] font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          Create a New Sheet
                        </button>
                      </div>
                    ) : (
                      filteredSheets.map((sheet) => {
                        const isCurrent = sheet.id === sheetId;
                        return (
                          <div
                            key={sheet.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              isCurrent
                                ? 'bg-emerald-950/20 border-emerald-800/60'
                                : 'bg-[#191919] border-[#262626] hover:border-[#383838]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isCurrent ? 'bg-emerald-900/40 text-emerald-400' : 'bg-[#222] text-gray-400'
                              }`}>
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white text-xs truncate">{sheet.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10.5px] text-gray-500 block truncate">
                                  Modified {sheet.modifiedTime ? new Date(sheet.modifiedTime).toLocaleDateString() : 'recently'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isCurrent ? (
                                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 px-2.5 py-1">
                                  <Check className="w-3.5 h-3.5" /> Connected
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSwitchSheet(sheet)}
                                  disabled={isProcessingAction}
                                  className="px-3 py-1.5 bg-[#252525] hover:bg-[#C5A47E] hover:text-black text-gray-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Switch to This</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CREATE CUSTOM NAMED SHEET */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateNewSheet} className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Create a Custom GTD Spreadsheet</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                      Create a dedicated Google Spreadsheet with custom naming (e.g. for personal life, enterprise work, or separate GTD silos). The app will automatically construct the 5 GTD altitude tabs and seed your current items.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Spreadsheet Name</label>
                    <input
                      type="text"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      placeholder="e.g., Personal GTD 2026 or Work GTD Master"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#191919] border border-[#262626] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E]"
                    />
                  </div>

                  <div className="p-3.5 bg-[#191919] rounded-xl border border-[#262626] text-xs text-gray-400 space-y-2">
                    <span className="font-semibold text-white block">Automatically Included Sheets Structure:</span>
                    <ul className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <li className="flex items-center gap-1.5 text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A47E]" /> Actions (16 columns)
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A47E]" /> Projects (12 columns)
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A47E]" /> Horizons (11 columns)
                      </li>
                      <li className="flex items-center gap-1.5 text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A47E]" /> Reviews (9 columns)
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('status')}
                      className="px-3.5 py-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingAction || !newSheetTitle.trim()}
                      className="px-4 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isProcessingAction ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating on Drive...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Create & Connect Sheet</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: CONNECT BY URL / ID */}
              {activeTab === 'connect' && (
                <form onSubmit={handleConnectExisting} className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Connect Existing Google Sheet</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                      Paste a Google Sheet URL or ID from your Drive. The system will verify access and configure the GTD data tabs automatically.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300">Google Sheet URL or Spreadsheet ID</label>
                    <input
                      type="text"
                      value={connectUrlOrId}
                      onChange={(e) => setConnectUrlOrId(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      required
                      className="w-full px-3.5 py-2.5 bg-[#191919] border border-[#262626] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#C5A47E] font-mono text-[11px]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('status')}
                      className="px-3.5 py-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingAction || !connectUrlOrId.trim()}
                      className="px-4 py-2 bg-[#C5A47E] hover:bg-[#b8946e] text-black font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isProcessingAction ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Sheet...</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Connect Spreadsheet</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Sign In Prompt View */
            <div className="space-y-5 text-center">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white font-serif">
                  Multi-User Google Sheets Persistence
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                  Sign in with your Google account to automatically store, update, and back up all your GTD Horizons, Projects, Actions, and Weekly Reviews into a private Google Sheet in your personal Google Drive.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
                <div className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Safe Multi-Device Sync</span>
                    <span className="text-gray-400 text-[11px]">Timestamp collision checks prevent overwriting concurrent updates.</span>
                  </div>
                </div>

                <div className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-start gap-2.5">
                  <FolderOpen className="w-4 h-4 text-[#C5A47E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Custom Sheets Selector</span>
                    <span className="text-gray-400 text-[11px]">Create custom-named sheets or pick existing files on Drive.</span>
                  </div>
                </div>

                <div className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-start gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Structured 6 Altitudes</span>
                    <span className="text-gray-400 text-[11px]">Actions, Projects, Horizons, and Weekly Reviews tabs.</span>
                  </div>
                </div>

                <div className="p-3 bg-[#191919] border border-[#262626] rounded-xl flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Multi-Account Ready</span>
                    <span className="text-gray-400 text-[11px]">Switch between accounts on the same computer cleanly.</span>
                  </div>
                </div>
              </div>

              {/* Error display */}
              {authError && (
                <div className="p-3.5 bg-[#1F1914] border border-[#593E22] rounded-xl text-xs text-amber-200 flex items-start gap-2.5 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#C5A47E] mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-amber-100">{authError}</p>
                    <p className="text-[11px] text-gray-400">
                      If pop-ups are blocked, please check your browser's address bar or try again. You can also use Guest Mode anytime.
                    </p>
                  </div>
                </div>
              )}

              {/* Google Sign-in CTA Button */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => signInWithGoogle(false)}
                  disabled={isAuthLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-bold rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg disabled:opacity-60"
                >
                  {isAuthLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-700" />
                      <span>Connecting to Google Account...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="text-xs text-gray-500 hover:text-gray-300 font-medium py-1.5 cursor-pointer transition-colors"
                >
                  Continue in Guest Mode (Offline browser storage only)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#141414] flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>Google Drive API v3 • Sheets API v4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E1E1E] hover:bg-[#252525] text-gray-300 rounded-lg font-medium cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
