import { GTDAction, GTDProject, HorizonItem, WeeklyReviewRecord } from '../types/gtd';

/**
 * Escapes a cell value for standard RFC 4180 CSV
 */
export function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses CSV text into an array of row arrays
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.length > 0 && currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Triggers a browser download of text data
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// SPREADSHEET EXPORTERS (CSV)
// -------------------------------------------------------------

export function generateActionsCSV(actions: GTDAction[], projects: GTDProject[]): string {
  const headers = [
    'ID',
    'Title',
    'Type',
    'Status',
    'Tags',
    'Context',
    'Energy',
    'TimeEstimate',
    'Priority',
    'ProjectID',
    'ProjectTitle',
    'DueDate',
    'ScheduledDate',
    'DelegatedTo',
    'DelegatedDate',
    'FollowUpDate',
    'IsRecurring',
    'RecurrenceLabel',
    'StreakCount',
    'Notes',
    'CreatedAt',
    'CompletedAt'
  ];

  const projectMap = new Map(projects.map((p) => [p.id, p.title]));

  const rows = actions.map((act) => [
    escapeCSVCell(act.id),
    escapeCSVCell(act.title),
    escapeCSVCell(act.type),
    escapeCSVCell(act.completed ? 'Completed' : 'Pending'),
    escapeCSVCell(act.tags ? act.tags.join('; ') : ''),
    escapeCSVCell(act.context),
    escapeCSVCell(act.energy),
    escapeCSVCell(act.timeEstimate),
    escapeCSVCell(act.priority),
    escapeCSVCell(act.projectId || ''),
    escapeCSVCell(act.projectId ? projectMap.get(act.projectId) || '' : ''),
    escapeCSVCell(act.dueDate || ''),
    escapeCSVCell(act.scheduledDate || ''),
    escapeCSVCell(act.delegatedTo || ''),
    escapeCSVCell(act.delegatedDate || ''),
    escapeCSVCell(act.followUpDate || ''),
    escapeCSVCell(act.isRecurring ? 'Yes' : 'No'),
    escapeCSVCell(act.recurrence?.label || ''),
    escapeCSVCell(act.streakCount || 0),
    escapeCSVCell(act.notes || ''),
    escapeCSVCell(act.createdAt),
    escapeCSVCell(act.completedAt || '')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function generateProjectsCSV(projects: GTDProject[], horizonItems: HorizonItem[]): string {
  const headers = [
    'ID',
    'Title',
    'Status',
    'Priority',
    'DesiredOutcome',
    'GoalID',
    'GoalTitle',
    'AreaID',
    'AreaTitle',
    'TargetDate',
    'CreatedAt',
    'Notes'
  ];

  const horizonMap = new Map(horizonItems.map((h) => [h.id, h.title]));

  const rows = projects.map((p) => [
    escapeCSVCell(p.id),
    escapeCSVCell(p.title),
    escapeCSVCell(p.status),
    escapeCSVCell(p.priority),
    escapeCSVCell(p.desiredOutcome || ''),
    escapeCSVCell(p.goalId || ''),
    escapeCSVCell(p.goalId ? horizonMap.get(p.goalId) || '' : ''),
    escapeCSVCell(p.areaId || ''),
    escapeCSVCell(p.areaId ? horizonMap.get(p.areaId) || '' : ''),
    escapeCSVCell(p.targetDate || ''),
    escapeCSVCell(p.createdAt),
    escapeCSVCell(p.notes || '')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function generateHorizonsCSV(horizonItems: HorizonItem[]): string {
  const headers = [
    'ID',
    'AltitudeLevel',
    'AltitudeName',
    'Title',
    'Description',
    'Status',
    'ParentID',
    'TargetTimeline',
    'CreatedAt'
  ];

  const levelNames: Record<number, string> = {
    2: 'H2: Areas of Focus',
    3: 'H3: Goals & Objectives',
    4: 'H4: Vision',
    5: 'H5: Purpose & Core Principles'
  };

  const rows = horizonItems.map((h) => [
    escapeCSVCell(h.id),
    escapeCSVCell(h.level),
    escapeCSVCell(levelNames[h.level] || `Level ${h.level}`),
    escapeCSVCell(h.title),
    escapeCSVCell(h.description || ''),
    escapeCSVCell(h.status || 'active'),
    escapeCSVCell(h.parentId || ''),
    escapeCSVCell(h.targetDate || ''),
    escapeCSVCell(h.createdAt)
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generates an All-in-One CSV spreadsheet bundle with clearly delineated sections
 */
export function generateAllInOneCSV(
  actions: GTDAction[],
  projects: GTDProject[],
  horizonItems: HorizonItem[],
  reviews: WeeklyReviewRecord[]
): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const parts: string[] = [];

  parts.push(`# GTD MASTER OFFLINE SPREADSHEET EXPORT - ${dateStr}`);
  parts.push(`# Generated from GTD Hub Offline Storage\n`);

  parts.push(`=== SECTION 1: NEXT ACTIONS & LISTS (${actions.length} items) ===`);
  parts.push(generateActionsCSV(actions, projects));
  parts.push('\n');

  parts.push(`=== SECTION 2: PROJECTS (${projects.length} items) ===`);
  parts.push(generateProjectsCSV(projects, horizonItems));
  parts.push('\n');

  parts.push(`=== SECTION 3: HORIZONS OF FOCUS (${horizonItems.length} items) ===`);
  parts.push(generateHorizonsCSV(horizonItems));
  parts.push('\n');

  parts.push(`=== SECTION 4: WEEKLY REVIEW LOGS (${reviews.length} logs) ===`);
  const reviewHeaders = ['ID', 'CompletedAt', 'DurationMinutes', 'InboxCleared', 'ProjectsReviewed', 'ActionsReviewed', 'Notes'];
  const reviewRows = reviews.map((r) => [
    escapeCSVCell(r.id),
    escapeCSVCell(r.completedAt),
    escapeCSVCell(r.durationMinutes),
    escapeCSVCell(r.inboxItemsCleared),
    escapeCSVCell(r.projectsReviewed),
    escapeCSVCell(r.nextActionsReviewed),
    escapeCSVCell(r.reflectionNotes || '')
  ]);
  parts.push([reviewHeaders.join(','), ...reviewRows.map((r) => r.join(','))].join('\n'));

  return parts.join('\n');
}

// -------------------------------------------------------------
// CSV IMPORTER
// -------------------------------------------------------------

export interface CSVImportResult {
  success: boolean;
  message: string;
  importedActions?: GTDAction[];
  importedProjects?: GTDProject[];
  type?: 'actions' | 'projects' | 'mixed';
}

export function parseAndImportCSV(
  csvText: string,
  existingProjects: GTDProject[] = []
): CSVImportResult {
  try {
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return { success: false, message: 'CSV is empty or missing data rows.' };
    }

    const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Check if this is an Actions CSV
    const isActionCSV = header.includes('tags') || header.includes('context') || header.includes('energy') || header.includes('timeestimate');
    // Check if this is a Projects CSV
    const isProjectCSV = header.includes('desiredoutcome') || (header.includes('title') && header.includes('status') && !isActionCSV);

    if (isActionCSV) {
      const titleIdx = header.findIndex((h) => h === 'title');
      const typeIdx = header.findIndex((h) => h === 'type');
      const statusIdx = header.findIndex((h) => h === 'status');
      const tagsIdx = header.findIndex((h) => h === 'tags' || h === 'tag');
      const contextIdx = header.findIndex((h) => h === 'context');
      const energyIdx = header.findIndex((h) => h === 'energy');
      const timeIdx = header.findIndex((h) => h === 'timeestimate' || h === 'time');
      const priorityIdx = header.findIndex((h) => h === 'priority');
      const projIdIdx = header.findIndex((h) => h === 'projectid' || h === 'project');
      const projTitleIdx = header.findIndex((h) => h === 'projecttitle');
      const dueIdx = header.findIndex((h) => h === 'duedate' || h === 'due');
      const notesIdx = header.findIndex((h) => h === 'notes');

      if (titleIdx === -1) {
        return { success: false, message: 'CSV does not have a "Title" column for actions.' };
      }

      const projectTitleMap = new Map(existingProjects.map((p) => [p.title.toLowerCase(), p.id]));
      const now = new Date().toISOString();

      const newActions: GTDAction[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const title = row[titleIdx];
        if (!title || title.startsWith('#') || title.startsWith('===')) continue;

        let projectId = projIdIdx !== -1 ? row[projIdIdx] : undefined;
        if (!projectId && projTitleIdx !== -1 && row[projTitleIdx]) {
          projectId = projectTitleMap.get(row[projTitleIdx].toLowerCase());
        }

        const isDone = statusIdx !== -1 && (row[statusIdx].toLowerCase() === 'completed' || row[statusIdx].toLowerCase() === 'done' || row[statusIdx] === 'true');

        let tags: string[] | undefined = undefined;
        if (tagsIdx !== -1 && row[tagsIdx]) {
          tags = row[tagsIdx].split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
        } else {
          const legacy: string[] = [];
          if (contextIdx !== -1 && row[contextIdx]) legacy.push(row[contextIdx]);
          if (energyIdx !== -1 && row[energyIdx]) legacy.push(`${row[energyIdx]}-energy`);
          if (timeIdx !== -1 && row[timeIdx]) legacy.push(row[timeIdx]);
          if (legacy.length > 0) tags = legacy;
        }

        newActions.push({
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          type: (typeIdx !== -1 && row[typeIdx]) ? (row[typeIdx] as any) : 'action',
          completed: isDone,
          completedAt: isDone ? now : undefined,
          tags,
          priority: (priorityIdx !== -1 && row[priorityIdx]) ? (row[priorityIdx] as any) : 'medium',
          projectId: projectId || undefined,
          dueDate: (dueIdx !== -1 && row[dueIdx]) ? row[dueIdx] : undefined,
          notes: (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx] : undefined,
          createdAt: now.split('T')[0],
          updatedAt: now
        });
      }

      return {
        success: true,
        message: `Successfully parsed ${newActions.length} action item${newActions.length === 1 ? '' : 's'}.`,
        importedActions: newActions,
        type: 'actions'
      };
    }

    if (isProjectCSV) {
      const titleIdx = header.findIndex((h) => h === 'title');
      const statusIdx = header.findIndex((h) => h === 'status');
      const priorityIdx = header.findIndex((h) => h === 'priority');
      const outcomeIdx = header.findIndex((h) => h === 'desiredoutcome' || h === 'outcome');
      const targetDateIdx = header.findIndex((h) => h === 'targetdate');
      const notesIdx = header.findIndex((h) => h === 'notes');

      if (titleIdx === -1) {
        return { success: false, message: 'CSV does not have a "Title" column for projects.' };
      }

      const now = new Date().toISOString();
      const newProjects: GTDProject[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const title = row[titleIdx];
        if (!title || title.startsWith('#') || title.startsWith('===')) continue;

        newProjects.push({
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          status: (statusIdx !== -1 && row[statusIdx]) ? (row[statusIdx] as any) : 'active',
          priority: (priorityIdx !== -1 && row[priorityIdx]) ? (row[priorityIdx] as any) : 'medium',
          desiredOutcome: (outcomeIdx !== -1 && row[outcomeIdx]) ? row[outcomeIdx] : '',
          targetDate: (targetDateIdx !== -1 && row[targetDateIdx]) ? row[targetDateIdx] : undefined,
          notes: (notesIdx !== -1 && row[notesIdx]) ? row[notesIdx] : undefined,
          createdAt: now.split('T')[0],
          updatedAt: now
        });
      }

      return {
        success: true,
        message: `Successfully parsed ${newProjects.length} project${newProjects.length === 1 ? '' : 's'}.`,
        importedProjects: newProjects,
        type: 'projects'
      };
    }

    return {
      success: false,
      message: 'Unrecognized CSV structure. Expected headers like Title, Context, Energy or DesiredOutcome.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to parse CSV: ${err.message || 'Unknown error'}`
    };
  }
}

// -------------------------------------------------------------
// FILE SYSTEM ACCESS API (Direct Local File Sync)
// -------------------------------------------------------------

export interface LocalFileHandleState {
  handle: any | null;
  fileName: string | null;
  isSupported: boolean;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

/**
 * Creates or selects a local file on user's disk for persistent offline sync
 */
export async function linkLocalJsonFile(): Promise<{ handle: any; fileName: string; data?: any } | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser. Use manual JSON/CSV download.');
  }

  try {
    // Let user pick an existing file or create a new file
    const options = {
      types: [
        {
          description: 'GTD Hub JSON Vault',
          accept: {
            'application/json': ['.json']
          }
        }
      ],
      excludeAcceptAllOption: false,
      suggestedName: `gtd-vault-${new Date().toISOString().split('T')[0]}.json`
    };

    // Prompt user to pick/save
    // @ts-ignore
    const handle = await window.showSaveFilePicker(options);
    const file = await handle.getFile();
    let fileData: any = null;

    if (file.size > 0) {
      const text = await file.text();
      try {
        fileData = JSON.parse(text);
      } catch (e) {
        console.warn('Existing file could not be parsed as JSON:', e);
      }
    }

    return {
      handle,
      fileName: file.name,
      data: fileData
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null; // User cancelled file picker
    }
    throw err;
  }
}

/**
 * Writes data directly to an existing local file handle
 */
export async function writeDataToFileHandle(handle: any, data: any): Promise<boolean> {
  if (!handle) return false;
  try {
    const writable = await handle.createWritable();
    const jsonStr = JSON.stringify(data, null, 2);
    await writable.write(jsonStr);
    await writable.close();
    return true;
  } catch (err) {
    console.error('Failed to write to local file handle:', err);
    return false;
  }
}
