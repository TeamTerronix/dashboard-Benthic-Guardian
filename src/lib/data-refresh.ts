/**
 * Browser event fired when the API pushes new sensor data (WebSocket `reading_new`)
 * or bleaching alerts. Components refetch API data when this fires.
 */
export const DASHBOARD_DATA_REFRESH = 'bg-dashboard-data-refresh';

export function dispatchDashboardDataRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DASHBOARD_DATA_REFRESH));
}

export function subscribeDashboardDataRefresh(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(DASHBOARD_DATA_REFRESH, handler);
  return () => window.removeEventListener(DASHBOARD_DATA_REFRESH, handler);
}
