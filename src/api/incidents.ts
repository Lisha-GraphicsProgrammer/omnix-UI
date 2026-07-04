import { apiGet } from "../lib/api";
import type { ApiIncident, ApiStats } from "../types";

export function fetchIncidents(): Promise<ApiIncident[]> {
  return apiGet("/api/incidents");
}

export function fetchStats(): Promise<ApiStats> {
  return apiGet("/api/stats");
}
