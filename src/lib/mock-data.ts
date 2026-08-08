// Mock data generator for the Benthic Guardian dashboard
// In production, this would be replaced with actual API calls

import type {
  SensorNode,
  MonitoringArea,
  TemperatureReading,
  PredictionPoint,
  Alert,
  AlertRule,
  ForecastData,
  TrainingMetrics,
  DashboardKPI,
  ZoneRisk,
} from './types';

// Keep generated mock values deterministic across SSR and hydration.
function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = createSeededRandom(20260401);

// --- Monitoring Areas ---
export const monitoringAreas: MonitoringArea[] = [
  {
    id: 'bar-reef',
    name: 'Bar Reef',
    description: 'Kalpitiya Peninsula, NW coast',
    center: { lat: 8.877, lon: 79.525 },
    color: '#00E5FF',
    defaultZoom: 14,
  },
  {
    id: 'pigeon-island',
    name: 'Pigeon Island',
    description: 'Trincomalee, NE coast',
    center: { lat: 8.725, lon: 81.180 },
    color: '#FF6B6B',
    defaultZoom: 15,
  },
  {
    id: 'hikkaduwa',
    name: 'Hikkaduwa Reef',
    description: 'Hikkaduwa, SW coast',
    center: { lat: 6.139, lon: 80.092 },
    color: '#FFD93D',
    defaultZoom: 15,
  },
  {
    id: 'rumassala',
    name: 'Rumassala',
    description: 'Galle, Southern coast',
    center: { lat: 6.003, lon: 80.239 },
    color: '#6BCB77',
    defaultZoom: 15,
  },
];

