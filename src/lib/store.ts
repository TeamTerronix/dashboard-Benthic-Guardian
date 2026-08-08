// Zustand store for global dashboard state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert } from './types';

/** YYYY-MM-DD in local time */
export function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Default range: last 7 days → today */
export function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

interface DashboardState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Date range (filters history views)
  dateRange: { from: string; to: string };
  setDateRange: (from: string, to: string) => void;

  // Selected network group id (null = all networks the user can see)
  selectedNetworkId: string | null;
  setSelectedNetworkId: (id: string | null) => void;

  // Last successful dashboard data refresh (ISO string or null)
  lastDataUpdatedAt: string | null;
  setLastDataUpdatedAt: (iso: string | null) => void;

  // Available nodes (from backend)
  availableNodes: string[];
  setAvailableNodes: (nodeIds: string[]) => void;

  // Selected nodes
  selectedNodes: string[];
  toggleNode: (nodeId: string) => void;
  selectAllNodes: () => void;
  deselectAllNodes: () => void;

  // Unit
  unit: 'celsius' | 'fahrenheit';
  toggleUnit: () => void;

  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Settings (persisted)
  refreshIntervalSec: number;
  thresholdWarningC: number;
  thresholdCriticalC: number;
  setRefreshIntervalSec: (sec: number) => void;
  setThresholdWarningC: (c: number) => void;
  setThresholdCriticalC: (c: number) => void;
  resetSettings: () => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Alerts
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;

  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

const DEFAULT_SETTINGS = {
  refreshIntervalSec: 300,
  thresholdWarningC: 28.0,
  thresholdCriticalC: 29.0,
} as const;

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      alerts: [],
      addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 50) })),
      acknowledgeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)) })),
      clearAlerts: () => set({ alerts: [] }),

      wsConnected: false,
      setWsConnected: (connected) => set({ wsConnected: connected }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      dateRange: defaultDateRange(),
      setDateRange: (from, to) => set({ dateRange: { from, to } }),

      selectedNetworkId: null,
      setSelectedNetworkId: (id) => set({ selectedNetworkId: id }),

      lastDataUpdatedAt: null,
      setLastDataUpdatedAt: (iso) => set({ lastDataUpdatedAt: iso }),

      availableNodes: [],
      setAvailableNodes: (nodeIds) =>
        set((s) => ({
          availableNodes: nodeIds,
          selectedNodes: s.selectedNodes.length === 0 ? nodeIds : s.selectedNodes,
        })),

      selectedNodes: [],
      toggleNode: (nodeId) =>
        set((s) => ({
          selectedNodes: s.selectedNodes.includes(nodeId)
            ? s.selectedNodes.filter((id) => id !== nodeId)
            : [...s.selectedNodes, nodeId],
        })),
      selectAllNodes: () => set((s) => ({ selectedNodes: s.availableNodes })),
      deselectAllNodes: () => set({ selectedNodes: [] }),

      unit: 'celsius',
      toggleUnit: () => set((s) => ({ unit: s.unit === 'celsius' ? 'fahrenheit' : 'celsius' })),

      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      refreshIntervalSec: DEFAULT_SETTINGS.refreshIntervalSec,
      thresholdWarningC: DEFAULT_SETTINGS.thresholdWarningC,
      thresholdCriticalC: DEFAULT_SETTINGS.thresholdCriticalC,
      setRefreshIntervalSec: (sec) => set({ refreshIntervalSec: sec }),
      setThresholdWarningC: (c) => set({ thresholdWarningC: c }),
      setThresholdCriticalC: (c) => set({ thresholdCriticalC: c }),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),

      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),
    }),
    {
      name: 'bg_dashboard_store',
      partialize: (s) => ({
        unit: s.unit,
        theme: s.theme,
        dateRange: s.dateRange,
        selectedNetworkId: s.selectedNetworkId,
        refreshIntervalSec: s.refreshIntervalSec,
        thresholdWarningC: s.thresholdWarningC,
        thresholdCriticalC: s.thresholdCriticalC,
      }),
    },
  ),
);

/** Human-readable relative time for "Last updated …" */
export function formatRelativeUpdated(iso: string | null): string {
  if (!iso) return 'Waiting for data…';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'Waiting for data…';
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 15) return 'Updated just now';
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  const hr = Math.round(min / 60);
  return `Updated ${hr}h ago`;
}
