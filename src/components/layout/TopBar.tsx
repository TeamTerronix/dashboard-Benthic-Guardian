'use client';

import { useDashboardStore } from '@/lib/store';
import { Bell, Thermometer, Calendar, RefreshCw, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { clearToken, getToken } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function TopBar() {
  const { dateRange, setDateRange, unit, toggleUnit, theme, toggleTheme } = useDashboardStore();
  const activeAlerts = 0;
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left: Site selector & date range */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        >
          <span className="font-medium">Coral Triangle — Zone A</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(e.target.value, dateRange.to)}
            className="text-xs px-2 py-1 rounded border-none outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>→</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(dateRange.from, e.target.value)}
            className="text-xs px-2 py-1 rounded border-none outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
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
          Last updated 3m ago
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
          className="p-1.5 rounded cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          className="relative p-1.5 rounded cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell className="w-4 h-4" />
          {activeAlerts > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white pulse-alert"
              style={{ background: 'var(--danger-coral)' }}
            >
              {activeAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
