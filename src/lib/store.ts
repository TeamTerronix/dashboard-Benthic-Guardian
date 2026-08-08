// Zustand store for global dashboard state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert } from './types';

interface DashboardState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Date range
  dateRange: { from: string; to: string };
  setDateRange: (from: string, to: string) => void;

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
  refreshIntervalSec: number;      // auto-refresh polling interval
  thresholdWarningC: number;       // chart warning threshold (°C)
  thresholdCriticalC: number;      // chart critical threshold (°C)
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

      dateRange: { from: '2026-01-26', to: '2026-02-25' },
      setDateRange: (from, to) => set({ dateRange: { from, to } }),

      availableNodes: [],
      setAvailableNodes: (nodeIds) =>
        set((s) => ({
          availableNodes: nodeIds,
          // If nothing selected yet, auto-select all loaded nodes.
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
        refreshIntervalSec: s.refreshIntervalSec,
        thresholdWarningC: s.thresholdWarningC,
        thresholdCriticalC: s.thresholdCriticalC,
      }),
    },
  ),
);
