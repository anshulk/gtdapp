import { GTDAction, GTDProject, HorizonItem, WeeklyReviewRecord, DriveSpreadsheetItem } from '../types/gtd';
import { isInitialSampleDataset, sanitizeDatasetForSheet } from '../utils/sampleDataGuard';

export interface GTDDataset {
  horizons: HorizonItem[];
  projects: GTDProject[];
  actions: GTDAction[];
  reviews: WeeklyReviewRecord[];
  lastSyncedAt?: string;
  hasAnyData?: boolean;
  sheetExists?: boolean;
}

export interface SheetSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle?: string;
  syncedAt: string;
}

export const DEFAULT_SPREADSHEET_TITLE = 'GTD Horizon & Review Hub';

const ACTION_HEADERS = [
  'ID',
  'Title',
  'Type',
  'Context',
  'Energy',
  'TimeEstimate',
  'Completed',
  'ProjectId',
  'DelegatedTo',
  'DueDate',
  'ScheduledDate',
  'Notes',
  'Priority',
  'CreatedAt',
  'CompletedAt',
  'UpdatedAt',
  'IsRecurring',
  'Recurrence',
  'CompletionHistory',
  'StreakCount',
  'BestStreak',
];

const PROJECT_HEADERS = [
  'ID',
  'Title',
  'DesiredOutcome',
  'Status',
  'AreaId',
  'GoalId',
  'Priority',
  'TargetDate',
  'Notes',
  'CreatedAt',
  'CompletedAt',
  'UpdatedAt',
];

const HORIZON_HEADERS = [
  'ID',
  'Level',
  'Title',
  'Category',
  'ParentId',
  'TargetDate',
  'Status',
  'Description',
  'KeyResults',
  'CreatedAt',
  'UpdatedAt',
];

const REVIEW_HEADERS = [
  'ID',
  'CompletedAt',
  'DurationMinutes',
  'InboxItemsCleared',
  'ProjectsReviewed',
  'NextActionsReviewed',
  'NewActionsCreated',
  'ReflectionNotes',
  'FocusAreas',
];

const META_HEADERS = ['Key', 'Value', 'UpdatedAt'];

export class GoogleApiAuthError extends Error {
  isAuthError = true;
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'GoogleApiAuthError';
    this.status = status;
  }
}

async function checkApiResponse(res: Response, actionContext: string) {
  if (res.ok) return;
  let serverMessage = '';
  try {
    const errorJson = await res.json();
    serverMessage = errorJson.error?.message || '';
  } catch {}

  const lowerMsg = serverMessage.toLowerCase();
  if (
    res.status === 401 ||
    res.status === 403 ||
    lowerMsg.includes('invalid authentication credentials') ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('invalid_token') ||
    lowerMsg.includes('auth error')
  ) {
    throw new GoogleApiAuthError(
      serverMessage || 'Google authentication session expired or credentials are invalid. Please re-authenticate.',
      res.status
    );
  }

  throw new Error(serverMessage || `Failed to ${actionContext}: ${res.statusText}`);
}

/**
 * Extracts spreadsheet ID from either a raw ID or full Google Sheets URL
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // If full URL: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // If raw alphanumeric ID with hyphens/underscores
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Lists Google Spreadsheets in user's Drive with optional query
 */
