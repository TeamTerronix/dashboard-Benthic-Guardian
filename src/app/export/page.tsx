'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { downloadReportFile } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

type Format = 'csv' | 'json' | 'netcdf' | 'pdf';

interface ExportConfig {
  format: Format;
  dateFrom: string;
  dateTo: string;
  includeSST: boolean;
  includeDHW: boolean;
  includePredictions: boolean;
  includeMetadata: boolean;
}

const formatInfo: Record<Format, { icon: typeof FileSpreadsheet; label: string; desc: string; available: boolean }> = {
  csv: { icon: FileSpreadsheet, label: 'CSV', desc: 'Server-generated spreadsheet export', available: true },
  json: { icon: FileJson, label: 'JSON', desc: 'Server-generated structured export', available: true },
  netcdf: { icon: FileType, label: 'NetCDF', desc: 'Coming soon', available: false },
  pdf: { icon: FileText, label: 'PDF Report', desc: 'Server-generated Benthic Guardian PDF', available: true },
};

const mimeByFormat: Record<'csv' | 'json' | 'pdf', string> = {
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  pdf: 'application/pdf',
};

function downloadFile(contents: BlobPart, mime: string, filename: string) {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const dateRange = useDashboardStore((s) => s.dateRange);
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    includeSST: true,
    includeDHW: true,
    includePredictions: false,
    includeMetadata: true,
  });
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    setMessage(null);
    if (!['csv', 'json', 'pdf'].includes(config.format)) {
      setError('This export format is not available yet.');
      return;
    }
    if (!config.dateFrom || !config.dateTo || config.dateFrom > config.dateTo) {
      setError('Choose a valid date range.');
      return;
    }
    if (!config.includeSST && !config.includeDHW && !config.includePredictions) {
      setError('Select at least one data layer.');
      return;
    }

    setExporting(true);
    try {
      const rangeStart = `${config.dateFrom}T00:00:00.000Z`;
      const rangeEnd = `${config.dateTo}T23:59:59.999Z`;
      const basename = `benthic-guardian-${config.dateFrom}-to-${config.dateTo}`;
      const format = config.format as 'csv' | 'json' | 'pdf';

      const blob = await downloadReportFile({
        start: rangeStart,
        end: rangeEnd,
        format,
        includeSST: config.includeSST,
        includeDHW: config.includeDHW,
        includePredictions: config.includePredictions,
        includeMetadata: config.includeMetadata,
      });

      downloadFile(blob, mimeByFormat[format], `${basename}.${format}`);
      setMessage(`Exported ${format.toUpperCase()} from the Benthic Guardian API server.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Data Export Builder</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          CSV, JSON, and PDF files are generated on the backend and downloaded securely.
        </p>
      </div>

      {error && <p className="p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--danger-coral)', color: 'var(--danger-coral)' }}>{error}</p>}
      {message && <p className="p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)' }}>{message}</p>}

      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Output format</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(formatInfo) as [Format, typeof formatInfo[Format]][]).map(([key, info]) => {
            const Icon = info.icon;
            const active = config.format === key;
            return (
              <button
                type="button"
                key={key}
                disabled={!info.available}
                onClick={() => setConfig((current) => ({ ...current, format: key }))}
                className="relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: active ? 'var(--bg-elevated)' : 'transparent', borderColor: active ? 'var(--accent-cyan)' : 'var(--border)' }}
              >
                <Icon className="w-6 h-6" style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }} />
                <span className="text-xs font-semibold" style={{ color: active ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{info.label}</span>
                <span className="text-[10px] text-center" style={{ color: 'var(--text-secondary)' }}>{info.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Date range</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            From
            <input type="date" value={config.dateFrom} max={config.dateTo} onChange={(event) => setConfig((current) => ({ ...current, dateFrom: event.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} />
          </label>
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            To
            <input type="date" value={config.dateTo} min={config.dateFrom} onChange={(event) => setConfig((current) => ({ ...current, dateTo: event.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Data layers</h3>
        <div className="space-y-2">
          {([
            ['includeSST', 'Sea surface temperature (SST)'],
            ['includeDHW', 'Degree heating weeks / heat-stress data'],
            ['includePredictions', 'ML prediction results'],
            ['includeMetadata', 'Account and network metadata'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-[var(--bg-elevated)]" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={config[key]} onChange={(event) => setConfig((current) => ({ ...current, [key]: event.target.checked }))} className="accent-[#00E5FF]" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <button type="button" disabled={exporting} onClick={() => void handleExport()} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
        <Download className="w-4 h-4" />
        {exporting ? 'Preparing export...' : `Export ${config.format.toUpperCase()}`}
      </button>
    </div>
  );
}
