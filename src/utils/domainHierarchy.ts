import { HorizonItem, GTDProject, GTDAction } from '../types/gtd';

/**
 * Normalizes a life domain string to one of the canonical 7 GTD life domains
 */
export function normalizeDomain(domain?: string): string {
  if (!domain) return 'Unassigned';
  const trimmed = domain.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes('personal growth') || lower.includes('learning')) return 'Personal Growth & Learning';
  if (lower.includes('purpose') || lower.includes('legacy')) return 'Purpose & Legacy';
  if (lower.includes('career') || lower.includes('craft') || lower.includes('work') || lower.includes('professional')) return 'Career & Craft';
  if (lower.includes('health') || lower.includes('vitality') || lower.includes('fitness')) return 'Health & Vitality';
  if (lower.includes('finance') || lower.includes('wealth')) return 'Finances & Wealth';
  if (lower.includes('home') || lower.includes('operation')) return 'Home & Operations';
  if (lower.includes('family') || lower.includes('relationship')) return 'Family & Relationships';
  return trimmed;
}

/**
 * Finds the ancestor Horizon 4 (3-5 Year Vision) for any given HorizonItem
 */
export function getAncestorH4(
  item: HorizonItem | undefined | null,
  allHorizons: HorizonItem[]
): HorizonItem | undefined {
  if (!item) return undefined;

  // If item itself is Horizon 4, it is its own root
  if (item.level === 4) {
    return item;
  }

  // If item is Horizon 2 (Area of Focus): parent points to H4 Vision
  if (item.level === 2) {
    if (item.parentId) {
      const h4 = allHorizons.find((h) => h.level === 4 && h.id === item.parentId);
      if (h4) return h4;
    }
    // Fallback search: any H4 that has matching domain if previously stored
    if (item.lifeDomain) {
      const h4 = allHorizons.find((h) => h.level === 4 && h.lifeDomain === item.lifeDomain);
      if (h4) return h4;
    }
    return undefined;
  }

  // If item is Horizon 3 (1-2 Year Goal): parent typically points to H2 Area of Focus, or directly to H4 Vision
  if (item.level === 3) {
    if (item.parentId) {
      // Check if parent is H2 Area
      const h2 = allHorizons.find((h) => h.level === 2 && h.id === item.parentId);
      if (h2) {
        return getAncestorH4(h2, allHorizons);
      }
      // Check if parent is directly an H4
      const h4 = allHorizons.find((h) => h.level === 4 && h.id === item.parentId);
      if (h4) return h4;
    }
    return undefined;
  }

  // If item is Horizon 5 (Purpose): find downstream H4 Visions linked to it
  if (item.level === 5) {
    const childH4 = allHorizons.find((h) => h.level === 4 && h.parentId === item.id);
    return childH4;
  }

  return undefined;
}

/**
 * Returns the effective Life Domain for a HorizonItem.
 * Horizon 4 (Vision) is the single source of truth for Life Domains.
 * Levels H5, H3, and H2 derive their domain dynamically from their ancestor H4.
 */
export function getHorizonItemDomain(
  item: HorizonItem | undefined | null,
  allHorizons: HorizonItem[]
): string | undefined {
  if (!item) return undefined;

  // Horizon 4 is the authority for Life Domain
  if (item.level === 4) {
    return item.lifeDomain || undefined;
  }

  // Find ancestor H4 Vision
  const ancestorH4 = getAncestorH4(item, allHorizons);
  if (ancestorH4?.lifeDomain) {
    return ancestorH4.lifeDomain;
  }

  // Fallback if item had legacy domain stored
  return item.lifeDomain || undefined;
}

/**
 * Finds the ancestor Horizon 4 (Vision) for a GTD Project
 */
export function getAncestorH4ForProject(
  project: GTDProject | undefined | null,
  allHorizons: HorizonItem[]
): HorizonItem | undefined {
  if (!project) return undefined;

  if (project.goalId) {
    const goal = allHorizons.find((h) => h.id === project.goalId);
    if (goal) {
      const h4 = getAncestorH4(goal, allHorizons);
      if (h4) return h4;
    }
  }

  if (project.areaId) {
    const area = allHorizons.find((h) => h.id === project.areaId);
    if (area) {
      const h4 = getAncestorH4(area, allHorizons);
      if (h4) return h4;
    }
  }

  return undefined;
}

/**
 * Returns the effective inherited Life Domain for a GTDProject.
 * Inherited from linked Goal (H3) or Area (H2), which trace up to an H4 Vision.
 */
export function getProjectInheritedDomain(
  project: GTDProject | undefined | null,
  allHorizons: HorizonItem[]
): string | undefined {
  if (!project) return undefined;

  const ancestorH4 = getAncestorH4ForProject(project, allHorizons);
  if (ancestorH4?.lifeDomain) {
    return ancestorH4.lifeDomain;
  }

  // Legacy fallback
  return project.lifeDomain || undefined;
}

/**
 * Returns the effective inherited Life Domain for a GTDAction.
 * Inherited from its linked Project, which traces up to an H4 Vision.
 */
export function getActionInheritedDomain(
  action: GTDAction | undefined | null,
  allProjects: GTDProject[],
  allHorizons: HorizonItem[]
): string | undefined {
  if (!action) return undefined;

  if (action.projectId) {
    const project = allProjects.find((p) => p.id === action.projectId);
    if (project) {
      return getProjectInheritedDomain(project, allHorizons);
    }
  }

  // Standalone actions without a project have no inherited domain
  return (action as { lifeDomain?: string }).lifeDomain || undefined;
}