export async function listGoogleSpreadsheets(
  accessToken: string,
  searchKeyword = ''
): Promise<DriveSpreadsheetItem[]> {
  let query = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  if (searchKeyword.trim()) {
    const sanitized = searchKeyword.trim().replace(/'/g, "\\'");
    query += ` and name contains '${sanitized}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=25&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    await checkApiResponse(res, 'list spreadsheets from Google Drive');
  }

  const data = await res.json();
  const files: any[] = data.files || [];
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
  }));
}

/**
 * Verifies and fetches metadata of a specific spreadsheet
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<{ id: string; title: string; url: string; sheets: string[] }> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    await checkApiResponse(res, 'fetch spreadsheet info');
  }

  const data = await res.json();
  const title = data.properties?.title || 'Untitled Spreadsheet';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return {
    id: spreadsheetId,
    title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets,
  };
}

/**
 * Initializes a new or existing spreadsheet with required GTD tabs and headers
 */
export async function setupGTDSheetsStructure(
  accessToken: string,
  spreadsheetId: string,
  userEmail: string,
  existingSheetNames: string[] = []
): Promise<void> {
  const requiredTabs = ['Actions', 'Projects', 'Horizons', 'Reviews', 'Meta'];
  const missingTabs = requiredTabs.filter((tab) => !existingSheetNames.includes(tab));

  if (missingTabs.length > 0) {
    const addSheetRequests = missingTabs.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

    const addRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: addSheetRequests,
        }),
      }
    );

    if (!addRes.ok) {
      console.warn('Note on creating missing sheets tabs:', await addRes.text());
    }
  }

  // Initialize headers
  const now = new Date().toISOString();
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Actions!A1:U1', values: [ACTION_HEADERS] },
          { range: 'Projects!A1:L1', values: [PROJECT_HEADERS] },
          { range: 'Horizons!A1:K1', values: [HORIZON_HEADERS] },
          { range: 'Reviews!A1:I1', values: [REVIEW_HEADERS] },
          {
            range: 'Meta!A1:C5',
            values: [
              META_HEADERS,
              ['OwnerEmail', userEmail, now],
              ['AppVersion', '1.2.0 (GTD Multi-Altitude)', now],
              ['CreatedWith', 'GTD Horizon & Review Hub', now],
              ['LastSyncedAt', now, now],
            ],
          },
        ],
      }),
    }
  ).catch((e) => console.warn('Header init non-fatal note:', e));
}

/**
 * Creates a brand new named GTD spreadsheet in Google Drive
 */
export async function createNamedGTDSpreadsheet(
  accessToken: string,
  title: string,
  userEmail: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const sanitizedTitle = title.trim() || DEFAULT_SPREADSHEET_TITLE;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sanitizedTitle,
      },
      sheets: [
        { properties: { title: 'Actions', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Projects', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Horizons', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Reviews', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Meta', gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  if (!createRes.ok) {
    await checkApiResponse(createRes, 'create custom named GTD spreadsheet');
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl =
    createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const now = new Date().toISOString();
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Actions!A1:U1', values: [ACTION_HEADERS] },
          { range: 'Projects!A1:L1', values: [PROJECT_HEADERS] },
          { range: 'Horizons!A1:K1', values: [HORIZON_HEADERS] },
          { range: 'Reviews!A1:I1', values: [REVIEW_HEADERS] },
          {
            range: 'Meta!A1:C5',
            values: [
              META_HEADERS,
              ['OwnerEmail', userEmail, now],
              ['AppVersion', '1.2.0 (GTD Multi-Altitude)', now],
              ['CreatedWith', 'GTD Horizon & Review Hub', now],
              ['LastSyncedAt', now, now],
            ],
          },
        ],
      }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: sanitizedTitle,
  };
}

/**
 * Searches user's Google Drive for default spreadsheet or creates one
 */
export async function findOrCreateGTDSpreadsheet(
  accessToken: string,
  userEmail: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string; isNew: boolean }> {
  // Search in Drive for standard named spreadsheet
  const query = encodeURIComponent(
    `name = '${DEFAULT_SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const existing = searchData.files[0];
      return {
        spreadsheetId: existing.id,
        spreadsheetUrl: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
        title: existing.name || DEFAULT_SPREADSHEET_TITLE,
        isNew: false,
      };
    }
  }

  // Create new if not found
  const created = await createNamedGTDSpreadsheet(accessToken, DEFAULT_SPREADSHEET_TITLE, userEmail);
  return {
    ...created,
    isNew: true,
  };
}

/**
 * Rapidly checks the remote sheet's LastSyncedAt timestamp in the Meta tab
 */
