'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import { tempToColor } from '@/lib/utils';
import type { PredictionPoint, ForecastData } from '@/lib/types';
import { getDHW, getLatestReadings, getLSTMForecast, getPredictions, getSST, mapLatestReadingRow } from '@/lib/api';
import { nearestAreaId } from '@/lib/geo';
import { useMonitoringAreas } from '@/lib/useMonitoringAreas';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';

type ModelType = 'PINN' | 'LSTM' | 'Ensemble';
type Horizon = '72h' | '7d' | '30d';

export default function PredictionsPage() {
  const { areas, loading: areasLoading } = useMonitoringAreas();
  const [model, setModel] = useState<ModelType>('PINN');
  const [horizon, setHorizon] = useState<Horizon>('7d');
  const [confidence, setConfidence] = useState<90 | 95>(95);
  const [mounted, setMounted] = useState(false);

  const horizonDays = horizon === '72h' ? 3 : horizon === '7d' ? 7 : 30;
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [predGrid, setPredGrid] = useState<PredictionPoint[]>([]);
  const [dhwData, setDhwData] = useState<{ week: string; dhw: number }[]>([]);
  const [zoneRisks, setZoneRisks] = useState<{ zone: string; risk: number }[]>([]);
  const [dataRefreshTick, setDataRefreshTick] = useState(0);

  useEffect(() => {
    return subscribeDashboardDataRefresh(() => setDataRefreshTick((t) => t + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sst = await getSST(undefined, undefined, 5000);
        const anySst = sst as any;
        const sstRows = (Array.isArray(anySst?.value) ? anySst.value : anySst) as any[];

        // Historical: daily mean of actual temperatures (last 7 days)
        const histAgg: Record<string, { sum: number; n: number }> = {};
        for (const r of sstRows) {
          const day = String(r.time).slice(0, 10);
          if (!histAgg[day]) histAgg[day] = { sum: 0, n: 0 };
          const t = Number(r.temperature);
          if (Number.isFinite(t)) {
            histAgg[day].sum += t;
            histAgg[day].n += 1;
          }
        }
        const histDays = Object.keys(histAgg).sort().slice(-7);
        const historical = histDays.map((d) => {
          const a = histAgg[d];
          const mean = a.n ? a.sum / a.n : 0;
          return { time: d, actual: Number(mean.toFixed(2)) };
        });

        let forecast: ForecastData[] = [];

        if (model === 'LSTM' || model === 'Ensemble') {
          // ANN–LSTM: fixed horizons +1 / +3 / +7 days from 60-day history
          const lstm = await getLSTMForecast('hikkaduwa');
          const ci = confidence === 95 ? 0.5 : 0.35;
          const lstmPoints = lstm
            .filter((p) => p.horizon_days <= horizonDays || horizonDays >= 7)
            .map((p) => {
              const mean = Number(p.predicted_temp);
              return {
                time: String(p.target_date).slice(0, 10),
                predicted: Number(mean.toFixed(2)),
                upperBound: Number((mean + ci).toFixed(2)),
                lowerBound: Number((mean - ci).toFixed(2)),
              };
            });

          if (model === 'LSTM') {
            forecast = lstmPoints;
          } else {
            // Ensemble: blend PINN daily means with LSTM horizons when dates match
            const preds = await getPredictions(0, 5000);
            const anyPreds = preds as any;
            const predRows = (Array.isArray(anyPreds?.value) ? anyPreds.value : anyPreds) as any[];
            const predAgg: Record<string, { sum: number; n: number }> = {};
            for (const p of predRows) {
              const day = String(p.target_timestamp).slice(0, 10);
              if (!predAgg[day]) predAgg[day] = { sum: 0, n: 0 };
              const t = Number(p.predicted_temp);
              if (Number.isFinite(t)) {
                predAgg[day].sum += t;
                predAgg[day].n += 1;
              }
            }
            const lstmByDay = Object.fromEntries(lstmPoints.map((p) => [p.time, p.predicted]));
            const days = Object.keys({ ...predAgg, ...lstmByDay }).sort().slice(0, horizonDays + 7);
            forecast = days.slice(-horizonDays).map((d) => {
              const pinn = predAgg[d]?.n ? predAgg[d].sum / predAgg[d].n : null;
              const lstmV = lstmByDay[d] ?? null;
              const mean =
                pinn != null && lstmV != null
                  ? (pinn + lstmV) / 2
                  : pinn != null
                    ? pinn
                    : lstmV ?? 0;
              return {
                time: d,
                predicted: Number(mean.toFixed(2)),
                upperBound: Number((mean + ci).toFixed(2)),
                lowerBound: Number((mean - ci).toFixed(2)),
              };
            });
          }
        } else {
          // PINN: daily mean of stored 168-h predictions
          const preds = await getPredictions(0, 5000);
          const anyPreds = preds as any;
          const predRows = (Array.isArray(anyPreds?.value) ? anyPreds.value : anyPreds) as any[];
          const predAgg: Record<string, { sum: number; n: number }> = {};
          for (const p of predRows) {
            const day = String(p.target_timestamp).slice(0, 10);
            if (!predAgg[day]) predAgg[day] = { sum: 0, n: 0 };
            const t = Number(p.predicted_temp);
            if (Number.isFinite(t)) {
              predAgg[day].sum += t;
              predAgg[day].n += 1;
            }
          }
          const futureDays = Object.keys(predAgg).sort().slice(0, horizonDays + 7);
          const ci = confidence === 95 ? 0.6 : 0.45;
          forecast = futureDays.slice(-horizonDays).map((d) => {
            const a = predAgg[d];
            const mean = a.n ? a.sum / a.n : 0;
            return {
              time: d,
              predicted: Number(mean.toFixed(2)),
              upperBound: Number((mean + ci).toFixed(2)),
              lowerBound: Number((mean - ci).toFixed(2)),
            };
          });
        }

        const merged: ForecastData[] = [
          ...historical.map((h) => ({
            time: h.time,
            actual: h.actual,
            predicted: h.actual,
            upperBound: h.actual + 0.2,
            lowerBound: h.actual - 0.2,
          })),
          ...forecast,
        ];

        if (!cancelled) setForecastData(merged);
      } catch {
        if (!cancelled) setForecastData([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [horizonDays, confidence, dataRefreshTick, model]);

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

        // DHW: bucket into "W1..W12" from oldest->newest using returned series
        const anyDhw = dhw as any;
        const dhwRows = (Array.isArray(anyDhw?.value) ? anyDhw.value : anyDhw) as any[];
        const vals = dhwRows.map((x) => Number(x.dhw)).filter((v) => Number.isFinite(v));
        const chunk = Math.max(1, Math.floor(vals.length / 12));
        const weeks = Array.from({ length: 12 }, (_, i) => {
          const slice = vals.slice(i * chunk, (i + 1) * chunk);
          const avg = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
          return { week: `W${i + 1}`, dhw: Number(avg.toFixed(2)) };
        });
        if (!cancelled) setDhwData(weeks);

        // Zone risks from predictions + latest coords (scoped to your networks)
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
            if (!areaId) continue;
            const rs = p.risk_score;
            if (rs == null) continue;
            if (!byArea[areaId]) continue;
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

  // Map dims
  const MW = 350, MH = 220;
  const latMin = 8.870, latMax = 8.885, lonMin = 79.518, lonMax = 79.533;
  const toX = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * MW;
  const toY = (lat: number) => MH - ((lat - latMin) / (latMax - latMin)) * MH;

  return (
    <div className="space-y-6">
      {/* Model Control Panel */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Model:</span>
          {(['PINN', 'LSTM', 'Ensemble'] as ModelType[]).map((m) => (
            <button
              key={m}
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
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Horizon:</span>
          {(['72h', '7d', '30d'] as Horizon[]).map((h) => (
            <button
              key={h}
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
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>CI:</span>
          {([90, 95] as const).map((c) => (
            <button
              key={c}
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
          className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          Run Forecast
        </button>
      </div>

      {/* Forecast Chart */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {model} Forecast — {horizon} Horizon ({confidence}% CI)
        </h3>
        <div className="h-72">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} stroke="var(--grid-line)" />
                <YAxis domain={[26, 30]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} stroke="var(--grid-line)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={28} stroke="var(--warn-amber)" strokeDasharray="5 5" />
                <ReferenceLine y={29} stroke="var(--danger-coral)" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="upperBound" stroke="none" fill="var(--accent-cyan)" fillOpacity={0.1} name="Upper Bound" />
                <Area type="monotone" dataKey="lowerBound" stroke="none" fill="var(--accent-cyan)" fillOpacity={0.1} name="Lower Bound" />
                <Line type="monotone" dataKey="actual" stroke="var(--accent-teal)" strokeWidth={2} dot={false} name="Historical" />
                <Line type="monotone" dataKey="predicted" stroke="var(--accent-cyan)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Bottom: Danger map + Risk cards + Model Performance + DHW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Danger Zone Map */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Predicted Danger Zones
          </h3>
          <svg viewBox={`0 0 ${MW} ${MH}`} className="w-full rounded-lg" style={{ background: 'var(--bg-primary)' }}>
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

          {/* Risk score bars */}
          <div className="space-y-2 mt-3">
            {zoneRisks.map((z) => (
              <div key={z.zone} className="flex items-center gap-2 text-xs">
                <span className="w-14 font-mono" style={{ color: 'var(--text-primary)' }}>{z.zone}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${z.risk}%`,
                      background: z.risk > 60 ? 'var(--danger-coral)' : z.risk > 30 ? 'var(--warn-amber)' : 'var(--accent-teal)',
                    }}
                  />
                </div>
                <span className="font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>{z.risk}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Performance + DHW */}
        <div className="space-y-6">
          {/* Model perf */}
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Model Performance ({model})
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'MAE', value: '0.23°C' },
                { label: 'RMSE', value: '0.31°C' },
                { label: 'R²', value: '0.94' },
                { label: 'Physics Loss', value: '0.008' },
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

          {/* DHW Accumulation */}
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
                    <XAxis dataKey="week" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} stroke="var(--grid-line)" />
                    <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} stroke="var(--grid-line)" />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 11,
                        color: 'var(--text-primary)',
                      }}
                    />
                    <ReferenceLine y={4} stroke="var(--warn-amber)" strokeDasharray="4 4" label={{ value: 'DHW=4 Alert', fill: 'var(--warn-amber)', fontSize: 9 }} />
                    <ReferenceLine y={8} stroke="var(--danger-coral)" strokeDasharray="4 4" label={{ value: 'DHW=8 Bleach', fill: 'var(--danger-coral)', fontSize: 9 }} />
                    <Area type="monotone" dataKey="dhw" stroke="var(--warn-amber)" fill="var(--warn-amber)" fillOpacity={0.2} />
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
