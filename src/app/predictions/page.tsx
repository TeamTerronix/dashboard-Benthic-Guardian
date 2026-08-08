'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';
import { tempToColor } from '@/lib/utils';
import type { PredictionPoint, ForecastData } from '@/lib/types';
import { getDHW, getLatestReadings, getLSTMForecast, getPredictions, getSST, mapLatestReadingRow } from '@/lib/api';
import { nearestAreaId } from '@/lib/geo';
import { useMonitoringAreas } from '@/lib/useMonitoringAreas';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';
import { useDashboardStore } from '@/lib/store';

type ModelType = 'PINN' | 'LSTM' | 'Ensemble';
type Horizon = '72h' | '7d' | '30d';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD from start through end */
function eachDayInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = shiftDays(cur, 1);
  }
  return out;
}

/** Aggregate rows into daily means keyed by YYYY-MM-DD */
function dailyMeans(
  rows: Record<string, unknown>[],
  timeKey: string,
  valueKey: string,
): Record<string, number> {
  const agg: Record<string, { sum: number; n: number }> = {};
  for (const r of rows) {
    const raw = r[timeKey];
    const day = String(raw ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const t = Number(r[valueKey]);
    if (!Number.isFinite(t)) continue;
    if (!agg[day]) agg[day] = { sum: 0, n: 0 };
    agg[day].sum += t;
    agg[day].n += 1;
  }
  const out: Record<string, number> = {};
  for (const [d, a] of Object.entries(agg)) {
    out[d] = a.sum / a.n;
  }
  return out;
}

function asRowArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).value)) {
    return (payload as any).value as Record<string, unknown>[];
  }
  return [];
}

