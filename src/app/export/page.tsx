'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { generateReport, type ReportApiPayload } from '@/lib/api';
import { useDashboardStore } from '@/lib/store';

type Format = 'csv' | 'json' | 'netcdf' | 'pdf';
type ReportFormat = 'csv' | 'json' | 'pdf';

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
  csv: { icon: FileSpreadsheet, label: 'CSV', desc: 'Spreadsheet-ready data', available: true },
  json: { icon: FileJson, label: 'JSON', desc: 'Structured data and metadata', available: true },
  netcdf: { icon: FileType, label: 'NetCDF', desc: 'Coming soon', available: false },
  pdf: { icon: FileText, label: 'PDF Report', desc: 'Generated from the report payload', available: true },
};

function rowsFrom(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { value?: unknown }).value)) {
    return (payload as { value: Record<string, unknown>[] }).value;
  }
  return [];
}

function safeCsvCell(value: unknown): string {
  if (value == null) return '';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(groups: { name: string; rows: Record<string, unknown>[] }[], metadata?: Record<string, unknown>): string {
  const flattened: Record<string, unknown>[] = groups.flatMap((group) => group.rows.map((row) => ({ dataset: group.name, ...row })));
  const columns = Array.from(new Set(flattened.flatMap((row) => Object.keys(row))));
  const body = [
    columns.map(safeCsvCell).join(','),
    ...flattened.map((row) => columns.map((column) => safeCsvCell(row[column])).join(',')),
  ];
  if (!metadata) return body.join('\r\n');
  const comments = Object.entries(metadata).map(([key, value]) => `# ${key}: ${String(value)}`);
  return [...comments, ...body].join('\r\n');
}

function downloadFile(contents: BlobPart, mime: string, filename: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r/g, '').replace(/\n/g, ' ');
}

function buildPdfReport(report: ReportApiPayload): string {
  const lines = [
    'SLIOT Report',
    `Generated: ${report.summary.generated_at ?? 'n/a'}`,
    `Range: ${report.summary.date_from ?? 'start'} to ${report.summary.date_to ?? 'end'}`,
    `Readings: ${report.summary.total_readings}`,
    `Predictions: ${report.summary.total_predictions}`,
    `DHW points: ${report.summary.total_dhw}`,
    `Avg temp: ${report.summary.average_temperature ?? 'n/a'}°C`,
    `Max temp: ${report.summary.max_temperature ?? 'n/a'}°C`,
    `Healthy: ${report.risk_summary.healthy}`,
    `Warning: ${report.risk_summary.warning}`,
    `Danger: ${report.risk_summary.danger}`,
    `Avg risk: ${report.risk_summary.avg_risk_score ?? 'n/a'}`,
  ];

  let content = '';
  lines.forEach((line, index) => {
    const y = 790 - index * 18;
    content += `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET\n`;
  });

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

export default function ExportPage() {
  const dateRange = useDashboardStore((s) => s.dateRange);
  const selectedNetworkId = useDashboardStore((s) => s.selectedNetworkId);
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
      const reportFormat: ReportFormat = config.format === 'netcdf' ? 'json' : config.format;
      const report = await generateReport({
        start: rangeStart,
        end: rangeEnd,
        format: reportFormat,
      });

      const groups: { name: string; rows: Record<string, unknown>[] }[] = [];
      if (config.includeSST) groups.push({ name: 'sst', rows: report.datasets.sst ?? [] });
      if (config.includeDHW) groups.push({ name: 'dhw', rows: report.datasets.dhw ?? [] });
      if (config.includePredictions) groups.push({ name: 'predictions', rows: report.datasets.predictions ?? [] });

      const rowCount = groups.reduce((sum, group) => sum + group.rows.length, 0);
      const metadata = config.includeMetadata
        ? {
            generated_at: report.metadata.generated_at ?? new Date().toISOString(),
            generated_by: report.metadata.generated_by ?? '',
            date_from: config.dateFrom,
            date_to: config.dateTo,
            selected_network_id: selectedNetworkId ?? 'all-visible-networks',
            visible_networks: 'report-generated-from-api',
            row_count: rowCount,
          }
        : undefined;
      const basename = `benthic-guardian-${config.dateFrom}-to-${config.dateTo}`;

      if (config.format === 'csv') {
        downloadFile(buildCsv(groups, metadata), 'text/csv;charset=utf-8', `${basename}.csv`);
      } else if (config.format === 'json') {
        downloadFile(
          JSON.stringify({ metadata, data: Object.fromEntries(groups.map((group) => [group.name, group.rows])) }, null, 2),
          'application/json;charset=utf-8',
          `${basename}.json`,
        );
      } else {
        downloadFile(buildPdfReport(report), 'application/pdf;charset=utf-8', `${basename}.pdf`);
      }
      setMessage(`Exported ${rowCount.toLocaleString()} rows.`);
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
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>CSV and JSON downloads contain live data from the API.</p>
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
