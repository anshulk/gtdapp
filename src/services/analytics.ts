/**
 * Analytics Tracking Service for GTD App
 * Integrates with Google Analytics 4 (gtag.js / dataLayer)
 * Tracks view-level changes, button clicks, modal interactions, and GTD domain lifecycle events.
 */

export interface AnalyticsEvent {
  name: string;
  category: string;
  label?: string;
  location?: string;
  properties?: Record<string, any>;
  timestamp: string;
}

const MAX_STORED_EVENTS = 100;
const STORAGE_KEY = 'gtd_analytics_events_log';

// In-memory rolling event buffer
let eventsLog: AnalyticsEvent[] = [];
let currentView: string = 'dashboard';
let viewStartTime: number = Date.now();

// Try loading persisted events from sessionStorage
if (typeof window !== 'undefined') {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      eventsLog = JSON.parse(saved);
    }
  } catch {
    eventsLog = [];
  }
}

function persistEvent(event: AnalyticsEvent) {
  eventsLog.push(event);
  if (eventsLog.length > MAX_STORED_EVENTS) {
    eventsLog = eventsLog.slice(-MAX_STORED_EVENTS);
  }
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(eventsLog));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Dispatch event to Google Analytics (gtag.js / dataLayer)
 */
function sendToGA(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;

  const enrichedParams = {
    ...params,
    current_view: currentView,
    app_name: 'GTD App',
    timestamp: new Date().toISOString(),
  };

  // 1. Google Analytics 4 gtag()
  if (typeof (window as any).gtag === 'function') {
    try {
      (window as any).gtag('event', eventName, enrichedParams);
    } catch (e) {
      console.warn('[Analytics] gtag error:', e);
    }
  }

  // 2. Google Tag Manager dataLayer
  if (Array.isArray((window as any).dataLayer)) {
    try {
      (window as any).dataLayer.push({
        event: eventName,
        ...enrichedParams,
      });
    } catch {
      // Ignore dataLayer errors
    }
  }

  // 3. Dispatch window CustomEvent for listeners
  try {
    window.dispatchEvent(
      new CustomEvent('gtd:analytics', {
        detail: { eventName, params: enrichedParams },
      })
    );
  } catch {
    // Ignore CustomEvent error
  }
}

/**
 * Track high-level view/screen transitions
 */
