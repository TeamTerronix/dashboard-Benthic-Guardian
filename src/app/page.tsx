'use client';

import { useEffect, useMemo, useState } from 'react';
import KPICard from '@/components/dashboard/KPICard';
import MiniHeatmap from '@/components/dashboard/MiniHeatmap';
import AlertFeed from '@/components/dashboard/AlertFeed';
import MLQuickInsight from '@/components/dashboard/MLQuickInsight';
import { ChevronDown, MapPin, Thermometer, Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import Link from 'next/link';
import { getLatestReadings, getStats, mapLatestReadingRow, type StatsApiResponse } from '@/lib/api';
import { resolveNodeAreaId } from '@/lib/geo';
import { useMonitoringAreas } from '@/lib/useMonitoringAreas';
import type { DashboardKPI, SensorNode, TemperatureReading } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';
import { deriveNodeStatusFromAgeMinutes } from '@/lib/node-status';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';

export default function DashboardPage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { areas, loading: areasLoading } = useMonitoringAreas();
  const {
    setAvailableNodes,
    selectedNetworkId,
    setSelectedNetworkId,
    setLastDataUpdatedAt,
  } = useDashboardStore();
  const selectedArea = selectedNetworkId;
  const currentArea = areas.find((a) => a.id === selectedArea);

  const [latestReadings, setLatestReadings] = useState<TemperatureReading[]>([]);
  const [stats, setStats] = useState<StatsApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [latest, st] = await Promise.all([getLatestReadings(), getStats()]);
        const anyLatest = latest as any;
        const rows = (Array.isArray(anyLatest?.value) ? anyLatest.value : anyLatest) as any[];
        const mapped: TemperatureReading[] = rows.map((r) => mapLatestReadingRow(r));
        if (!cancelled) {
          setLatestReadings(mapped);
          setAvailableNodes(mapped.map((m) => m.nodeId));
          setStats(st);
          setLastDataUpdatedAt(new Date().toISOString());
        }
      } catch {
        if (!cancelled) {
          setLatestReadings([]);
          setStats(null);
        }
      }
    };
    load();
    const unsub = subscribeDashboardDataRefresh(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [setAvailableNodes, setLastDataUpdatedAt]);

  const sensorNodes: SensorNode[] = useMemo(() => {
    return latestReadings.map((r) => {
      const areaId = resolveNodeAreaId(r, areas);
      const t = Date.parse(r.time);
      const ageMins = Number.isFinite(t) ? (Date.now() - t) / 60000 : 1e9;
      const status = deriveNodeStatusFromAgeMinutes(ageMins);
      return {
        id: r.nodeId,
        name: r.nodeId,
        areaId,
        latitude: r.latitude,
        longitude: r.longitude,
        depth: 0,
        battery: 0,
        status,
        lastSync: r.time,
        totalReadings: 0,
      };
    });
  }, [latestReadings, areas]);

  const areaInfo = useMemo(() => {
    const nodes = selectedArea ? sensorNodes.filter((n) => n.areaId === selectedArea) : sensorNodes;
    const online = nodes.filter((n) => n.status === 'online');
    const delayed = nodes.filter((n) => n.status === 'delayed');
    const offline = nodes.filter((n) => n.status === 'offline');

    const temps: number[] = [];
    for (const n of nodes) {
      const r = latestReadings.find((l) => l.nodeId === n.id);
      if (r && !Number.isNaN(r.temperature)) temps.push(r.temperature);
    }

    const avg = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const max = temps.length > 0 ? Math.max(...temps) : 0;
    const min = temps.length > 0 ? Math.min(...temps) : 0;
    const health = avg < 28 ? 'Healthy' : avg < 30 ? 'Warning' : 'Danger';
    const healthColor = avg < 28 ? '#00cc66' : avg < 30 ? '#ddaa00' : '#ee3333';
    const healthEmoji = avg < 28 ? '🟢' : avg < 30 ? '🟡' : '🔴';
    return { nodes, online, delayed, offline, temps, avg, max, min, health, healthColor, healthEmoji };
  }, [latestReadings, selectedArea, sensorNodes]);

  // Per-area cards data
  const areaCards = useMemo(() => {
    return areas.map((area) => {
      const info = (() => {
        const nodes = sensorNodes.filter((n) => n.areaId === area.id);
        const online = nodes.filter((n) => n.status === 'online');
        const delayed = nodes.filter((n) => n.status === 'delayed');
        const offline = nodes.filter((n) => n.status === 'offline');
        const temps = latestReadings
          .filter((r) => nodes.some((n) => n.id === r.nodeId))
          .map((r) => r.temperature)
          .filter((t) => !Number.isNaN(t));
        const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
        const max = temps.length ? Math.max(...temps) : 0;
        const min = temps.length ? Math.min(...temps) : 0;
        const health = avg < 28 ? 'Healthy' : avg < 30 ? 'Warning' : 'Danger';
        const healthColor = avg < 28 ? '#00cc66' : avg < 30 ? '#ddaa00' : '#ee3333';
        const healthEmoji = avg < 28 ? '🟢' : avg < 30 ? '🟡' : '🔴';
        return { nodes, online, delayed, offline, temps, avg, max, min, health, healthColor, healthEmoji };
      })();
      return { area, info };
    });
  }, [latestReadings, sensorNodes, areas]);

  const dashboardKPIs: DashboardKPI[] = useMemo(() => {
    const temps = latestReadings.map((r) => r.temperature).filter((t) => !Number.isNaN(t));
    const fallbackMean = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const fallbackMax = temps.length ? Math.max(...temps) : 0;
    const mean =
      stats?.avg_temperature_24h != null && !Number.isNaN(stats.avg_temperature_24h)
        ? stats.avg_temperature_24h
        : fallbackMean;
    const maxT =
      stats?.max_temperature_24h != null && !Number.isNaN(stats.max_temperature_24h)
        ? stats.max_temperature_24h
        : fallbackMax;
    const totalStored = stats?.total_sst_records ?? 0;
    const online = sensorNodes.filter((n) => n.status === 'online').length;
    const total = sensorNodes.length;
    return [
      { label: 'Mean T° (24h)', value: mean.toFixed(1), unit: '°C', delta: '', deltaDirection: 'neutral', sparkline: [], status: mean >= 30 ? 'danger' : mean >= 28 ? 'warning' : 'normal' },
      { label: 'Max T° (24h)', value: maxT.toFixed(1), unit: '°C', delta: '', deltaDirection: 'neutral', sparkline: [], status: maxT >= 31 ? 'danger' : maxT >= 30 ? 'warning' : 'normal' },
      { label: 'Active Nodes', value: `${online}/${total}`, unit: '', delta: '', deltaDirection: 'neutral', sparkline: [], status: total && online / total < 0.6 ? 'warning' : 'normal' },
      { label: 'Networks', value: String(areas.length), unit: '', delta: '', deltaDirection: 'neutral', sparkline: [], status: 'normal' },
      { label: 'Total readings', value: String(totalStored), unit: '', delta: '', deltaDirection: 'neutral', sparkline: [], status: 'normal' },
    ];
  }, [latestReadings, sensorNodes, areas.length, stats]);

  if (areasLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[40vh] rounded-xl border text-sm"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Loading your networks…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with area selector */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Dashboard — {currentArea ? currentArea.name : 'All Areas'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {currentArea
                ? `${currentArea.description} — ${areaInfo.online.length}/${areaInfo.nodes.length} nodes online`
                : `${areas.length} network${areas.length === 1 ? '' : 's'}, ${sensorNodes.length} node${sensorNodes.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: currentArea ? areaInfo.healthColor : 'var(--text-secondary)' }} />
            {currentArea?.name ?? 'All Areas'}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full right-0 mt-1 w-56 rounded-lg border shadow-lg z-50 overflow-hidden"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => { setSelectedNetworkId(null); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors"
                style={{
                  background: selectedArea === null ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = selectedArea === null ? 'rgba(0, 229, 255, 0.08)' : 'transparent')}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-secondary)' }} />
                All Areas
                <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {sensorNodes.length} nodes
                </span>
              </button>
              {areas.map((a) => {
                const nodes = sensorNodes.filter((n) => n.areaId === a.id);
                const online = nodes.filter((n) => n.status === 'online');
                const temps = latestReadings
                  .filter((r) => nodes.some((n) => n.id === r.nodeId))
                  .map((r) => r.temperature)
                  .filter((t) => !Number.isNaN(t));
                const avg = temps.length ? temps.reduce((x, y) => x + y, 0) / temps.length : 0;
                const healthColor = avg < 28 ? '#00cc66' : avg < 30 ? '#ddaa00' : '#ee3333';
                const info = { nodes, online, healthColor };
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedNetworkId(a.id); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors"
                    style={{
                      background: selectedArea === a.id ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = selectedArea === a.id ? 'rgba(0, 229, 255, 0.08)' : 'transparent')}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: info.healthColor }} />
                    {a.name}
                    <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {info.online.length}/{info.nodes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {dashboardKPIs.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Area Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {selectedArea ? `${currentArea?.name} Status` : 'Area Health Overview'}
              </h3>
              <Link
                href="/map"
                className="text-xs hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                Open Map →
              </Link>
            </div>

            {selectedArea ? (
              /* Single area detail view */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{ background: `${areaInfo.healthColor}20`, border: `2px solid ${areaInfo.healthColor}` }}
                  >
                    {areaInfo.healthEmoji}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: areaInfo.healthColor }}>
                      {areaInfo.health}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {currentArea?.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-elevated)' }}>
                    <Thermometer className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent-cyan)' }} />
                    <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {areaInfo.avg.toFixed(1)}°C
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Avg Temp</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-elevated)' }}>
                    <Thermometer className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--danger-coral)' }} />
                    <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {areaInfo.max.toFixed(1)}°C
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Max Temp</p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: 'var(--bg-elevated)' }}>
                    <Thermometer className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent-teal)' }} />
                    <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {areaInfo.min.toFixed(1)}°C
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Min Temp</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                    <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--accent-teal)' }} />
                    <div>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{areaInfo.online.length}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--warn-amber)' }} />
                    <div>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{areaInfo.delayed.length}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Delayed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                    <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--danger-coral)' }} />
                    <div>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{areaInfo.offline.length}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Offline</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* All areas grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {areaCards.map(({ area, info }) => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedNetworkId(area.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer text-left"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = info.healthColor)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0"
                      style={{ background: `${info.healthColor}20`, border: `2px solid ${info.healthColor}` }}
                    >
                      {info.healthEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {area.name}
                        </p>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                          style={{ background: `${info.healthColor}20`, color: info.healthColor }}
                        >
                          {info.health}
                        </span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {area.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px]">
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{info.avg.toFixed(1)}°C</span> avg
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {info.online.length}/{info.nodes.length} online
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mini heatmap — 1/3 */}
        <div>
          <MiniHeatmap />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertFeed />
        <MLQuickInsight />
      </div>
    </div>
  );
}
