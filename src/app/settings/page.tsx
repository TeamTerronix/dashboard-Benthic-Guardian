'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { getDashboardSettings, saveDashboardSettings } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

const DEFAULTS = {
  unit: 'celsius' as const,
  theme: 'dark' as const,
  refreshIntervalSec: 300,
  thresholdWarningC: 28,
  thresholdCriticalC: 29,
};

export default function SettingsPage() {
  const {
    unit,
    setUnit,
    theme,
    setTheme,
    refreshIntervalSec,
    thresholdWarningC,
    thresholdCriticalC,
    applyRemoteSettings,
  } = useDashboardStore();
  const [draftRefresh, setDraftRefresh] = useState(refreshIntervalSec);
  const [draftWarn, setDraftWarn] = useState(thresholdWarningC);
  const [draftCrit, setDraftCrit] = useState(thresholdCriticalC);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboardSettings()
      .then((settings) => {
        if (cancelled) return;
        applyRemoteSettings({
          unit: settings.unit,
          theme: settings.theme,
          refreshIntervalSec: settings.refresh_interval_sec,
          thresholdWarningC: settings.threshold_warning_c,
          thresholdCriticalC: settings.threshold_critical_c,
        });
        setDraftRefresh(settings.refresh_interval_sec);
        setDraftWarn(settings.threshold_warning_c);
        setDraftCrit(settings.threshold_critical_c);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyRemoteSettings]);

  useEffect(() => {
    setDraftRefresh(refreshIntervalSec);
    setDraftWarn(thresholdWarningC);
    setDraftCrit(thresholdCriticalC);
  }, [refreshIntervalSec, thresholdWarningC, thresholdCriticalC]);

  const persist = async (next = {
    unit,
    theme,
    refreshIntervalSec: draftRefresh,
    thresholdWarningC: draftWarn,
    thresholdCriticalC: draftCrit,
  }) => {
    setError(null);
    setMessage(null);
    if (!Number.isFinite(next.thresholdWarningC) || !Number.isFinite(next.thresholdCriticalC)) {
      setError('Enter valid numeric thresholds.');
      return;
    }
    if (next.thresholdCriticalC <= next.thresholdWarningC) {
      setError('Critical threshold must be higher than the warning threshold.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveDashboardSettings({
        unit: next.unit,
        theme: next.theme,
        refresh_interval_sec: next.refreshIntervalSec,
        threshold_warning_c: next.thresholdWarningC,
        threshold_critical_c: next.thresholdCriticalC,
      });
      applyRemoteSettings({
        unit: saved.unit,
        theme: saved.theme,
        refreshIntervalSec: saved.refresh_interval_sec,
        thresholdWarningC: saved.threshold_warning_c,
        thresholdCriticalC: saved.threshold_critical_c,
      });
      setMessage('Settings saved to your account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setUnit(DEFAULTS.unit);
    setTheme(DEFAULTS.theme);
    setDraftRefresh(DEFAULTS.refreshIntervalSec);
    setDraftWarn(DEFAULTS.thresholdWarningC);
    setDraftCrit(DEFAULTS.thresholdCriticalC);
    void persist(DEFAULTS);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          These preferences are saved to your account and follow you across browsers.
        </p>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading saved settings...</p>}
      {error && <p className="text-sm p-3 rounded-lg border" style={{ color: 'var(--danger-coral)', borderColor: 'var(--danger-coral)' }}>{error}</p>}
      {message && <p className="text-sm p-3 rounded-lg border" style={{ color: 'var(--accent-teal)', borderColor: 'var(--accent-teal)' }}>{message}</p>}

      <section className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Display</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Temperature unit</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Choose Celsius or Fahrenheit.</div>
          </div>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['celsius', 'fahrenheit'] as const).map((value) => (
              <button key={value} type="button" onClick={() => setUnit(value)} className="px-3 py-1.5 text-xs font-medium" style={{ background: unit === value ? 'var(--accent-cyan)' : 'var(--bg-elevated)', color: unit === value ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>
                {value === 'celsius' ? '\u00b0C' : '\u00b0F'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Appearance</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Switch between dark and light mode.</div>
          </div>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['dark', 'light'] as const).map((value) => (
              <button key={value} type="button" onClick={() => setTheme(value)} className="px-3 py-1.5 text-xs font-medium capitalize" style={{ background: theme === value ? 'var(--accent-cyan)' : 'var(--bg-elevated)', color: theme === value ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Auto-refresh interval</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>How often the dashboard polls for fresh data.</div>
          </div>
          <select value={draftRefresh} onChange={(event) => setDraftRefresh(Number(event.target.value))} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
            <option value={3600}>1 hour</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chart thresholds</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            These values control your chart colours. Server-generated bleaching alerts currently use the operational 31&deg;C threshold.
          </p>
        </div>
        <ThresholdInput label="Warning threshold" value={draftWarn} color="var(--warn-amber)" onChange={setDraftWarn} />
        <ThresholdInput label="Critical threshold" value={draftCrit} color="var(--danger-coral)" onChange={setDraftCrit} />
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" disabled={saving || loading} onClick={() => void persist()} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        <button type="button" disabled={saving || loading} onClick={reset} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm border disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <RotateCcw className="w-4 h-4" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function ThresholdInput({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm" style={{ color }}>
      {label}
      <span className="flex items-center gap-2">
        <input type="number" min={-5} max={50} step={0.1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-24 px-3 py-2 rounded-lg text-right" style={{ background: 'var(--bg-elevated)', color }} />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>&deg;C</span>
      </span>
    </label>
  );
}