export async function checkRemoteSheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{ lastSyncedAt?: string; ownerEmail?: string; totalActions?: number } | null> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Meta!A1:C15`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];
    let lastSyncedAt: string | undefined;
    let ownerEmail: string | undefined;
    let totalActions: number | undefined;

    for (const r of rows) {
      if (!r || !r[0]) continue;
      if (r[0] === 'LastSyncedAt' && r[1]) lastSyncedAt = r[1];
      if (r[0] === 'OwnerEmail' && r[1]) ownerEmail = r[1];
      if (r[0] === 'TotalActions' && r[1]) totalActions = Number(r[1]) || undefined;
    }

    return { lastSyncedAt, ownerEmail, totalActions };
  } catch (e) {
    console.warn('Unable to read quick remote metadata:', e);
    return null;
  }
}

/**
 * Intelligent 3-way / multi-device dataset merger
 * Compares item timestamps (updatedAt, completedAt, createdAt) and field modifications
 * to resolve conflicts and merge bidirectional changes without data loss.
 */
export function mergeGTDDatasets(
  local: GTDDataset,
  remote: GTDDataset,
  lastSyncBaseline?: string | Date | null
): { 
  merged: GTDDataset; 
  changesCount: number;
  remoteChangesCount: number;
  localChangesCount: number;
} {
  let changesCount = 0;
  let remoteChangesCount = 0;
  let localChangesCount = 0;

  // Sanitize local dataset so demo sample items never merge into remote user data
  const safeLocal = sanitizeDatasetForSheet(local);

  // Helper to parse ISO date string to timestamp safely
  const toTime = (dateStr?: string) => (dateStr ? new Date(dateStr).getTime() : 0);
  const baselineTime = lastSyncBaseline ? new Date(lastSyncBaseline).getTime() : 0;

  // 1. Merge Actions
  const actionMap = new Map<string, GTDAction>();
  for (const a of safeLocal.actions) {
    actionMap.set(a.id, { ...a });
  }

  const mergedActionsMap = new Map<string, GTDAction>();

  for (const remoteA of remote.actions) {
    const localA = actionMap.get(remoteA.id);
    const remoteFreshness = Math.max(
      toTime(remoteA.updatedAt),
      toTime(remoteA.completedAt),
      toTime(remoteA.createdAt)
    );

    if (!localA) {
      // Exists in remote but not in local
      // If we have no baseline or remote item was created/updated after last sync, add it
      if (baselineTime === 0 || remoteFreshness > baselineTime) {
        mergedActionsMap.set(remoteA.id, { ...remoteA });
        changesCount++;
        remoteChangesCount++;
      }
      // If remoteFreshness <= baselineTime, the item was deleted locally since last sync, so don't resurrect
    } else {
      // Both exist: check timestamps and content differences
      const localFreshness = Math.max(
        toTime(localA.updatedAt),
        toTime(localA.completedAt),
        toTime(localA.createdAt)
      );

      const hasContentDiff =
        localA.title !== remoteA.title ||
        localA.type !== remoteA.type ||
        localA.context !== remoteA.context ||
        localA.energy !== remoteA.energy ||
        localA.timeEstimate !== remoteA.timeEstimate ||
        Boolean(localA.completed) !== Boolean(remoteA.completed) ||
        (localA.projectId || '') !== (remoteA.projectId || '') ||
        (localA.delegatedTo || '') !== (remoteA.delegatedTo || '') ||
        (localA.dueDate || '') !== (remoteA.dueDate || '') ||
        (localA.scheduledDate || '') !== (remoteA.scheduledDate || '') ||
        (localA.notes || '') !== (remoteA.notes || '') ||
        (localA.priority || 'medium') !== (remoteA.priority || 'medium') ||
        Boolean(localA.isRecurring) !== Boolean(remoteA.isRecurring) ||
        (localA.streakCount || 0) !== (remoteA.streakCount || 0);

      if (remoteFreshness > localFreshness) {
        mergedActionsMap.set(remoteA.id, { ...remoteA });
        changesCount++;
        remoteChangesCount++;
      } else if (localFreshness > remoteFreshness) {
        mergedActionsMap.set(remoteA.id, { ...localA });
        changesCount++;
        localChangesCount++;
      } else if (hasContentDiff) {
        // Equal timestamps but direct sheet edits occurred -> adopt remote sheet edit with fresh timestamp
        mergedActionsMap.set(remoteA.id, { ...remoteA, updatedAt: new Date().toISOString() });
        changesCount++;
        remoteChangesCount++;
      } else {
        // Identical
        mergedActionsMap.set(remoteA.id, { ...localA });
      }
    }
  }

  // Preserve local actions that haven't synced to remote yet
  for (const localA of safeLocal.actions) {
    if (!mergedActionsMap.has(localA.id) && !remote.actions.some((r) => r.id === localA.id)) {
      mergedActionsMap.set(localA.id, { ...localA });
      changesCount++;
      localChangesCount++;
    }
  }

  // 2. Merge Projects
  const projectMap = new Map<string, GTDProject>();
  for (const p of safeLocal.projects) {
    projectMap.set(p.id, { ...p });
  }

  const mergedProjectsMap = new Map<string, GTDProject>();

  for (const remoteP of remote.projects) {
    const localP = projectMap.get(remoteP.id);
    const remoteFreshness = Math.max(
      toTime(remoteP.updatedAt),
      toTime(remoteP.completedAt),
      toTime(remoteP.createdAt)
    );

    if (!localP) {
      if (baselineTime === 0 || remoteFreshness > baselineTime) {
        mergedProjectsMap.set(remoteP.id, { ...remoteP });
        changesCount++;
        remoteChangesCount++;
      }
    } else {
      const localFreshness = Math.max(
        toTime(localP.updatedAt),
        toTime(localP.completedAt),
        toTime(localP.createdAt)
      );

      const hasContentDiff =
        localP.title !== remoteP.title ||
        (localP.desiredOutcome || '') !== (remoteP.desiredOutcome || '') ||
        localP.status !== remoteP.status ||
        (localP.areaId || '') !== (remoteP.areaId || '') ||
        (localP.goalId || '') !== (remoteP.goalId || '') ||
        (localP.priority || 'medium') !== (remoteP.priority || 'medium') ||
        (localP.targetDate || '') !== (remoteP.targetDate || '') ||
        (localP.notes || '') !== (remoteP.notes || '');

      if (remoteFreshness > localFreshness) {
        mergedProjectsMap.set(remoteP.id, { ...remoteP });
        changesCount++;
        remoteChangesCount++;
      } else if (localFreshness > remoteFreshness) {
        mergedProjectsMap.set(remoteP.id, { ...localP });
        changesCount++;
        localChangesCount++;
      } else if (hasContentDiff) {
        mergedProjectsMap.set(remoteP.id, { ...remoteP, updatedAt: new Date().toISOString() });
        changesCount++;
        remoteChangesCount++;
      } else {
        mergedProjectsMap.set(remoteP.id, { ...localP });
      }
    }
  }

  for (const localP of safeLocal.projects) {
    if (!mergedProjectsMap.has(localP.id) && !remote.projects.some((r) => r.id === localP.id)) {
      mergedProjectsMap.set(localP.id, { ...localP });
      changesCount++;
      localChangesCount++;
    }
  }

  // 3. Merge Horizons
  const horizonMap = new Map<string, HorizonItem>();
  for (const h of safeLocal.horizons) {
    horizonMap.set(h.id, { ...h });
  }

  const mergedHorizonsMap = new Map<string, HorizonItem>();

  for (const remoteH of remote.horizons) {
    const localH = horizonMap.get(remoteH.id);
    const remoteFreshness = Math.max(toTime(remoteH.updatedAt), toTime(remoteH.createdAt));

    if (!localH) {
      if (baselineTime === 0 || remoteFreshness > baselineTime) {
        mergedHorizonsMap.set(remoteH.id, { ...remoteH });
        changesCount++;
        remoteChangesCount++;
      }
    } else {
      const localFreshness = Math.max(toTime(localH.updatedAt), toTime(localH.createdAt));
      const hasContentDiff =
        localH.level !== remoteH.level ||
        localH.title !== remoteH.title ||
        (localH.lifeDomain || '') !== (remoteH.lifeDomain || '') ||
        (localH.parentId || '') !== (remoteH.parentId || '') ||
        (localH.targetDate || '') !== (remoteH.targetDate || '') ||
        (localH.status || 'active') !== (remoteH.status || 'active') ||
        (localH.description || '') !== (remoteH.description || '');

      if (remoteFreshness > localFreshness) {
        mergedHorizonsMap.set(remoteH.id, { ...remoteH });
        changesCount++;
        remoteChangesCount++;
      } else if (localFreshness > remoteFreshness) {
        mergedHorizonsMap.set(remoteH.id, { ...localH });
        changesCount++;
        localChangesCount++;
      } else if (hasContentDiff) {
        mergedHorizonsMap.set(remoteH.id, { ...remoteH, updatedAt: new Date().toISOString() });
        changesCount++;
        remoteChangesCount++;
      } else {
        mergedHorizonsMap.set(remoteH.id, { ...localH });
      }
    }
  }

  for (const localH of safeLocal.horizons) {
    if (!mergedHorizonsMap.has(localH.id) && !remote.horizons.some((r) => r.id === localH.id)) {
      mergedHorizonsMap.set(localH.id, { ...localH });
      changesCount++;
      localChangesCount++;
    }
  }

  // 4. Merge Reviews
  const reviewMap = new Map<string, WeeklyReviewRecord>();
  for (const r of safeLocal.reviews) {
    reviewMap.set(r.id, { ...r });
  }
  for (const remoteR of remote.reviews) {
    if (!reviewMap.has(remoteR.id)) {
      reviewMap.set(remoteR.id, { ...remoteR });
      changesCount++;
      remoteChangesCount++;
    }
  }

  const mergedReviews = Array.from(reviewMap.values()).sort(
    (a, b) => toTime(b.completedAt) - toTime(a.completedAt)
  );

  return {
    merged: {
      actions: Array.from(mergedActionsMap.values()),
      projects: Array.from(mergedProjectsMap.values()),
      horizons: Array.from(mergedHorizonsMap.values()),
      reviews: mergedReviews,
      lastSyncedAt: new Date().toISOString(),
    },
    changesCount,
    remoteChangesCount,
    localChangesCount,
  };
}
/**
 * Fetch all GTD data from the user's Google Sheet
 */
export async function fetchGTDDataFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<GTDDataset | null> {
  const ranges = [
    'Actions!A1:Z2000',
    'Projects!A1:Z1000',
    'Horizons!A1:Z500',
    'Reviews!A1:Z500',
    'Meta!A1:Z50',
  ];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    await checkApiResponse(res, 'load data from Google Sheet');
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const actionsRows = valueRanges[0]?.values || [];
  const projectsRows = valueRanges[1]?.values || [];
  const horizonsRows = valueRanges[2]?.values || [];
  const reviewsRows = valueRanges[3]?.values || [];
  const metaRows = valueRanges[4]?.values || [];

  // Parse Actions
  const actions: GTDAction[] = [];
  if (actionsRows.length > 1) {
    for (let i = 1; i < actionsRows.length; i++) {
      const row = actionsRows[i];
      if (!row || !row[0] || !row[1]) continue;

      let isRecurring = String(row[16]).toLowerCase() === 'true' || String(row[16]) === '1';
      let recurrence: any = undefined;
      if (row[17]) {
        try {
          recurrence = typeof row[17] === 'string' ? JSON.parse(row[17]) : row[17];
        } catch {
          recurrence = undefined;
        }
      }
      let completionHistory: string[] | undefined = undefined;
      if (row[18]) {
        try {
          completionHistory = typeof row[18] === 'string' ? JSON.parse(row[18]) : row[18];
        } catch {
          completionHistory = [];
        }
      }

      actions.push({
        id: String(row[0]),
        title: String(row[1]),
        type: (row[2] as any) || 'action',
        context: (row[3] as any) || '@computer',
        energy: (row[4] as any) || 'medium',
        timeEstimate: (row[5] as any) || '15-30m',
        completed: String(row[6]).toLowerCase() === 'true' || String(row[6]) === '1',
        projectId: row[7] ? String(row[7]) : undefined,
        delegatedTo: row[8] ? String(row[8]) : undefined,
        dueDate: row[9] ? String(row[9]) : undefined,
        scheduledDate: row[10] ? String(row[10]) : undefined,
        notes: row[11] ? String(row[11]) : undefined,
        priority: (row[12] as any) || 'medium',
        createdAt: row[13] ? String(row[13]) : new Date().toISOString(),
        completedAt: row[14] ? String(row[14]) : undefined,
        updatedAt: row[15] ? String(row[15]) : undefined,
        isRecurring: isRecurring || undefined,
        recurrence,
        completionHistory,
        streakCount: row[19] !== undefined && row[19] !== '' ? Number(row[19]) : undefined,
        bestStreak: row[20] !== undefined && row[20] !== '' ? Number(row[20]) : undefined,
      });
    }
  }

  // Parse Projects
  const projects: GTDProject[] = [];
  if (projectsRows.length > 1) {
    for (let i = 1; i < projectsRows.length; i++) {
      const row = projectsRows[i];
      if (!row || !row[0] || !row[1]) continue;
      projects.push({
        id: String(row[0]),
        title: String(row[1]),
        desiredOutcome: String(row[2] || ''),
        status: (row[3] as any) || 'active',
        areaId: row[4] ? String(row[4]) : undefined,
        goalId: row[5] ? String(row[5]) : undefined,
        priority: (row[6] as any) || 'medium',
        targetDate: row[7] ? String(row[7]) : undefined,
        notes: row[8] ? String(row[8]) : undefined,
        createdAt: row[9] ? String(row[9]) : new Date().toISOString(),
        completedAt: row[10] ? String(row[10]) : undefined,
        updatedAt: row[11] ? String(row[11]) : undefined,
      });
    }
  }

  // Parse Horizons
  const horizons: HorizonItem[] = [];
  if (horizonsRows.length > 1) {
    for (let i = 1; i < horizonsRows.length; i++) {
      const row = horizonsRows[i];
      if (!row || !row[0] || !row[2]) continue;
      const keyResultsRaw = row[8];
      let keyResults: string[] | undefined;
      if (keyResultsRaw) {
        try {
          keyResults = JSON.parse(keyResultsRaw);
        } catch {
          keyResults = String(keyResultsRaw).split(';').map((s) => s.trim()).filter(Boolean);
        }
      }

      horizons.push({
        id: String(row[0]),
        level: (Number(row[1]) || 2) as any,
        title: String(row[2]),
        lifeDomain: row[3] ? String(row[3]) : undefined,
        parentId: row[4] ? String(row[4]) : undefined,
        targetDate: row[5] ? String(row[5]) : undefined,
        status: (row[6] as any) || 'active',
        description: row[7] ? String(row[7]) : undefined,
        keyResults,
        createdAt: row[9] ? String(row[9]) : new Date().toISOString(),
        updatedAt: row[10] ? String(row[10]) : undefined,
      });
    }
  }

  // Parse Reviews
  const reviews: WeeklyReviewRecord[] = [];
  if (reviewsRows.length > 1) {
    for (let i = 1; i < reviewsRows.length; i++) {
      const row = reviewsRows[i];
      if (!row || !row[0]) continue;
      const focusAreasRaw = row[8];
      let focusAreas: string[] | undefined;
      if (focusAreasRaw) {
        try {
          focusAreas = JSON.parse(focusAreasRaw);
        } catch {
          focusAreas = String(focusAreasRaw).split(';').map((s) => s.trim()).filter(Boolean);
        }
      }

      reviews.push({
        id: String(row[0]),
        completedAt: String(row[1] || new Date().toISOString()),
        durationMinutes: Number(row[2]) || 20,
        inboxItemsCleared: Number(row[3]) || 0,
        projectsReviewed: Number(row[4]) || 0,
        nextActionsReviewed: Number(row[5]) || 0,
        newActionsCreated: Number(row[6]) || 0,
        reflectionNotes: row[7] ? String(row[7]) : undefined,
        focusAreasForUpcomingWeek: focusAreas,
      });
    }
  }

  // Find last sync in Meta
  let lastSyncedAt: string | undefined;
  if (metaRows.length > 1) {
    const syncRow = metaRows.find((r: string[]) => r[0] === 'LastSyncedAt');
    if (syncRow && syncRow[1]) {
      lastSyncedAt = syncRow[1];
    }
  }

  const hasAnyData = actions.length > 0 || projects.length > 0 || horizons.length > 0 || reviews.length > 0;

  return {
    horizons,
    projects,
    actions,
    reviews,
    lastSyncedAt,
    hasAnyData,
    sheetExists: true,
  };
}

export function formatActionRow(a: GTDAction, now = new Date().toISOString()): (string | number | boolean)[] {
  return [
    a.id,
    a.title,
    a.type,
    a.context,
    a.energy,
    a.timeEstimate,
    a.completed,
    a.projectId || '',
    a.delegatedTo || '',
    a.dueDate || '',
    a.scheduledDate || '',
    a.notes || '',
    a.priority || 'medium',
    a.createdAt || now,
    a.completedAt || '',
    a.updatedAt || '',
    a.isRecurring ? true : false,
    a.recurrence ? JSON.stringify(a.recurrence) : '',
    a.completionHistory ? JSON.stringify(a.completionHistory) : '',
    a.streakCount !== undefined ? a.streakCount : '',
    a.bestStreak !== undefined ? a.bestStreak : '',
  ];
}

export function formatProjectRow(p: GTDProject, now = new Date().toISOString()): (string | number | boolean)[] {
  return [
    p.id,
    p.title,
    p.desiredOutcome || '',
    p.status,
    p.areaId || '',
    p.goalId || '',
    p.priority || 'medium',
    p.targetDate || '',
    p.notes || '',
    p.createdAt || now,
    p.completedAt || '',
    p.updatedAt || '',
  ];
}

export function formatHorizonRow(h: HorizonItem, now = new Date().toISOString()): (string | number | boolean)[] {
  return [
    h.id,
    h.level,
    h.title,
    h.lifeDomain || '',
    h.parentId || '',
    h.targetDate || '',
    h.status || 'active',
    h.description || '',
    h.keyResults ? JSON.stringify(h.keyResults) : '',
    h.createdAt || now,
    h.updatedAt || '',
  ];
}

export function formatReviewRow(r: WeeklyReviewRecord): (string | number | boolean)[] {
  return [
    r.id,
    r.completedAt,
    r.durationMinutes || 0,
    r.inboxItemsCleared || 0,
    r.projectsReviewed || 0,
    r.nextActionsReviewed || 0,
    r.newActionsCreated || 0,
    r.reflectionNotes || '',
    r.focusAreasForUpcomingWeek ? JSON.stringify(r.focusAreasForUpcomingWeek) : '',
  ];
}

function areRowValuesEqual(
  row1: (string | number | boolean | undefined | null)[],
  row2: (string | number | boolean | undefined | null)[]
): boolean {
  const maxLen = Math.max(row1.length, row2.length);
  for (let i = 0; i < maxLen; i++) {
    const val1 = row1[i] !== undefined && row1[i] !== null ? String(row1[i]).trim() : '';
    const val2 = row2[i] !== undefined && row2[i] !== null ? String(row2[i]).trim() : '';
    // Normalize boolean strings
    const norm1 = val1 === '1' ? 'true' : val1 === '0' ? 'false' : val1;
    const norm2 = val2 === '1' ? 'true' : val2 === '0' ? 'false' : val2;
    if (norm1 !== norm2) {
      return false;
    }
  }
  return true;
}

/**
 * Save GTD Dataset to Google Sheets using Item-Wise synchronization.
 * Instead of overwriting or wiping the whole sheet, it:
 * 1. Reads existing rows and row numbers per tab.
 * 2. Compares each item to its corresponding row on the sheet.
 * 3. Sends targeted row updates only for modified items.
 * 4. Appends new items to the bottom of the table.
 * 5. Clears only specifically deleted item rows without touching other rows/formulas.
 * 6. Updates Meta timestamp and metrics.
 */
export async function saveGTDDataToSheet(
  accessToken: string,
  spreadsheetId: string,
  userEmail: string,
  data: GTDDataset,
  spreadsheetTitle?: string
): Promise<SheetSyncResult> {
  const now = new Date().toISOString();

  let safeData = data;

  // CRITICAL GUARD: Never overwrite an existing Google Sheet with initial demo sample data
  if (isInitialSampleDataset(data)) {
    try {
      const existing = await fetchGTDDataFromSheet(accessToken, spreadsheetId);
      if (existing && existing.hasAnyData) {
        console.warn('CRITICAL PROTECTION: Blocked attempt to overwrite existing Google Sheet with initial sample data.');
        return {
          spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          spreadsheetTitle: spreadsheetTitle || DEFAULT_SPREADSHEET_TITLE,
          syncedAt: existing.lastSyncedAt || now,
        };
      }
    } catch (e) {
      console.warn('Pre-save inspection warning:', e);
    }
    // If the remote sheet is empty or newly created, sanitize to empty collections
    safeData = {
      ...data,
      actions: [],
      projects: [],
      horizons: [],
      reviews: [],
    };
  } else {
    // If data is a mix of user items and sample demo items, sanitize out the demo items
    safeData = sanitizeDatasetForSheet(data);
  }

  // 1. Fetch current raw sheet data to inspect existing rows and indices
  const ranges = [
    'Actions!A1:U2000',
    'Projects!A1:L1000',
    'Horizons!A1:K500',
    'Reviews!A1:I500',
    'Meta!A1:C50',
  ];
  const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const fetchRes = await fetch(fetchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const valueRanges = fetchRes.ok ? (await fetchRes.json()).valueRanges || [] : [];
  const actionsRows: (string | number | boolean)[][] = valueRanges[0]?.values || [];
  const projectsRows: (string | number | boolean)[][] = valueRanges[1]?.values || [];
  const horizonsRows: (string | number | boolean)[][] = valueRanges[2]?.values || [];
  const reviewsRows: (string | number | boolean)[][] = valueRanges[3]?.values || [];

  const updateBatch: { range: string; values: (string | number | boolean)[][] }[] = [];
  const clearRanges: string[] = [];

  // Helper to reconcile a tab item-wise
  const reconcileTab = <T extends { id: string }>(
    tabName: string,
    headers: string[],
    existingRows: (string | number | boolean)[][],
    currentItems: T[],
    formatter: (item: T, timestamp: string) => (string | number | boolean)[],
    lastColLetter: string
  ) => {
    // Ensure header row exists
    if (existingRows.length === 0 || !existingRows[0] || existingRows[0].length === 0) {
      updateBatch.push({
        range: `${tabName}!A1:${lastColLetter}1`,
        values: [headers],
      });
    }

    // Map existing rows: ID -> { rowIndex (1-based), rowValues }
    const existingMap = new Map<string, { rowIndex: number; row: (string | number | boolean)[] }>();
    for (let i = 1; i < existingRows.length; i++) {
      const row = existingRows[i];
      if (row && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
        existingMap.set(String(row[0]).trim(), {
          rowIndex: i + 1,
          row,
        });
      }
    }

    let maxRowIndex = Math.max(1, existingRows.length);
    const seenIds = new Set<string>();

    // Process current items (item-wise update or append)
    for (const item of currentItems) {
      const rowValues = formatter(item, now);
      seenIds.add(item.id);

      const existing = existingMap.get(item.id);
      if (existing) {
        // Item exists on sheet: compare content
        if (!areRowValuesEqual(rowValues, existing.row)) {
          // Update only this specific item row
          updateBatch.push({
            range: `${tabName}!A${existing.rowIndex}:${lastColLetter}${existing.rowIndex}`,
            values: [rowValues],
          });
        }
      } else {
        // New item: append to the next available row
        maxRowIndex++;
        updateBatch.push({
          range: `${tabName}!A${maxRowIndex}:${lastColLetter}${maxRowIndex}`,
          values: [rowValues],
        });
      }
    }

    // Process deleted items: exist in sheet but no longer in current dataset
    for (const [id, existing] of existingMap.entries()) {
      if (!seenIds.has(id)) {
        // Clear specifically this item's row without wiping the rest of the sheet
        clearRanges.push(`${tabName}!A${existing.rowIndex}:${lastColLetter}${existing.rowIndex}`);
      }
    }
  };

  // 2. Item-wise reconcile each GTD entity type
  reconcileTab('Actions', ACTION_HEADERS, actionsRows, safeData.actions, formatActionRow, 'U');
  reconcileTab('Projects', PROJECT_HEADERS, projectsRows, safeData.projects, formatProjectRow, 'L');
  reconcileTab('Horizons', HORIZON_HEADERS, horizonsRows, safeData.horizons, formatHorizonRow, 'K');
  reconcileTab('Reviews', REVIEW_HEADERS, reviewsRows, safeData.reviews, formatReviewRow, 'I');

  // 3. Update Meta Tab
  const metaValues = [
    META_HEADERS,
    ['OwnerEmail', userEmail, now],
    ['LastSyncedAt', now, now],
    ['TotalActions', safeData.actions.length, now],
    ['TotalProjects', safeData.projects.length, now],
    ['TotalHorizons', safeData.horizons.length, now],
    ['TotalReviews', safeData.reviews.length, now],
    ['AppVersion', '1.2.0 (GTD Multi-Altitude)', now],
    ['SpreadsheetTitle', spreadsheetTitle || DEFAULT_SPREADSHEET_TITLE, now],
  ];
  updateBatch.push({
    range: `Meta!A1:C${metaValues.length}`,
    values: metaValues,
  });

  // 4. Execute targeted clear for specifically deleted item rows (if any)
  if (clearRanges.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: clearRanges,
        }),
      }
    ).catch((e) => console.warn('Note on clearing deleted item rows:', e));
  }

  // 5. Execute targeted batch updates for modified/new rows only
  if (updateBatch.length > 0) {
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updateBatch,
        }),
      }
    );

    if (!updateRes.ok) {
      await checkApiResponse(updateRes, 'update GTD data in Google Sheet item-wise');
    }
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: spreadsheetTitle || DEFAULT_SPREADSHEET_TITLE,
    syncedAt: now,
  };
}

/**
 * Granular Single-Item Sync: Synchronize a single action directly to Google Sheets
 */
export async function syncSingleActionItem(
  accessToken: string,
  spreadsheetId: string,
  action: GTDAction,
  isDelete = false
): Promise<void> {
  if (!accessToken || !spreadsheetId) return;

  try {
    const colUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Actions!A1:A2000`;
    const colRes = await fetch(colUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!colRes.ok) return;
    const colData = await colRes.json();
    const rows: string[][] = colData.values || [];

    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === action.id) {
        foundRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (isDelete) {
      if (foundRowIndex > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ranges: [`Actions!A${foundRowIndex}:U${foundRowIndex}`],
            }),
          }
        );
      }
    } else {
      const rowValues = formatActionRow(action);
      if (foundRowIndex > 0) {
        // Update existing row
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Actions!A${foundRowIndex}:U${foundRowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      } else {
        // Append new row
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Actions!A:U:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      }
    }

    // Update LastSyncedAt in Meta
    const now = new Date().toISOString();
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Meta!A3:C3?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [['LastSyncedAt', now, now]],
        }),
      }
    ).catch(() => {});
  } catch (e) {
    console.warn('Single action item sync note:', e);
  }
}