export function trackPageView(viewName: string, properties: Record<string, any> = {}) {
  const now = Date.now();
  const timeOnPreviousView = Math.round((now - viewStartTime) / 1000);

  // If changing view, log duration on prior view
  if (currentView && currentView !== viewName) {
    sendToGA('view_duration', {
      view_name: currentView,
      duration_seconds: timeOnPreviousView,
    });
  }

  const previousView = currentView;
  currentView = viewName;
  viewStartTime = now;

  const eventPayload = {
    page_title: `GTD - ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
    page_path: `/${viewName}`,
    view_name: viewName,
    previous_view: previousView,
    ...properties,
  };

  sendToGA('page_view', eventPayload);
  sendToGA('screen_view', {
    screen_name: viewName,
    ...properties,
  });

  persistEvent({
    name: 'page_view',
    category: 'navigation',
    label: viewName,
    location: viewName,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track sub-view, tab, or section changes inside a primary view
 */
export function trackSubView(
  parentView: string,
  subView: string,
  properties: Record<string, any> = {}
) {
  const fullView = `${parentView}:${subView}`;
  const eventPayload = {
    parent_view: parentView,
    sub_view: subView,
    full_view: fullView,
    view: currentView,
    ...properties,
  };

  sendToGA('sub_view_change', {
    event_category: 'navigation',
    event_label: fullView,
    ...eventPayload,
  });

  persistEvent({
    name: 'sub_view_change',
    category: 'navigation',
    label: fullView,
    location: parentView,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track button and user control clicks
 */
export function trackButtonClick(
  buttonName: string,
  location: string,
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    button_name: buttonName,
    location,
    view: currentView,
    ...properties,
  };

  sendToGA('button_click', {
    event_category: 'interaction',
    event_label: buttonName,
    ...eventPayload,
  });

  persistEvent({
    name: 'button_click',
    category: 'interaction',
    label: buttonName,
    location,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track action lifecycle events (create, complete, toggle, edit, clarify)
 */
export function trackActionEvent(
  actionType: 'create' | 'complete' | 'uncomplete' | 'edit' | 'delete' | 'clarify',
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    action_type: actionType,
    location: currentView,
    ...properties,
  };

  sendToGA(`action_${actionType}`, {
    event_category: 'actions',
    event_label: properties.title || properties.id || actionType,
    ...eventPayload,
  });

  persistEvent({
    name: `action_${actionType}`,
    category: 'actions',
    label: properties.title || properties.id,
    location: currentView,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track project lifecycle events (create, edit, delete, status_change)
 */
export function trackProjectEvent(
  projectAction: 'create' | 'edit' | 'delete' | 'status_change',
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    project_action: projectAction,
    location: currentView,
    ...properties,
  };

  sendToGA(`project_${projectAction}`, {
    event_category: 'projects',
    event_label: properties.title || properties.id,
    ...eventPayload,
  });

  persistEvent({
    name: `project_${projectAction}`,
    category: 'projects',
    label: properties.title || properties.id,
    location: currentView,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track horizon lifecycle events (create, edit, delete, rate)
 */
export function trackHorizonEvent(
  horizonAction: 'create' | 'edit' | 'delete' | 'rate',
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    horizon_action: horizonAction,
    location: currentView,
    ...properties,
  };

  sendToGA(`horizon_${horizonAction}`, {
    event_category: 'horizons',
    event_label: properties.title || properties.id,
    ...eventPayload,
  });

  persistEvent({
    name: `horizon_${horizonAction}`,
    category: 'horizons',
    label: properties.title || properties.id,
    location: currentView,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track filter interactions (tags, domains, contexts, status, altitudes, search, etc.)
 */
export function trackFilterChange(
  filterType: 'tag' | 'domain' | 'altitude' | 'context' | 'status' | 'search' | 'area' | 'goal' | 'search_category' | 'mind_sweep_category' | string,
  value: string,
  location: string = currentView
) {
  const eventPayload = {
    filter_type: filterType,
    filter_value: value,
    location,
  };

  sendToGA('filter_change', {
    event_category: 'filters',
    event_label: `${filterType}:${value}`,
    ...eventPayload,
  });

  persistEvent({
    name: 'filter_change',
    category: 'filters',
    label: `${filterType}:${value}`,
    location,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track modal open / close interactions
 */
export function trackModalEvent(
  modalName: string,
  action: 'open' | 'close' | 'submit',
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    modal_name: modalName,
    modal_action: action,
    location: currentView,
    ...properties,
  };

  sendToGA(`modal_${action}`, {
    event_category: 'modals',
    event_label: `${modalName}:${action}`,
    ...eventPayload,
  });

  persistEvent({
    name: `modal_${action}`,
    category: 'modals',
    label: `${modalName}:${action}`,
    location: currentView,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track data sync & backup operations
 */
export function trackSyncEvent(
  syncType: 'sheets_sync' | 'csv_export' | 'csv_import' | 'data_reset',
  status: 'started' | 'success' | 'error',
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    sync_type: syncType,
    status,
    location: currentView,
    ...properties,
  };

  sendToGA(`sync_${syncType}`, {
    event_category: 'sync',
    event_label: `${syncType}:${status}`,
    ...eventPayload,
  });

  persistEvent({
    name: `sync_${syncType}`,
    category: 'sync',
    label: `${syncType}:${status}`,
    location: currentView,
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track Weekly Review step progression
 */
export function trackReviewStep(
  stepType: string,
  stepId: string,
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    step_type: stepType,
    step_id: stepId,
    location: 'weekly_review',
    ...properties,
  };

  sendToGA('review_step', {
    event_category: 'review',
    event_label: `${stepType}:${stepId}`,
    ...eventPayload,
  });

  persistEvent({
    name: 'review_step',
    category: 'review',
    label: `${stepType}:${stepId}`,
    location: 'weekly_review',
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track Weekly Review completion
 */
export function trackReviewCompleted(
  properties: Record<string, any> = {}
) {
  const eventPayload = {
    location: 'weekly_review',
    ...properties,
  };

  sendToGA('review_completed', {
    event_category: 'review',
    event_label: 'weekly_review_completed',
    ...eventPayload,
  });

  persistEvent({
    name: 'review_completed',
    category: 'review',
    label: 'weekly_review_completed',
    location: 'weekly_review',
    properties: eventPayload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Initializes delegated auto-click tracking for elements with `data-track-click` or buttons
 */
let isAutoTrackingInitialized = false;

export function initGlobalClickTracking() {
  if (typeof window === 'undefined' || isAutoTrackingInitialized) return;
  isAutoTrackingInitialized = true;

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // 1. Look for explicit `data-track-click` attribute on target or closest parent
    const trackedEl = target.closest('[data-track-click]') as HTMLElement | null;
    if (trackedEl) {
      const buttonName = trackedEl.getAttribute('data-track-click') || 'unnamed_button';
      const location = trackedEl.getAttribute('data-track-location') || currentView;
      trackButtonClick(buttonName, location);
      return;
    }

    // 2. Auto-capture buttons with clear aria-label or titles
    const button = target.closest('button, [role="button"]') as HTMLElement | null;
    if (button) {
      // Skip if explicitly marked to ignore
      if (button.hasAttribute('data-track-ignore')) return;

      const ariaLabel = button.getAttribute('aria-label');
      const title = button.getAttribute('title');
      const text = button.innerText?.trim();

      // Only track if it has a meaningful identifier and isn't too long
      const identifier = ariaLabel || title || (text && text.length < 32 ? text : null);
      if (identifier) {
        trackButtonClick(identifier.toLowerCase().replace(/\s+/g, '_'), currentView);
      }
    }
  }, { passive: true, capture: true });
}

// Attach inspection helpers to window for easy debugging in console
if (typeof window !== 'undefined') {
  (window as any).__GTD_ANALYTICS__ = {
    getEvents: () => [...eventsLog],
    clearEvents: () => {
      eventsLog = [];
      sessionStorage.removeItem(STORAGE_KEY);
    },
    getCurrentView: () => currentView,
    trackEvent: (name: string, props?: Record<string, any>) => sendToGA(name, props),
  };
}
