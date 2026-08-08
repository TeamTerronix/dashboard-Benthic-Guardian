'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/lib/store';
import { Save, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const {
    unit,
    toggleUnit,
    theme,
    setTheme,
    refreshIntervalSec,
    thresholdWarningC,
    thresholdCriticalC,
    setRefreshIntervalSec,
    setThresholdWarningC,
    setThresholdCriticalC,
    resetSettings,
  } = useDashboardStore();

  // Draft UI state so Save/Reset buttons have meaning.
  const [draftRefresh, setDraftRefresh] = useState<number>(refreshIntervalSec);
  const [draftWarn, setDraftWarn] = useState<number>(thresholdWarningC);
  const [draftCrit, setDraftCrit] = useState<number>(thresholdCriticalC);

  useEffect(() => {
    setDraftRefresh(refreshIntervalSec);
    setDraftWarn(thresholdWarningC);
    setDraftCrit(thresholdCriticalC);
  }, [refreshIntervalSec, thresholdWarningC, thresholdCriticalC]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>

      {/* Display Settings */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Display</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Temperature Unit</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Toggle between Celsius and Fahrenheit</div>
          </div>
          <button
            onClick={toggleUnit}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--accent-cyan)' }}
          >
            {unit === 'celsius' ? '°C → °F' : '°F → °C'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Appearance</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Switch between dark and light mode</div>
          </div>
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="px-3 py-1.5 text-xs font-medium cursor-pointer"
              style={{
                background: theme === 'dark' ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                color: theme === 'dark' ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="px-3 py-1.5 text-xs font-medium cursor-pointer"
              style={{
                background: theme === 'light' ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                color: theme === 'light' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              Light
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Auto-refresh Interval</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>How often to poll for new data</div>
          </div>
          <select
            value={draftRefresh}
            onChange={(e) => setDraftRefresh(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-xs border-none outline-none cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={900}>15 minutes</option>
            <option value={3600}>1 hour</option>
          </select>
        </div>
      </div>

      {/* Threshold Settings */}
      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Temperature Thresholds</h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--warn-amber)' }}>Warning Threshold</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Triggers yellow alerts on charts</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={0.1}
              value={draftWarn}
              onChange={(e) => setDraftWarn(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 rounded text-sm font-mono text-right border-none outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--warn-amber)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>°C</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ color: 'var(--danger-coral)' }}>Critical Threshold</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Triggers red alerts and notifications</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={0.1}
              value={draftCrit}
              onChange={(e) => setDraftCrit(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 rounded text-sm font-mono text-right border-none outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--danger-coral)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>°C</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setRefreshIntervalSec(draftRefresh);
            setThresholdWarningC(draftWarn);
            setThresholdCriticalC(draftCrit);
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
        <button
          onClick={() => {
            resetSettings();
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-opacity hover:opacity-90 border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
