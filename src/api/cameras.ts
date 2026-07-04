import { apiGet } from "../lib/api";
import type { ApiCamera } from "../types";

export function fetchCameras(): Promise<ApiCamera[]> {
  return apiGet("/api/cameras");
}