// --- Sensor Nodes ---
export const sensorNodes: SensorNode[] = [
  // ── Bar Reef (NW coast, Kalpitiya) — 16 nodes ──
  { id: 'BR-01', name: 'Bar Reef 01', areaId: 'bar-reef', latitude: 8.880, longitude: 79.525, depth: 1.2, battery: 94, status: 'online', lastSync: '2026-02-25T06:00:00Z', totalReadings: 1247 },
  { id: 'BR-02', name: 'Bar Reef 02', areaId: 'bar-reef', latitude: 8.878, longitude: 79.523, depth: 1.8, battery: 88, status: 'online', lastSync: '2026-02-25T06:01:00Z', totalReadings: 1245 },
  { id: 'BR-03', name: 'Bar Reef 03', areaId: 'bar-reef', latitude: 8.876, longitude: 79.527, depth: 2.0, battery: 91, status: 'online', lastSync: '2026-02-25T06:00:30Z', totalReadings: 1246 },
  { id: 'BR-04', name: 'Bar Reef 04', areaId: 'bar-reef', latitude: 8.874, longitude: 79.522, depth: 2.4, battery: 76, status: 'online', lastSync: '2026-02-25T06:02:00Z', totalReadings: 1240 },
  { id: 'BR-05', name: 'Bar Reef 05', areaId: 'bar-reef', latitude: 8.882, longitude: 79.520, depth: 1.5, battery: 85, status: 'online', lastSync: '2026-02-25T06:01:30Z', totalReadings: 1243 },
  { id: 'BR-06', name: 'Bar Reef 06', areaId: 'bar-reef', latitude: 8.879, longitude: 79.528, depth: 3.1, battery: 90, status: 'online', lastSync: '2026-02-25T06:00:15Z', totalReadings: 1248 },
  { id: 'BR-07', name: 'Bar Reef 07', areaId: 'bar-reef', latitude: 8.875, longitude: 79.525, depth: 2.4, battery: 82, status: 'online', lastSync: '2026-02-25T06:02:30Z', totalReadings: 1245 },
  { id: 'BR-08', name: 'Bar Reef 08', areaId: 'bar-reef', latitude: 8.877, longitude: 79.530, depth: 1.9, battery: 87, status: 'online', lastSync: '2026-02-25T06:01:45Z', totalReadings: 1244 },
  { id: 'BR-09', name: 'Bar Reef 09', areaId: 'bar-reef', latitude: 8.873, longitude: 79.526, depth: 2.7, battery: 79, status: 'online', lastSync: '2026-02-25T06:03:00Z', totalReadings: 1241 },
  { id: 'BR-10', name: 'Bar Reef 10', areaId: 'bar-reef', latitude: 8.881, longitude: 79.524, depth: 1.3, battery: 93, status: 'online', lastSync: '2026-02-25T06:00:45Z', totalReadings: 1247 },
  { id: 'BR-11', name: 'Bar Reef 11', areaId: 'bar-reef', latitude: 8.876, longitude: 79.521, depth: 2.2, battery: 72, status: 'online', lastSync: '2026-02-25T06:02:15Z', totalReadings: 1238 },
  { id: 'BR-12', name: 'Bar Reef 12', areaId: 'bar-reef', latitude: 8.874, longitude: 79.529, depth: 3.0, battery: 23, status: 'delayed', lastSync: '2026-02-23T06:00:00Z', totalReadings: 1100 },
  { id: 'BR-13', name: 'Bar Reef 13', areaId: 'bar-reef', latitude: 8.883, longitude: 79.526, depth: 1.0, battery: 96, status: 'online', lastSync: '2026-02-25T06:00:10Z', totalReadings: 1249 },
  { id: 'BR-14', name: 'Bar Reef 14', areaId: 'bar-reef', latitude: 8.878, longitude: 79.519, depth: 1.7, battery: 84, status: 'online', lastSync: '2026-02-25T06:01:20Z', totalReadings: 1242 },
  { id: 'BR-15', name: 'Bar Reef 15', areaId: 'bar-reef', latitude: 8.872, longitude: 79.524, depth: 3.5, battery: 68, status: 'online', lastSync: '2026-02-25T06:03:30Z', totalReadings: 1235 },
  { id: 'BR-16', name: 'Bar Reef 16', areaId: 'bar-reef', latitude: 8.880, longitude: 79.531, depth: 2.1, battery: 0, status: 'offline', lastSync: '2026-02-20T06:00:00Z', totalReadings: 980 },

  // ── Pigeon Island (NE coast, Trincomalee) — 8 nodes ──
  { id: 'PI-01', name: 'Pigeon 01', areaId: 'pigeon-island', latitude: 8.7265, longitude: 81.1795, depth: 1.0, battery: 97, status: 'online', lastSync: '2026-02-25T06:00:00Z', totalReadings: 1050 },
  { id: 'PI-02', name: 'Pigeon 02', areaId: 'pigeon-island', latitude: 8.7245, longitude: 81.1810, depth: 1.5, battery: 91, status: 'online', lastSync: '2026-02-25T06:01:00Z', totalReadings: 1048 },
  { id: 'PI-03', name: 'Pigeon 03', areaId: 'pigeon-island', latitude: 8.7230, longitude: 81.1785, depth: 2.2, battery: 84, status: 'online', lastSync: '2026-02-25T06:02:00Z', totalReadings: 1045 },
  { id: 'PI-04', name: 'Pigeon 04', areaId: 'pigeon-island', latitude: 8.7255, longitude: 81.1830, depth: 1.8, battery: 78, status: 'online', lastSync: '2026-02-25T06:01:30Z', totalReadings: 1040 },
  { id: 'PI-05', name: 'Pigeon 05', areaId: 'pigeon-island', latitude: 8.7275, longitude: 81.1805, depth: 2.5, battery: 88, status: 'online', lastSync: '2026-02-25T06:00:30Z', totalReadings: 1052 },
  { id: 'PI-06', name: 'Pigeon 06', areaId: 'pigeon-island', latitude: 8.7240, longitude: 81.1825, depth: 3.0, battery: 70, status: 'online', lastSync: '2026-02-25T06:03:00Z', totalReadings: 1038 },
  { id: 'PI-07', name: 'Pigeon 07', areaId: 'pigeon-island', latitude: 8.7260, longitude: 81.1840, depth: 1.3, battery: 15, status: 'delayed', lastSync: '2026-02-23T06:00:00Z', totalReadings: 920 },
  { id: 'PI-08', name: 'Pigeon 08', areaId: 'pigeon-island', latitude: 8.7235, longitude: 81.1835, depth: 2.0, battery: 82, status: 'online', lastSync: '2026-02-25T06:02:30Z', totalReadings: 1042 },

  // ── Hikkaduwa Reef (SW coast, offshore) — 8 nodes ──
  { id: 'HK-01', name: 'Hikkaduwa 01', areaId: 'hikkaduwa', latitude: 6.1415, longitude: 80.0930, depth: 1.2, battery: 95, status: 'online', lastSync: '2026-02-25T06:00:00Z', totalReadings: 890 },
  { id: 'HK-02', name: 'Hikkaduwa 02', areaId: 'hikkaduwa', latitude: 6.1395, longitude: 80.0945, depth: 1.8, battery: 89, status: 'online', lastSync: '2026-02-25T06:01:00Z', totalReadings: 888 },
  { id: 'HK-03', name: 'Hikkaduwa 03', areaId: 'hikkaduwa', latitude: 6.1380, longitude: 80.0935, depth: 2.5, battery: 81, status: 'online', lastSync: '2026-02-25T06:02:00Z', totalReadings: 885 },
  { id: 'HK-04', name: 'Hikkaduwa 04', areaId: 'hikkaduwa', latitude: 6.1405, longitude: 80.0920, depth: 1.5, battery: 92, status: 'online', lastSync: '2026-02-25T06:00:30Z', totalReadings: 892 },
  { id: 'HK-05', name: 'Hikkaduwa 05', areaId: 'hikkaduwa', latitude: 6.1425, longitude: 80.0910, depth: 3.0, battery: 74, status: 'online', lastSync: '2026-02-25T06:03:00Z', totalReadings: 880 },
  { id: 'HK-06', name: 'Hikkaduwa 06', areaId: 'hikkaduwa', latitude: 6.1370, longitude: 80.0925, depth: 2.0, battery: 86, status: 'online', lastSync: '2026-02-25T06:01:30Z', totalReadings: 887 },
  { id: 'HK-07', name: 'Hikkaduwa 07', areaId: 'hikkaduwa', latitude: 6.1410, longitude: 80.0905, depth: 1.0, battery: 0, status: 'offline', lastSync: '2026-02-18T06:00:00Z', totalReadings: 720 },
  { id: 'HK-08', name: 'Hikkaduwa 08', areaId: 'hikkaduwa', latitude: 6.1390, longitude: 80.0915, depth: 2.8, battery: 77, status: 'online', lastSync: '2026-02-25T06:02:30Z', totalReadings: 882 },

  // ── Rumassala (South coast, offshore Galle) — 6 nodes ──
  { id: 'RM-01', name: 'Rumassala 01', areaId: 'rumassala', latitude: 6.0050, longitude: 80.2380, depth: 1.5, battery: 93, status: 'online', lastSync: '2026-02-25T06:00:00Z', totalReadings: 760 },
  { id: 'RM-02', name: 'Rumassala 02', areaId: 'rumassala', latitude: 6.0035, longitude: 80.2400, depth: 2.0, battery: 87, status: 'online', lastSync: '2026-02-25T06:01:00Z', totalReadings: 758 },
  { id: 'RM-03', name: 'Rumassala 03', areaId: 'rumassala', latitude: 6.0020, longitude: 80.2370, depth: 2.8, battery: 80, status: 'online', lastSync: '2026-02-25T06:02:00Z', totalReadings: 755 },
  { id: 'RM-04', name: 'Rumassala 04', areaId: 'rumassala', latitude: 6.0045, longitude: 80.2420, depth: 1.2, battery: 96, status: 'online', lastSync: '2026-02-25T06:00:30Z', totalReadings: 762 },
  { id: 'RM-05', name: 'Rumassala 05', areaId: 'rumassala', latitude: 6.0030, longitude: 80.2410, depth: 3.2, battery: 65, status: 'online', lastSync: '2026-02-25T06:03:00Z', totalReadings: 748 },
  { id: 'RM-06', name: 'Rumassala 06', areaId: 'rumassala', latitude: 6.0015, longitude: 80.2360, depth: 1.8, battery: 42, status: 'delayed', lastSync: '2026-02-24T06:00:00Z', totalReadings: 735 },
];

