import { apiGet } from "../lib/api";
import type { ApiIncident, ApiStats } from "../types";

export interface IncidentPage {
  items: ApiIncident[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchIncidentsPage(page: number, pageSize: number): Promise<IncidentPage> {
  const offset = (page - 1) * pageSize;
  return apiGet(`/api/incidents?limit=${pageSize}&offset=${offset}`);
}

// Cheap "what's the newest incident" probe (used by Cameras page).
export async function fetchLatestIncident(): Promise<ApiIncident | null> {
  const page: IncidentPage = await apiGet("/api/incidents?limit=1&offset=0");
  return page.items[0] ?? null;
}

export function fetchStats(): Promise<ApiStats> {
  return apiGet("/api/stats");
}
