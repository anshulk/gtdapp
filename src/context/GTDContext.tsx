import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import { 
  HorizonItem, 
  GTDProject, 
  GTDAction, 
  WeeklyReviewRecord, 
  ActiveTab,
  ActionType,
  DriveSpreadsheetItem,
  SyncMode,
  DEFAULT_SUGGESTED_TAGS
} from '../types/gtd';
import { getActionStreakInfo, formatDateKey } from '../utils/streakUtils';
import { isProjectStalled } from '../utils/projectUtils';
import {
  generateActionsCSV,
  generateProjectsCSV,
  generateHorizonsCSV,
  generateAllInOneCSV,
  parseAndImportCSV,
  isFileSystemAccessSupported,
  linkLocalJsonFile,
  writeDataToFileHandle,
  triggerFileDownload
} from '../utils/offlineSync';
import { 
  INITIAL_HORIZON_ITEMS, 
  INITIAL_PROJECTS, 
  INITIAL_ACTIONS, 
  INITIAL_REVIEWS 
} from '../data/gtdData';
import { 
  GoogleUser, 
  getStoredGoogleUser, 
  saveGoogleUser, 
  requestGoogleLogin, 
  isTokenValid
} from '../services/googleAuth';
import { 
  DEFAULT_SPREADSHEET_TITLE,
  findOrCreateGTDSpreadsheet, 
  fetchGTDDataFromSheet, 
  saveGTDDataToSheet,
  listGoogleSpreadsheets,
  createNamedGTDSpreadsheet,
  getSpreadsheetDetails,
  setupGTDSheetsStructure,
  checkRemoteSheetMetadata,
  mergeGTDDatasets,
  extractSpreadsheetId,
  GoogleApiAuthError
} from '../services/googleSheets';

export interface SyncConflictNotice {
  message: string;
  remoteTime: string;
  changesCount: number;
}

interface GTDContextType {
  // Auth & Sync State
  user: GoogleUser | null;
  isAuthLoading: boolean;
  authError: string | null;
  isGuestMode: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  sheetUrl: string | null;
  sheetId: string | null;
  sheetTitle: string | null;
  syncError: string | null;
  availableSheets: DriveSpreadsheetItem[];
  isFetchingSheets: boolean;
  autoSyncEnabled: boolean;
  syncConflictNotice: SyncConflictNotice | null;

  // Sync / Sheet Actions
  signInWithGoogle: (promptConsent?: boolean) => Promise<void>;
  signOut: () => void;
  continueAsGuest: () => void;
  syncNow: () => Promise<void>;
  reloadFromSheet: () => Promise<void>;
  refreshAvailableSheets: () => Promise<void>;
  switchSpreadsheet: (id: string, title?: string) => Promise<void>;
  createNewSpreadsheet: (title: string) => Promise<void>;
  connectExistingSpreadsheet: (urlOrId: string) => Promise<void>;
  setAutoSyncEnabled: (enabled: boolean) => void;
  dismissSyncConflict: () => void;

  // Sync Mode & Offline Sync
  syncMode: SyncMode;
  setSyncMode: (mode: SyncMode) => void;
  lastOfflineSyncTime: Date | null;
  linkedFileName: string | null;
  isFileSystemSupported: boolean;
  linkLocalFile: () => Promise<boolean>;
  unlinkLocalFile: () => void;
  syncToOfflineNow: () => Promise<void>;
  exportCSV: (type: 'all' | 'actions' | 'projects' | 'horizons') => void;
  importCSV: (csvText: string) => { success: boolean; message: string };

  // Data State
  horizonItems: HorizonItem[];
  projects: GTDProject[];
  actions: GTDAction[];
  reviews: WeeklyReviewRecord[];
  activeTab: ActiveTab;
  searchQuery: string;
  searchModalOpen: boolean;
  quickCaptureOpen: boolean;
  weeklyReviewOpen: boolean;
  mindSweepOpen: boolean;
  authModalOpen: boolean;
  installModalOpen: boolean;
  clarifyModalItem: GTDAction | null;
  selectedProjectId: string | null;
  selectedHorizonId: string | null;

  // Setters
  setActiveTab: (tab: ActiveTab) => void;
  setSearchQuery: (query: string) => void;
  setSearchModalOpen: (open: boolean) => void;
  setQuickCaptureOpen: (open: boolean) => void;
  setWeeklyReviewOpen: (open: boolean) => void;
  setMindSweepOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setInstallModalOpen: (open: boolean) => void;
  setClarifyModalItem: (item: GTDAction | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedHorizonId: (id: string | null) => void;

  // Horizon Actions
  addHorizonItem: (item: Omit<HorizonItem, 'id' | 'createdAt'>) => string;
  updateHorizonItem: (id: string, updates: Partial<HorizonItem>) => void;
  deleteHorizonItem: (id: string) => void;

  // Project Actions
  addProject: (project: Omit<GTDProject, 'id' | 'createdAt'>, initialActionTitle?: string) => string;
  updateProject: (id: string, updates: Partial<GTDProject>) => void;
  deleteProject: (id: string) => void;
  restoreProject: (project: GTDProject, linkedActionIds?: string[]) => void;
  toggleProjectStatus: (id: string, status: GTDProject['status']) => void;

  // Action Actions
  addAction: (action: Omit<GTDAction, 'id' | 'createdAt' | 'completed'>) => string;
  updateAction: (id: string, updates: Partial<GTDAction>) => void;
  deleteAction: (id: string) => void;
  toggleActionComplete: (id: string) => void;
  logRecurringCompletion: (id: string, dateStr?: string) => void;
  convertInboxItem: (
    inboxId: string, 
    conversion: {
      type: ActionType;
      title?: string;
      projectId?: string;
      tags?: string[];
      context?: string;
      energy?: GTDAction['energy'];
      timeEstimate?: GTDAction['timeEstimate'];
      delegatedTo?: string;
      delegatedDate?: string;
      followUpDate?: string;
      newProjectData?: {
        title: string;
        desiredOutcome: string;
        areaId?: string;
        goalId?: string;
      };
    }
  ) => void;

  // Review Actions
  recordWeeklyReview: (record: Omit<WeeklyReviewRecord, 'id'>) => void;
  deleteReview: (id: string) => void;

  // Bulk / Utility Actions
  resetToDefaults: () => void;
  exportData: () => void;
  importData: (jsonString: string) => boolean;

  // Computed Metrics
  allTags: string[];
  stalledProjects: GTDProject[];
  nextActionsCount: number;
  inboxCount: number;
  waitingForCount: number;
  somedayCount: number;
  lastReviewDate: Date | null;
  daysSinceLastReview: number;
  isReviewDue: boolean;
  getProjectActions: (projectId: string) => GTDAction[];
  getHorizonChildren: (horizonId: string) => {
    subHorizons: HorizonItem[];
    projects: GTDProject[];
  };
}

const LOCAL_STORAGE_KEY_PREFIX = 'gtd_hub_state_v2';
const CROSS_TAB_CHANNEL_NAME = 'gtd_cross_tab_sync_channel';

export const normalizeActions = (rawActions: any[]): GTDAction[] => {
  if (!Array.isArray(rawActions)) return [];
  return rawActions.map((act) => {
    let tags = act.tags;
    if (!Array.isArray(tags)) {
      const migrated: string[] = [];
      if (act.context && typeof act.context === 'string') migrated.push(act.context.trim());
      if (act.energy && typeof act.energy === 'string') migrated.push(`${act.energy}-energy`);
      if (act.timeEstimate && typeof act.timeEstimate === 'string') migrated.push(act.timeEstimate.trim());
      tags = migrated;
    }
    return {
      ...act,
      tags,
    };
  });
};

const GTDContext = createContext<GTDContextType | undefined>(undefined);

export const GTDProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Unique session identifier for this browser tab
  const tabSessionId = useRef<string>(Math.random().toString(36).substring(2, 9));