// --- Generate time series temperature data ---
function generateTimeSeries(days: number = 30): TemperatureReading[] {
  const readings: TemperatureReading[] = [];
  const baseDate = new Date('2026-01-26T00:00:00Z');

  for (let d = 0; d < days; d++) {
    for (const node of sensorNodes) {
      if (node.status === 'offline' && d > 20) continue;
      const date = new Date(baseDate);
      date.setDate(date.getDate() + d);

      // Base temp with seasonal & node variation
      const seasonalComponent = 27.5 + 1.2 * Math.sin((d / 365) * 2 * Math.PI);
      const nodeNum = parseInt(node.id.replace(/^[A-Z]+-/, ''), 10) || 1;
      // Area-based offset: northern reefs warmer, southern reefs cooler
      const areaOffset = node.areaId === 'bar-reef' ? 0.8
        : node.areaId === 'pigeon-island' ? 1.2
        : node.areaId === 'hikkaduwa' ? -0.4
        : -0.6; // rumassala
      const nodeOffset = (nodeNum - 8) * 0.04;
      const noise = (rand() - 0.5) * 0.6;
      const depthCooling = -node.depth * 0.08;
      const temp = seasonalComponent + areaOffset + nodeOffset + noise + depthCooling;

      // DHW accumulation — higher for warmer nodes
      const dhw = Math.max(0, (temp - 28.0) * 0.15 + rand() * 0.3);

      readings.push({
        time: date.toISOString(),
        nodeId: node.id,
        temperature: parseFloat(temp.toFixed(2)),
        dhw: parseFloat(dhw.toFixed(3)),
        latitude: node.latitude,
        longitude: node.longitude,
      });
    }
  }
  return readings;
}

