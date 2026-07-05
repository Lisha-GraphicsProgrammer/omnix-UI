import { apiGet, apiPost, apiDelete } from "../lib/api";

export interface ZoneLite {
  id: number;
  name: string;
  polygon: number[][];
  color: string;
  camera_id: number | null;
}

export function fetchZones(cameraId?: number): Promise<ZoneLite[]> {
  const q = cameraId != null ? `?camera_id=${cameraId}` : "";
  return apiGet(`/api/zones${q}`);
}

export function createZone(input: { name: string; polygon: number[][]; camera_id: number }): Promise<ZoneLite> {
  return apiPost("/api/zones", input);
}

export function deleteZone(zoneId: number): Promise<{ status: string; zone_id: number }> {
  return apiDelete(`/api/zones/${zoneId}`);
}