  // Authentication & Guest State
  const [user, setUser] = useState<GoogleUser | null>(() => getStoredGoogleUser());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    return localStorage.getItem('gtd_guest_mode') === 'true';
  });

  // User storage partition key
  const storageKey = useMemo(() => {
    if (user?.email) {
      return `${LOCAL_STORAGE_KEY_PREFIX}_user_${encodeURIComponent(user.email)}`;
    }
    return `${LOCAL_STORAGE_KEY_PREFIX}_guest`;
  }, [user?.email]);

  // Google Sheets sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem(`${storageKey}_lastSyncTime`);
    return saved ? new Date(saved) : null;
  });
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => {
    return localStorage.getItem(`${storageKey}_sheetUrl`);
  });
  const [sheetId, setSheetId] = useState<string | null>(() => {
    return localStorage.getItem(`${storageKey}_sheetId`);
  });
  const [sheetTitle, setSheetTitle] = useState<string | null>(() => {
    return localStorage.getItem(`${storageKey}_sheetTitle`) || DEFAULT_SPREADSHEET_TITLE;
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [availableSheets, setAvailableSheets] = useState<DriveSpreadsheetItem[]>([]);
  const [isFetchingSheets, setIsFetchingSheets] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('gtd_auto_sync_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [syncConflictNotice, setSyncConflictNotice] = useState<SyncConflictNotice | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Sync Mode: 'cloud' | 'offline'
  const [syncMode, setSyncModeState] = useState<SyncMode>(() => {
    const saved = localStorage.getItem('gtd_sync_mode');
    if (saved === 'offline' || saved === 'cloud') return saved;
    return getStoredGoogleUser() ? 'cloud' : 'offline';
  });

  const [lastOfflineSyncTime, setLastOfflineSyncTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('gtd_last_offline_sync_time');
    return saved ? new Date(saved) : null;
  });

  const linkedFileHandleRef = useRef<any>(null);
  const [linkedFileName, setLinkedFileName] = useState<string | null>(() => {
    return localStorage.getItem('gtd_linked_file_name');
  });
  const isFileSystemSupported = useMemo(() => isFileSystemAccessSupported(), []);

  const setAutoSyncEnabled = (enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    localStorage.setItem('gtd_auto_sync_enabled', String(enabled));
  };

  const dismissSyncConflict = () => {
    setSyncConflictNotice(null);
  };

  // Load partitioned state
  const [horizonItems, setHorizonItems] = useState<HorizonItem[]>(() => {
    try {
      const initialKey = user?.email 
        ? `${LOCAL_STORAGE_KEY_PREFIX}_user_${encodeURIComponent(user.email)}`
        : `${LOCAL_STORAGE_KEY_PREFIX}_guest`;
      const saved = localStorage.getItem(`${initialKey}_horizons`);
      return saved ? JSON.parse(saved) : INITIAL_HORIZON_ITEMS;
    } catch {
      return INITIAL_HORIZON_ITEMS;
    }
  });

  const [projects, setProjects] = useState<GTDProject[]>(() => {
    try {
      const initialKey = user?.email 
        ? `${LOCAL_STORAGE_KEY_PREFIX}_user_${encodeURIComponent(user.email)}`
        : `${LOCAL_STORAGE_KEY_PREFIX}_guest`;
      const saved = localStorage.getItem(`${initialKey}_projects`);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [actions, setActions] = useState<GTDAction[]>(() => {
    try {
      const initialKey = user?.email 
        ? `${LOCAL_STORAGE_KEY_PREFIX}_user_${encodeURIComponent(user.email)}`
        : `${LOCAL_STORAGE_KEY_PREFIX}_guest`;
      const saved = localStorage.getItem(`${initialKey}_actions`);
      return saved ? normalizeActions(JSON.parse(saved)) : INITIAL_ACTIONS;
    } catch {
      return INITIAL_ACTIONS;
    }
  });

  const [reviews, setReviews] = useState<WeeklyReviewRecord[]>(() => {
    try {
      const initialKey = user?.email 
        ? `${LOCAL_STORAGE_KEY_PREFIX}_user_${encodeURIComponent(user.email)}`
        : `${LOCAL_STORAGE_KEY_PREFIX}_guest`;
      const saved = localStorage.getItem(`${initialKey}_reviews`);
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [mindSweepOpen, setMindSweepOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [clarifyModalItem, setClarifyModalItem] = useState<GTDAction | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(null);

  // Fresh state refs so async operations (cloud sync, background checks) never use stale closures
  const horizonItemsRef = useRef(horizonItems);
  const projectsRef = useRef(projects);
  const actionsRef = useRef(actions);
  const reviewsRef = useRef(reviews);

  horizonItemsRef.current = horizonItems;
  projectsRef.current = projects;
  actionsRef.current = actions;
  reviewsRef.current = reviews;

  // Cross-Tab & Cross-Page Synchronization refs
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isApplyingExternalUpdate = useRef<boolean>(false);
  const lastLocalMutationTimestampRef = useRef<number>(Date.now());
  const lastAppliedRemoteTimestampRef = useRef<number>(0);

  // Helper to immediately push local state to localStorage and broadcast to other tabs/pages with zero delay
  const syncImmediateLocalChange = useCallback(
    (payload: {
      horizons?: HorizonItem[];
      projects?: GTDProject[];
      actions?: GTDAction[];
      reviews?: WeeklyReviewRecord[];
    }) => {
      try {
        const now = Date.now();
        lastLocalMutationTimestampRef.current = now;

        if (payload.horizons) {
          horizonItemsRef.current = payload.horizons;
          localStorage.setItem(`${storageKey}_horizons`, JSON.stringify(payload.horizons));
        }
        if (payload.projects) {
          projectsRef.current = payload.projects;
          localStorage.setItem(`${storageKey}_projects`, JSON.stringify(payload.projects));
        }
        if (payload.actions) {
          actionsRef.current = payload.actions;
          localStorage.setItem(`${storageKey}_actions`, JSON.stringify(payload.actions));
        }
        if (payload.reviews) {
          reviewsRef.current = payload.reviews;
          localStorage.setItem(`${storageKey}_reviews`, JSON.stringify(payload.reviews));
        }

        localStorage.setItem(`${storageKey}_updated_at`, String(now));
        // Storage event trigger for other browser tabs/windows
        localStorage.setItem(
          `${storageKey}_sync_event`,
          JSON.stringify({ senderId: tabSessionId.current, timestamp: now })
        );

        // Immediate BroadcastChannel message for active tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'DATA_UPDATE',
            senderId: tabSessionId.current,
            storageKey,
            timestamp: now,
            data: {
              horizons: payload.horizons ?? horizonItems,
              projects: payload.projects ?? projects,
              actions: payload.actions ?? actions,
              reviews: payload.reviews ?? reviews,
              lastSyncTime: lastSyncTime?.toISOString(),
              sheetId,
              sheetTitle,
              sheetUrl,
            },
          });
        }
      } catch (err) {
        console.error('Failed to sync immediate local change:', err);
      }
    },
    [storageKey, horizonItems, projects, actions, reviews, lastSyncTime, sheetId, sheetTitle, sheetUrl]
  );

  // Reload the freshest partitioned state from localStorage
  const loadLatestFromLocalStorage = useCallback(() => {
    try {
      const storedUpdatedAt = Number(localStorage.getItem(`${storageKey}_updated_at`)) || 0;
      // Do not overwrite if we have newer pending local mutations on this tab
      if (
        storedUpdatedAt > 0 &&
        storedUpdatedAt <= lastLocalMutationTimestampRef.current &&
        storedUpdatedAt <= lastAppliedRemoteTimestampRef.current
      ) {
        return;
      }

      const savedH = localStorage.getItem(`${storageKey}_horizons`);
      const savedP = localStorage.getItem(`${storageKey}_projects`);
      const savedA = localStorage.getItem(`${storageKey}_actions`);
      const savedR = localStorage.getItem(`${storageKey}_reviews`);
      const savedSync = localStorage.getItem(`${storageKey}_lastSyncTime`);
      const savedSheetId = localStorage.getItem(`${storageKey}_sheetId`);
      const savedSheetTitle = localStorage.getItem(`${storageKey}_sheetTitle`);
      const savedSheetUrl = localStorage.getItem(`${storageKey}_sheetUrl`);

      isApplyingExternalUpdate.current = true;
      lastAppliedRemoteTimestampRef.current = storedUpdatedAt || Date.now();

      if (savedH) setHorizonItems(JSON.parse(savedH));
      if (savedP) setProjects(JSON.parse(savedP));
      if (savedA) setActions(JSON.parse(savedA));
      if (savedR) setReviews(JSON.parse(savedR));
      if (savedSync) setLastSyncTime(new Date(savedSync));
      if (savedSheetId) setSheetId(savedSheetId);
      if (savedSheetTitle) setSheetTitle(savedSheetTitle);
      if (savedSheetUrl) setSheetUrl(savedSheetUrl);

      setTimeout(() => {
        isApplyingExternalUpdate.current = false;
      }, 100);
    } catch (e) {
      console.warn('Error reading from localStorage cross-tab sync:', e);
    }
  }, [storageKey]);

  // Cross-Tab BroadcastChannel + Window Storage Events + Page Focus & Visibility Listeners
  useEffect(() => {
    // 1. BroadcastChannel setup (zero-latency message bus for active tabs)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.senderId === tabSessionId.current) return;

          if (msg.type === 'DATA_UPDATE' && msg.storageKey === storageKey) {
            const incomingTimestamp = msg.timestamp || Date.now();
            if (
              incomingTimestamp <= lastLocalMutationTimestampRef.current &&
              lastLocalMutationTimestampRef.current > lastAppliedRemoteTimestampRef.current
            ) {
              return;
            }

            isApplyingExternalUpdate.current = true;
            lastAppliedRemoteTimestampRef.current = incomingTimestamp;

            if (msg.data.horizons) setHorizonItems(msg.data.horizons);
            if (msg.data.projects) setProjects(msg.data.projects);
            if (msg.data.actions) setActions(msg.data.actions);
            if (msg.data.reviews) setReviews(msg.data.reviews);
            if (msg.data.lastSyncTime) setLastSyncTime(new Date(msg.data.lastSyncTime));
            if (msg.data.sheetId) setSheetId(msg.data.sheetId);
            if (msg.data.sheetTitle) setSheetTitle(msg.data.sheetTitle);
            if (msg.data.sheetUrl) setSheetUrl(msg.data.sheetUrl);

            setTimeout(() => {
              isApplyingExternalUpdate.current = false;
            }, 100);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // 2. Storage event listener (fires across tabs/windows of the same domain on localStorage updates)
    const handleStorageEvent = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(storageKey)) {
        if (event.key === `${storageKey}_sync_event` && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed.senderId === tabSessionId.current) return;
          } catch {}
        }
        loadLatestFromLocalStorage();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 3. Tab visibility change & window focus listeners (instantly sync when user switches tabs/pages)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      loadLatestFromLocalStorage();
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [storageKey, loadLatestFromLocalStorage]);

  // Sync state to current user's localStorage partition & broadcast to other tabs
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_horizons`, JSON.stringify(horizonItems));
      localStorage.setItem(`${storageKey}_projects`, JSON.stringify(projects));
      localStorage.setItem(`${storageKey}_actions`, JSON.stringify(actions));
      localStorage.setItem(`${storageKey}_reviews`, JSON.stringify(reviews));

      if (lastSyncTime) {
        localStorage.setItem(`${storageKey}_lastSyncTime`, lastSyncTime.toISOString());
      }
      if (sheetId) {
        localStorage.setItem(`${storageKey}_sheetId`, sheetId);
      }
      if (sheetTitle) {
        localStorage.setItem(`${storageKey}_sheetTitle`, sheetTitle);
      }
      if (sheetUrl) {
        localStorage.setItem(`${storageKey}_sheetUrl`, sheetUrl);
      }

      // Broadcast changes only if this was an active local change (not triggered by remote/external sync)
      if (
        !isApplyingExternalUpdate.current &&
        lastLocalMutationTimestampRef.current > lastAppliedRemoteTimestampRef.current
      ) {
        const now = Date.now();
        localStorage.setItem(`${storageKey}_updated_at`, String(now));
        localStorage.setItem(
          `${storageKey}_sync_event`,
          JSON.stringify({
            senderId: tabSessionId.current,
            timestamp: now,
          })
        );

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'DATA_UPDATE',
            senderId: tabSessionId.current,
            storageKey,
            timestamp: now,
            data: {
              horizons: horizonItems,
              projects,
              actions,
              reviews,
              lastSyncTime: lastSyncTime?.toISOString(),
              sheetId,
              sheetTitle,
              sheetUrl,
            },
          });
        }
      }
    } catch (e) {
      console.error('Failed to save to localStorage / broadcast:', e);
    }
  }, [horizonItems, projects, actions, reviews, lastSyncTime, sheetId, sheetTitle, sheetUrl, storageKey]);

  // Multi-Device Tombstone Tracking for Deletions
  const tombstonesRef = useRef<Map<string, number>>(new Map());

  const getTombstoneKey = (email?: string) => 
    `gtd_tombstones_${email ? encodeURIComponent(email) : 'guest'}`;

  const loadTombstones = useCallback((email?: string) => {
    try {
      const raw = localStorage.getItem(getTombstoneKey(email));
      if (raw) {
        const parsed = JSON.parse(raw);
        const map = new Map<string, number>();
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // retain tombstones for 30 days
        for (const [id, time] of Object.entries(parsed)) {
          if (Number(time) > cutoff) {
            map.set(id, Number(time));
          }
        }
        tombstonesRef.current = map;
        return;
      }
    } catch (e) {
      console.warn('Error loading tombstones:', e);
    }
    tombstonesRef.current = new Map();
  }, []);

  const saveTombstones = useCallback((email?: string) => {
    try {
      const obj: Record<string, number> = {};
      for (const [id, time] of tombstonesRef.current.entries()) {
        obj[id] = time;
      }
      localStorage.setItem(getTombstoneKey(email), JSON.stringify(obj));
    } catch (e) {
      console.warn('Error saving tombstones:', e);
    }
  }, []);

  const recordTombstone = useCallback((id: string) => {
    tombstonesRef.current.set(id, Date.now());
    saveTombstones(user?.email);
  }, [user?.email, saveTombstones]);

  // Load initial tombstones on mount
  useEffect(() => {
    loadTombstones(user?.email);
  }, [user?.email, loadTombstones]);

  // Handle User Partition Switching
  const loadUserPartition = useCallback((userEmail?: string) => {
    loadTombstones(userEmail);
    const key = userEmail 
      ? `${LOCAL_STORAGE_KEY_PREFIX}_user_${encodeURIComponent(userEmail)}`
      : `${LOCAL_STORAGE_KEY_PREFIX}_guest`;

    try {
      const savedH = localStorage.getItem(`${key}_horizons`);
      const savedP = localStorage.getItem(`${key}_projects`);
      const savedA = localStorage.getItem(`${key}_actions`);
      const savedR = localStorage.getItem(`${key}_reviews`);
      const savedSync = localStorage.getItem(`${key}_lastSyncTime`);
      const savedSheetId = localStorage.getItem(`${key}_sheetId`);
      const savedSheetTitle = localStorage.getItem(`${key}_sheetTitle`);
      const savedSheetUrl = localStorage.getItem(`${key}_sheetUrl`);

      setHorizonItems(savedH ? JSON.parse(savedH) : INITIAL_HORIZON_ITEMS);
      setProjects(savedP ? JSON.parse(savedP) : INITIAL_PROJECTS);
      setActions(savedA ? normalizeActions(JSON.parse(savedA)) : INITIAL_ACTIONS);
      setReviews(savedR ? JSON.parse(savedR) : INITIAL_REVIEWS);
      setLastSyncTime(savedSync ? new Date(savedSync) : null);
      setSheetId(savedSheetId || null);
      setSheetTitle(savedSheetTitle || DEFAULT_SPREADSHEET_TITLE);
      setSheetUrl(savedSheetUrl || null);
    } catch (e) {
      console.error('Error loading partition:', e);
    }
  }, []);

  // Fetch available spreadsheets from Google Drive
  const refreshAvailableSheets = useCallback(async (customUser?: GoogleUser | null) => {
    const activeUser = customUser || user;
    if (!activeUser?.accessToken || activeUser?.isExpired || !isTokenValid(activeUser)) return;

    setIsFetchingSheets(true);
    try {
      const files = await listGoogleSpreadsheets(activeUser.accessToken);
      setAvailableSheets(
        files.map((f) => ({
          ...f,
          isCurrent: f.id === sheetId,
        }))
      );
    } catch (e) {
      console.warn('Could not list Google Spreadsheets:', e);
    } finally {
      setIsFetchingSheets(false);
    }
  }, [user, sheetId]);

  // Offline Sync Actions
  const syncToOfflineNow = useCallback(async () => {
    const now = new Date();
    setLastOfflineSyncTime(now);
    localStorage.setItem('gtd_last_offline_sync_time', now.toISOString());

    if (linkedFileHandleRef.current) {
      const dataPayload = {
        version: '2.0',
        syncedAt: now.toISOString(),
        mode: 'offline',
        horizonItems: horizonItemsRef.current,
        projects: projectsRef.current,
        actions: actionsRef.current,
        reviews: reviewsRef.current,
      };
      await writeDataToFileHandle(linkedFileHandleRef.current, dataPayload);
    }
  }, []);

  const setSyncMode = useCallback((mode: SyncMode) => {
    setSyncModeState(mode);
    localStorage.setItem('gtd_sync_mode', mode);
    if (mode === 'offline') {
      const now = new Date();
      setLastOfflineSyncTime(now);
      localStorage.setItem('gtd_last_offline_sync_time', now.toISOString());
    } else if (mode === 'cloud') {
      if (user?.accessToken && !user.isExpired) {
        setTimeout(() => {
          if (syncToSheetRef.current) syncToSheetRef.current();
        }, 100);
      }
    }
  }, [user]);

  const linkLocalFile = useCallback(async (): Promise<boolean> => {
    try {
      const result = await linkLocalJsonFile();
      if (!result) return false;

      linkedFileHandleRef.current = result.handle;
      setLinkedFileName(result.fileName);
      localStorage.setItem('gtd_linked_file_name', result.fileName);

      if (result.data && (result.data.actions || result.data.projects)) {
        if (result.data.horizonItems) setHorizonItems(result.data.horizonItems);
        if (result.data.projects) setProjects(result.data.projects);
        if (result.data.actions) setActions(result.data.actions);
        if (result.data.reviews) setReviews(result.data.reviews);
      } else {
        const dataPayload = {
          version: '2.0',
          syncedAt: new Date().toISOString(),
          mode: 'offline',
          horizonItems: horizonItemsRef.current,
          projects: projectsRef.current,
          actions: actionsRef.current,
          reviews: reviewsRef.current,
        };
        await writeDataToFileHandle(result.handle, dataPayload);
      }

      const now = new Date();
      setLastOfflineSyncTime(now);
      localStorage.setItem('gtd_last_offline_sync_time', now.toISOString());
      return true;
    } catch (err) {
      console.error('Failed to link local file:', err);
      return false;
    }
  }, []);

  const unlinkLocalFile = useCallback(() => {
    linkedFileHandleRef.current = null;
    setLinkedFileName(null);
    localStorage.removeItem('gtd_linked_file_name');
  }, []);

  const exportCSV = useCallback((type: 'all' | 'actions' | 'projects' | 'horizons') => {
    const dateStr = new Date().toISOString().split('T')[0];
    const liveActions = actionsRef.current;
    const liveProjects = projectsRef.current;
    const liveHorizons = horizonItemsRef.current;
    const liveReviews = reviewsRef.current;

    if (type === 'actions') {
      const csv = generateActionsCSV(liveActions, liveProjects);
      triggerFileDownload(csv, `gtd-actions-${dateStr}.csv`, 'text/csv;charset=utf-8');
    } else if (type === 'projects') {
      const csv = generateProjectsCSV(liveProjects, liveHorizons);
      triggerFileDownload(csv, `gtd-projects-${dateStr}.csv`, 'text/csv;charset=utf-8');
    } else if (type === 'horizons') {
      const csv = generateHorizonsCSV(liveHorizons);
      triggerFileDownload(csv, `gtd-horizons-${dateStr}.csv`, 'text/csv;charset=utf-8');
    } else {
      const csv = generateAllInOneCSV(liveActions, liveProjects, liveHorizons, liveReviews);
      triggerFileDownload(csv, `gtd-master-spreadsheet-${dateStr}.csv`, 'text/csv;charset=utf-8');
    }
    const now = new Date();
    setLastOfflineSyncTime(now);
    localStorage.setItem('gtd_last_offline_sync_time', now.toISOString());
  }, []);

  const importCSV = useCallback((csvText: string) => {
    const result = parseAndImportCSV(csvText, projects);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    if (result.type === 'actions' && result.importedActions) {
      setActions((prev) => {
        const next = [...result.importedActions!, ...prev];
        syncImmediateLocalChange({ actions: next });
        return next;
      });
      const now = new Date();
      setLastOfflineSyncTime(now);
      localStorage.setItem('gtd_last_offline_sync_time', now.toISOString());
      return { success: true, message: result.message };
    }

    if (result.type === 'projects' && result.importedProjects) {
      setProjects((prev) => {
        const next = [...result.importedProjects!, ...prev];
        syncImmediateLocalChange({ projects: next });
        return next;
      });
      const now = new Date();
      setLastOfflineSyncTime(now);
      localStorage.setItem('gtd_last_offline_sync_time', now.toISOString());
      return { success: true, message: result.message };
    }

    return { success: false, message: 'Unrecognized CSV format.' };
  }, [projects]);

  // Sync to Google Sheets with Safe Multi-Device Conflict Detection
  const syncToSheetRef = useRef<(() => Promise<void>) | null>(null);
  const isSyncInProgressRef = useRef<boolean>(false);

  const syncNow = useCallback(async () => {
    if (syncMode === 'offline') {
      await syncToOfflineNow();
      return;
    }

    if (!user || !user.accessToken) {
      return;
    }

    if (user.isExpired || !isTokenValid(user)) {
      setSyncError('Google session expired. Please re-authenticate to sync.');
      setAuthError('Your Google session has expired. Click below to reconnect.');
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, isExpired: true };
        saveGoogleUser(updated);
        return updated;
      });
      return;
    }

    if (isSyncInProgressRef.current) {
      return;
    }

    const syncStartedAt = Date.now();
    isSyncInProgressRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      let targetSheetId = sheetId;
      let targetSheetTitle = sheetTitle || DEFAULT_SPREADSHEET_TITLE;

      if (!targetSheetId) {
        const sheetMeta = await findOrCreateGTDSpreadsheet(user.accessToken, user.email);
        targetSheetId = sheetMeta.spreadsheetId;
        targetSheetTitle = sheetMeta.title;
        setSheetId(sheetMeta.spreadsheetId);
        setSheetUrl(sheetMeta.spreadsheetUrl);
        setSheetTitle(sheetMeta.title);
      }

      // Always read the live in-memory dataset so local changes reflect immediately
      let payloadData: {
        horizons: HorizonItem[];
        projects: GTDProject[];
        actions: GTDAction[];
        reviews: WeeklyReviewRecord[];
      } = {
        horizons: horizonItemsRef.current,
        projects: projectsRef.current,
        actions: actionsRef.current,
        reviews: reviewsRef.current,
      };

      // 1. Fetch remote dataset from Google Sheet
      const remoteDataset = await fetchGTDDataFromSheet(user.accessToken, targetSheetId);

      if (remoteDataset && remoteDataset.sheetExists) {
        // 2. Intelligent merge of remote sheet data with local dataset
        const { merged, remoteChangesCount } = mergeGTDDatasets(
          payloadData,
          remoteDataset,
          lastSyncTime,
          tombstonesRef.current
        );

        // Protect any local edits or items that were modified while network fetch was in-flight
        const currentActions = actionsRef.current;
        const currentProjects = projectsRef.current;
        const currentHorizons = horizonItemsRef.current;
        const currentReviews = reviewsRef.current;

        const resolvedActions = merged.actions.map((m) => {
          const localMatch = currentActions.find((c) => c.id === m.id);
          if (localMatch) {
            const localTime = Math.max(
              new Date(localMatch.updatedAt || 0).getTime(),
              new Date(localMatch.completedAt || 0).getTime()
            );
            if (localTime >= syncStartedAt) {
              return localMatch;
            }
          }
          return m;
        });
        for (const c of currentActions) {
          if (!resolvedActions.some((r) => r.id === c.id)) {
            resolvedActions.push(c);
          }
        }

        const resolvedProjects = merged.projects.map((m) => {
          const localMatch = currentProjects.find((c) => c.id === m.id);
          if (localMatch) {
            const localTime = Math.max(
              new Date(localMatch.updatedAt || 0).getTime(),
              new Date(localMatch.completedAt || 0).getTime()
            );
            if (localTime >= syncStartedAt) {
              return localMatch;
            }
          }
          return m;
        });
        for (const c of currentProjects) {
          if (!resolvedProjects.some((r) => r.id === c.id)) {
            resolvedProjects.push(c);
          }
        }

        const resolvedHorizons = merged.horizons.map((m) => {
          const localMatch = currentHorizons.find((c) => c.id === m.id);
          if (localMatch) {
            const localTime = Math.max(
              new Date(localMatch.updatedAt || 0).getTime(),
              new Date(localMatch.lastReviewedAt || 0).getTime()
            );
            if (localTime >= syncStartedAt) {
              return localMatch;
            }
          }
          return m;
        });
        for (const c of currentHorizons) {
          if (!resolvedHorizons.some((r) => r.id === c.id)) {
            resolvedHorizons.push(c);
          }
        }

        const resolvedReviews = merged.reviews.slice();
        for (const c of currentReviews) {
          if (!resolvedReviews.some((r) => r.id === c.id)) {
            resolvedReviews.push(c);
          }
        }

        payloadData = {
          horizons: resolvedHorizons,
          projects: resolvedProjects,
          actions: resolvedActions,
          reviews: resolvedReviews,
        };

        // If remote had updates from other devices, update local state safely without clobbering local changes
        if (remoteChangesCount > 0) {
          isApplyingExternalUpdate.current = true;
          horizonItemsRef.current = resolvedHorizons;
          projectsRef.current = resolvedProjects;
          actionsRef.current = resolvedActions;
          reviewsRef.current = resolvedReviews;

          setHorizonItems(resolvedHorizons);
          setProjects(resolvedProjects);
          setActions(resolvedActions);
          setReviews(resolvedReviews);
          setTimeout(() => {
            isApplyingExternalUpdate.current = false;
          }, 100);

          setSyncConflictNotice({
            message: `Fetched and integrated ${remoteChangesCount} update${remoteChangesCount > 1 ? 's' : ''} from Google Sheet.`,
            remoteTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            changesCount: remoteChangesCount,
          });
        }
      }

      // 3. Write unified data to the sheet in the background
      const res = await saveGTDDataToSheet(
        user.accessToken, 
        targetSheetId, 
        user.email, 
        payloadData, 
        targetSheetTitle
      );

      setLastSyncTime(new Date(res.syncedAt));
      setSheetUrl(res.spreadsheetUrl);
      setSyncError(null);

      // If user performed further local changes while sync was processing, queue next background sync
      if (lastLocalMutationTimestampRef.current > syncStartedAt) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          if (syncToSheetRef.current && !isSyncInProgressRef.current) {
            syncToSheetRef.current();
          }
        }, 2500);
      }
    } catch (err: any) {
      console.error('Google Sheets Sync failed:', err);
      const isAuthProblem =
        err instanceof GoogleApiAuthError ||
        err?.isAuthError ||
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('UNAUTHENTICATED') ||
        err?.message?.includes('invalid credentials') ||
        err?.message?.includes('invalid authentication credentials');

      if (isAuthProblem) {
        setSyncError('Google session expired. Click to re-authenticate.');
        setAuthError('Your Google session has expired. Please re-authenticate to continue syncing to Google Sheets.');
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, isExpired: true };
          saveGoogleUser(updated);
          return updated;
        });
      } else {
        setSyncError(err.message || 'Failed to sync to Google Sheets');
      }
    } finally {
      setIsSyncing(false);
      isSyncInProgressRef.current = false;
    }
  }, [user, sheetId, sheetTitle, horizonItems, projects, actions, reviews, lastSyncTime]);

  syncToSheetRef.current = syncNow;

  // Debounced auto-sync to Google Sheets on data mutations
  const isInitialMount = useRef(true);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (syncMode === 'offline') {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        syncToOfflineNow();
      }, 1500);
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }

    if (!autoSyncEnabled) return;
    if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;
    if (isApplyingExternalUpdate.current || isSyncInProgressRef.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (syncToSheetRef.current && !isSyncInProgressRef.current) {
        syncToSheetRef.current();
      }
    }, 2500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [horizonItems, projects, actions, reviews, user?.accessToken, user?.isExpired, autoSyncEnabled, syncMode, syncToOfflineNow]);

  // Startup Sync: When a signed-in user opens or returns to the app, pull changes from Google Sheet
  const hasPerformedStartupSync = useRef<boolean>(false);
  useEffect(() => {
    if (hasPerformedStartupSync.current) return;
    if (syncMode === 'offline') return;
    if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;

    hasPerformedStartupSync.current = true;
    const timer = setTimeout(() => {
      if (syncToSheetRef.current && !isSyncInProgressRef.current) {
        syncToSheetRef.current();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [user?.email, user?.accessToken, user?.isExpired, syncMode]);

  // Multi-Device Background Sync Listeners:
  // 1. Regular periodic check (every 45s) using lightweight metadata check
  // 2. Full periodic sync fallback every 3 minutes
  // 3. Immediate check when window or tab gains focus / becomes visible
  // 4. Immediate check when device reconnects to network
  useEffect(() => {
    if (syncMode === 'offline') return;
    if (!autoSyncEnabled) return;
    if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;

    // Periodic check (every 45 seconds) using lightweight metadata
    const checkInterval = setInterval(async () => {
      if (isSyncInProgressRef.current) return;
      if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;

      try {
        const targetSheetId = sheetId;
        if (targetSheetId) {
          const meta = await checkRemoteSheetMetadata(user.accessToken, targetSheetId);
          if (meta && meta.lastSyncedAt) {
            const remoteTime = new Date(meta.lastSyncedAt).getTime();
            const localTime = lastSyncTime ? new Date(lastSyncTime).getTime() : 0;
            // If remote sheet was synced from another device more recently than this device's last sync
            if (remoteTime > localTime) {
              if (syncToSheetRef.current && !isSyncInProgressRef.current) {
                await syncToSheetRef.current();
              }
            }
          }
        }
      } catch (e) {
        console.warn('Periodic sheet check notice:', e);
      }
    }, 45000);

    // Full periodic sync fallback every 3 minutes (catches external edits even if Meta was unchanged)
    const fullFallbackInterval = setInterval(() => {
      if (syncToSheetRef.current && !isSyncInProgressRef.current) {
        syncToSheetRef.current();
      }
    }, 180000);

    // Window focus / visibility change handler: sync when returning to the tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;
      if (isSyncInProgressRef.current) return;

      const now = Date.now();
      const lastSync = lastSyncTime ? new Date(lastSyncTime).getTime() : 0;
      // If at least 15 seconds have elapsed since last sync, pull new changes
      if (now - lastSync > 15000) {
        if (syncToSheetRef.current && !isSyncInProgressRef.current) {
          syncToSheetRef.current();
        }
      }
    };

    // Online event handler: sync as soon as network returns
    const handleOnline = () => {
      if (syncToSheetRef.current && !isSyncInProgressRef.current) {
        syncToSheetRef.current();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(checkInterval);
      clearInterval(fullFallbackInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [user?.accessToken, user?.isExpired, sheetId, lastSyncTime, autoSyncEnabled, syncMode]);

  // Switch Active Spreadsheet
  const switchSpreadsheet = useCallback(async (newSheetId: string, customTitle?: string) => {
    if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const details = await getSpreadsheetDetails(user.accessToken, newSheetId);
      const chosenTitle = customTitle || details.title || DEFAULT_SPREADSHEET_TITLE;

      // Ensure GTD tabs exist
      await setupGTDSheetsStructure(user.accessToken, newSheetId, user.email, details.sheets);

      setSheetId(newSheetId);
      setSheetTitle(chosenTitle);
      setSheetUrl(details.url);

      // Attempt to load existing data from chosen sheet
      const sheetData = await fetchGTDDataFromSheet(user.accessToken, newSheetId);
      if (sheetData) {
        if (sheetData.horizons && sheetData.horizons.length > 0) setHorizonItems(sheetData.horizons);
        if (sheetData.projects && sheetData.projects.length > 0) setProjects(sheetData.projects);
        if (sheetData.actions && sheetData.actions.length > 0) setActions(sheetData.actions);
        if (sheetData.reviews && sheetData.reviews.length > 0) setReviews(sheetData.reviews);
        if (sheetData.lastSyncedAt) setLastSyncTime(new Date(sheetData.lastSyncedAt));
      } else {
        // Virgin sheet, save current dataset into it
        await saveGTDDataToSheet(user.accessToken, newSheetId, user.email, {
          horizons: horizonItemsRef.current,
          projects: projectsRef.current,
          actions: actionsRef.current,
          reviews: reviewsRef.current,
        }, chosenTitle);
        setLastSyncTime(new Date());
      }

      await refreshAvailableSheets();
    } catch (err: any) {
      console.error('Error switching spreadsheet:', err);
      setSyncError(err.message || 'Failed to switch spreadsheet');
    } finally {
      setIsSyncing(false);
    }
  }, [user, refreshAvailableSheets]);

  // Create a brand new named Google Spreadsheet
  const createNewSpreadsheet = useCallback(async (title: string) => {
    if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const created = await createNamedGTDSpreadsheet(user.accessToken, title, user.email);
      setSheetId(created.spreadsheetId);
      setSheetTitle(created.title);
      setSheetUrl(created.spreadsheetUrl);

      // Seed newly created sheet with current live data
      await saveGTDDataToSheet(user.accessToken, created.spreadsheetId, user.email, {
        horizons: horizonItemsRef.current,
        projects: projectsRef.current,
        actions: actionsRef.current,
        reviews: reviewsRef.current,
      }, created.title);

      setLastSyncTime(new Date());
      await refreshAvailableSheets();
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      setSyncError(err.message || 'Failed to create new spreadsheet');
    } finally {
      setIsSyncing(false);
    }
  }, [user, refreshAvailableSheets]);

  // Connect to an existing spreadsheet by URL or ID
  const connectExistingSpreadsheet = useCallback(async (urlOrId: string) => {
    const extractedId = extractSpreadsheetId(urlOrId);
    if (!extractedId) {
      setSyncError('Invalid Google Sheets URL or ID. Please check the link.');
      return;
    }

    await switchSpreadsheet(extractedId);
  }, [switchSpreadsheet]);

  // Initial load from Google Sheet when user signs in
  const reloadFromSheet = useCallback(async () => {
    if (!user?.accessToken || user?.isExpired || !isTokenValid(user)) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      let targetSheetId = sheetId;
      let targetSheetTitle = sheetTitle;

      if (!targetSheetId) {
        const sheetMeta = await findOrCreateGTDSpreadsheet(user.accessToken, user.email);
        targetSheetId = sheetMeta.spreadsheetId;
        targetSheetTitle = sheetMeta.title;
        setSheetId(sheetMeta.spreadsheetId);
        setSheetUrl(sheetMeta.spreadsheetUrl);
        setSheetTitle(sheetMeta.title);
      }

      const sheetData = await fetchGTDDataFromSheet(user.accessToken, targetSheetId);
      if (sheetData) {
        const payloadData = {
          horizons: horizonItemsRef.current,
          projects: projectsRef.current,
          actions: actionsRef.current,
          reviews: reviewsRef.current,
        };
        const { merged } = mergeGTDDatasets(
          payloadData,
          sheetData,
          lastSyncTime,
          tombstonesRef.current
        );
        isApplyingExternalUpdate.current = true;
        setHorizonItems(merged.horizons);
        setProjects(merged.projects);
        setActions(merged.actions);
        setReviews(merged.reviews);
        setTimeout(() => {
          isApplyingExternalUpdate.current = false;
        }, 100);

        if (sheetData.lastSyncedAt) {
          setLastSyncTime(new Date(sheetData.lastSyncedAt));
        } else {
          setLastSyncTime(new Date());
        }
      } else {
        // Sheet is virgin, seed it with current user data
        await saveGTDDataToSheet(user.accessToken, targetSheetId, user.email, {
          horizons: horizonItemsRef.current,
          projects: projectsRef.current,
          actions: actionsRef.current,
          reviews: reviewsRef.current,
        }, targetSheetTitle || DEFAULT_SPREADSHEET_TITLE);
        setLastSyncTime(new Date());
      }

      refreshAvailableSheets();
    } catch (err: any) {
      console.error('Error connecting to user Google Sheet:', err);
      const isAuthProblem =
        err instanceof GoogleApiAuthError ||
        err?.isAuthError ||
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('UNAUTHENTICATED') ||
        err?.message?.includes('invalid credentials') ||
        err?.message?.includes('invalid authentication credentials');

      if (isAuthProblem) {
        setSyncError('Google session expired. Click to re-authenticate.');
        setAuthError('Your Google session has expired. Please re-authenticate to connect your Google Sheet.');
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, isExpired: true };
          saveGoogleUser(updated);
          return updated;
        });
      } else {
        setSyncError(err.message || 'Failed to connect to Google Sheet');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, sheetId, sheetTitle, horizonItems, projects, actions, reviews, refreshAvailableSheets]);

  // Sign in with Google
  const signInWithGoogle = async (promptConsent = false) => {
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      const loggedUser = await requestGoogleLogin(promptConsent);
      setUser(loggedUser);
      setIsGuestMode(false);
      localStorage.removeItem('gtd_guest_mode');
      setAuthModalOpen(false);

      // Load this user's local cache
      loadUserPartition(loggedUser.email);

      // Fetch & sync Google Sheet
      setTimeout(() => {
        reloadFromSheet();
      }, 100);
    } catch (err: any) {
      if (err?.isCancellation) {
        console.info('Google sign-in popup was dismissed by user.');
        setAuthError('Sign-in cancelled. Click to try again when you are ready.');
      } else {
        console.error('Sign-in error:', err);
        setAuthError(err.message || 'Unable to sign in with Google');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signOut = () => {
    saveGoogleUser(null);
    setUser(null);
    setSheetId(null);
    setSheetTitle(DEFAULT_SPREADSHEET_TITLE);
    setSheetUrl(null);
    setLastSyncTime(null);
    setIsGuestMode(true);
    localStorage.setItem('gtd_guest_mode', 'true');
    loadUserPartition(); // Load guest cache
  };

  const continueAsGuest = () => {
    setIsGuestMode(true);
    localStorage.setItem('gtd_guest_mode', 'true');
    setAuthModalOpen(false);
    loadUserPartition();
  };

  // Horizon Actions
  const addHorizonItem = (item: Omit<HorizonItem, 'id' | 'createdAt'>): string => {
    const id = `h${item.level}-${Date.now()}`;
    const now = new Date().toISOString();
    const newItem: HorizonItem = {
      ...item,
      id,
      createdAt: now.split('T')[0],
      updatedAt: now,
      status: item.status || 'active',
    };
    setHorizonItems((prev) => {
      const next = [newItem, ...prev];
      syncImmediateLocalChange({ horizons: next });
      return next;
    });
    return id;
  };

  const updateHorizonItem = (id: string, updates: Partial<HorizonItem>) => {
    setHorizonItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      );
      syncImmediateLocalChange({ horizons: next });
      return next;
    });
  };

  const deleteHorizonItem = (id: string) => {
    recordTombstone(id);
    let nextHorizons: HorizonItem[] = [];
    setHorizonItems((prev) => {
      // Also unlink child horizon items that pointed to this id
      nextHorizons = prev
        .filter((item) => item.id !== id)
        .map((item) => (item.parentId === id ? { ...item, parentId: undefined, updatedAt: new Date().toISOString() } : item));
      return nextHorizons;
    });
    // Also unlink projects that were linked to this horizon goal/area
    setProjects((prev) => {
      const nextProjects = prev.map((p) => {
        if (p.goalId === id || p.areaId === id) {
          return {
            ...p,
            goalId: p.goalId === id ? undefined : p.goalId,
            areaId: p.areaId === id ? undefined : p.areaId,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      syncImmediateLocalChange({ horizons: nextHorizons, projects: nextProjects });
      return nextProjects;
    });
  };

  // Project Actions
  const addProject = (project: Omit<GTDProject, 'id' | 'createdAt'>, initialActionTitle?: string): string => {
    const id = `proj-${Date.now()}`;
    const now = new Date().toISOString();
    const newProject: GTDProject = {
      ...project,
      id,
      createdAt: now.split('T')[0],
      updatedAt: now,
      status: project.status || 'active',
      priority: project.priority || 'medium',
    };

    let nextActionsSnapshot: GTDAction[] | undefined;
    if (initialActionTitle && initialActionTitle.trim()) {
      const newAction: GTDAction = {
        id: `act-${Date.now()}`,
        title: initialActionTitle.trim(),
        projectId: id,
        tags: [],
        type: 'action',
        completed: false,
        priority: project.priority || 'medium',
        createdAt: now.split('T')[0],
        updatedAt: now,
      };
      setActions((prev) => {
        const next = [newAction, ...prev];
        nextActionsSnapshot = next;
        return next;
      });
    }

    setProjects((prev) => {
      const next = [newProject, ...prev];
      syncImmediateLocalChange({
        projects: next,
        ...(nextActionsSnapshot ? { actions: nextActionsSnapshot } : {}),
      });
      return next;
    });

    return id;
  };

  const updateProject = (id: string, updates: Partial<GTDProject>) => {
    const now = new Date().toISOString();
    setProjects((prev) => {
      const next = prev.map((proj) => {
        if (proj.id === id) {
          const updated = { ...proj, ...updates, updatedAt: now };
          if (updates.status === 'completed' && proj.status !== 'completed') {
            updated.completedAt = now;
          }
          return updated;
        }
        return proj;
      });
      syncImmediateLocalChange({ projects: next });
      return next;
    });
  };

  const deleteProject = (id: string) => {
    recordTombstone(id);
    let nextProjects: GTDProject[] = [];
    setProjects((prev) => {
      nextProjects = prev.filter((proj) => proj.id !== id);
      return nextProjects;
    });
    // Also unlink actions attached to this project (or keep them as standalone next actions)
    setActions((prev) => {
      const nextActions = prev.map((act) =>
        act.projectId === id ? { ...act, projectId: undefined, updatedAt: new Date().toISOString() } : act
      );
      syncImmediateLocalChange({ projects: nextProjects, actions: nextActions });
      return nextActions;
    });
  };

  const restoreProject = (project: GTDProject, linkedActionIds: string[] = []) => {
    let nextProjects: GTDProject[] = [];
    setProjects((prev) => {
      nextProjects = [project, ...prev.filter((p) => p.id !== project.id)];
      return nextProjects;
    });
    if (linkedActionIds.length > 0) {
      setActions((prev) => {
        const nextActions = prev.map((act) =>
          linkedActionIds.includes(act.id) ? { ...act, projectId: project.id, updatedAt: new Date().toISOString() } : act
        );
        syncImmediateLocalChange({ projects: nextProjects, actions: nextActions });
        return nextActions;
      });
    } else {
      syncImmediateLocalChange({ projects: nextProjects });
    }
  };

  const toggleProjectStatus = (id: string, status: GTDProject['status']) => {
    updateProject(id, { status });
  };

  // Action Actions
  const addAction = (action: Omit<GTDAction, 'id' | 'createdAt' | 'completed'>): string => {
    const id = `act-${Date.now()}`;
    const now = new Date().toISOString();
    const newAction: GTDAction = {
      ...action,
      tags: action.tags || [],
      id,
      completed: false,
      createdAt: now.split('T')[0],
      updatedAt: now,
    };
    setActions((prev) => {
      const next = [newAction, ...prev];
      syncImmediateLocalChange({ actions: next });
      return next;
    });
    return id;
  };

  const updateAction = (id: string, updates: Partial<GTDAction>) => {
    const now = new Date().toISOString();
    setActions((prev) => {
      const next = prev.map((act) => {
        if (act.id === id) {
          const updated = { ...act, ...updates, updatedAt: now };
          if (updates.completed === true && !act.completed) {
            updated.completedAt = now;
          } else if (updates.completed === false) {
            updated.completedAt = undefined;
          }
          return updated;
        }
        return act;
      });
      syncImmediateLocalChange({ actions: next });
      return next;
    });
  };

  const deleteAction = (id: string) => {
    recordTombstone(id);
    setActions((prev) => {
      const next = prev.filter((act) => act.id !== id);
      syncImmediateLocalChange({ actions: next });
      return next;
    });
  };

  const toggleActionComplete = (id: string) => {
    const now = new Date().toISOString();
    const todayStr = formatDateKey(new Date());

    setActions((prev) => {
      const next = prev.map((act) => {
        if (act.id === id) {
          if (act.isRecurring && act.recurrence) {
            const currentHistory = act.completionHistory || [];
            const isCompletedToday = currentHistory.includes(todayStr);
            const newHistory = isCompletedToday
              ? currentHistory.filter((d) => d !== todayStr)
              : [...currentHistory, todayStr];

            const streakInfo = getActionStreakInfo({ ...act, completionHistory: newHistory });
            return {
              ...act,
              completionHistory: newHistory,
              streakCount: streakInfo.currentStreak,
              bestStreak: Math.max(act.bestStreak || 0, streakInfo.bestStreak),
              completed: streakInfo.isPeriodTargetMet,
              completedAt: !isCompletedToday ? now : undefined,
              updatedAt: now,
            };
          }

          const nextCompleted = !act.completed;
          return {
            ...act,
            completed: nextCompleted,
            completedAt: nextCompleted ? now : undefined,
            updatedAt: now,
          };
        }
        return act;
      });
      syncImmediateLocalChange({ actions: next });
      return next;
    });
  };

  const logRecurringCompletion = (id: string, dateStr?: string) => {
    const now = new Date().toISOString();
    const targetDateStr = dateStr || formatDateKey(new Date());

    setActions((prev) => {
      const next = prev.map((act) => {
        if (act.id === id && act.isRecurring && act.recurrence) {
          const currentHistory = act.completionHistory || [];
          const isDone = currentHistory.includes(targetDateStr);
          const newHistory = isDone
            ? currentHistory.filter((d) => d !== targetDateStr)
            : [...currentHistory, targetDateStr];

          const streakInfo = getActionStreakInfo({ ...act, completionHistory: newHistory });
          return {
            ...act,
            completionHistory: newHistory,
            streakCount: streakInfo.currentStreak,
            bestStreak: Math.max(act.bestStreak || 0, streakInfo.bestStreak),
            completed: streakInfo.isPeriodTargetMet,
            completedAt: !isDone ? now : undefined,
            updatedAt: now,
          };
        }
        return act;
      });
      syncImmediateLocalChange({ actions: next });
      return next;
    });
  };

  const convertInboxItem = (
    inboxId: string,
    conversion: {
      type: ActionType;
      title?: string;
      projectId?: string;
      tags?: string[];
      context?: string;
      energy?: GTDAction['energy'];
      timeEstimate?: GTDAction['timeEstimate'];
      delegatedTo?: string;
      delegatedDate?: string;
      followUpDate?: string;
      newProjectData?: {
        title: string;
        desiredOutcome: string;
        areaId?: string;
        goalId?: string;
      };
    }
  ) => {
    let targetProjectId = conversion.projectId;

    if (conversion.newProjectData) {
      targetProjectId = addProject({
        title: conversion.newProjectData.title,
        desiredOutcome: conversion.newProjectData.desiredOutcome,
        areaId: conversion.newProjectData.areaId,
        goalId: conversion.newProjectData.goalId,
        status: 'active',
        priority: 'medium',
      });
    }

    const now = new Date().toISOString();
    setActions((prev) => {
      const next = prev.map((act) => {
        if (act.id === inboxId) {
          return {
            ...act,
            type: conversion.type,
            title: conversion.title || act.title,
            projectId: targetProjectId,
            tags: conversion.tags !== undefined ? conversion.tags : act.tags,
            context: conversion.context || act.context,
            energy: conversion.energy || act.energy,
            timeEstimate: conversion.timeEstimate || act.timeEstimate,
            delegatedTo: conversion.delegatedTo,
            delegatedDate: conversion.delegatedDate,
            followUpDate: conversion.followUpDate,
            updatedAt: now,
          };
        }
        return act;
      });
      syncImmediateLocalChange({ actions: next });
      return next;
    });
  };

  // Review Actions
  const recordWeeklyReview = (record: Omit<WeeklyReviewRecord, 'id'>) => {
    const id = `rev-${Date.now()}`;
    const newRecord: WeeklyReviewRecord = {
      ...record,
      id,
    };
    setReviews((prev) => {
      const next = [newRecord, ...prev];
      syncImmediateLocalChange({ reviews: next });
      return next;
    });
  };

  const deleteReview = (id: string) => {
    recordTombstone(id);
    setReviews((prev) => {
      const next = prev.filter((r) => r.id !== id);
      syncImmediateLocalChange({ reviews: next });
      return next;
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setHorizonItems(INITIAL_HORIZON_ITEMS);
    setProjects(INITIAL_PROJECTS);
    setActions(INITIAL_ACTIONS);
    setReviews(INITIAL_REVIEWS);
    localStorage.removeItem(`${storageKey}_horizons`);
    localStorage.removeItem(`${storageKey}_projects`);
    localStorage.removeItem(`${storageKey}_actions`);
    localStorage.removeItem(`${storageKey}_reviews`);
    syncImmediateLocalChange({
      horizons: INITIAL_HORIZON_ITEMS,
      projects: INITIAL_PROJECTS,
      actions: INITIAL_ACTIONS,
      reviews: INITIAL_REVIEWS,
    });
  };

  // Export Data
  const exportData = () => {
    const data = {
      version: '2.0',
      userEmail: user?.email || 'guest',
      exportedAt: new Date().toISOString(),
      horizonItems,
      projects,
      actions,
      reviews,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `gtd_backup_${user?.email ? user.email.split('@')[0] + '_' : ''}${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Data
  const importData = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.horizonItems && parsed.projects && parsed.actions) {
        const nextActions = normalizeActions(parsed.actions);
        setHorizonItems(parsed.horizonItems);
        setProjects(parsed.projects);
        setActions(nextActions);
        if (parsed.reviews) setReviews(parsed.reviews);
        syncImmediateLocalChange({
          horizons: parsed.horizonItems,
          projects: parsed.projects,
          actions: nextActions,
          reviews: parsed.reviews || reviews,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // All Unique Tags across actions and suggestions
  const allTags = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => {
      a.tags?.forEach((t) => {
        if (t && t.trim()) set.add(t.trim());
      });
    });
    DEFAULT_SUGGESTED_TAGS.forEach((t) => set.add(t));
    return Array.from(set);
  }, [actions]);

  // Metrics and Computed values
  const getProjectActions = (projectId: string) => {
    return actions.filter((act) => act.projectId === projectId);
  };

  const stalledProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (proj.status !== 'active') return false;
      const projActions = actions.filter((act) => act.projectId === proj.id);
      return isProjectStalled(proj, projActions);
    });
  }, [projects, actions]);

  const nextActionsCount = useMemo(() => {
    return actions.filter((act) => act.type === 'action' && !act.completed).length;
  }, [actions]);

  const inboxCount = useMemo(() => {
    return actions.filter((act) => act.type === 'inbox' && !act.completed).length;
  }, [actions]);

  const waitingForCount = useMemo(() => {
    return actions.filter((act) => act.type === 'waiting-for' && !act.completed).length;
  }, [actions]);

  const somedayCount = useMemo(() => {
    return actions.filter((act) => act.type === 'someday-maybe' && !act.completed).length;
  }, [actions]);

  const lastReviewDate = useMemo(() => {
    if (reviews.length === 0) return null;
    const sorted = [...reviews].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return new Date(sorted[0].completedAt);
  }, [reviews]);

  const daysSinceLastReview = useMemo(() => {
    if (!lastReviewDate) return 999;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastReviewDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [lastReviewDate]);

  const isReviewDue = daysSinceLastReview >= 7;

  const getHorizonChildren = (horizonId: string) => {
    const subHorizons = horizonItems.filter((item) => item.parentId === horizonId);
    const linkedProjects = projects.filter((proj) => proj.goalId === horizonId || proj.areaId === horizonId);
    return { subHorizons, projects: linkedProjects };
  };

  return (
    <GTDContext.Provider
      value={{
        user,
        isAuthLoading,
        authError,
        isGuestMode,
        isSyncing,
        lastSyncTime,
        sheetUrl,
        sheetId,
        sheetTitle,
        syncError,
        availableSheets,
        isFetchingSheets,
        autoSyncEnabled,
        syncConflictNotice,
        signInWithGoogle,
        signOut,
        continueAsGuest,
        syncNow,
        reloadFromSheet,
        refreshAvailableSheets,
        switchSpreadsheet,
        createNewSpreadsheet,
        connectExistingSpreadsheet,
        setAutoSyncEnabled,
        dismissSyncConflict,
        syncMode,
        setSyncMode,
        lastOfflineSyncTime,
        linkedFileName,
        isFileSystemSupported,
        linkLocalFile,
        unlinkLocalFile,
        syncToOfflineNow,
        exportCSV,
        importCSV,
        horizonItems,
        projects,
        actions,
        reviews,
        activeTab,
        searchQuery,
        searchModalOpen,
        quickCaptureOpen,
        weeklyReviewOpen,
        mindSweepOpen,
        authModalOpen,
        installModalOpen,
        clarifyModalItem,
        selectedProjectId,
        selectedHorizonId,
        setActiveTab,
        setSearchQuery,
        setSearchModalOpen,
        setQuickCaptureOpen,
        setWeeklyReviewOpen,
        setMindSweepOpen,
        setAuthModalOpen,
        setInstallModalOpen,
        setClarifyModalItem,
        setSelectedProjectId,
        setSelectedHorizonId,
        addHorizonItem,
        updateHorizonItem,
        deleteHorizonItem,
        addProject,
        updateProject,
        deleteProject,
        restoreProject,
        toggleProjectStatus,
        addAction,
        updateAction,
        deleteAction,
        toggleActionComplete,
        logRecurringCompletion,
        convertInboxItem,
        recordWeeklyReview,
        deleteReview,
        resetToDefaults,
        exportData,
        importData,
        allTags,
        stalledProjects,
        nextActionsCount,
        inboxCount,
        waitingForCount,
        somedayCount,
        lastReviewDate,
        daysSinceLastReview,
        isReviewDue,
        getProjectActions,
        getHorizonChildren,
      }}
    >
      {children}
    </GTDContext.Provider>
  );
};

export const useGTD = () => {
  const context = useContext(GTDContext);
  if (!context) {
    throw new Error('useGTD must be used within a GTDProvider');
  }
  return context;
};
