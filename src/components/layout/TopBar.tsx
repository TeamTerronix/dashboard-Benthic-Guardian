'use client';

import { useDashboardStore, formatRelativeUpdated } from '@/lib/store';
import { useMonitoringAreas } from '@/lib/useMonitoringAreas';
import { Bell, Thermometer, Calendar, RefreshCw, LogIn, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { clearToken, getToken } from '@/lib/auth';
import { dispatchDashboardDataRefresh } from '@/lib/data-refresh';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function TopBar() {
  const {
    dateRange,
    setDateRange,
    unit,
    toggleUnit,
    theme,
    toggleTheme,
    selectedNetworkId,
    setSelectedNetworkId,
    lastDataUpdatedAt,
  } = useDashboardStore();

  const { areas, loading: areasLoading } = useMonitoringAreas();
  const activeAlerts = useDashboardStore((s) => s.alerts.filter((a) => !a.acknowledged).length);
  const [hasToken, setHasToken] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const netRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  // Refresh relative "Updated Xm ago" label every 15s
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!netOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (netRef.current && !netRef.current.contains(e.target as Node)) setNetOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [netOpen]);

  // Drop stale selected network if user no longer has access
  useEffect(() => {
    if (areasLoading) return;
    if (selectedNetworkId && !areas.some((a) => a.id === selectedNetworkId)) {
      setSelectedNetworkId(null);
    }
  }, [areas, areasLoading, selectedNetworkId, setSelectedNetworkId]);

  const networkLabel = useMemo(() => {
    void tick;
    if (areasLoading) return 'Loading networks…';
    if (areas.length === 0) return 'No networks';
    if (!selectedNetworkId) {
      return areas.length === 1 ? areas[0].name : `All networks (${areas.length})`;
    }
    return areas.find((a) => a.id === selectedNetworkId)?.name ?? 'Network';
  }, [areas, areasLoading, selectedNetworkId, tick]);

  const updatedLabel = useMemo(
    () => formatRelativeUpdated(lastDataUpdatedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces re-eval of relative time
    [lastDataUpdatedAt, tick],
  );

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Network selector */}
        <div className="relative" ref={netRef}>
          <button
            type="button"
            onClick={() => setNetOpen((o) => !o)}
            disabled={areasLoading || areas.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm max-w-[240px] cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            title="Select monitoring network"
          >
            <span className="font-medium truncate">{networkLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
          </button>
          {netOpen && areas.length > 0 && (
            <div
              className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border py-1 shadow-lg"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              {areas.length > 1 && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-[var(--bg-elevated)]"
                  style={{
                    color: !selectedNetworkId ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    fontWeight: !selectedNetworkId ? 600 : 400,
                  }}
                  onClick={() => {
                    setSelectedNetworkId(null);
                    setNetOpen(false);
                  }}
                >
                  All networks
                </button>
              )}
              {areas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-[var(--bg-elevated)]"
                  style={{
                    color: selectedNetworkId === a.id ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    fontWeight: selectedNetworkId === a.id ? 600 : 400,
                  }}
                  onClick={() => {
                    setSelectedNetworkId(a.id);
                    setNetOpen(false);
                  }}
                >
                  <span className="block truncate">{a.name}</span>
                  {a.description && (
                    <span className="block text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {a.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="date"
            value={dateRange.from}
            max={dateRange.to}
            onChange={(e) => setDateRange(e.target.value, dateRange.to)}
            className="text-xs px-2 py-1 rounded border-none outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            aria-label="Date range start"
          />
          <span style={{ color: 'var(--text-secondary)' }}>→</span>
          <input
            type="date"
            value={dateRange.to}
            min={dateRange.from}
            max={formatToday()}
            onChange={(e) => setDateRange(dateRange.from, e.target.value)}
            className="text-xs px-2 py-1 rounded border-none outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            aria-label="Date range end"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {hasToken ? (
          <button
            onClick={() => {
              clearToken();
              setHasToken(false);
              window.location.href = '/login';
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--text-secondary)' }}
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--accent-cyan)' }}
            title="Login"
          >
            <LogIn className="w-3.5 h-3.5" />
            Login
          </Link>
        )}

        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: 'var(--accent-teal)' }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent-teal)' }} />
          </span>
          <span className="hidden sm:inline">{updatedLabel}</span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleUnit}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--accent-cyan)' }}
        >
          <Thermometer className="w-3.5 h-3.5" />
          {unit === 'celsius' ? '°C' : '°F'}
        </button>

        <button
          type="button"
          onClick={() => dispatchDashboardDataRefresh()}
          className="p-1.5 rounded cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <Link
          href="/alerts"
          className="relative p-1.5 rounded cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
          title="Alerts"
        >
          <Bell className="w-4 h-4" />
          {activeAlerts > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white pulse-alert"
              style={{ background: 'var(--danger-coral)' }}
            >
              {activeAlerts > 9 ? '9+' : activeAlerts}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
