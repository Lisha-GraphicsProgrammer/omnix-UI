import { useQuery } from "@tanstack/react-query";
import { fetchIncidents, fetchStats } from "../api/incidents";
import { fetchCameras } from "../api/cameras";
import { fetchAnalytics } from "../api/analytics";

const POLL_MS = 5_000;

// Query keys, centralized. Task 9's review mutation will call
// queryClient.invalidateQueries({ queryKey: keys.incidents }) and every
// page showing incidents updates at once.
export const keys = {
  incidents: ["incidents"] as const,
  stats: ["stats"] as const,
  cameras: ["cameras"] as const,
  analytics: (from: string, to: string, period: string) => ["analytics", from, to, period] as const,
};

export function useIncidents() {
  return useQuery({ queryKey: keys.incidents, queryFn: fetchIncidents, refetchInterval: POLL_MS });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: fetchStats, refetchInterval: POLL_MS });
}

export function useCameras() {
  return useQuery({ queryKey: keys.cameras, queryFn: fetchCameras, refetchInterval: POLL_MS });
}

export function useAnalytics(fromDate: string, toDate: string, period: "day" | "week" | "month") {
  return useQuery({
    queryKey: keys.analytics(fromDate, toDate, period),
    queryFn: () => fetchAnalytics(fromDate, toDate, period),
    // keep previous range's charts on screen while the new range loads
    placeholderData: (prev) => prev,
  });
}