/**
 * Granular Single-Item Sync: Synchronize a single project directly to Google Sheets
 */
export async function syncSingleProjectItem(
  accessToken: string,
  spreadsheetId: string,
  project: GTDProject,
  isDelete = false
): Promise<void> {
  if (!accessToken || !spreadsheetId) return;

  try {
    const colUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Projects!A1:A1000`;
    const colRes = await fetch(colUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!colRes.ok) return;
    const colData = await colRes.json();
    const rows: string[][] = colData.values || [];

    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === project.id) {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (isDelete) {
      if (foundRowIndex > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ranges: [`Projects!A${foundRowIndex}:L${foundRowIndex}`],
            }),
          }
        );
      }
    } else {
      const rowValues = formatProjectRow(project);
      if (foundRowIndex > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Projects!A${foundRowIndex}:L${foundRowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      } else {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Projects!A:L:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      }
    }

    const now = new Date().toISOString();
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Meta!A3:C3?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [['LastSyncedAt', now, now]],
        }),
      }
    ).catch(() => {});
  } catch (e) {
    console.warn('Single project item sync note:', e);
  }
}

/**
 * Granular Single-Item Sync: Synchronize a single horizon item directly to Google Sheets
 */
export async function syncSingleHorizonItem(
  accessToken: string,
  spreadsheetId: string,
  horizon: HorizonItem,
  isDelete = false
): Promise<void> {
  if (!accessToken || !spreadsheetId) return;

  try {
    const colUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Horizons!A1:A500`;
    const colRes = await fetch(colUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!colRes.ok) return;
    const colData = await colRes.json();
    const rows: string[][] = colData.values || [];

    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === horizon.id) {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (isDelete) {
      if (foundRowIndex > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ranges: [`Horizons!A${foundRowIndex}:K${foundRowIndex}`],
            }),
          }
        );
      }
    } else {
      const rowValues = formatHorizonRow(horizon);
      if (foundRowIndex > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Horizons!A${foundRowIndex}:K${foundRowIndex}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      } else {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Horizons!A:K:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      }
    }

    const now = new Date().toISOString();
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Meta!A3:C3?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [['LastSyncedAt', now, now]],
        }),
      }
    ).catch(() => {});
  } catch (e) {
    console.warn('Single horizon item sync note:', e);
  }
}

