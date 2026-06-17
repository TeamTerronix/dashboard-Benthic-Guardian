'use client';

import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

const iconMap = { critical: XCircle, warning: AlertTriangle, info: Info, resolved: CheckCircle };
const colorMap = {
  critical: 'var(--danger-coral)',
  warning: 'var(--warn-amber)',
  info: 'var(--accent-cyan)',
  resolved: 'var(--accent-teal)',
};

export default function AlertFeed() {
  const alerts = useDashboardStore((s) => s.alerts);
  const wsConnected = useDashboardStore((s) => s.wsConnected);

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Alerts</h3>
        <span className="text-[10px] flex items-center gap-1" style={{ color: wsConnected ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: wsConnected ? 'var(--accent-teal)' : 'var(--text-secondary)' }} />
          {wsConnected ? 'Live' : 'Connecting…'}
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto max-h-48">
        {alerts.length === 0 ? (
          <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colorMap.info }} />
            <div className="flex-1 min-w-0">
              <p style={{ color: 'var(--text-primary)' }}>Alerts are delivered in real time over WebSocket when you’re logged in.</p>
              <p style={{ color: 'var(--text-secondary)' }}>Trigger one by posting a reading above 31°C to the backend.</p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = iconMap[alert.type];
            return (
              <div key={alert.id} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'var(--bg-elevated)', opacity: alert.acknowledged ? 0.55 : 1 }}>
                <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colorMap[alert.type] }} />
                <div className="flex-1 min-w-0">
                  <p style={{ color: 'var(--text-primary)' }}>{alert.message}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}