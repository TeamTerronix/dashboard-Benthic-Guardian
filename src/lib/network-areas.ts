/**
 * Build dashboard "monitoring areas" from API network groups (user/admin scoped).
 * Merges known geographic presets from areas.ts when IDs match seed pattern ng_{areaId}_NN.
 */

import { monitoringAreas as staticAreas } from '@/lib/areas';
import type { MonitoringArea } from '@/lib/types';
import type { NetworkGroupInfo } from '@/lib/api';

const FALLBACK_PALETTE = ['#00E5FF', '#FF6B6B', '#FFD93D', '#6BCB77', '#A78BFA', '#F472B6'];

/** e.g. ng_bar-reef_01 → bar-reef; ng_hikkaduwa_sea_01 → hikkaduwa */
export function matchStaticAreaIdFromNetworkGroupId(ngId: string): string | null {
  const m = /^ng_(.+)_\d+$/.exec(ngId);
  if (!m) return null;
  const key = m[1];
  const exact = staticAreas.find((a) => a.id === key);
  if (exact) return exact.id;
  // Prefix / contains match: ng_hikkaduwa_sea_01 → hikkaduwa, ng_trinco_sea_01 → pigeon-island or trinco
  const byPrefix = staticAreas.find(
    (a) => key === a.id || key.startsWith(`${a.id}_`) || key.startsWith(a.id),
  );
  if (byPrefix) return byPrefix.id;
  if (key.includes('trinco') || key.includes('pigeon')) {
    return staticAreas.find((a) => a.id === 'pigeon-island')?.id ?? null;
  }
  return null;
}

export function buildMonitoringAreasFromNetworkGroups(groups: NetworkGroupInfo[]): MonitoringArea[] {
  return groups.map((g, i) => {
    const staticKey = matchStaticAreaIdFromNetworkGroupId(g.id);
    const base = staticKey ? staticAreas.find((a) => a.id === staticKey) : undefined;
    const lat = g.center_lat ?? base?.center.lat ?? 7.8731;
    const lon = g.center_lon ?? base?.center.lon ?? 80.7718;
    if (base) {
      return {
        ...base,
        id: g.id,
        name: g.name?.trim() || base.name,
      };
    }
    return {
      id: g.id,
      name: g.name?.trim() || `Network ${g.id.slice(-8)}`,
      description: 'Your node network',
      center: { lat, lon },
      color: FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
      defaultZoom: 14,
    };
  });
}
