// Types for the Benthic Guardian dashboard

export interface SensorNode {
  id: string;
  name: string;
  areaId: string; // which monitoring area this node belongs to
  latitude: number;
  longitude: number;
  depth: number; // meters
  battery: number; // percentage
  status: 'online' | 'delayed' | 'offline';
  lastSync: string; // ISO date
  totalReadings: number;
}

export interface MonitoringArea {
  id: string;
  name: string;
  description: string;
  center: { lat: number; lon: number };
  color: string; // accent color for the area marker
  defaultZoom: number; // zoom level when viewing this area
}

export interface TemperatureReading {
  time: string;
  nodeId: string;
  temperature: number;
  dhw: number;
  latitude: number;
  longitude: number;
  /** Backend sensor network; preferred for grouping vs geographic heuristic */
  networkGroupId?: string;
}

export interface PredictionPoint {
  latitude: number;
  longitude: number;
  temperature: number;
  riskScore: number;
  riskLevel: number; // 0=healthy, 1=warning, 2=danger
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'resolved';
  nodeId: string;
  message: string;
  temperature?: number;
  timestamp: string;
  acknowledged: boolean;
  status?: 'open' | 'acknowledged' | 'resolved';
  sensorId?: number | null;
  networkGroupId?: string | null;
  riskLevel?: number | null;
  assignedToId?: number | null;
  assignedToEmail?: string | null;
  acknowledgedByEmail?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  nodes: string; // 'all' or specific IDs
  action: 'email' | 'sms' | 'in-app' | 'webhook';
  status: 'active' | 'paused';
}

export interface ForecastData {
  time: string;
  actual?: number;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  mae: number;
  valLoss: number;
  valMae: number;
  lr: number;
}

export interface DashboardKPI {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaDirection: 'up' | 'down' | 'neutral';
  sparkline: number[];
  status: 'normal' | 'warning' | 'danger';
}

export interface ZoneRisk {
  zone: string;
  risk: number; // 0-100
  trend: 'rising' | 'falling' | 'stable';
}
