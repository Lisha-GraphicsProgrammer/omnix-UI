import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Slider, Switch, TextField,
  Select, MenuItem, FormControl, Snackbar, Alert,
  Chip, Tooltip, IconButton, LinearProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, Button,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RuleIcon from "@mui/icons-material/Rule";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LogoutIcon from "@mui/icons-material/Logout";
import WifiIcon from "@mui/icons-material/Wifi";
import VideocamIcon from "@mui/icons-material/Videocam";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import TuneIcon from "@mui/icons-material/Tune";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SpeedIcon from "@mui/icons-material/Speed";
import SaveIcon from "@mui/icons-material/Save";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MemoryIcon from "@mui/icons-material/Memory";
import RestoreIcon from "@mui/icons-material/Restore";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useTheme } from "./ThemeContext";

const DRAWER_OPEN = 220;
const DRAWER_CLOSED = 0;
const API_BASE = "http://localhost:8000";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CYAN   = "#00D4FF";
const PURPLE = "#7C3AED";
const GREEN  = "#00E676";
const AMBER  = "#FFB300";
const CARD_BG   = "rgba(255,255,255,0.03)";
const CARD_BORDER = "1px solid rgba(255,255,255,0.07)";

interface ApiIncident {
  id: string; timestamp: string; frame: number; camera: string;
  person_id: number; violation: string; zone: string; bbox: number[]; screenshot_url: string;
}
interface DashboardAlert {
  id: number; camera: string; rule: string; time: string;
  severity: "critical" | "high" | "medium"; status: "active" | "resolved";
  personId: number; zone: string; screenshotUrl: string;
}
interface ApiStats { total: number; unique_persons: number; zones_affected: string[] }

function titleCase(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }

function transformIncident(inc: ApiIncident): DashboardAlert {
  return {
    id: parseInt(inc.id.replace("inc_", ""), 10),
    camera: `Camera 1 — ${titleCase(inc.zone)}`,
    rule: titleCase(inc.violation),
    time: new Date(inc.timestamp).toLocaleTimeString("en-GB", { hour12: false }),
    severity: "high", status: "active",
    personId: inc.person_id, zone: titleCase(inc.zone), screenshotUrl: inc.screenshot_url,
  };
}

const mockCameras = [
  { id: 1, name: "Camera 1 — Loading Zone",  location: "Loading zone entrance",  status: "online",  alerts: 2, fps: 25, res: "1080p" },
  { id: 2, name: "Camera 2 — Crane Zone",    location: "Crane operation area",   status: "online",  alerts: 1, fps: 25, res: "1080p" },
  { id: 3, name: "Camera 3 — Storage",       location: "Material storage",       status: "online",  alerts: 1, fps: 20, res: "720p"  },
  { id: 4, name: "Camera 4 — Exit Gate",     location: "South exit",             status: "online",  alerts: 0, fps: 25, res: "1080p" },
  { id: 5, name: "Camera 5 — Scaffold A",    location: "Scaffold zone A",        status: "offline", alerts: 0, fps: 0,  res: "1080p" },
  { id: 6, name: "Camera 6 — Scaffold B",    location: "Scaffold zone B",        status: "online",  alerts: 0, fps: 25, res: "720p"  },
  { id: 7, name: "Camera 7 — Warehouse",     location: "Main warehouse",         status: "online",  alerts: 0, fps: 30, res: "4K"   },
  { id: 8, name: "Camera 8 — Rooftop",       location: "Rooftop overview",       status: "online",  alerts: 0, fps: 15, res: "720p"  },
];

