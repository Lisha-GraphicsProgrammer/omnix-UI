// Shared API and view-model types for ONVXP.

export interface ApiIncident {
  id: string;
  timestamp: string;
  frame: number;
  camera: string;
  person_id: number;
  violation: string;
  zone: string;
  bbox: number[];
  screenshot_url: string;
}
export interface DashboardAlert {
  id: number;
  camera: string;
  rule: string;
  time: string;
  severity: "critical" | "high" | "medium";
  status: "active" | "resolved";
  personId: number;
  zone: string;
  screenshotUrl: string;
}
export interface ApiStats {
  total: number;
  unique_persons: number;
  zones_affected: string[];
}
export interface ApiCamera {
  id: number;
  name: string;
  location: string;
  status: string;
  stream_url: string | null;
  snapshot_url: string | null;
  fps: number;
  resolution: string;
  source: string;
}
export interface TeamMember {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string | null;
}
export interface ZoneData {
  id: number;
  name: string;
  polygon: [number, number][];
  color: string;
  camera_id: number;
  created_at: string | null;
}
export interface RuleItem {
  id: number;
  zone_id: number | null;
}
