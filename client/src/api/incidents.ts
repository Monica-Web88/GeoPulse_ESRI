import { Filters, StatsResponse } from "../types";

// In production, VITE_API_URL points at your Render backend (e.g. https://geopulse-api.onrender.com).
// In local dev, leave VITE_API_URL unset — Vite's proxy in vite.config.ts forwards /api to localhost:4000.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

function filtersToQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.category) params.set("category", filters.category);
  if (filters.severity) params.set("severity", filters.severity);
  return params.toString();
}

/** Builds the URL the ArcGIS GeoJSONLayer points at directly — filters are baked into the query string. */
export function buildIncidentsGeoJsonUrl(filters: Filters): string {
  const qs = filtersToQueryString(filters);
  return `${API_BASE}/api/incidents${qs ? `?${qs}` : ""}`;
}

export async function fetchStats(filters: Filters, bbox?: string): Promise<StatsResponse> {
  const params = new URLSearchParams(filtersToQueryString(filters));
  if (bbox) params.set("bbox", bbox);
  const res = await fetch(`${API_BASE}/api/incidents/stats?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}
