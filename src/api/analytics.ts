import { apiFetch, apiGet } from "../lib/api";

export interface AnalyticsBundle {
  overTime: { date: string; count: number }[];
  byRule: { rule_name: string; count: number; severity: string }[];
  byHour: { hour: number; count: number }[];
  fpRate: { rule_name: string; tp_count: number; fp_count: number; total: number; rate: number }[];
}

// One round of all four analytics endpoints for a given date range/period.
export async function fetchAnalytics(fromDate: string, toDate: string, period: "day" | "week" | "month"): Promise<AnalyticsBundle> {
  const params = `from_date=${fromDate}&to_date=${toDate}`;
  const [ot, br, bh, fp] = await Promise.all([
    apiGet(`/api/analytics/incidents-over-time?period=${period}&${params}`),
    apiGet(`/api/analytics/incidents-by-rule?${params}`),
    apiGet(`/api/analytics/incidents-by-hour?${params}`),
    apiGet(`/api/analytics/false-positive-rate?${params}`),
  ]);
  return {
    overTime: Array.isArray(ot) ? ot : [],
    byRule: Array.isArray(br) ? br : [],
    byHour: Array.isArray(bh) ? bh : [],
    fpRate: Array.isArray(fp) ? fp : [],
  };
}

export async function exportIncidents(format: "csv" | "pdf", fromDate: string, toDate: string): Promise<Blob> {
  const res = await apiFetch(`/api/export/incidents?format=${format}&from_date=${fromDate}&to_date=${toDate}`);
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}
