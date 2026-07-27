/**
 * SLIOT API Client
 * Connects the Next.js dashboard to the FastAPI backend.
 */

import type { TemperatureReading } from './types';
import { API_BASE } from './api-base';

async function fetchAPI<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (typeof window !== 'undefined') {
    const tok = localStorage.getItem('sliot_token');
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  if (init?.body && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers,
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('sliot_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (res.status === 403) {
    let detail = 'Forbidden';
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (!res.ok) {
    let detail = `API ${res.status} for ${endpoint}`;
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return await res.json();
}

// --- Endpoints ---

export interface StatsApiResponse {
  total_sst_records: number;
  total_dhw_records: number;
  total_predictions: number;
  date_range: { start: string | null; end: string | null };
  unique_coordinates: number;
  avg_temperature_24h?: number | null;
  max_temperature_24h?: number | null;
  readings_count_24h?: number;
}

export async function getStats(): Promise<StatsApiResponse> {
  return fetchAPI('/api/stats');
}

export async function getSST(start?: string, end?: string, limit = 1000) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  params.set('limit', String(limit));
  return fetchAPI(`/api/sst?${params}`);
}

export async function getDHW(start?: string, end?: string, limit = 1000) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  params.set('limit', String(limit));
  return fetchAPI(`/api/dhw?${params}`);
}

export async function getPredictions(minRisk = 0, limit = 500) {
  return fetchAPI(`/api/predictions?min_risk=${minRisk}&limit=${limit}`);
}

/** ANN–LSTM 60d history → +1/+3/+7 day SST/DHW forecast for a reef site */
export interface LSTMForecastPoint {
  model: string;
  location: string;
  issue_time: string;
  horizon_days: number;
  target_date: string;
  sst_issue: number;
  dhw_issue: number;
  predicted_temp: number;
  sst_pred: number;
  dhw_pred: number;
  sst_persist: number;
  baseline_month_sst: number;
  anomaly: number;
  risk_score: number;
  risk_level: number;
  risk_name: string;
}

export async function getLSTMForecast(
  location = 'hikkaduwa',
  asOf?: string,
): Promise<LSTMForecastPoint[]> {
  const params = new URLSearchParams({ location });
  if (asOf) params.set('as_of', asOf);
  return fetchAPI(`/api/lstm-forecast?${params}`);
}

export async function getTrainingHistory() {
  return fetchAPI('/api/training-history');
}

export async function getRiskSummary() {
  return fetchAPI('/api/risk-summary');
}

export interface UserProfile {
  id: number;
  email: string;
  role: 'admin' | 'user';
}

export async function getMe(): Promise<UserProfile> {
  return fetchAPI('/auth/me');
}

export interface NetworkGroupInfo {
  id: string;
  name: string | null;
  center_lat: number | null;
  center_lon: number | null;
}

export async function getNetworkGroups(): Promise<NetworkGroupInfo[]> {
  return fetchAPI('/api/network-groups');
}

export async function getLatestReadings() {
  return fetchAPI('/api/latest-readings');
}

/** Normalize a row from GET /api/latest-readings */
export function mapLatestReadingRow(r: Record<string, unknown>): TemperatureReading {
  return {
    time: String(r.time),
    nodeId: String(r.sensor_uid),
    temperature: Number(r.temperature),
    dhw: 0,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    networkGroupId: r.network_group_id != null ? String(r.network_group_id) : undefined,
  };
}

// --- Admin provisioning ---

export interface AdminUserRow {
  id: number;
  email: string;
  role: 'admin' | 'user';
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  return fetchAPI('/admin/users');
}

export async function adminCreateUser(email: string, password: string): Promise<UserProfile> {
  return fetchAPI('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function adminCreateNetworkGroup(
  userEmail: string,
  name?: string,
): Promise<NetworkGroupInfo> {
  return fetchAPI('/admin/network-groups', {
    method: 'POST',
    body: JSON.stringify({ user_email: userEmail, name: name || null }),
  });
}

export async function getAdminUserNetworkGroups(userEmail: string): Promise<NetworkGroupInfo[]> {
  const q = new URLSearchParams({ user_email: userEmail });
  return fetchAPI(`/admin/user-network-groups?${q}`);
}

export async function adminRegisterSensor(payload: {
  sensor_id: string;
  owner_email: string;
  latitude: number;
  longitude: number;
  depth: number;
  network_group_id?: string | null;
}): Promise<{
  id: number;
  sensor_uid: string;
  owner_id: number | null;
  network_group_id: string | null;
  latitude: number | null;
  longitude: number | null;
  depth: number | null;
  is_approved: boolean;
}> {
  return fetchAPI('/admin/register-sensor', {
    method: 'POST',
    body: JSON.stringify({
      sensor_id: payload.sensor_id,
      owner_email: payload.owner_email,
      latitude: payload.latitude,
      longitude: payload.longitude,
      depth: payload.depth,
      network_group_id: payload.network_group_id ?? null,
    }),
  });
}
