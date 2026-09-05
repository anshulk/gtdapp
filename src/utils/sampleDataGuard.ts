import { GTDAction, GTDProject, HorizonItem, WeeklyReviewRecord } from '../types/gtd';
import { GTDDataset } from '../services/googleSheets';

const SAMPLE_ACTION_IDS = new Set([
  'act-1', 'act-2', 'act-3', 'act-4', 'act-5', 'act-6', 'act-7', 'act-8', 'act-9',
  'act-10', 'act-11', 'act-12', 'act-13', 'act-14', 'act-15', 'act-16', 'act-17', 'act-18'
]);

const SAMPLE_PROJECT_IDS = new Set([
  'proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5', 'proj-6'
]);

const SAMPLE_HORIZON_IDS = new Set([
  'h5-1', 'h5-2', 'h4-1', 'h4-2', 'h4-3', 'h3-1', 'h3-2', 'h3-3',
  'h2-1', 'h2-2', 'h2-3', 'h2-4', 'h2-5'
]);

const SAMPLE_REVIEW_IDS = new Set(['rev-1', 'rev-2']);

/**
 * Checks if a specific action belongs to the hardcoded initial demo sample dataset
 */
export function isInitialSampleAction(action?: Partial<GTDAction> | null): boolean {
  if (!action || !action.id) return false;
  return SAMPLE_ACTION_IDS.has(action.id);
}

/**
 * Checks if a specific project belongs to the hardcoded initial demo sample dataset
 */
export function isInitialSampleProject(project?: Partial<GTDProject> | null): boolean {
  if (!project || !project.id) return false;
  return SAMPLE_PROJECT_IDS.has(project.id);
}

/**
 * Checks if a specific horizon item belongs to the hardcoded initial demo sample dataset
 */
export function isInitialSampleHorizon(horizon?: Partial<HorizonItem> | null): boolean {
  if (!horizon || !horizon.id) return false;
  return SAMPLE_HORIZON_IDS.has(horizon.id);
}

/**
 * Checks if a specific review record belongs to the hardcoded initial demo sample dataset
 */
export function isInitialSampleReview(review?: Partial<WeeklyReviewRecord> | null): boolean {
  if (!review || !review.id) return false;
  return SAMPLE_REVIEW_IDS.has(review.id);
}

/**
 * Returns true if the dataset consists entirely of initial demo sample items.
 * If empty or contains any custom user items, returns false.
 */
export function isInitialSampleDataset(dataset?: Partial<GTDDataset> | null): boolean {
  if (!dataset) return false;

  const actions = dataset.actions || [];
  const projects = dataset.projects || [];
  const horizons = dataset.horizons || [];
  const reviews = dataset.reviews || [];

  const totalItems = actions.length + projects.length + horizons.length + reviews.length;
  if (totalItems === 0) return false;

  const hasNonSampleAction = actions.some((a) => !isInitialSampleAction(a));
  const hasNonSampleProject = projects.some((p) => !isInitialSampleProject(p));
  const hasNonSampleHorizon = horizons.some((h) => !isInitialSampleHorizon(h));
  const hasNonSampleReview = reviews.some((r) => !isInitialSampleReview(r));

  if (hasNonSampleAction || hasNonSampleProject || hasNonSampleHorizon || hasNonSampleReview) {
    return false;
  }

  // All items present are purely sample items
  return true;
}

/**
 * Strips initial demo sample data items from a dataset so they never leak into a user's real sheet
 */
export function sanitizeDatasetForSheet(dataset: GTDDataset): GTDDataset {
  return {
    ...dataset,
    actions: dataset.actions.filter((a) => !isInitialSampleAction(a)),
    projects: dataset.projects.filter((p) => !isInitialSampleProject(p)),
    horizons: dataset.horizons.filter((h) => !isInitialSampleHorizon(h)),
    reviews: dataset.reviews.filter((r) => !isInitialSampleReview(r)),
  };
}