export const temperatureReadings = generateTimeSeries(30);

// --- Latest readings (most recent per node) ---
export function getLatestReadings(): TemperatureReading[] {
  const latest: Record<string, TemperatureReading> = {};
  for (const r of temperatureReadings) {
    if (!latest[r.nodeId] || r.time > latest[r.nodeId].time) {
      latest[r.nodeId] = r;
    }
  }
  return Object.values(latest);
}

// --- Prediction grid ---
export function generatePredictionGrid(): PredictionPoint[] {
  const points: PredictionPoint[] = [];
  const latMin = 8.870, latMax = 8.885;
  const lonMin = 79.518, lonMax = 79.533;
  const resolution = 25;

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const lat = latMin + (latMax - latMin) * (i / (resolution - 1));
      const lon = lonMin + (lonMax - lonMin) * (j / (resolution - 1));

      // Simulate temperature field with hotspot
      const distToHotspot = Math.sqrt(
        Math.pow((lat - 8.875) * 111000, 2) +
        Math.pow((lon - 79.525) * 111000 * Math.cos(lat * Math.PI / 180), 2)
      );
      const temp = 28.5 + 1.2 * Math.exp(-distToHotspot / 400) + (rand() - 0.5) * 0.3;
      const riskScore = Math.min(1, Math.max(0, (temp - 27) / 4));
      const riskLevel = temp < 28 ? 0 : temp < 29 ? 1 : 2;

      points.push({
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
        temperature: parseFloat(temp.toFixed(2)),
        riskScore: parseFloat(riskScore.toFixed(4)),
        riskLevel,
      });
    }
  }
  return points;
}

// --- Alerts ---
export const alerts: Alert[] = [
  { id: 'A-001', type: 'critical', nodeId: 'BR-07', message: 'Temperature exceeded 29.0°C threshold', temperature: 29.1, timestamp: '2026-02-25T14:00:00Z', acknowledged: false },
  { id: 'A-002', type: 'critical', nodeId: 'BR-12', message: 'Temperature exceeded 29.0°C threshold', temperature: 29.3, timestamp: '2026-02-25T14:00:00Z', acknowledged: false },
  { id: 'A-003', type: 'warning', nodeId: 'BR-04', message: 'Temperature approaching warning threshold', temperature: 28.7, timestamp: '2026-02-25T14:00:00Z', acknowledged: false },
  { id: 'A-004', type: 'warning', nodeId: 'BR-09', message: 'Battery below 30%', timestamp: '2026-02-25T06:00:00Z', acknowledged: true },
  { id: 'A-005', type: 'critical', nodeId: 'BR-16', message: 'Node offline for 5 days', timestamp: '2026-02-20T06:00:00Z', acknowledged: false },
  { id: 'A-006', type: 'resolved', nodeId: 'BR-03', message: 'Temperature returned to normal range', temperature: 27.8, timestamp: '2026-02-25T12:00:00Z', acknowledged: true },
  { id: 'A-007', type: 'warning', nodeId: 'BR-15', message: 'Battery below 70%', timestamp: '2026-02-24T06:00:00Z', acknowledged: true },
  { id: 'A-008', type: 'warning', nodeId: 'BR-11', message: 'Temperature approaching warning threshold', temperature: 28.5, timestamp: '2026-02-25T10:00:00Z', acknowledged: false },
  { id: 'A-009', type: 'critical', nodeId: 'PI-07', message: 'Battery critically low (15%)', timestamp: '2026-02-25T06:00:00Z', acknowledged: false },
  { id: 'A-010', type: 'warning', nodeId: 'HK-07', message: 'Node offline for 7 days', timestamp: '2026-02-18T06:00:00Z', acknowledged: false },
  { id: 'A-011', type: 'warning', nodeId: 'RM-06', message: 'Sync delayed by 24h', timestamp: '2026-02-25T06:00:00Z', acknowledged: false },
];

