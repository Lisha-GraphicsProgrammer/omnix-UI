import { useState } from "react";
import { Box, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import WifiIcon from "@mui/icons-material/Wifi";
import VideocamIcon from "@mui/icons-material/Videocam";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PageHeader from "../../components/layout/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import { useCameras, useLatestIncident } from "../../hooks/queries";
import { ACCENT, GREEN, AMBER } from "../../lib/constants";
import type { ApiCamera } from "../../types";

const mockCameras = [
  { id: 1, name: "Camera 1 — Loading Zone", location: "Loading zone entrance", status: "online", alerts: 2, fps: 25, res: "1080p" },
  { id: 2, name: "Camera 2 — Crane Zone", location: "Crane operation area", status: "online", alerts: 1, fps: 25, res: "1080p" },
  { id: 3, name: "Camera 3 — Storage", location: "Material storage", status: "online", alerts: 1, fps: 20, res: "720p" },
  { id: 4, name: "Camera 4 — Exit Gate", location: "South exit", status: "online", alerts: 0, fps: 25, res: "1080p" },
  { id: 5, name: "Camera 5 — Scaffold A", location: "Scaffold zone A", status: "offline", alerts: 0, fps: 0, res: "1080p" },
  { id: 6, name: "Camera 6 — Scaffold B", location: "Scaffold zone B", status: "online", alerts: 0, fps: 25, res: "720p" },
  { id: 7, name: "Camera 7 — Warehouse", location: "Main warehouse", status: "online", alerts: 0, fps: 30, res: "4K" },
  { id: 8, name: "Camera 8 — Rooftop", location: "Rooftop overview", status: "online", alerts: 0, fps: 15, res: "720p" },
];

export default function CamerasPage() {
  const { t } = useTheme();
  const [selectedCam, setSelectedCam] = useState<ApiCamera | null>(null);

  const { data: camerasData, isError: camError } = useCameras();
  const { data: latestIncident, isError: incError } = useLatestIncident();

  const cameras: ApiCamera[] = camerasData ?? [];
  const lastDetection: string | null = latestIncident?.timestamp ?? null;
  const apiError = camError || incError;

  const mockMeta: Record<number, { alerts: number; res: string }> = {
    1: { alerts: 2, res: "1080p" }, 2: { alerts: 1, res: "1080p" }, 3: { alerts: 1, res: "720p" },
    4: { alerts: 0, res: "1080p" }, 5: { alerts: 0, res: "1080p" }, 6: { alerts: 0, res: "720p" },
    7: { alerts: 0, res: "4K" }, 8: { alerts: 0, res: "720p" },
  };

  const displayCameras = cameras.length > 0 ? cameras : mockCameras.map((c) => ({
    id: c.id, name: c.name, location: c.location, status: c.status,
    stream_url: null, snapshot_url: null, fps: c.fps, resolution: c.res, source: "none",
  }));
  const onlineCount = displayCameras.filter((c) => c.status === "online").length;
  const offlineCount = displayCameras.filter((c) => c.status === "offline").length;
  const alertCount = displayCameras.reduce((a, c) => a + (mockMeta[c.id]?.alerts || 0), 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <PageHeader
        title="Camera Management"
        description={
          apiError
            ? "⚠️ API offline — showing mock data"
            : "Live feeds and status for every camera on site"
        }
      />

      <Box sx={{ p: 4 }}>
        {/* Stat cards — these show real per-camera tallies not visible
        anywhere else in the grid below, unlike Alert Dashboard's (removed). */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 4 }}>
          {[
            { val: String(displayCameras.length), label: "Total Cameras", sub: "Configured on site", c: "#E8D5B0", icon: <VideocamIcon sx={{ fontSize: 20 }} /> },
            { val: String(onlineCount), label: "Online", sub: "Streaming live", c: GREEN, icon: <CheckCircleIcon sx={{ fontSize: 20 }} /> },
            { val: String(offlineCount), label: "Offline", sub: "Needs attention", c: "#E74C3C", icon: <WifiIcon sx={{ fontSize: 20 }} /> },
            { val: String(alertCount), label: "Active Alerts", sub: "Violations detected", c: AMBER, icon: <WarningAmberIcon sx={{ fontSize: 20 }} /> },
          ].map((s, i) => (
            <Box key={i} sx={{ p: "20px 24px", borderRadius: "14px", background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 2, position: "relative", overflow: "hidden", transition: "all .25s", "&:hover": { transform: "translateY(-2px)", boxShadow: `0 12px 32px ${s.c}18`, borderColor: `${s.c}30` }, "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${s.c}, transparent)` } }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "12px", background: `${s.c}18`, border: `1px solid ${s.c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Box sx={{ color: s.c, display: "flex" }}>{s.icon}</Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "1.45rem", fontWeight: 800, color: s.c, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{s.val}</Typography>
                <Typography sx={{ color: t.text, fontSize: ".82rem", fontWeight: 600, mt: ".2rem" }}>{s.label}</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".68rem", mt: ".1rem" }}>{s.sub}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Camera expand modal */}
        {selectedCam && (
          <Box onClick={() => setSelectedCam(null)} sx={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <Box onClick={(e) => e.stopPropagation()} sx={{ width: "min(900px, 90vw)", borderRadius: "20px", overflow: "hidden", border: `1px solid ${t.border}`, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
              <Box sx={{ px: 3, py: 2, background: t.sidebarBg, borderBottom: `1px solid ${t.sidebarBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
                  <Typography sx={{ color: t.sidebarText, fontWeight: 600, fontSize: ".9rem" }}>{selectedCam.name}</Typography>
                  <Box sx={{ px: 1, py: 0.2, borderRadius: "4px", background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
                    <Typography sx={{ color: ACCENT, fontSize: ".6rem", fontWeight: 700 }}>LIVE</Typography>
                  </Box>
                </Box>
                <Box onClick={() => setSelectedCam(null)} sx={{ cursor: "pointer", color: t.sidebarTextMuted, fontSize: "1.2rem", px: 1, "&:hover": { color: t.sidebarText } }}>✕</Box>
              </Box>
              {selectedCam.stream_url ? (
                <img src={selectedCam.stream_url} alt="Live stream" style={{ width: "100%", display: "block", maxHeight: "70vh", objectFit: "contain", background: "#000" }} />
              ) : (
                <Box sx={{ height: 400, background: "#0a0806", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 }}>
                  <VideocamIcon sx={{ fontSize: 48, color: "rgba(245,240,235,0.08)" }} />
                  <Typography sx={{ color: "rgba(245,240,235,0.2)" }}>No stream available</Typography>
                </Box>
              )}
              <Box sx={{ px: 3, py: 1.5, background: t.sidebarBg, display: "flex", gap: 3 }}>
                <Typography sx={{ color: t.sidebarTextMuted, fontSize: ".72rem" }}>📍 {selectedCam.location}</Typography>
                <Typography sx={{ color: t.sidebarTextMuted, fontSize: ".72rem" }}>🎞️ {selectedCam.fps}fps</Typography>
                <Typography sx={{ color: t.sidebarTextMuted, fontSize: ".72rem" }}>📐 {selectedCam.resolution}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Camera grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2.5 }}>
          {displayCameras.map((cam) => {
            const meta = mockMeta[cam.id] || { alerts: 0, res: cam.resolution };
            const isOnline = cam.status === "online";
            const hasStream = !!cam.stream_url;
            return (
              <Box
                key={cam.id}
                onClick={() => isOnline && setSelectedCam(cam)}
                sx={{
                  borderRadius: "20px", overflow: "hidden",
                  background: t.surface,
                  border: `1px solid ${!isOnline ? "rgba(231,76,60,0.2)" : t.border}`,
                  transition: "all .25s", boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  cursor: isOnline ? "pointer" : "default",
                  "&:hover": isOnline ? { transform: "translateY(-3px)", boxShadow: `0 12px 32px ${ACCENT}15`, borderColor: `${ACCENT}35` } : {},
                }}
              >
                <Box sx={{ aspectRatio: "16/9", background: !isOnline ? "linear-gradient(135deg, #1a0a0a, #2a0f0f)" : "linear-gradient(135deg, #130e0c, #1e1510)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {isOnline ? (
                    <>
                      {hasStream ? (
                        <img src={cam.stream_url || ""} alt={cam.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                          <VideocamIcon sx={{ color: `${ACCENT}30`, fontSize: 32 }} />
                          <Typography sx={{ color: "rgba(245,240,235,0.1)", fontSize: ".6rem", letterSpacing: ".06em" }}>NO SIGNAL</Typography>
                        </Box>
                      )}
                      <Box sx={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 0.6, px: 1, py: 0.4, borderRadius: "6px", background: `${ACCENT}25`, border: `1px solid ${ACCENT}50`, backdropFilter: "blur(8px)", zIndex: 2 }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 6px ${ACCENT}`, animation: "blink 1s infinite", "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.2 } } }} />
                        <Typography sx={{ color: "#E8D5B0", fontSize: ".55rem", fontWeight: 800, letterSpacing: ".05em" }}>{hasStream ? "LIVE" : "ONLINE"}</Typography>
                      </Box>
                      {hasStream && (
                        <Box sx={{ position: "absolute", bottom: 10, left: 10, px: 1, py: 0.3, borderRadius: "6px", background: `${ACCENT}20`, border: `1px solid ${ACCENT}40`, backdropFilter: "blur(8px)", zIndex: 2 }}>
                          <Typography sx={{ color: "#E8D5B0", fontSize: ".55rem", fontWeight: 700 }}>▶️ Click to expand</Typography>
                        </Box>
                      )}
                      {meta.alerts > 0 && (
                        <Box sx={{ position: "absolute", top: 10, right: 10, px: 1, py: 0.3, borderRadius: "6px", background: "rgba(231,76,60,0.25)", border: "1px solid rgba(231,76,60,0.5)", backdropFilter: "blur(8px)", zIndex: 2 }}>
                          <Typography sx={{ color: "#fca5a5", fontSize: ".6rem", fontWeight: 800 }}>⚠️ {meta.alerts}</Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <VideocamIcon sx={{ color: "rgba(231,76,60,0.5)", fontSize: 20 }} />
                      </Box>
                      <Typography sx={{ color: "rgba(231,76,60,0.5)", fontSize: ".68rem", fontWeight: 600, letterSpacing: ".04em" }}>OFFLINE</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ p: "14px 16px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.6 }}>
                    <Typography sx={{ color: t.text, fontSize: ".8rem", fontWeight: 600 }} noWrap>{cam.name}</Typography>
                    <WifiIcon sx={{ fontSize: 13, color: isOnline ? GREEN : "#E74C3C", flexShrink: 0, ml: 1 }} />
                  </Box>
                  <Typography sx={{ color: t.textMuted, fontSize: ".7rem", mb: 0.8 }}>{cam.location}</Typography>
                  {cam.id === 1 && lastDetection && (
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, mb: 1, px: 1, py: 0.35, borderRadius: "6px", background: `${ACCENT}08`, border: `1px solid ${ACCENT}20` }}>
                      <Box sx={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
                      <Typography sx={{ color: ACCENT, fontSize: ".62rem" }}>Last: {new Date(lastDetection).toLocaleTimeString()}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                    <Box sx={{ px: 1, py: 0.3, borderRadius: "5px", background: isOnline ? "rgba(39,174,96,0.08)" : "rgba(231,76,60,0.08)", border: `1px solid ${isOnline ? "rgba(39,174,96,0.2)" : "rgba(231,76,60,0.2)"}` }}>
                      <Typography sx={{ color: isOnline ? GREEN : "#E74C3C", fontSize: ".58rem", fontWeight: 600 }}>{isOnline ? "● Online" : "● Offline"}</Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.3, borderRadius: "5px", background: t.surface, border: `1px solid ${t.border}` }}>
                      <Typography sx={{ color: t.textMuted, fontSize: ".58rem" }}>{meta.res}</Typography>
                    </Box>
                    {cam.fps > 0 && (
                      <Box sx={{ px: 1, py: 0.3, borderRadius: "5px", background: t.surface, border: `1px solid ${t.border}` }}>
                        <Typography sx={{ color: t.textMuted, fontSize: ".58rem" }}>{cam.fps}fps</Typography>
                      </Box>
                    )}
                    {hasStream && (
                      <Box sx={{ px: 1, py: 0.3, borderRadius: "5px", background: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}>
                        <Typography sx={{ color: ACCENT, fontSize: ".58rem", fontWeight: 600 }}>STREAM</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
