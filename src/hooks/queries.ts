import { useQuery } from "@tanstack/react-query";
import { fetchIncidentsPage, fetchLatestIncident, fetchStats } from "../api/incidents";
import { fetchCameras } from "../api/cameras";
import { fetchAnalytics } from "../api/analytics";

const POLL_MS = 5_000;

// Query keys, centralized. All incident keys share the ["incidents"] prefix,
// so Task 9's review mutation can invalidate every incident view at once:
//   queryClient.invalidateQueries({ queryKey: ["incidents"] })
export const keys = {
  incidentsPage: (page: number, pageSize: number) => ["incidents", "page", page, pageSize] as const,
  incidentsLatest: ["incidents", "latest"] as const,
  stats: ["stats"] as const,
  cameras: ["cameras"] as const,
  analytics: (from: string, to: string, period: string) => ["analytics", from, to, period] as const,
};

export function useIncidentsPage(page: number, pageSize: number) {
  return useQuery({
    queryKey: keys.incidentsPage(page, pageSize),
    queryFn: () => fetchIncidentsPage(page, pageSize),
    refetchInterval: POLL_MS,
    // keep current rows on screen while the next page loads
    placeholderData: (prev) => prev,
  });
}

export function useLatestIncident() {
  return useQuery({ queryKey: keys.incidentsLatest, queryFn: fetchLatestIncident, refetchInterval: POLL_MS });
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
    placeholderData: (prev) => prev,
  });
}