const severityConfig = {
  critical: { color: "#fca5a5", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"  },
  high:     { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  medium:   { color: "#818cf8", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)" },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  selected, onSelect, open, onToggle, onSignOut, t,
}: {
  selected: string; onSelect: (s: string) => void;
  open: boolean; onToggle: () => void; onSignOut: () => void;
  t: ReturnType<typeof useTheme>["t"];
}) {
  const menuItems = [
    { text: "Cameras",           icon: <CameraAltIcon sx={{ fontSize: 18 }} /> },
    { text: "Rules",             icon: <RuleIcon sx={{ fontSize: 18 }} /> },
    { text: "Alert Dashboard",   icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
    { text: "Settings",          icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box sx={{
      width: open ? DRAWER_OPEN : 56, flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: t.sidebarBg,
      borderRight: `1px solid ${t.border}`,
      position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
      transition: "width .25s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden",
    }}>
      {/* Logo + toggle */}
      <Box sx={{ px: open ? 3 : 1.5, py: 3, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 1.5, minHeight: 72 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: "8px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(99,102,241,0.4)", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="12" rx="10" ry="6.5" stroke="white" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3.5" fill="white" />
            <circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1" />
          </svg>
        </Box>
        {open && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".95rem", letterSpacing: "-.2px", lineHeight: 1 }}>OMNIX</Typography>
            <Typography sx={{ color: t.textMuted, fontSize: ".58rem", letterSpacing: ".06em" }}>ENTERPRISE</Typography>
          </Box>
        )}
        <IconButton size="small" onClick={onToggle} sx={{ color: t.textMuted, ml: open ? 0 : "-4px", "&:hover": { color: t.text } }}>
          {open ? <ChevronLeftIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Nav items */}
      <Box sx={{ flex: 1, py: 2, overflowX: "hidden" }}>
        {open && (
          <Typography sx={{ color: t.textMuted, fontSize: ".6rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", px: 3, mb: 1, opacity: 0.6 }}>
            Navigation
          </Typography>
        )}
        {menuItems.map((item) => {
          const isSel = selected === item.text;
          return (
            <Tooltip key={item.text} title={!open ? item.text : ""} placement="right">
              <Box onClick={() => onSelect(item.text)} sx={{
                display: "flex", alignItems: "center", gap: 1.5,
                px: open ? 3 : 1.5, py: 1.4,
                mx: 1, mb: 0.5, borderRadius: "10px", cursor: "pointer",
                position: "relative",
                background: isSel ? "rgba(99,102,241,0.12)" : "transparent",
                border: isSel ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                transition: "all .2s",
                "&:hover": { background: isSel ? "rgba(99,102,241,0.12)" : t.surfaceHover },
              }}>
                {isSel && <Box sx={{ position: "absolute", left: 0, top: "25%", bottom: "25%", width: 3, borderRadius: "0 3px 3px 0", background: "#6366f1", boxShadow: "0 0 8px #6366f1" }} />}
                <Box sx={{ color: isSel ? "#818cf8" : t.textMuted, display: "flex", transition: "color .2s", flexShrink: 0 }}>{item.icon}</Box>
                {open && <Typography sx={{ color: isSel ? t.text : t.textSecondary, fontSize: ".85rem", fontWeight: isSel ? 600 : 400, transition: "all .2s", whiteSpace: "nowrap" }}>{item.text}</Typography>}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* User + signout */}
      <Box sx={{ p: open ? 2 : 1, borderTop: `1px solid ${t.border}` }}>
        {open ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: "10px 12px", borderRadius: "10px", background: t.surface, border: `1px solid ${t.border}`, mb: 1.5 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Typography sx={{ color: "#fff", fontSize: ".72rem", fontWeight: 700 }}>A</Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: t.text, fontSize: ".78rem", fontWeight: 600, lineHeight: 1 }}>Admin</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".65rem", mt: 0.2 }} noWrap>admin@omnix.ai</Typography>
              </Box>
            </Box>
            <Box onClick={onSignOut} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "8px", cursor: "pointer", "&:hover": { background: t.surfaceHover }, transition: "all .2s" }}>
              <LogoutIcon sx={{ color: t.textMuted, fontSize: 15 }} />
              <Typography sx={{ color: t.textMuted, fontSize: ".75rem" }}>Sign out</Typography>
            </Box>
          </>
        ) : (
          <Tooltip title="Sign out" placement="right">
            <Box onClick={onSignOut} sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 1, borderRadius: "8px", cursor: "pointer", "&:hover": { background: t.surfaceHover } }}>
              <LogoutIcon sx={{ color: t.textMuted, fontSize: 18 }} />
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────────
function MetricTile({ icon, value, label, color, pulse = false }: { icon: React.ReactNode; value: string; label: string; color: string; pulse?: boolean }) {
  const { t } = useTheme();
  return (
    <Box sx={{ flex: 1, minWidth: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", p: "20px 24px", display: "flex", alignItems: "center", gap: 2, position: "relative", overflow: "hidden",
      "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${color}, transparent)` },
    }}>
      <Box sx={{ width: 44, height: 44, borderRadius: "12px", background: `${color}18`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        ...(pulse && { animation: "omnix-pulse 2.4s ease-in-out infinite", "@keyframes omnix-pulse": { "0%, 100%": { boxShadow: `0 0 0 0 ${color}40` }, "50%": { boxShadow: "0 0 0 8px transparent" } } }),
      }}>
        <Box sx={{ color, display: "flex" }}>{icon}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: "1.35rem", fontWeight: 700, color, lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: t.textMuted, mt: "2px", letterSpacing: "0.04em" }}>{label}</Typography>
      </Box>
    </Box>
  );
}

