import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VideocamIcon from "@mui/icons-material/Videocam";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../lib/api";
import { GREEN, AMBER, severityConfig } from "../../lib/constants";
import { transformIncident } from "../../lib/format";
import type { ApiIncident, ApiStats, DashboardAlert } from "../../types";

export default function AlertsPage({ navigate }: { navigate: (p: string) => void }) {
  const { t } = useTheme();
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [stats, setStats] = useState<ApiStats>({ total: 0, unique_persons: 0, zones_affected: [] });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incRes, statsRes] = await Promise.all([apiFetch("/api/incidents"), apiFetch("/api/stats")]);
        const incJson = await incRes.json();
        const statsJson = await statsRes.json();
        setAlerts((incJson as ApiIncident[]).map(transformIncident));
        setStats(statsJson);
        setApiError(false);
      } catch (e) { console.error("Dashboard fetch failed:", e); setApiError(true); }
      setLoading(false);
    };
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const filtered = alerts.filter((a) => filter === "All" || a.severity === filter.toLowerCase());
  const statCards = [
    { val: stats.total.toString(), label: "Total Violations", sub: "From detection pipeline", c: "#FF4444", icon: <WarningAmberIcon sx={{ fontSize: 20 }} /> },
    { val: "8", label: "Active Cameras", sub: "100% online", c: "#818cf8", icon: <VideocamIcon sx={{ fontSize: 20 }} /> },
    { val: stats.zones_affected.length.toString(), label: "Zones Affected", sub: "With active violations", c: GREEN, icon: <CheckCircleIcon sx={{ fontSize: 20 }} /> },
    { val: stats.unique_persons.toString(), label: "Unique Persons", sub: "ByteTrack deduplicated", c: AMBER, icon: <PersonIcon sx={{ fontSize: 20 }} /> },
  ];

  return (
    <Box>
      <Box sx={{ px: 4, py: 2.5, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.topbarBg, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Box>
          <Typography sx={{ color: t.text, fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.3px" }}>Alert Dashboard</Typography>
          <Typography sx={{ color: apiError ? "#fca5a5" : t.textMuted, fontSize: ".78rem", mt: 0.2 }}>{apiError ? "⚠️ API offline — showing cached state" : `Real-time violation monitoring — ${alerts.length} events`}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: apiError ? "#ef4444" : "#22c55e", boxShadow: `0 0 8px ${apiError ? "rgba(239,68,68,0.6)" : "rgba(34,197,94,0.6)"}`, animation: "pg 2s infinite" }} />
            <Typography sx={{ color: t.textMuted, fontSize: ".75rem" }}>{apiError ? "Offline" : "Live"}</Typography>
          </Box>
          <Box onClick={() => navigate("/rules")} sx={{ px: 2.5, py: 1, borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.25)", transition: "all .2s", "&:hover": { transform: "translateY(-1px)" } }}>
            <Typography sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 600 }}>+ New Rule</Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 4 }}>
          {statCards.map((s, i) => (
            <Box key={i} sx={{ p: "20px 24px", borderRadius: "14px", background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 2, position: "relative", overflow: "hidden", transition: "all .25s", "&:hover": { transform: "translateY(-2px)", boxShadow: `0 12px 32px ${s.c}18`, borderColor: `${s.c}30` }, "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${s.c}, transparent)` } }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "12px", background: `${s.c}18`, border: `1px solid ${s.c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Box sx={{ color: s.c, display: "flex" }}>{s.icon}</Box></Box>
              <Box>
                <Typography sx={{ fontSize: "1.45rem", fontWeight: 800, color: s.c, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{s.val}</Typography>
                <Typography sx={{ color: t.text, fontSize: ".82rem", fontWeight: 600, mt: ".2rem" }}>{s.label}</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".68rem", mt: ".1rem" }}>{s.sub}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ borderRadius: "20px", background: t.surface, border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>Violation Log</Typography>
              <Box sx={{ px: 1.5, py: 0.4, borderRadius: "20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}><Typography sx={{ color: "#fca5a5", fontSize: ".65rem", fontWeight: 700 }}>{filtered.length} events</Typography></Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["All", "Critical", "High", "Medium"].map((f) => (
                <Box key={f} onClick={() => setFilter(f)} sx={{ px: 1.5, py: 0.5, borderRadius: "8px", background: filter === f ? "rgba(99,102,241,0.15)" : "transparent", border: filter === f ? "1px solid rgba(99,102,241,0.3)" : `1px solid ${t.border}`, cursor: "pointer", transition: "all .2s" }}>
                  <Typography sx={{ color: filter === f ? "#818cf8" : t.textMuted, fontSize: ".72rem", fontWeight: filter === f ? 700 : 400 }}>{f}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Box sx={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.15)", borderTopColor: "#6366f1", animation: "sp 1s linear infinite", "@keyframes sp": { "100%": { transform: "rotate(360deg)" } }, mx: "auto", mb: 2 }} />
              <Typography sx={{ color: t.textMuted, fontSize: ".85rem" }}>Loading incidents...</Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}><Typography sx={{ color: t.textMuted, fontSize: ".9rem", mb: 0.5 }}>{apiError ? "Cannot reach API at localhost:8000" : "No violations match this filter"}</Typography></Box>
          ) : (
            <Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.7fr", px: 3, py: 1.5, borderBottom: `1px solid ${t.border}`, background: t.surface }}>
                {["Camera", "Rule Violated", "Time", "Status", "Severity", "Action"].map((h) => (
                  <Typography key={h} sx={{ color: t.textMuted, fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</Typography>
                ))}
              </Box>
              {filtered.map((alert, idx) => {
                const sev = severityConfig[alert.severity];
                return (
                  <Box key={alert.id} onClick={() => navigate(`/alert/${alert.id}`)} sx={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.7fr", px: 3, py: 2.5, alignItems: "center", borderBottom: idx < filtered.length - 1 ? `1px solid ${t.border}` : "none", cursor: "pointer", transition: "all .15s", "&:hover": { background: t.surfaceHover } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, boxShadow: "0 0 6px #ef4444", animation: "blink 1s infinite" }} />
                      <Typography sx={{ color: t.text, fontSize: ".84rem", fontWeight: 500 }}>{alert.camera}</Typography>
                    </Box>
                    <Typography sx={{ color: t.textSecondary, fontSize: ".82rem" }}>{alert.rule}</Typography>
                    <Typography sx={{ color: t.textMuted, fontSize: ".8rem", fontFamily: "monospace" }}>{alert.time}</Typography>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.7, px: 1.2, py: 0.5, borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", width: "fit-content" }}>
                      <WarningAmberIcon sx={{ fontSize: 11, color: "#fca5a5" }} />
                      <Typography sx={{ color: "#fca5a5", fontSize: ".68rem", fontWeight: 600 }}>Active</Typography>
                    </Box>
                    <Box sx={{ display: "inline-flex", px: 1.5, py: 0.5, borderRadius: "8px", background: sev.bg, border: `1px solid ${sev.border}`, width: "fit-content" }}>
                      <Typography sx={{ color: sev.color, fontSize: ".7rem", fontWeight: 700, textTransform: "capitalize" }}>{alert.severity}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography sx={{ fontSize: ".78rem", fontWeight: 600, color: "#818cf8" }}>View</Typography>
                      <ArrowForwardIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

