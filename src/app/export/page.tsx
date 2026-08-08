'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, FileType } from 'lucide-react';
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

const formatInfo: Record<Format, { icon: typeof FileSpreadsheet; label: string; desc: string }> = {
  csv: { icon: FileSpreadsheet, label: 'CSV', desc: 'ISO 8601 timestamps + metadata header' },
  json: { icon: FileJson, label: 'JSON / GeoJSON', desc: 'Structured data with spatial coordinates' },
  netcdf: { icon: FileType, label: 'NetCDF', desc: 'Standard oceanographic data exchange' },
  pdf: { icon: FileText, label: 'PDF Report', desc: 'Formatted summary with embedded charts' },
};

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

  const handleExport = () => {
    // In production this would trigger actual download
    alert(`Export started: ${config.format.toUpperCase()} format from ${config.dateFrom} to ${config.dateTo}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Data Export Builder</h2>

      {/* Format Selection */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Output Format</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(formatInfo) as [Format, typeof formatInfo[Format]][]).map(([key, info]) => {
            const Icon = info.icon;
            const isActive = config.format === key;
            return (
              <button
                key={key}
                onClick={() => setConfig({ ...config, format: key })}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all"
                style={{
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border)',
                }}
              >
                <Icon className="w-6 h-6" style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)' }} />
                <span className="text-xs font-semibold" style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                  {info.label}
                </span>
                <span className="text-[10px] text-center" style={{ color: 'var(--text-secondary)' }}>{info.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Date Range</h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>From</label>
            <input
              type="date"
              value={config.dateFrom}
              onChange={(e) => setConfig({ ...config, dateFrom: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm border-none outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <span className="mt-5" style={{ color: 'var(--text-secondary)' }}>→</span>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>To</label>
            <input
              type="date"
              value={config.dateTo}
              onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm border-none outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Data Layers */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Include Data Layers</h3>
        <div className="space-y-2">
          {[
            { key: 'includeSST', label: 'Sea Surface Temperature (SST)' },
            { key: 'includeDHW', label: 'Degree Heating Weeks (DHW)' },
            { key: 'includePredictions', label: 'ML Prediction Results' },
            { key: 'includeMetadata', label: 'Node Metadata & Coordinates' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 text-sm cursor-pointer p-2 rounded hover:bg-[var(--bg-elevated)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <input
                type="checkbox"
                checked={config[item.key as keyof ExportConfig] as boolean}
                onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked })}
                className="accent-[#00E5FF]"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
      >
        <Download className="w-4 h-4" />
        Export {config.format.toUpperCase()}
      </button>
    </div>
  );
}
