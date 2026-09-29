export type HorizonLevel = 5 | 4 | 3 | 2 | 1 | 0;

export interface HorizonDefinition {
  level: HorizonLevel;
  altitude: string;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  color: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    lightBg: string;
  };
}

export interface HorizonItem {
  id: string;
  level: HorizonLevel;
  title: string;
  description?: string;
  /**
   * Defined strictly at Horizon 4 (3-5 Year Vision) as the single source of truth.
   * Items at other levels (H5, H3, H2) inherit their lifeDomain from ancestor H4.
   */
  lifeDomain?: string; // e.g. "Health & Vitality", "Career & Craft", "Finances & Wealth", "Home & Operations", "Family & Relationships", "Personal Growth & Learning", "Purpose & Legacy"
  parentId?: string; // For H3 (1-2y Goals): ID of the linked H2 Area of Focus. For H4 (Vision): ID of linked H5 Purpose.
  color?: string;
  targetDate?: string;
  status: 'active' | 'achieved' | 'archived';
  keyResults?: string[];
  createdAt: string;
  updatedAt?: string;
  progressRating?: number; // Weekly review status/progress rating (1 to 5)
  reviewNotes?: string; // Optional weekly review notes or reflection
  lastReviewedAt?: string;
}

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'someday-maybe';

export interface GTDProject {
  id: string;
  title: string;
  desiredOutcome: string; // The GTD "Definition of Done"
  areaId?: string; // Link to Horizon 2 (Area of Focus)
  goalId?: string; // Link to Horizon 3 (Goal)
  /**
   * Inherited dynamically from ancestor H4 Vision via linked Goal (H3) or Area (H2).
   */
  lifeDomain?: string;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high';
  targetDate?: string;
  notes?: string;
  supportMaterials?: { id: string; title: string; linkOrContent: string; type: 'link' | 'note' | 'file' }[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export type GTDContext = 
  | '@computer'
  | '@calls'
  | '@errands'
  | '@office'
  | '@home'
  | '@read-review'
  | '@agenda'
  | '@deep-work'
  | '@anywhere'
  | string;

export type EnergyLevel = 'low' | 'medium' | 'high';
export type TimeEstimate = '<15m' | '15-30m' | '30-60m' | '1-2h' | '2h+';
export type ActionType = 'action' | 'waiting-for' | 'someday-maybe' | 'inbox' | 'scheduled';

export type RecurrencePeriod = 'day' | 'week' | 'month';

export interface RecurrenceConfig {
  targetCount: number; // e.g. 3 for "3x a week", 1 for daily
  period: RecurrencePeriod; // 'day' | 'week' | 'month'
  daysOfWeek?: number[]; // [0=Sun, 1=Mon, ..., 6=Sat] optional preferred days
  label?: string; // e.g. "3x a week workout"
}

export const DEFAULT_SUGGESTED_TAGS: string[] = [
  '@computer',
  '@calls',
  '@errands',
  '@home',
  '@office',
  '@agenda',
  '@read-review',
  'deep-work',
  'quick',
  'urgent',
  'review',
  'writing',
  'admin',
  'finance',
];

export interface GTDAction {
  id: string;
  title: string;
  projectId?: string; // Link to Horizon 1 (Project)
  tags?: string[]; // Optional tags with multiple tags allowed
  context?: GTDContext; // Legacy compatibility
  energy?: EnergyLevel; // Legacy compatibility
  timeEstimate?: TimeEstimate; // Legacy compatibility
  type: ActionType;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  scheduledDate?: string;
  delegatedTo?: string; // For 'waiting-for'
  delegatedDate?: string;
  followUpDate?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt?: string;
  // Recurring routines & streak tracking
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  completionHistory?: string[]; // Array of 'YYYY-MM-DD' dates when completed
  streakCount?: number;
  bestStreak?: number;
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  isCurrent?: boolean;
}

export interface WeeklyReviewRecord {
  id: string;
  completedAt: string;
  durationMinutes: number;
  inboxItemsCleared: number;
  projectsReviewed: number;
  nextActionsReviewed: number;
  newActionsCreated: number;
  reflectionNotes?: string;
  focusAreasForUpcomingWeek?: string[];
  horizonRatings?: Record<string, { rating: number; notes?: string; status?: string; title?: string; level?: number }>;
}

export interface MindSweepCategory {
  title: string;
  type: 'professional' | 'personal';
  triggers: string[];
}

export type ActiveTab = 'dashboard' | 'horizons' | 'projects' | 'actions' | 'inbox' | 'waiting' | 'someday' | 'reviews';

export type SyncMode = 'cloud' | 'offline';
