import type { ApiIncident, DashboardAlert } from "../types";

export function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function transformIncident(inc: ApiIncident): DashboardAlert {
  const zoneRaw = inc.zone || "unknown_zone";
  const violationRaw = inc.violation || "violation";
  return {
    id: typeof inc.id === "string" ? parseInt(inc.id.replace("inc_", ""), 10) : (inc.id as any),
    camera: `Camera 1 — ${titleCase(zoneRaw)}`,
    rule: titleCase(violationRaw),
    time: inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString("en-GB", { hour12: false }) : "",
    severity: "high",
    status: "active",
    personId: inc.person_id,
    zone: titleCase(zoneRaw),
    screenshotUrl: inc.screenshot_url,
  };
}
