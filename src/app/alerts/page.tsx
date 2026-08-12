'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  getAlertOperators,
  getAlerts,
  mapPersistedAlert,
  updateAlert,
  type AlertOperator,
} from '@/lib/api';
import { useDashboardStore } from '@/lib/store';
import type { Alert } from '@/lib/types';

type AlertStatus = '' | 'open' | 'acknowledged' | 'resolved';
type AlertType = '' | 'critical' | 'warning' | 'info';

const iconMap = { critical: XCircle, warning: AlertTriangle, info: Info, resolved: CheckCircle };
const colorMap = {
  critical: 'var(--danger-coral)',
  warning: 'var(--warn-amber)',
  info: 'var(--accent-cyan)',
  resolved: 'var(--accent-teal)',
};

export default function AlertsPage() {
  const wsConnected = useDashboardStore((s) => s.wsConnected);
  const setGlobalAlerts = useDashboardStore((s) => s.setAlerts);
  const newestLiveAlertId = useDashboardStore((s) => s.alerts[0]?.id);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [operators, setOperators] = useState<AlertOperator[]>([]);
  const [statusFilter, setStatusFilter] = useState<AlertStatus>('');
  const [typeFilter, setTypeFilter] = useState<AlertType>('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAlerts({
        status: statusFilter,
        type: typeFilter,
        assignedToId: assignedFilter ? Number(assignedFilter) : null,
      });
      const mapped = rows.map(mapPersistedAlert);
      setAlerts(mapped);
      setNotesDraft(Object.fromEntries(mapped.map((alert) => [alert.id, alert.notes ?? ''])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load alert history.');
    } finally {
      setLoading(false);
    }
  }, [assignedFilter, statusFilter, typeFilter]);

  const refreshGlobalAlerts = useCallback(async () => {
    const recent = await getAlerts({ limit: 50 });
    setGlobalAlerts(recent.map(mapPersistedAlert));
  }, [setGlobalAlerts]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (newestLiveAlertId) void loadAlerts();
  }, [loadAlerts, newestLiveAlertId]);

  useEffect(() => {
    getAlertOperators().then(setOperators).catch(() => setOperators([]));
  }, []);

  const update = async (
    alert: Alert,
    payload: {
      status?: 'open' | 'acknowledged' | 'resolved';
      assigned_to_id?: number | null;
      notes?: string | null;
    },
  ) => {
    setSavingId(alert.id);
    setError(null);
    try {
      const saved = mapPersistedAlert(await updateAlert(alert.id, payload));
      setAlerts((items) => items.map((item) => (item.id === saved.id ? saved : item)));
      setNotesDraft((drafts) => ({ ...drafts, [saved.id]: saved.notes ?? '' }));
      await refreshGlobalAlerts();
      if (statusFilter && saved.status !== statusFilter) {
        await loadAlerts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update alert.');
    } finally {
      setSavingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      open: alerts.filter((alert) => alert.status === 'open').length,
      acknowledged: alerts.filter((alert) => alert.status === 'acknowledged').length,
      resolved: alerts.filter((alert) => alert.status === 'resolved').length,
    }),
    [alerts],
  );

  return (
    <div className="space-y-5">
      <div
        className="flex flex-col md:flex-row md:items-start gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {wsConnected ? (
          <Wifi className="w-5 h-5 shrink-0" style={{ color: 'var(--accent-teal)' }} />
        ) : (
          <WifiOff className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
        )}
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Persistent alert history
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {wsConnected ? 'Live connection active.' : 'Live connection unavailable.'} History,
            assignments, notes and workflow state are saved on the server.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span style={{ color: 'var(--danger-coral)' }}>{counts.open} open</span>
          <span style={{ color: 'var(--warn-amber)' }}>{counts.acknowledged} acknowledged</span>
          <span style={{ color: 'var(--accent-teal)' }}>{counts.resolved} resolved</span>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as AlertStatus)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          aria-label="Filter alerts by status"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as AlertType)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          aria-label="Filter alerts by type"
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Information</option>
        </select>
        <select
          value={assignedFilter}
          onChange={(event) => setAssignedFilter(event.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          aria-label="Filter alerts by assigned operator"
        >
          <option value="">All operators</option>
          {operators.map((operator) => (
            <option key={operator.id} value={operator.id}>{operator.email}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadAlerts()}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--danger-coral)', color: 'var(--danger-coral)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading alert history...
        </div>
      ) : alerts.length === 0 ? (
        <div
          className="p-8 text-center rounded-xl border text-sm"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          No alerts match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = iconMap[alert.type];
            const isSaving = savingId === alert.id;
            return (
              <article
                key={alert.id}
                className="p-4 rounded-xl border space-y-4"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <Icon className="w-5 h-5 shrink-0" style={{ color: colorMap[alert.type] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {alert.message}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {alert.nodeId} ? {new Date(alert.timestamp).toLocaleString()}
                      {alert.acknowledgedByEmail ? ` ? acknowledged by ${alert.acknowledgedByEmail}` : ''}
                    </p>
                  </div>
                  <span
                    className="self-start px-2 py-1 rounded-full text-[11px] font-semibold uppercase"
                    style={{ background: 'var(--bg-elevated)', color: colorMap[alert.type] }}
                  >
                    {alert.status ?? (alert.acknowledged ? 'acknowledged' : 'open')}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,260px)_1fr_auto] gap-3">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Assigned operator
                    <select
                      value={alert.assignedToId ?? ''}
                      disabled={isSaving}
                      onChange={(event) => void update(alert, {
                        assigned_to_id: event.target.value ? Number(event.target.value) : null,
                      })}
                      className="mt-1 w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Unassigned</option>
                      {operators.map((operator) => (
                        <option key={operator.id} value={operator.id}>{operator.email}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Operator notes
                    <textarea
                      value={notesDraft[alert.id] ?? ''}
                      onChange={(event) => setNotesDraft((drafts) => ({
                        ...drafts,
                        [alert.id]: event.target.value,
                      }))}
                      rows={2}
                      maxLength={4000}
                      className="mt-1 w-full px-3 py-2 rounded-lg text-sm resize-y"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                      placeholder="Add investigation or response notes"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void update(alert, { notes: notesDraft[alert.id] ?? '' })}
                    className="self-end flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <Save className="w-4 h-4" />
                    Save notes
                  </button>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {alert.status !== 'open' && (
                    <button type="button" disabled={isSaving} onClick={() => void update(alert, { status: 'open' })} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      Reopen
                    </button>
                  )}
                  {alert.status === 'open' && (
                    <button type="button" disabled={isSaving} onClick={() => void update(alert, { status: 'acknowledged' })} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50" style={{ borderColor: 'var(--warn-amber)', color: 'var(--warn-amber)' }}>
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button type="button" disabled={isSaving} onClick={() => void update(alert, { status: 'resolved' })} className="px-3 py-1.5 rounded-lg text-xs border disabled:opacity-50" style={{ borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)' }}>
                      Resolve
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