export default function PredictionsPage() {
  const { areas, loading: areasLoading } = useMonitoringAreas();
  const selectedNetworkId = useDashboardStore((s) => s.selectedNetworkId);
  const [model, setModel] = useState<ModelType>('PINN');
  const [horizon, setHorizon] = useState<Horizon>('7d');
  const [confidence, setConfidence] = useState<90 | 95>(95);
  const [mounted, setMounted] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [runTick, setRunTick] = useState(0);
  const [forecastNote, setForecastNote] = useState<string | null>(null);

  const horizonDays = horizon === '72h' ? 3 : horizon === '7d' ? 7 : 30;
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [predGrid, setPredGrid] = useState<PredictionPoint[]>([]);
  const [dhwData, setDhwData] = useState<{ week: string; dhw: number }[]>([]);
  const [zoneRisks, setZoneRisks] = useState<{ zone: string; risk: number }[]>([]);
  const [dataRefreshTick, setDataRefreshTick] = useState(0);

  useEffect(() => {
    return subscribeDashboardDataRefresh(() => setDataRefreshTick((t) => t + 1));
  }, []);

  // LSTM only has 1/3/7-day points — clamp UI if needed
  useEffect(() => {
    if ((model === 'LSTM' || model === 'Ensemble') && horizon === '30d') {
      setHorizon('7d');
    }
  }, [model, horizon]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingForecast(true);
      try {
        const today = todayISO();
        // Always build a fixed axis for this horizon so 72h / 7d / 30d look different
        const histDaysCount = horizon === '72h' ? 5 : horizon === '7d' ? 7 : 14;
        const histStart = shiftDays(today, -histDaysCount);
        const histEnd = today;
        const forecastStart = shiftDays(today, 1);
        const forecastEnd = shiftDays(today, horizonDays);
        const histAxis = eachDayInclusive(histStart, histEnd);
        const forecastAxis = eachDayInclusive(forecastStart, forecastEnd);

        const ci =
          confidence === 95 ? (model === 'PINN' ? 0.6 : 0.5) : model === 'PINN' ? 0.45 : 0.35;

        // Historical temperatures from sensor readings (/api/sst)
        let histMeans: Record<string, number> = {};
        try {
          const sst = await getSST(histStart, shiftDays(today, 1), 5000);
          histMeans = dailyMeans(asRowArray(sst), 'time', 'temperature');
        } catch {
          histMeans = {};
        }

        let predMeans: Record<string, number> = {};
        let lstmByDay: Record<string, number> = {};
        let note: string | null = null;
        let loadError: string | null = null;

        if (model === 'LSTM' || model === 'Ensemble') {
          const locHint =
            selectedNetworkId?.includes('trinco') || selectedNetworkId?.includes('pigeon')
              ? 'trinco'
              : 'hikkaduwa';
          try {
            const lstm = await getLSTMForecast(locHint);
            lstmByDay = Object.fromEntries(
              lstm.map((p) => [String(p.target_date).slice(0, 10), Number(p.predicted_temp)]),
            );
          } catch (e: unknown) {
            loadError = e instanceof Error ? e.message : 'LSTM forecast failed';
          }
          if (model === 'LSTM') {
            note = 'ANN–LSTM provides discrete +1 / +3 / +7 day points along this horizon.';
          }
        }

        if (model === 'PINN' || model === 'Ensemble') {
          try {
            const preds = await getPredictions(0, 5000);
            predMeans = dailyMeans(asRowArray(preds), 'target_timestamp', 'predicted_temp');
          } catch (e: unknown) {
            loadError = e instanceof Error ? e.message : 'PINN predictions failed';
          }
        }

        // Carry-forward fill for forecast gaps within the chosen horizon
        const forecastVals: Record<string, number> = {};
        let lastKnown: number | null = null;
        // Seed carry from last historical mean if present
        for (let i = histAxis.length - 1; i >= 0; i--) {
          const v = histMeans[histAxis[i]];
          if (Number.isFinite(v)) {
            lastKnown = v;
            break;
          }
        }

        let filledFromModel = 0;
        for (const d of forecastAxis) {
          let mean: number | null = null;
          if (model === 'LSTM') {
            if (Number.isFinite(lstmByDay[d])) mean = lstmByDay[d];
          } else if (model === 'Ensemble') {
            const pinn = predMeans[d];
            const lstmV = lstmByDay[d];
            if (Number.isFinite(pinn) && Number.isFinite(lstmV)) mean = (pinn + lstmV) / 2;
            else if (Number.isFinite(pinn)) mean = pinn;
            else if (Number.isFinite(lstmV)) mean = lstmV;
          } else {
            if (Number.isFinite(predMeans[d])) mean = predMeans[d];
          }

          if (mean != null && Number.isFinite(mean)) {
            forecastVals[d] = mean;
            lastKnown = mean;
            filledFromModel += 1;
          } else if (lastKnown != null) {
            // Mild persistence so the axis stays populated for longer horizons
            forecastVals[d] = lastKnown;
          }
        }

        if (!loadError && filledFromModel === 0 && forecastAxis.length > 0) {
          note =
            model === 'PINN'
              ? 'No PINN forecast rows found for upcoming days. Seed predictions or run the forecast job.'
              : note;
        } else if (!loadError && filledFromModel < forecastAxis.length && model === 'PINN') {
          note = `PINN has ${filledFromModel} day(s) of stored forecast; remaining days use persistence fill to complete the ${horizon} axis.`;
        }

        const series = [
          ...histAxis.map((d) => {
            const actual = Number.isFinite(histMeans[d]) ? Number(histMeans[d].toFixed(2)) : null;
            return {
              time: d,
              actual,
              predicted: null as number | null,
              upperBound: null as number | null,
              lowerBound: null as number | null,
            };
          }),
          ...forecastAxis.map((d) => {
            const predicted = Number.isFinite(forecastVals[d])
              ? Number(forecastVals[d].toFixed(2))
              : null;
            return {
              time: d,
              actual: null as number | null,
              predicted,
              upperBound: predicted != null ? Number((predicted + ci).toFixed(2)) : null,
              lowerBound: predicted != null ? Number((predicted - ci).toFixed(2)) : null,
            };
          }),
        ];

        // Bridge last historical point into predicted series for a continuous join
        const lastHistIdx = [...series].map((r) => r.actual != null).lastIndexOf(true);
        const firstPredIdx = series.findIndex((r) => r.predicted != null);
        if (lastHistIdx >= 0 && firstPredIdx > lastHistIdx && series[lastHistIdx].actual != null) {
          const bridge = series[lastHistIdx].actual!;
          series[lastHistIdx] = {
            ...series[lastHistIdx],
            predicted: bridge,
            upperBound: bridge,
            lowerBound: bridge,
          };
        }

        if (!cancelled) {
          setForecastData(series as unknown as ForecastData[]);
          setForecastNote(loadError ? loadError : note);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setForecastData([]);
          setForecastNote(e instanceof Error ? e.message : 'Could not load forecast data.');
        }
      } finally {
        if (!cancelled) setLoadingForecast(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [horizon, horizonDays, confidence, dataRefreshTick, model, runTick, selectedNetworkId]);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      try {
        const [latest, dhw, preds] = await Promise.all([
          getLatestReadings(),
          getDHW(undefined, undefined, 5000),
          getPredictions(0, 5000),
        ]);

        const anyLatest = latest as any;
        const latestRows = (Array.isArray(anyLatest?.value) ? anyLatest.value : anyLatest) as any[];
        const points: PredictionPoint[] = latestRows
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => {
            const temp = Number(r.temperature);
            const riskScore = Math.min(1, Math.max(0, (temp - 27) / 4));
            const riskLevel = temp < 28 ? 0 : temp < 30 ? 1 : 2;
            return {
              latitude: Number(r.latitude),
              longitude: Number(r.longitude),
              temperature: temp,
              riskScore,
              riskLevel,
            };
          });
        if (!cancelled) setPredGrid(points);

        const anyDhw = dhw as any;
        const dhwRows = (Array.isArray(anyDhw?.value) ? anyDhw.value : anyDhw) as any[];
        const vals = dhwRows.map((x) => Number(x.dhw)).filter((v) => Number.isFinite(v));
        const chunk = Math.max(1, Math.floor(vals.length / 12) || 1);
        const weeks = Array.from({ length: 12 }, (_, i) => {
          const slice = vals.slice(i * chunk, (i + 1) * chunk);
          const avg = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
          return { week: `W${i + 1}`, dhw: Number(avg.toFixed(2)) };
        });
        if (!cancelled) setDhwData(weeks);

        const anyPreds = preds as any;
        const predRows = (Array.isArray(anyPreds?.value) ? anyPreds.value : anyPreds) as any[];
        if (areasLoading || areas.length === 0) {
          if (!cancelled) setZoneRisks([]);
        } else {
          const sensorArea = new Map<number, string>();
          for (const r of latestRows) {
            const row = mapLatestReadingRow(r as Record<string, unknown>);
            let areaId: string | null = row.networkGroupId ?? null;
            if (!areaId || !areas.some((a) => a.id === areaId)) {
              areaId = nearestAreaId(areas, row.latitude, row.longitude);
            }
            if (areaId) sensorArea.set(Number(r.sensor_id), areaId);
          }
          const byArea: Record<string, { sum: number; n: number }> = {};
          for (const a of areas) byArea[a.id] = { sum: 0, n: 0 };
          for (const p of predRows) {
            const areaId = sensorArea.get(Number(p.sensor_id));
            if (!areaId || !byArea[areaId]) continue;
            const rs = p.risk_score;
            if (rs == null) continue;
            byArea[areaId].sum += Number(rs);
            byArea[areaId].n += 1;
          }
          const zr = areas.map((a) => {
            const agg = byArea[a.id];
            const avg = agg?.n ? agg.sum / agg.n : 0;
            return { zone: a.name, risk: Math.round(avg * 100) };
          });
          if (!cancelled) setZoneRisks(zr);
        }
      } catch {
        if (!cancelled) {
          setPredGrid([]);
          setDhwData([]);
          setZoneRisks(areas.map((a) => ({ zone: a.name, risk: 0 })));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [areas, areasLoading, dataRefreshTick]);

  const yDomain = useMemo(() => {
    const vals: number[] = [];
    for (const r of forecastData) {
      for (const k of ['actual', 'predicted', 'upperBound', 'lowerBound'] as const) {
        const v = Number((r as any)[k]);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    if (!vals.length) return [26, 31] as [number, number];
    const min = Math.floor(Math.min(...vals, 26) - 0.5);
    const max = Math.ceil(Math.max(...vals, 30) + 0.5);
    return [min, max] as [number, number];
  }, [forecastData]);

  const xInterval = useMemo(() => {
    const n = forecastData.length;
    if (n <= 10) return 0;
    if (n <= 20) return 1;
    if (n <= 40) return 2;
    return Math.floor(n / 12);
  }, [forecastData.length]);

  // Danger map bounds from actual points (not hardcoded Bar Reef)
  const mapBounds = useMemo(() => {
    if (!predGrid.length) {
      return { latMin: 5.9, latMax: 9.0, lonMin: 79.5, lonMax: 81.6, MW: 350, MH: 220 };
    }
    const lats = predGrid.map((p) => p.latitude);
    const lons = predGrid.map((p) => p.longitude);
    const latMin = Math.min(...lats) - 0.02;
    const latMax = Math.max(...lats) + 0.02;
    const lonMin = Math.min(...lons) - 0.02;
    const lonMax = Math.max(...lons) + 0.02;
    return { latMin, latMax, lonMin, lonMax, MW: 350, MH: 220 };
  }, [predGrid]);

  const toX = (lon: number) =>
    ((lon - mapBounds.lonMin) / Math.max(1e-6, mapBounds.lonMax - mapBounds.lonMin)) * mapBounds.MW;
  const toY = (lat: number) =>
    mapBounds.MH -
    ((lat - mapBounds.latMin) / Math.max(1e-6, mapBounds.latMax - mapBounds.latMin)) * mapBounds.MH;

  const availableHorizons: Horizon[] =
    model === 'PINN' ? ['72h', '7d', '30d'] : ['72h', '7d'];

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Model:
          </span>
          {(['PINN', 'LSTM', 'Ensemble'] as ModelType[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModel(m)}
              className="px-3 py-1 rounded text-xs font-mono cursor-pointer"
              style={{
                background: model === m ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                color: model === m ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Horizon:
          </span>
          {availableHorizons.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className="px-3 py-1 rounded text-xs font-mono cursor-pointer"
              style={{
                background: horizon === h ? 'var(--accent-teal)' : 'var(--bg-elevated)',
                color: horizon === h ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {h}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            CI:
          </span>
          {([90, 95] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConfidence(c)}
              className="px-2 py-1 rounded text-xs font-mono cursor-pointer"
              style={{
                background: confidence === c ? 'var(--warn-amber)' : 'var(--bg-elevated)',
                color: confidence === c ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {c}%
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRunTick((t) => t + 1)}
          disabled={loadingForecast}
          className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-60"
          style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          {loadingForecast ? 'Loading…' : 'Run Forecast'}
        </button>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {model} Forecast — {horizon} Horizon ({confidence}% CI)
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {forecastData.length > 0
              ? `${forecastData[0]?.time} → ${forecastData[forecastData.length - 1]?.time} (${forecastData.length} days)`
              : loadingForecast
                ? 'Loading…'
                : 'No series'}
          </p>
        </div>
        {forecastNote && (
          <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>
            {forecastNote}
          </p>
        )}
        <div className="h-72">
          {mounted && forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                key={`fc-${model}-${horizon}-${confidence}-${forecastData.length}-${forecastData[0]?.time}-${forecastData[forecastData.length - 1]?.time}`}
                data={forecastData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                <XAxis
                  dataKey="time"
                  interval={xInterval}
                  minTickGap={28}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  stroke="var(--grid-line)"
                  tickFormatter={(v: string) => {
                    // Show MM-DD to reduce clutter; full date in tooltip
                    if (typeof v === 'string' && v.length >= 10) return v.slice(5);
                    return v;
                  }}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  stroke="var(--grid-line)"
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                  labelFormatter={(label) => String(label)}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={28} stroke="var(--warn-amber)" strokeDasharray="5 5" />
                <ReferenceLine y={29} stroke="var(--danger-coral)" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="var(--accent-cyan)"
                  fillOpacity={0.12}
                  name="Upper Bound"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="var(--bg-primary)"
                  fillOpacity={1}
                  name="Lower Bound"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--accent-teal)"
                  strokeWidth={2}
                  dot={false}
                  name="Historical"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Predicted"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="h-full flex items-center justify-center text-sm rounded-lg"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {loadingForecast ? 'Loading forecast…' : forecastNote || 'No forecast data to display.'}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Predicted Danger Zones
          </h3>
          <svg
            viewBox={`0 0 ${mapBounds.MW} ${mapBounds.MH}`}
            className="w-full rounded-lg"
            style={{ background: 'var(--bg-primary)' }}
          >
            {predGrid.map((p, i) => (
              <rect
                key={i}
                x={toX(p.longitude) - 7}
                y={toY(p.latitude) - 5}
                width={15}
                height={10}
                fill={tempToColor(p.temperature)}
                opacity={0.65}
              />
            ))}
          </svg>

          <div className="space-y-2 mt-3">
            {zoneRisks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                No network risk scores yet.
              </p>
            ) : (
              zoneRisks.map((z) => (
                <div key={z.zone} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate font-mono" style={{ color: 'var(--text-primary)' }}>
                    {z.zone}
                  </span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${z.risk}%`,
                        background:
                          z.risk > 60
                            ? 'var(--danger-coral)'
                            : z.risk > 30
                              ? 'var(--warn-amber)'
                              : 'var(--accent-teal)',
                      }}
                    />
                  </div>
                  <span className="font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {z.risk}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Model Performance ({model})
            </h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
              Metrics below are placeholders until an evaluation endpoint is wired.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'MAE', value: '—' },
                { label: 'RMSE', value: '—' },
                { label: 'R²', value: '—' },
                { label: 'Physics Loss', value: model === 'PINN' ? '—' : 'n/a' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="p-3 rounded-lg text-center"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    {m.value}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Degree Heating Weeks (12-week Rolling)
            </h3>
            <div className="h-36">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dhwData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                      stroke="var(--grid-line)"
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                      stroke="var(--grid-line)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 11,
                        color: 'var(--text-primary)',
                      }}
                    />
                    <ReferenceLine
                      y={4}
                      stroke="var(--warn-amber)"
                      strokeDasharray="4 4"
                      label={{ value: 'DHW=4 Alert', fill: 'var(--warn-amber)', fontSize: 9 }}
                    />
                    <ReferenceLine
                      y={8}
                      stroke="var(--danger-coral)"
                      strokeDasharray="4 4"
                      label={{ value: 'DHW=8 Bleach', fill: 'var(--danger-coral)', fontSize: 9 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="dhw"
                      stroke="var(--warn-amber)"
                      fill="var(--warn-amber)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