function SectionCard({ icon, title, subtitle, accentColor, children }: { icon: React.ReactNode; title: string; subtitle: string; accentColor: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 3, py: "18px", background: `linear-gradient(135deg, ${accentColor}12 0%, transparent 60%)`, borderBottom: `1px solid ${accentColor}20`, display: "flex", alignItems: "center", gap: "14px" }}>
        <Box sx={{ width: 38, height: 38, borderRadius: "10px", background: `${accentColor}20`, border: `1px solid ${accentColor}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Box sx={{ color: accentColor, display: "flex", fontSize: 18 }}>{icon}</Box>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: t.text }}>{title}</Typography>
          <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "1px" }}>{subtitle}</Typography>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2 }}>{children}</Box>
    </Box>
  );
}

function SettingRow({ label, description, tag, tagColor = CYAN, children, tooltip }: { label: string; description: string; tag?: string; tagColor?: string; children: React.ReactNode; tooltip?: string }) {
  const { t } = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: "14px", gap: 2, "&:not(:last-child)": { borderBottom: `1px solid ${t.border}` } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: t.text }}>{label}</Typography>
          {tooltip && <Tooltip title={tooltip} arrow placement="top"><InfoOutlinedIcon sx={{ fontSize: 14, color: t.textMuted, cursor: "help" }} /></Tooltip>}
        </Box>
        <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "2px" }}>{description}</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {tag && <Chip label={tag} size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.04em", background: `${tagColor}18`, color: tagColor, border: `1px solid ${tagColor}30`, borderRadius: "5px" }} />}
        {children}
      </Box>
    </Box>
  );
}

function ValuePill({ value, highlight = false }: { value: string; highlight?: boolean }) {
  const { t } = useTheme();
  return (
    <Box sx={{ px: "14px", py: "5px", borderRadius: "8px", background: highlight ? `${CYAN}15` : t.surface, border: `1px solid ${highlight ? CYAN + "35" : t.border}`, color: highlight ? CYAN : t.textSecondary, fontSize: "0.82rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
      {value}
    </Box>
  );
}

// ─── CamerasPage ──────────────────────────────────────────────────────────────
function CamerasPage() {
  const { t } = useTheme();
  const [cam1Data, setCam1Data] = useState<{ thumbnail: string | null; lastDetection: string | null }>({ thumbnail: null, lastDetection: null });
  useEffect(() => {
    const fetchCam1 = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/incidents`);
        const data: ApiIncident[] = await res.json();
        if (data?.length > 0) setCam1Data({ thumbnail: data[0].screenshot_url || null, lastDetection: data[0].timestamp || null });
      } catch {}
    };
    fetchCam1();
    const ti = setInterval(fetchCam1, 5000);
    return () => clearInterval(ti);
  }, []);

  return (
    <Box>
      <Box sx={{ px: 4, py: 2.5, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.topbarBg, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Box>
          <Typography sx={{ color: t.text, fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.3px" }}>Camera Management</Typography>
          <Typography sx={{ color: t.textMuted, fontSize: ".78rem", mt: .2 }}>8 cameras configured · 7 online · Site A</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.6)", animation: "pg 2s infinite", "@keyframes pg": { "0%,100%": { opacity: 1 }, "50%": { opacity: .3 } } }} />
            <Typography sx={{ color: t.textMuted, fontSize: ".75rem" }}>Live</Typography>
          </Box>
          <Box sx={{ px: 2.5, py: 1, borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.25)", transition: "all .2s", "&:hover": { transform: "translateY(-1px)" } }}>
            <Typography sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 600 }}>+ Add Camera</Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 4 }}>
          {[
            { val: "8", label: "Total Cameras", sub: "Configured on site",   c: "#818cf8", icon: <VideocamIcon sx={{ fontSize: 20 }} /> },
            { val: "7", label: "Online",         sub: "Streaming live",       c: GREEN,     icon: <CheckCircleIcon sx={{ fontSize: 20 }} /> },
            { val: "1", label: "Offline",         sub: "Needs attention",     c: "#FF4444", icon: <WifiIcon sx={{ fontSize: 20 }} /> },
            { val: "4", label: "Active Alerts",   sub: "Violations detected", c: AMBER,     icon: <WarningAmberIcon sx={{ fontSize: 20 }} /> },
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
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2.5 }}>
          {mockCameras.map((cam) => (
            <Box key={cam.id} sx={{ borderRadius: "20px", overflow: "hidden", background: t.surface, border: `1px solid ${cam.status === "offline" ? "rgba(239,68,68,0.2)" : t.border}`, transition: "all .25s", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", "&:hover": { transform: "translateY(-3px)", boxShadow: "0 12px 32px rgba(0,0,0,0.2)" } }}>
              <Box sx={{ aspectRatio: "16/9", background: cam.status === "offline" ? "linear-gradient(135deg, #1a0a0a, #2a0f0f)" : "linear-gradient(135deg, #0d1117, #161b22)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {cam.status === "online" ? (
                  <>
                    {cam.id === 1 && cam1Data.thumbnail ? (
                      <img src={cam1Data.thumbnail} alt="Camera 1" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <VideocamIcon sx={{ color: "rgba(99,102,241,0.2)", fontSize: 32 }} />
                        <Typography sx={{ color: "rgba(255,255,255,0.1)", fontSize: ".6rem", letterSpacing: ".06em" }}>NO SIGNAL</Typography>
                      </Box>
                    )}
                    <Box sx={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: .6, px: 1, py: .4, borderRadius: "6px", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", backdropFilter: "blur(8px)", zIndex: 2 }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444", animation: "blink 1s infinite", "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: .2 } } }} />
                      <Typography sx={{ color: "#fca5a5", fontSize: ".55rem", fontWeight: 800, letterSpacing: ".05em" }}>LIVE</Typography>
                    </Box>
                    {cam.alerts > 0 && (
                      <Box sx={{ position: "absolute", top: 10, right: 10, px: 1, py: .3, borderRadius: "6px", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", backdropFilter: "blur(8px)", zIndex: 2 }}>
                        <Typography sx={{ color: "#fca5a5", fontSize: ".6rem", fontWeight: 800 }}>⚠ {cam.alerts}</Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <VideocamIcon sx={{ color: "rgba(239,68,68,0.5)", fontSize: 20 }} />
                    </Box>
                    <Typography sx={{ color: "rgba(239,68,68,0.5)", fontSize: ".68rem", fontWeight: 600, letterSpacing: ".04em" }}>OFFLINE</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ p: "14px 16px" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: .6 }}>
                  <Typography sx={{ color: t.text, fontSize: ".8rem", fontWeight: 600 }} noWrap>{cam.name}</Typography>
                  <WifiIcon sx={{ fontSize: 13, color: cam.status === "online" ? "#6ee7b7" : "#fca5a5", flexShrink: 0, ml: 1 }} />
                </Box>
                <Typography sx={{ color: t.textMuted, fontSize: ".7rem", mb: .8 }}>{cam.location}</Typography>
                {cam.id === 1 && cam1Data.lastDetection && (
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: .6, mb: 1, px: 1, py: .35, borderRadius: "6px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <Box sx={{ width: 4, height: 4, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                    <Typography sx={{ color: "rgba(239,68,68,0.7)", fontSize: ".62rem" }}>Last: {new Date(cam1Data.lastDetection).toLocaleTimeString()}</Typography>
                  </Box>
                )}
                <Box sx={{ display: "flex", gap: .8, flexWrap: "wrap" }}>
                  <Box sx={{ px: 1, py: .3, borderRadius: "5px", background: cam.status === "online" ? "rgba(110,231,183,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${cam.status === "online" ? "rgba(110,231,183,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                    <Typography sx={{ color: cam.status === "online" ? "#6ee7b7" : "#fca5a5", fontSize: ".58rem", fontWeight: 600 }}>{cam.status === "online" ? "● Online" : "● Offline"}</Typography>
                  </Box>
                  <Box sx={{ px: 1, py: .3, borderRadius: "5px", background: t.surface, border: `1px solid ${t.border}` }}>
                    <Typography sx={{ color: t.textMuted, fontSize: ".58rem" }}>{cam.res}</Typography>
                  </Box>
                  {cam.fps > 0 && <Box sx={{ px: 1, py: .3, borderRadius: "5px", background: t.surface, border: `1px solid ${t.border}` }}><Typography sx={{ color: t.textMuted, fontSize: ".58rem" }}>{cam.fps}fps</Typography></Box>}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── AlertsPage ───────────────────────────────────────────────────────────────
function AlertsPage({ navigate }: { navigate: (p: string) => void }) {
  const { t } = useTheme();
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [stats, setStats] = useState<ApiStats>({ total: 0, unique_persons: 0, zones_affected: [] });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incRes, statsRes] = await Promise.all([fetch(`${API_BASE}/api/incidents`), fetch(`${API_BASE}/api/stats`)]);
        setAlerts((await incRes.json() as ApiIncident[]).map(transformIncident));
        setStats(await statsRes.json());
        setApiError(false);
      } catch { setApiError(true); }
      setLoading(false);
    };
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const filtered = alerts.filter(a => filter === "All" || a.severity === filter.toLowerCase());
  const statCards = [
    { val: stats.total.toString(),              label: "Total Violations", sub: "From detection pipeline",  c: "#FF4444", icon: <WarningAmberIcon sx={{ fontSize: 20 }} /> },
    { val: "8",                                  label: "Active Cameras",   sub: "100% online",              c: "#818cf8", icon: <VideocamIcon sx={{ fontSize: 20 }} /> },
    { val: stats.zones_affected.length.toString(), label: "Zones Affected", sub: "With active violations",  c: GREEN,     icon: <CheckCircleIcon sx={{ fontSize: 20 }} /> },
    { val: stats.unique_persons.toString(),      label: "Unique Persons",   sub: "ByteTrack deduplicated",   c: AMBER,     icon: <PersonIcon sx={{ fontSize: 20 }} /> },
  ];

  return (
    <Box>
      <Box sx={{ px: 4, py: 2.5, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.topbarBg, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Box>
          <Typography sx={{ color: t.text, fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.3px" }}>Alert Dashboard</Typography>
          <Typography sx={{ color: apiError ? "#fca5a5" : t.textMuted, fontSize: ".78rem", mt: .2 }}>
            {apiError ? "⚠ API offline — showing cached state" : `Real-time violation monitoring — ${alerts.length} events`}
          </Typography>
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
        <Box sx={{ borderRadius: "20px", background: t.surface, border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>Violation Log</Typography>
              <Box sx={{ px: 1.5, py: .4, borderRadius: "20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Typography sx={{ color: "#fca5a5", fontSize: ".65rem", fontWeight: 700 }}>{filtered.length} events</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["All", "Critical", "High", "Medium"].map(f => (
                <Box key={f} onClick={() => setFilter(f)} sx={{ px: 1.5, py: .5, borderRadius: "8px", background: filter === f ? "rgba(99,102,241,0.15)" : "transparent", border: filter === f ? "1px solid rgba(99,102,241,0.3)" : `1px solid ${t.border}`, cursor: "pointer", transition: "all .2s" }}>
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
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Typography sx={{ color: t.textMuted, fontSize: ".9rem", mb: .5 }}>{apiError ? "Cannot reach API at localhost:8000" : "No violations match this filter"}</Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.7fr", px: 3, py: 1.5, borderBottom: `1px solid ${t.border}`, background: t.surface }}>
                {["Camera", "Rule Violated", "Time", "Status", "Severity", "Action"].map(h => (
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
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: .7, px: 1.2, py: .5, borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", width: "fit-content" }}>
                      <WarningAmberIcon sx={{ fontSize: 11, color: "#fca5a5" }} />
                      <Typography sx={{ color: "#fca5a5", fontSize: ".68rem", fontWeight: 600 }}>Active</Typography>
                    </Box>
                    <Box sx={{ display: "inline-flex", px: 1.5, py: .5, borderRadius: "8px", background: sev.bg, border: `1px solid ${sev.border}`, width: "fit-content" }}>
                      <Typography sx={{ color: sev.color, fontSize: ".7rem", fontWeight: 700, textTransform: "capitalize" }}>{alert.severity}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: .5 }}>
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

// ─── SettingsPage ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const { t, mode, toggleMode } = useTheme();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(150);
  const [confidence, setConfidence] = useState(0.50);
  const [bytetrackBuffer, setBytetrackBuffer] = useState(30);
  const [dedup, setDedup] = useState(true);
  const [alertChannel, setAlertChannel] = useState("dashboard");
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [frameSampling, setFrameSampling] = useState("every");
  const [modelPrecision, setModelPrecision] = useState("balanced");
  const [siteName, setSiteName] = useState("Site A — Construction");
  const [llmModel, setLlmModel] = useState("claude-haiku");

  const mark = () => setDirty(true);
  const handleSave = async () => { setSaving(true); await new Promise(r => setTimeout(r, 900)); setSaving(false); setDirty(false); setSaved(true); };
  const handleReset = () => { setCooldown(150); setConfidence(0.50); setBytetrackBuffer(30); setDedup(true); setAlertChannel("dashboard"); setEmailAlerts(false); setFrameSampling("every"); setModelPrecision("balanced"); setSiteName("Site A — Construction"); setLlmModel("claude-haiku"); setDirty(false); };

  const selectSx = { minWidth: 160, fontSize: "0.82rem", background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text, "& fieldset": { border: "none" }, "& .MuiSvgIcon-root": { color: t.textMuted } };

  return (
    <Box sx={{ p: "32px 36px", minHeight: "100vh" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>Settings</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: t.textMuted, mt: "4px" }}>Platform configuration — OMNIX POC v0.1</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {dirty && <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mr: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: AMBER, boxShadow: `0 0 8px ${AMBER}` }} />
            <Typography sx={{ fontSize: "0.75rem", color: AMBER }}>Unsaved changes</Typography>
          </Box>}
          {/* Theme toggle */}
          <Tooltip title={mode === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}>
            <IconButton onClick={toggleMode} size="small" sx={{ border: `1px solid ${t.border}`, borderRadius: "10px", color: t.textMuted, "&:hover": { borderColor: t.borderStrong, color: t.text } }}>
              {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={handleReset} size="small" sx={{ border: `1px solid ${t.border}`, borderRadius: "10px", color: t.textMuted, "&:hover": { borderColor: t.borderStrong, color: t.text } }}>
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box onClick={dirty && !saving ? handleSave : undefined} sx={{ display: "flex", alignItems: "center", gap: "8px", px: "20px", py: "10px", borderRadius: "10px", background: dirty ? `linear-gradient(135deg, ${PURPLE}, #5B21B6)` : t.surface, border: `1px solid ${dirty ? PURPLE + "80" : t.border}`, cursor: dirty && !saving ? "pointer" : "default", opacity: saving ? 0.7 : 1, transition: "all .25s", "&:hover": dirty && !saving ? { background: `linear-gradient(135deg, #8B5CF6, ${PURPLE})`, boxShadow: `0 0 20px ${PURPLE}50` } : {} }}>
            <SaveIcon sx={{ fontSize: 16, color: dirty ? "#fff" : t.textMuted }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: dirty ? "#fff" : t.textMuted }}>{saving ? "Saving…" : "Save Changes"}</Typography>
          </Box>
        </Box>
      </Box>

      {saving && <LinearProgress sx={{ mb: 3, borderRadius: 2, height: 2, background: t.surface, "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${PURPLE}, ${CYAN})` } }} />}

      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <MetricTile icon={<RocketLaunchIcon sx={{ fontSize: 20 }} />} value="v0.1"   label="Version"  color={CYAN}   />
        <MetricTile icon={<MemoryIcon sx={{ fontSize: 20 }} />}        value="YOLOv8" label="Engine"   color={PURPLE} />
        <MetricTile icon={<SpeedIcon sx={{ fontSize: 20 }} />}         value="79%"    label="Vest mAP" color={AMBER}  />
        <MetricTile icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}   value="Online" label="Status"   color={GREEN}  pulse />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        <SectionCard icon={<TuneIcon fontSize="small" />} title="Detection Engine" subtitle="Configure core CV pipeline parameters" accentColor={CYAN}>
          <SettingRow label="Alert Cooldown" description="Minimum frames between alerts for same person ID" tag="ByteTrack" tooltip="Prevents alert flooding per person">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 210 }}>
              <Slider value={cooldown} min={30} max={500} step={10} onChange={(_, v) => { setCooldown(v as number); mark(); }} sx={{ color: CYAN, flex: 1, "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-rail": { opacity: 0.2 } }} />
              <ValuePill value={`${cooldown} f`} highlight />
            </Box>
          </SettingRow>
          <SettingRow label="Detection Confidence" description="Minimum YOLO confidence score (0–1)" tag="YOLOv8" tooltip="Lower = more detections but more false positives">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 210 }}>
              <Slider value={confidence} min={0.1} max={0.95} step={0.01} onChange={(_, v) => { setConfidence(v as number); mark(); }} sx={{ color: PURPLE, flex: 1, "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-rail": { opacity: 0.2 } }} />
              <ValuePill value={confidence.toFixed(2)} highlight />
            </Box>
          </SettingRow>
          <SettingRow label="ByteTrack Buffer" description="Frames to retain lost track IDs" tag="Tracking" tooltip="How long to keep a person's ID alive after leaving frame">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 210 }}>
              <Slider value={bytetrackBuffer} min={5} max={120} step={5} onChange={(_, v) => { setBytetrackBuffer(v as number); mark(); }} sx={{ color: AMBER, flex: 1, "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-rail": { opacity: 0.2 } }} />
              <ValuePill value={`${bytetrackBuffer} f`} />
            </Box>
          </SettingRow>
        </SectionCard>

        <SectionCard icon={<NotificationsActiveIcon fontSize="small" />} title="Alert System" subtitle="Configure how and where alerts are dispatched" accentColor={AMBER}>
          <SettingRow label="Alert Channels" description="Where to send violation notifications" tag="Active" tagColor={GREEN}>
            <FormControl size="small"><Select value={alertChannel} onChange={e => { setAlertChannel(e.target.value); mark(); }} sx={selectSx}><MenuItem value="dashboard">Dashboard Only</MenuItem><MenuItem value="email">Email</MenuItem><MenuItem value="webhook">Webhook</MenuItem><MenuItem value="all">All Channels</MenuItem></Select></FormControl>
          </SettingRow>
          <SettingRow label="Alert Deduplication" description="Prevent duplicate alerts for the same event" tag="ByteTrack" tooltip="Uses ByteTrack IDs to suppress repeated alerts">
            <Switch checked={dedup} onChange={e => { setDedup(e.target.checked); mark(); }} size="small" sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: GREEN }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: GREEN } }} />
          </SettingRow>
          <SettingRow label="Email Notifications" description="Send alert emails to registered admin address" tag="Optional" tagColor="rgba(255,255,255,0.3)">
            <Switch checked={emailAlerts} onChange={e => { setEmailAlerts(e.target.checked); mark(); }} size="small" sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: CYAN }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: CYAN } }} />
          </SettingRow>
        </SectionCard>

        <SectionCard icon={<PsychologyIcon fontSize="small" />} title="AI Model" subtitle="Computer vision model configuration" accentColor={PURPLE}>
          <SettingRow label="Active Models" description="Currently loaded detection models" tag="Running" tagColor={GREEN}><ValuePill value="Helmet + Vest + Base YOLO" /></SettingRow>
          <SettingRow label="Vest Model" description="Trained on Roboflow safety vest dataset" tag="POC" tagColor={AMBER}><ValuePill value="79% mAP@50" highlight /></SettingRow>
          <SettingRow label="Frame Sampling" description="How frequently frames are processed" tag="Max Quality" tagColor={CYAN} tooltip="Every frame = highest accuracy, higher GPU load">
            <FormControl size="small"><Select value={frameSampling} onChange={e => { setFrameSampling(e.target.value); mark(); }} sx={selectSx}><MenuItem value="every">Every frame</MenuItem><MenuItem value="2">Every 2nd frame</MenuItem><MenuItem value="5">Every 5th frame</MenuItem><MenuItem value="10">Every 10th frame</MenuItem></Select></FormControl>
          </SettingRow>
          <SettingRow label="Model Precision" description="Speed vs accuracy tradeoff">
            <FormControl size="small"><Select value={modelPrecision} onChange={e => { setModelPrecision(e.target.value); mark(); }} sx={selectSx}><MenuItem value="fast">Fast (FP16)</MenuItem><MenuItem value="balanced">Balanced (FP32)</MenuItem><MenuItem value="accurate">Accurate (Full)</MenuItem></Select></FormControl>
          </SettingRow>
        </SectionCard>

        <SectionCard icon={<SettingsIcon fontSize="small" />} title="Platform" subtitle="General platform settings" accentColor="rgba(255,255,255,0.45)">
          <SettingRow label="LLM Model" description="AI model for natural language rule parsing" tag="Anthropic" tagColor={PURPLE}>
            <FormControl size="small"><Select value={llmModel} onChange={e => { setLlmModel(e.target.value); mark(); }} sx={{ ...selectSx, minWidth: 200 }}><MenuItem value="claude-haiku">Claude Haiku (planned)</MenuItem><MenuItem value="claude-sonnet">Claude Sonnet</MenuItem><MenuItem value="gpt-4o-mini">GPT-4o Mini</MenuItem></Select></FormControl>
          </SettingRow>
          <SettingRow label="Site Name" description="Current monitoring site identifier" tag="Active" tagColor={GREEN}>
            <TextField value={siteName} onChange={e => { setSiteName(e.target.value); mark(); }} size="small" sx={{ width: 220, "& .MuiOutlinedInput-root": { fontSize: "0.82rem", background: t.surface, borderRadius: "8px", color: t.text, "& fieldset": { borderColor: t.border }, "&:hover fieldset": { borderColor: t.borderStrong }, "&.Mui-focused fieldset": { borderColor: CYAN } } }} />
          </SettingRow>
          <SettingRow label="Interface Theme" description="Switch between dark and light mode">
            <Box onClick={toggleMode} sx={{ display: "flex", alignItems: "center", gap: 1, px: "14px", py: "6px", borderRadius: "8px", background: t.surface, border: `1px solid ${t.border}`, cursor: "pointer", transition: "all .2s", "&:hover": { borderColor: PURPLE, background: `${PURPLE}10` } }}>
              {mode === "dark" ? <LightModeIcon sx={{ fontSize: 15, color: AMBER }} /> : <DarkModeIcon sx={{ fontSize: 15, color: PURPLE }} />}
              <Typography sx={{ fontSize: "0.8rem", color: t.textSecondary }}>{mode === "dark" ? "Light Mode" : "Dark Mode"}</Typography>
            </Box>
          </SettingRow>
        </SectionCard>
      </Box>

      {/* Danger zone */}
      <Box sx={{ mt: 3, p: "20px 24px", borderRadius: "14px", border: "1px solid rgba(255,68,68,0.2)", background: "rgba(255,68,68,0.03)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#FF6B6B" }}>Danger Zone</Typography>
            <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "2px" }}>Clear pipeline data, reset stored tracks, and flush the alert queue</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: "10px" }}>
            {["Flush Alert Queue", "Reset Track IDs"].map(label => (
              <Box key={label} sx={{ px: "16px", py: "7px", borderRadius: "8px", cursor: "pointer", border: "1px solid rgba(255,68,68,0.3)", color: "#FF6B6B", fontSize: "0.8rem", fontWeight: 500, transition: "all .2s", "&:hover": { background: "rgba(255,68,68,0.1)" } }}>{label}</Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSaved(false)} sx={{ background: `${GREEN}12`, border: `1px solid ${GREEN}30`, color: GREEN, "& .MuiAlert-icon": { color: GREEN } }}>Settings saved successfully</Alert>
      </Snackbar>
    </Box>
  );
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [selected, setSelected] = useState("Alert Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const navigate = useNavigate();
  const { t, mode } = useTheme();

  const drawerWidth = sidebarOpen ? DRAWER_OPEN : 56;

  const handleSelect = (item: string) => {
    setSelected(item);
    if (item === "Rules") navigate("/rules");
  };

  const handleSignOut = () => {
    localStorage.removeItem("omnix_auth");
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: t.bg, fontFamily: '"Inter", system-ui, sans-serif' }}>
      <Sidebar
        selected={selected}
        onSelect={handleSelect}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        onSignOut={() => setSignOutOpen(true)}
        t={t}
      />

      <Box sx={{ flex: 1, ml: `${drawerWidth}px`, display: "flex", flexDirection: "column", minHeight: "100vh", transition: "margin-left .25s cubic-bezier(.4,0,.2,1)" }}>
        {selected === "Alert Dashboard" && <AlertsPage navigate={navigate} />}
        {selected === "Cameras"         && <CamerasPage />}
        {selected === "Settings"        && <SettingsPage />}
      </Box>

      {/* Sign out confirmation dialog */}
      <Dialog open={signOutOpen} onClose={() => setSignOutOpen(false)} sx={{ "& .MuiDialog-paper": { background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: "16px", minWidth: 360 } }}>
        <DialogTitle sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}>Sign out of OMNIX?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textSecondary, fontSize: ".88rem", lineHeight: 1.6 }}>
            You'll be returned to the login screen. Any unsaved settings will be lost.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setSignOutOpen(false)} sx={{ color: t.textSecondary, borderRadius: "9px", textTransform: "none", border: `1px solid ${t.border}`, px: 2.5, "&:hover": { background: t.surfaceHover } }}>
            Cancel
          </Button>
          <Button onClick={handleSignOut} variant="contained" sx={{ borderRadius: "9px", textTransform: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 14px rgba(239,68,68,0.3)", px: 2.5, "&:hover": { background: "linear-gradient(135deg, #dc2626, #b91c1c)" } }}>
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}