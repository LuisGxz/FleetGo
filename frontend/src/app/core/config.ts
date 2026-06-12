declare global {
  interface Window { FLEETGO_API_BASE?: string; }
}

// Overridable at deploy time (GitHub Pages injects window.FLEETGO_API_BASE in index.html).
export const API_BASE = window.FLEETGO_API_BASE ?? 'http://localhost:5200';
export const API_URL = `${API_BASE}/api/v1`;
export const HUB_URL = `${API_BASE}/hubs/tracking`;
