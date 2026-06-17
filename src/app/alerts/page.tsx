'use client';

import { AlertTriangle, CheckCircle, Info, Wifi, WifiOff, XCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

const iconMap = { critical: XCircle, warning: AlertTriangle, info: Info, resolved: CheckCircle };
const colorMap = {
  critical: 'var(--danger-coral)',
  warning: 'var(--warn-amber)',
  info: 'var(--accent-cyan)',
  resolved: 'var(--accent-teal)',
};

export default function AlertsPage() {
  const alerts = useDashboardStore((s) => s.alerts);
  const wsConnected = useDashboardStore((s) => s.wsConnected);
  const acknowledgeAlert = useDashboardStore((s) => s.acknowledgeAlert);
  const clearAlerts = useDashboardStore((s) => s.clearAlerts);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        {wsConnected ? <Wifi className="w-5 h-5 shrink-0" style={{ color: 'var(--accent-teal)' }} /> : <WifiOff className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />}
        <div className="flex-1">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {wsConnected ? 'Connected — receiving live alerts' : 'Connecting…'}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Alerts shown below arrived during this session — historical alert storage isn’t implemented in the backend yet.
          </p>
        </div>
        {alerts.length > 0 && (
          <button onClick={clearAlerts} className="text-xs px-2 py-1 rounded-md border shrink-0" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Clear
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-sm p-6 text-center rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          No alerts yet this session. Waiting for live data…
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = iconMap[alert.type];
            return (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', opacity: alert.acknowledged ? 0.55 : 1 }}>
                <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: colorMap[alert.type] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{alert.message}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{alert.nodeId} · {new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                {!alert.acknowledged && (
                  <button onClick={() => acknowledgeAlert(alert.id)} className="text-xs px-2 py-1 rounded-md border shrink-0" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    Acknowledge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}