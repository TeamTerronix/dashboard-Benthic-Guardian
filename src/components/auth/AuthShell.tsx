'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import AutoRefreshTicker from '@/components/layout/AutoRefreshTicker';
import { AlertWebSocket } from '@/lib/websocket';
import { getToken, subscribeAuthChanged } from '@/lib/auth';
import { getAlerts, getDashboardSettings, mapPersistedAlert } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const sidebarCollapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const setAlerts = useDashboardStore((s) => s.setAlerts);
  const applyRemoteSettings = useDashboardStore((s) => s.applyRemoteSettings);
  const setMobileSidebarOpen = useDashboardStore((s) => s.setMobileSidebarOpen);

  useEffect(() => {
    const sync = () => {
      setHasToken(Boolean(getToken()));
      setReady(true);
    };
    sync();
    const unsub = subscribeAuthChanged(sync);
    return unsub;
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    if (pathname === '/login') return;
    if (!hasToken) router.replace('/login');
  }, [hasToken, pathname, ready, router]);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    Promise.all([getAlerts({ limit: 50 }), getDashboardSettings()])
      .then(([alerts, settings]) => {
        if (cancelled) return;
        setAlerts(alerts.map(mapPersistedAlert));
        applyRemoteSettings({
          unit: settings.unit,
          theme: settings.theme,
          refreshIntervalSec: settings.refresh_interval_sec,
          thresholdWarningC: settings.threshold_warning_c,
          thresholdCriticalC: settings.threshold_critical_c,
        });
      })
      .catch(() => {
        // Keep locally cached preferences if the API is temporarily unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [applyRemoteSettings, hasToken, setAlerts]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  // Login page: no app chrome.
  if (pathname === '/login') return <>{children}</>;

  // While redirecting, show a small gate screen (avoids "blank page").
  if (!ready || !hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertWebSocket />
      <AutoRefreshTicker />
      <Sidebar />
      <div className={`min-h-screen flex flex-col transition-[margin] duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'}`}>
        <TopBar />
        <main className="flex-1 p-3 md:p-6 overflow-auto">{children}</main>
      </div>
    </>
  );
}

