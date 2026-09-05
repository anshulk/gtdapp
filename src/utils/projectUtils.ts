import { GTDProject, GTDAction } from '../types/gtd';

/**
 * Determines whether a GTD project is stalled (i.e. missing an active next action).
 * 
 * Rules:
 * 1. Only 'active' projects can be stalled. Completed, on-hold, or someday-maybe projects are not stalled.
 * 2. If a project has any pending standard next action (!completed, type === 'action', !isRecurring), it is NOT stalled.
 * 3. If a project has any recurring routine/action attached to it (isRecurring === true, type === 'action'), 
 *    it is NOT stalled, even if the current recurring instance has already been completed today or this week.
 */
export function isProjectStalled(project?: Partial<GTDProject> | null, projectActions: GTDAction[] = []): boolean {
  if (!project || project.status !== 'active') {
    return false;
  }

  const linkedActions = projectActions.filter((act) => act.projectId === project.id);

  // Check for active uncompleted atomic next action
  const hasUncompletedAction = linkedActions.some(
    (act) => act.type === 'action' && !act.isRecurring && !act.completed
  );
  if (hasUncompletedAction) {
    return false;
  }

  // Check for recurring action/routine attached to the project
  const hasRecurringRoutine = linkedActions.some(
    (act) => act.type === 'action' && Boolean(act.isRecurring)
  );
  if (hasRecurringRoutine) {
    return false;
  }

  // No active next action or recurring routine found -> project is stalled
  return true;
}

/**
 * Returns the effective count of active drivers for a project (uncompleted actions + recurring routines).
 */
export function getProjectActiveDriversCount(project: GTDProject, projectActions: GTDAction[] = []): {
  uncompletedStandardCount: number;
  recurringRoutinesCount: number;
  totalActiveDrivers: number;
  isStalled: boolean;
} {
  const linkedActions = projectActions.filter((act) => act.projectId === project.id);
  const uncompletedStandardCount = linkedActions.filter(
    (act) => act.type === 'action' && !act.isRecurring && !act.completed
  ).length;
  const recurringRoutinesCount = linkedActions.filter(
    (act) => act.type === 'action' && Boolean(act.isRecurring)
  ).length;

  const totalActiveDrivers = uncompletedStandardCount + recurringRoutinesCount;
  const isStalled = isProjectStalled(project, linkedActions);

  return {
    uncompletedStandardCount,
    recurringRoutinesCount,
    totalActiveDrivers,
    isStalled,
  };
}
