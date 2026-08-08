// Utility functions for the Benthic Guardian dashboard

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function toFahrenheit(celsius: number): number {
  return celsius * 9 / 5 + 32;
}

export function formatTemp(celsius: number, unit: 'celsius' | 'fahrenheit'): string {
  if (unit === 'fahrenheit') {
    return `${toFahrenheit(celsius).toFixed(1)}°F`;
  }
  return `${celsius.toFixed(1)}°C`;
}

export function getRiskColor(riskLevel: number): string {
  if (riskLevel === 0) return '#1DE9B6'; // teal - healthy
  if (riskLevel === 1) return '#FFB300'; // amber - warning
  return '#FF5252'; // coral - danger
}

export function getRiskLabel(riskLevel: number): string {
  if (riskLevel === 0) return 'Healthy';
  if (riskLevel === 1) return 'Warning';
  return 'Danger';
}

export function tempToColor(temp: number): string {
  // Map temperature 25-31°C to blue→green→yellow→red
  const t = Math.max(25, Math.min(31, temp));
  const ratio = (t - 25) / 6;

  if (ratio < 0.33) {
    // Blue to Cyan
    const r = 0;
    const g = Math.round(229 * (ratio / 0.33));
    const b = 255 - Math.round(89 * (ratio / 0.33));
    return `rgb(${r},${g},${b})`;
  } else if (ratio < 0.66) {
    // Cyan to Yellow
    const localRatio = (ratio - 0.33) / 0.33;
    const r = Math.round(255 * localRatio);
    const g = 229 + Math.round(26 * localRatio);
    const b = Math.round(166 * (1 - localRatio));
    return `rgb(${r},${g},${b})`;
  } else {
    // Yellow to Red
    const localRatio = (ratio - 0.66) / 0.34;
    const r = 255;
    const g = Math.round(255 * (1 - localRatio));
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
