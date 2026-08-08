'use client';

/**
 * websocket.tsx
 * =============
 * Client-side WebSocket connection for real-time bleaching alerts.
 *
 * - Reads the JWT from localStorage after mount (avoids SSR mismatch)
 * - Connects to /ws/alerts?token=<jwt>
 * - On `reading_new`, dispatches a dashboard data refresh (refetch APIs)
 * - On `bleaching_alert`, pushes into the alerts store and shows a toast
 * - Tracks connection status in the store (wsConnected)
 * - Reconnects automatically on disconnect
 *
 * Mount <AlertWebSocket /> once in layout.tsx — it renders nothing to the DOM.
 */

import { useEffect, useMemo, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { toast } from 'sonner';

import { getBleachingAlertsWebSocketUrl } from './api-base';
import { dispatchDashboardDataRefresh } from './data-refresh';
import { useDashboardStore } from './store';
import type { Alert } from './types';

interface AlertMessage {
  type: string;
  sensor_id: number;
  sensor_uid: string;
  location_name: string;
  temperature: number;
  risk_level: number;
  timestamp: string;
}

function AlertWebSocketInner({ token }: { token: string }) {
  const url = useMemo(() => getBleachingAlertsWebSocketUrl(token), [token]);
  if (!url) return null;
  return <AlertWebSocketConnected url={url} />;
}

function AlertWebSocketConnected({ url }: { url: string }) {
  const { lastJsonMessage, readyState } = useWebSocket(url, {
    shouldReconnect: () => true,
    reconnectAttempts: 20,
    reconnectInterval: 4000,
  });
  const setWsConnected = useDashboardStore((s) => s.setWsConnected);
  const addAlert = useDashboardStore((s) => s.addAlert);

  useEffect(() => {
    setWsConnected(readyState === ReadyState.OPEN);
  }, [readyState, setWsConnected]);

  useEffect(() => {
    if (!lastJsonMessage) return;
    const msg = lastJsonMessage as AlertMessage & { type?: string };

    if (msg.type === 'reading_new' || msg.type === 'bleaching_alert') {
      dispatchDashboardDataRefresh();
    }
    if (msg.type !== 'bleaching_alert') return;

    const loc = msg.location_name ?? msg.sensor_uid;

    addAlert({
      id: `${msg.sensor_id}-${msg.timestamp}`,
      type: 'critical',
      nodeId: msg.sensor_uid,
      message: `${loc} recorded ${msg.temperature.toFixed(1)}°C (bleaching threshold exceeded)`,
      temperature: msg.temperature,
      timestamp: msg.timestamp,
      acknowledged: false,
    } satisfies Alert);

    toast.error(`Bleaching Alert — ${loc}`, {
      description: `Sensor ${msg.sensor_uid} recorded ${msg.temperature.toFixed(1)}°C (bleaching threshold exceeded)`,
      duration: 12000,
      action: {
        label: 'View on Map',
        onClick: () => { window.location.href = '/map'; },
      },
    });
  }, [lastJsonMessage, addAlert]);

  return null;
}

export function AlertWebSocket() {
  const [token, setToken] = useState<string | null>(null);
  const setWsConnected = useDashboardStore((s) => s.setWsConnected);

  useEffect(() => {
    setToken(localStorage.getItem('sliot_token'));
    return () => setWsConnected(false);
  }, [setWsConnected]);

  if (!token) return null;
  return <AlertWebSocketInner token={token} />;
}