import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import { 
  HorizonItem, 
  GTDProject, 
  GTDAction, 
  WeeklyReviewRecord, 
  ActiveTab,
  ActionType,
  DriveSpreadsheetItem
} from '../types/gtd';
import { getActionStreakInfo, formatDateKey } from '../utils/streakUtils';
import { isProjectStalled } from '../utils/projectUtils';
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
      return saved ? JSON.parse(saved) : INITIAL_ACTIONS;
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

  // Cross-Tab Broadcast Channel initialization
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isApplyingExternalUpdate = useRef<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.senderId === tabSessionId.current) return;

          if (msg.type === 'DATA_UPDATE' && msg.storageKey === storageKey) {
            isApplyingExternalUpdate.current = true;
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
            }, 50);
          }
        };

        return () => {
          channel.close();
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }
  }, [storageKey]);

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

      // Broadcast changes to any other open browser tabs
      if (!isApplyingExternalUpdate.current && broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'DATA_UPDATE',
          senderId: tabSessionId.current,
          storageKey,
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
    } catch (e) {
      console.error('Failed to save to localStorage / broadcast:', e);
    }
  }, [horizonItems, projects, actions, reviews, lastSyncTime, sheetId, sheetTitle, sheetUrl, storageKey]);

  // Handle User Partition Switching
  const loadUserPartition = useCallback((userEmail?: string) => {
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
      setActions(savedA ? JSON.parse(savedA) : INITIAL_ACTIONS);
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

  // Sync to Google Sheets with Safe Multi-Device Conflict Detection
  const syncToSheetRef = useRef<(() => Promise<void>) | null>(null);
  const isSyncInProgressRef = useRef<boolean>(false);

  const syncNow = useCallback(async () => {
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

      // 1. ALWAYS FETCH FROM SHEET FIRST: Retrieve latest remote state & changes since last sync
      const remoteDataset = await fetchGTDDataFromSheet(user.accessToken, targetSheetId);

      let payloadData: {
        horizons: HorizonItem[];
        projects: GTDProject[];
        actions: GTDAction[];
        reviews: WeeklyReviewRecord[];
      } = {
        horizons: horizonItems,
        projects,
        actions,
        reviews,
      };

      if (remoteDataset && remoteDataset.sheetExists) {
        // 2. INTELLIGENT MERGE: Merge remote modifications with any local changes made since last sync
        const { merged, remoteChangesCount } = mergeGTDDatasets(
          payloadData,
          remoteDataset,
          lastSyncTime
        );
        payloadData = merged;

        // Apply merged results into local React state immediately
        isApplyingExternalUpdate.current = true;
        setHorizonItems(merged.horizons);
        setProjects(merged.projects);
        setActions(merged.actions);
        setReviews(merged.reviews);
        setTimeout(() => {
          isApplyingExternalUpdate.current = false;
        }, 100);

        if (remoteChangesCount > 0) {
          setSyncConflictNotice({
            message: `Fetched and integrated ${remoteChangesCount} change${remoteChangesCount > 1 ? 's' : ''} from Google Sheet.`,
            remoteTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            changesCount: remoteChangesCount,
          });
        }
      }

      // 3. ONLY THEN WRITE TO THE SHEET: Save the unified merged dataset
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
  }, [horizonItems, projects, actions, reviews, user?.accessToken, user?.isExpired, autoSyncEnabled]);

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
          horizons: horizonItems,
          projects,
          actions,
          reviews,
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
  }, [user, horizonItems, projects, actions, reviews, refreshAvailableSheets]);

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

      // Seed newly created sheet with current data
      await saveGTDDataToSheet(user.accessToken, created.spreadsheetId, user.email, {
        horizons: horizonItems,
        projects,
        actions,
        reviews,
      }, created.title);

      setLastSyncTime(new Date());
      await refreshAvailableSheets();
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      setSyncError(err.message || 'Failed to create new spreadsheet');
    } finally {
      setIsSyncing(false);
    }
  }, [user, horizonItems, projects, actions, reviews, refreshAvailableSheets]);

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
        if (sheetData.horizons && sheetData.horizons.length > 0) setHorizonItems(sheetData.horizons);
        if (sheetData.projects && sheetData.projects.length > 0) setProjects(sheetData.projects);
        if (sheetData.actions && sheetData.actions.length > 0) setActions(sheetData.actions);
        if (sheetData.reviews && sheetData.reviews.length > 0) setReviews(sheetData.reviews);
        if (sheetData.lastSyncedAt) setLastSyncTime(new Date(sheetData.lastSyncedAt));
      } else {
        // Sheet is virgin, seed it with current user data
        await saveGTDDataToSheet(user.accessToken, targetSheetId, user.email, {
          horizons: horizonItems,
          projects,
          actions,
          reviews,
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
      console.error('Sign-in error:', err);
      if (err?.isCancellation) {
        setAuthError('Google sign-in popup was closed before completion. Please try again when ready.');
      } else {
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
    setHorizonItems((prev) => [newItem, ...prev]);
    return id;
  };

  const updateHorizonItem = (id: string, updates: Partial<HorizonItem>) => {
    setHorizonItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item))
    );
  };

  const deleteHorizonItem = (id: string) => {
    setHorizonItems((prev) => {
      // Also unlink child horizon items that pointed to this id
      return prev
        .filter((item) => item.id !== id)
        .map((item) => (item.parentId === id ? { ...item, parentId: undefined, updatedAt: new Date().toISOString() } : item));
    });
    // Also unlink projects that were linked to this horizon goal/area
    setProjects((prev) =>
      prev.map((p) => {
        if (p.goalId === id || p.areaId === id) {
          return {
            ...p,
            goalId: p.goalId === id ? undefined : p.goalId,
            areaId: p.areaId === id ? undefined : p.areaId,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
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
    };
    setProjects((prev) => [newProject, ...prev]);

    if (initialActionTitle && initialActionTitle.trim()) {
      const newAction: GTDAction = {
        id: `act-${Date.now()}`,
        title: initialActionTitle.trim(),
        projectId: id,
        context: '@computer',
        energy: 'medium',
        timeEstimate: '15-30m',
        type: 'action',
        completed: false,
        priority: project.priority || 'medium',
        createdAt: now.split('T')[0],
        updatedAt: now,
      };
      setActions((prev) => [newAction, ...prev]);
    }

    return id;
  };

  const updateProject = (id: string, updates: Partial<GTDProject>) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === id) {
          const updated = { ...proj, ...updates, updatedAt: now };
          if (updates.status === 'completed' && proj.status !== 'completed') {
            updated.completedAt = now;
          }
          return updated;
        }
        return proj;
      })
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((proj) => proj.id !== id));
    // Also unlink actions attached to this project (or keep them as standalone next actions)
    setActions((prev) =>
      prev.map((act) =>
        act.projectId === id ? { ...act, projectId: undefined, updatedAt: new Date().toISOString() } : act
      )
    );
  };

  const restoreProject = (project: GTDProject, linkedActionIds: string[] = []) => {
    setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
    if (linkedActionIds.length > 0) {
      setActions((prev) =>
        prev.map((act) =>
          linkedActionIds.includes(act.id) ? { ...act, projectId: project.id, updatedAt: new Date().toISOString() } : act
        )
      );
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
      id,
      completed: false,
      createdAt: now.split('T')[0],
      updatedAt: now,
    };
    setActions((prev) => [newAction, ...prev]);
    return id;
  };

  const updateAction = (id: string, updates: Partial<GTDAction>) => {
    const now = new Date().toISOString();
    setActions((prev) =>
      prev.map((act) => {
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
      })
    );
  };

  const deleteAction = (id: string) => {
    setActions((prev) => prev.filter((act) => act.id !== id));
  };

  const toggleActionComplete = (id: string) => {
    const now = new Date().toISOString();
    const todayStr = formatDateKey(new Date());

    setActions((prev) =>
      prev.map((act) => {
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
      })
    );
  };

  const logRecurringCompletion = (id: string, dateStr?: string) => {
    const now = new Date().toISOString();
    const targetDateStr = dateStr || formatDateKey(new Date());

    setActions((prev) =>
      prev.map((act) => {
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
      })
    );
  };

  const convertInboxItem = (
    inboxId: string,
    conversion: {
      type: ActionType;
      title?: string;
      projectId?: string;
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
    setActions((prev) =>
      prev.map((act) => {
        if (act.id === inboxId) {
          return {
            ...act,
            type: conversion.type,
            title: conversion.title || act.title,
            projectId: targetProjectId,
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
      })
    );
  };

  // Review Actions
  const recordWeeklyReview = (record: Omit<WeeklyReviewRecord, 'id'>) => {
    const id = `rev-${Date.now()}`;
    const newRecord: WeeklyReviewRecord = {
      ...record,
      id,
    };
    setReviews((prev) => [newRecord, ...prev]);
  };

  const deleteReview = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
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
        setHorizonItems(parsed.horizonItems);
        setProjects(parsed.projects);
        setActions(parsed.actions);
        if (parsed.reviews) setReviews(parsed.reviews);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

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