// --- Alert Rules ---
export const alertRules: AlertRule[] = [
  { id: 'R-01', name: 'Bleaching Alert', condition: 'T > 29.0°C', nodes: 'All', action: 'email', status: 'active' },
  { id: 'R-02', name: 'Warning', condition: 'T > 28.0°C', nodes: 'All', action: 'in-app', status: 'active' },
  { id: 'R-03', name: 'Node Offline', condition: 'No sync 48h', nodes: 'All', action: 'sms', status: 'active' },
  { id: 'R-04', name: 'Anomaly Detection', condition: '|Z-score| > 3', nodes: 'Zone-A', action: 'email', status: 'paused' },
];

// --- Forecast Data ---
export function generateForecast(horizonDays: number = 7): ForecastData[] {
  const data: ForecastData[] = [];
  const baseDate = new Date('2026-02-18T00:00:00Z');

  for (let d = 0; d < 7 + horizonDays; d++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + d);

    const baseTemp = 27.8 + 0.8 * Math.sin((d / 14) * Math.PI) + (rand() - 0.5) * 0.3;
    const isHistorical = d < 7;

    data.push({
      time: date.toISOString().split('T')[0],
      actual: isHistorical ? parseFloat(baseTemp.toFixed(2)) : undefined,
      predicted: parseFloat((baseTemp + (isHistorical ? 0 : 0.1)).toFixed(2)),
      upperBound: parseFloat((baseTemp + 0.4 + d * 0.02).toFixed(2)),
      lowerBound: parseFloat((baseTemp - 0.4 - d * 0.02).toFixed(2)),
    });
  }
  return data;
}

// --- Training History ---
export const trainingHistory: TrainingMetrics[] = Array.from({ length: 33 }, (_, i) => ({
  epoch: i + 1,
  loss: 0.030 - i * 0.0001 + rand() * 0.001,
  mae: 0.138 - i * 0.0003 + rand() * 0.002,
  valLoss: 0.043 - i * 0.0003 + rand() * 0.004,
  valMae: 0.178 - i * 0.001 + rand() * 0.005,
  lr: 0.001,
}));

// --- KPI Cards ---
export const dashboardKPIs: DashboardKPI[] = [
  {
    label: 'Current Mean T°',
    value: '27.3',
    unit: '°C',
    delta: '+0.2',
    deltaDirection: 'up',
    sparkline: [27.0, 27.1, 27.0, 27.2, 27.1, 27.3, 27.3],
    status: 'normal',
  },
  {
    label: '24h Avg ΔT',
    value: '+0.4',
    unit: '°C',
    delta: '+0.1',
    deltaDirection: 'up',
    sparkline: [0.1, 0.2, 0.3, 0.2, 0.3, 0.4, 0.4],
    status: 'normal',
  },
  {
    label: 'Max Temp',
    value: '29.1',
    unit: '°C',
    delta: '+0.3',
    deltaDirection: 'up',
    sparkline: [28.5, 28.6, 28.8, 28.9, 29.0, 28.9, 29.1],
    status: 'danger',
  },
  {
    label: 'Active Nodes',
    value: '34/38',
    unit: '',
    delta: '-2',
    deltaDirection: 'down',
    sparkline: [16, 16, 16, 15, 15, 15, 14],
    status: 'warning',
  },
  {
    label: 'Active Alerts',
    value: '3',
    unit: '',
    delta: '+2',
    deltaDirection: 'up',
    sparkline: [0, 0, 1, 1, 1, 2, 3],
    status: 'danger',
  },
];

// --- Zone Risks ---
export const zoneRisks: ZoneRisk[] = [
  { zone: 'Bar Reef', risk: 72, trend: 'rising' },
  { zone: 'Pigeon Island', risk: 45, trend: 'stable' },
  { zone: 'Hikkaduwa', risk: 18, trend: 'falling' },
  { zone: 'Rumassala', risk: 32, trend: 'stable' },
];
