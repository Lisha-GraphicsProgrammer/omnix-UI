import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RuleIcon from "@mui/icons-material/Rule";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LogoutIcon from "@mui/icons-material/Logout";
import WifiIcon from "@mui/icons-material/Wifi";
import VideocamIcon from "@mui/icons-material/Videocam";

const DRAWER = 220;
const API_BASE = "http://localhost:8000";

interface ApiIncident {
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

interface DashboardAlert {
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

interface ApiStats {
  total: number;
  unique_persons: number;
  zones_affected: string[];
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function transformIncident(inc: ApiIncident): DashboardAlert {
  const idNum = parseInt(inc.id.replace("inc_", ""), 10);
  const time = new Date(inc.timestamp).toLocaleTimeString("en-GB", {
    hour12: false,
  });
  return {
    id: idNum,
    camera: `Camera 1 — ${titleCase(inc.zone)}`,
    rule: titleCase(inc.violation),
    time,
    severity: "high",
    status: "active",
    personId: inc.person_id,
    zone: titleCase(inc.zone),
    screenshotUrl: inc.screenshot_url,
  };
}

const mockCameras = [
  {
    id: 1,
    name: "Camera 1 — Entry Gate",
    location: "Main entrance",
    status: "online",
    alerts: 2,
    fps: 25,
    res: "1080p",
  },
  {
    id: 2,
    name: "Camera 2 — Crane Zone",
    location: "Crane operation area",
    status: "online",
    alerts: 1,
    fps: 25,
    res: "1080p",
  },
  {
    id: 3,
    name: "Camera 3 — Storage",
    location: "Material storage",
    status: "online",
    alerts: 1,
    fps: 20,
    res: "720p",
  },
  {
    id: 4,
    name: "Camera 4 — Exit Gate",
    location: "South exit",
    status: "online",
    alerts: 0,
    fps: 25,
    res: "1080p",
  },
  {
    id: 5,
    name: "Camera 5 — Scaffold A",
    location: "Scaffold zone A",
    status: "offline",
    alerts: 0,
    fps: 0,
    res: "1080p",
  },
  {
    id: 6,
    name: "Camera 6 — Scaffold B",
    location: "Scaffold zone B",
    status: "online",
    alerts: 0,
    fps: 25,
    res: "720p",
  },
  {
    id: 7,
    name: "Camera 7 — Warehouse",
    location: "Main warehouse",
    status: "online",
    alerts: 0,
    fps: 30,
    res: "4K",
  },
  {
    id: 8,
    name: "Camera 8 — Rooftop",
    location: "Rooftop overview",
    status: "online",
    alerts: 0,
    fps: 15,
    res: "720p",
  },
];

const severityConfig: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  critical: {
    color: "#fca5a5",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
  },
  high: {
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.25)",
  },
  medium: {
    color: "#818cf8",
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.25)",
  },
};

const menuItems = [
  { text: "Cameras", icon: <CameraAltIcon sx={{ fontSize: 18 }} /> },
  { text: "Rules", icon: <RuleIcon sx={{ fontSize: 18 }} /> },
  { text: "Alerts", icon: <NotificationsIcon sx={{ fontSize: 18 }} /> },
  { text: "Settings", icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
];

function TopBar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        px: 4,
        py: 2.5,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(13,13,16,0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Box>
        <Typography
          sx={{
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "-.3px",
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{ color: "rgba(255,255,255,0.25)", fontSize: ".78rem", mt: 0.2 }}
        >
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

function LiveDot() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 8px rgba(34,197,94,0.6)",
          animation: "pg 2s infinite",
          "@keyframes pg": {
            "0%,100%": { opacity: 1 },
            "50%": { opacity: 0.3 },
          },
        }}
      />
      <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: ".75rem" }}>
        Live
      </Typography>
    </Box>
  );
}

function CamerasPage() {
  return (
    <Box>
      <TopBar
        title="Camera Management"
        subtitle="8 cameras configured · 7 online · Site A"
      >
        <LiveDot />
        <Box
          sx={{
            px: 2,
            py: 0.8,
            borderRadius: "8px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            cursor: "pointer",
          }}
        >
          <Typography
            sx={{ color: "#818cf8", fontSize: ".78rem", fontWeight: 600 }}
          >
            + Add Camera
          </Typography>
        </Box>
      </TopBar>
      <Box sx={{ p: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 4,
          }}
        >
          {[
            {
              val: "8",
              label: "Total",
              c: "#818cf8",
              bg: "rgba(99,102,241,0.07)",
              border: "rgba(99,102,241,0.15)",
              icon: "📹",
            },
            {
              val: "7",
              label: "Online",
              c: "#6ee7b7",
              bg: "rgba(110,231,183,0.07)",
              border: "rgba(110,231,183,0.15)",
              icon: "✅",
            },
            {
              val: "1",
              label: "Offline",
              c: "#fca5a5",
              bg: "rgba(239,68,68,0.07)",
              border: "rgba(239,68,68,0.15)",
              icon: "❌",
            },
            {
              val: "4",
              label: "Alerts",
              c: "#fbbf24",
              bg: "rgba(251,191,36,0.07)",
              border: "rgba(251,191,36,0.15)",
              icon: "⚠️",
            },
          ].map((s, i) => (
            <Box
              key={i}
              sx={{
                p: "18px",
                borderRadius: "14px",
                background: s.bg,
                border: `1px solid ${s.border}`,
              }}
            >
              <Box
                component="span"
                sx={{ fontSize: "1.3rem", display: "block", mb: 1 }}
              >
                {s.icon}
              </Box>
              <Typography
                sx={{
                  color: s.c,
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  lineHeight: 1,
                  mb: 0.4,
                }}
              >
                {s.val}
              </Typography>
              <Typography
                sx={{ color: "rgba(255,255,255,0.35)", fontSize: ".78rem" }}
              >
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
          }}
        >
          {mockCameras.map((cam) => (
            <Box
              key={cam.id}
              sx={{
                borderRadius: "14px",
                overflow: "hidden",
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${cam.status === "offline" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
                transition: "all .2s",
                "&:hover": {
                  border: "1px solid rgba(99,102,241,0.25)",
                  background: "rgba(99,102,241,0.04)",
                },
              }}
            >
              <Box
                sx={{
                  aspectRatio: "16/9",
                  background:
                    cam.status === "offline"
                      ? "rgba(239,68,68,0.05)"
                      : "linear-gradient(135deg, #1a1a2e, #16213e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {cam.status === "online" ? (
                  <>
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                    <VideocamIcon
                      sx={{ color: "rgba(99,102,241,0.3)", fontSize: 28 }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        px: 1,
                        py: 0.3,
                        borderRadius: "4px",
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      <Box
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#ef4444",
                          animation: "blink 1s infinite",
                          "@keyframes blink": {
                            "0%,100%": { opacity: 1 },
                            "50%": { opacity: 0.2 },
                          },
                        }}
                      />
                      <Typography
                        sx={{
                          color: "#fca5a5",
                          fontSize: ".55rem",
                          fontWeight: 700,
                        }}
                      >
                        LIVE
                      </Typography>
                    </Box>
                    {cam.alerts > 0 && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(239,68,68,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            color: "#fca5a5",
                            fontSize: ".6rem",
                            fontWeight: 700,
                          }}
                        >
                          {cam.alerts}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <VideocamIcon
                      sx={{ color: "rgba(239,68,68,0.3)", fontSize: 24 }}
                    />
                    <Typography
                      sx={{ color: "rgba(239,68,68,0.4)", fontSize: ".65rem" }}
                    >
                      Offline
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ p: "12px 14px" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 600 }}
                    noWrap
                  >
                    {cam.name}
                  </Typography>
                  <WifiIcon
                    sx={{
                      fontSize: 12,
                      color: cam.status === "online" ? "#6ee7b7" : "#fca5a5",
                      flexShrink: 0,
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: ".7rem",
                    mb: 1,
                  }}
                >
                  {cam.location}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.8 }}>
                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.2,
                      borderRadius: "4px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: ".58rem",
                      }}
                    >
                      {cam.res}
                    </Typography>
                  </Box>
                  {cam.fps > 0 && (
                    <Box
                      sx={{
                        px: 0.8,
                        py: 0.2,
                        borderRadius: "4px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: ".58rem",
                        }}
                      >
                        {cam.fps}fps
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function AlertsPage({ navigate }: { navigate: (path: string) => void }) {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [stats, setStats] = useState<ApiStats>({
    total: 0,
    unique_persons: 0,
    zones_affected: [],
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/api/incidents`),
          fetch(`${API_BASE}/api/stats`),
        ]);
        const incidents: ApiIncident[] = await incRes.json();
        const statsData: ApiStats = await statsRes.json();
        setAlerts(incidents.map(transformIncident));
        setStats(statsData);
        setApiError(false);
      } catch (e) {
        console.error("Failed to fetch from API:", e);
        setApiError(true);
      }
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      val: stats.total.toString(),
      label: "Total Violations",
      sub: "From detection pipeline",
      c: "#fca5a5",
      bg: "rgba(239,68,68,0.07)",
      border: "rgba(239,68,68,0.15)",
      icon: "🔴",
    },
    {
      val: "8",
      label: "Active Cameras",
      sub: "100% online",
      c: "#818cf8",
      bg: "rgba(99,102,241,0.07)",
      border: "rgba(99,102,241,0.15)",
      icon: "📹",
    },
    {
      val: stats.zones_affected.length.toString(),
      label: "Zones Affected",
      sub: "With active violations",
      c: "#6ee7b7",
      bg: "rgba(110,231,183,0.07)",
      border: "rgba(110,231,183,0.15)",
      icon: "⚡",
    },
    {
      val: stats.unique_persons.toString(),
      label: "Unique Persons",
      sub: "ByteTrack deduplicated",
      c: "#fbbf24",
      bg: "rgba(251,191,36,0.07)",
      border: "rgba(251,191,36,0.15)",
      icon: "⚠️",
    },
  ];

  return (
    <Box>
      <TopBar
        title="Active Alerts"
        subtitle={
          apiError
            ? "API offline — showing cached state"
            : `Real-time violation monitoring — ${alerts.length} events`
        }
      >
        <LiveDot />
        <Box
          sx={{
            px: 2,
            py: 0.8,
            borderRadius: "8px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/rules")}
        >
          <Typography
            sx={{ color: "#818cf8", fontSize: ".78rem", fontWeight: 600 }}
          >
            + New Rule
          </Typography>
        </Box>
      </TopBar>
      <Box sx={{ p: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 4,
          }}
        >
          {statCards.map((s, i) => (
            <Box
              key={i}
              sx={{
                p: "20px",
                borderRadius: "14px",
                background: s.bg,
                border: `1px solid ${s.border}`,
                transition: "all .2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 8px 24px ${s.border}`,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Box component="span" sx={{ fontSize: "1.4rem" }}>
                  {s.icon}
                </Box>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: s.c,
                    boxShadow: `0 0 8px ${s.c}`,
                  }}
                />
              </Box>
              <Typography
                sx={{
                  color: s.c,
                  fontSize: "2rem",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  lineHeight: 1,
                  mb: 0.5,
                }}
              >
                {s.val}
              </Typography>
              <Typography
                sx={{
                  color: "#fff",
                  fontSize: ".82rem",
                  fontWeight: 600,
                  mb: 0.3,
                }}
              >
                {s.label}
              </Typography>
              <Typography
                sx={{ color: "rgba(255,255,255,0.25)", fontSize: ".72rem" }}
              >
                {s.sub}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            borderRadius: "16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                sx={{ color: "#fff", fontWeight: 600, fontSize: ".9rem" }}
              >
                Violation Log
              </Typography>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.3,
                  borderRadius: "20px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <Typography
                  sx={{ color: "#fca5a5", fontSize: ".65rem", fontWeight: 600 }}
                >
                  {alerts.length} events
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["All", "Critical", "High", "Medium"].map((f, i) => (
                <Box
                  key={f}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "6px",
                    background:
                      i === 0 ? "rgba(99,102,241,0.12)" : "transparent",
                    border:
                      i === 0
                        ? "1px solid rgba(99,102,241,0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                  }}
                >
                  <Typography
                    sx={{
                      color: i === 0 ? "#818cf8" : "rgba(255,255,255,0.3)",
                      fontSize: ".72rem",
                      fontWeight: i === 0 ? 600 : 400,
                    }}
                  >
                    {f}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
          {loading ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Typography
                sx={{ color: "rgba(255,255,255,0.3)", fontSize: ".85rem" }}
              >
                Loading incidents from pipeline...
              </Typography>
            </Box>
          ) : alerts.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Typography
                sx={{ color: "rgba(255,255,255,0.3)", fontSize: ".85rem" }}
              >
                {apiError
                  ? "Cannot reach API at localhost:8000. Is uvicorn running?"
                  : "No incidents yet. Run the detection pipeline to see violations here."}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  {[
                    "Camera",
                    "Rule Violated",
                    "Time",
                    "Status",
                    "Severity",
                    "Action",
                  ].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        color: "rgba(255,255,255,0.2)",
                        fontSize: ".7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        py: 1.5,
                        background: "rgba(255,255,255,0.01)",
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((alert, idx) => {
                  const sev = severityConfig[alert.severity];
                  return (
                    <TableRow
                      key={alert.id}
                      onClick={() => navigate(`/alert/${alert.id}`)}
                      sx={{
                        cursor: "pointer",
                        transition: "all .15s",
                        "&:hover": { background: "rgba(99,102,241,0.05)" },
                        "& td": {
                          borderBottom:
                            idx < alerts.length - 1
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "none",
                        },
                      }}
                    >
                      <TableCell sx={{ py: 2.5 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background:
                                alert.status === "active"
                                  ? "#ef4444"
                                  : "#6ee7b7",
                              flexShrink: 0,
                              boxShadow:
                                alert.status === "active"
                                  ? "0 0 6px #ef4444"
                                  : "0 0 6px #6ee7b7",
                              animation:
                                alert.status === "active"
                                  ? "blink 1s infinite"
                                  : "none",
                            }}
                          />
                          <Typography
                            sx={{
                              color: "#fff",
                              fontSize: ".84rem",
                              fontWeight: 500,
                            }}
                          >
                            {alert.camera}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: ".82rem",
                          }}
                        >
                          {alert.rule}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.3)",
                            fontSize: ".8rem",
                            fontFamily: "monospace",
                          }}
                        >
                          {alert.time}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.7,
                            px: 1.2,
                            py: 0.4,
                            borderRadius: "6px",
                            background:
                              alert.status === "active"
                                ? "rgba(239,68,68,0.08)"
                                : "rgba(110,231,183,0.08)",
                            border: `1px solid ${alert.status === "active" ? "rgba(239,68,68,0.2)" : "rgba(110,231,183,0.2)"}`,
                          }}
                        >
                          {alert.status === "active" ? (
                            <WarningAmberIcon
                              sx={{ fontSize: 11, color: "#fca5a5" }}
                            />
                          ) : (
                            <CheckCircleIcon
                              sx={{ fontSize: 11, color: "#6ee7b7" }}
                            />
                          )}
                          <Typography
                            sx={{
                              color:
                                alert.status === "active"
                                  ? "#fca5a5"
                                  : "#6ee7b7",
                              fontSize: ".68rem",
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {alert.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-flex",
                            px: 1.5,
                            py: 0.4,
                            borderRadius: "6px",
                            background: sev.bg,
                            border: `1px solid ${sev.border}`,
                          }}
                        >
                          <Typography
                            sx={{
                              color: sev.color,
                              fontSize: ".7rem",
                              fontWeight: 700,
                              textTransform: "capitalize",
                            }}
                          >
                            {alert.severity}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "#818cf8",
                          }}
                        >
                          <Typography
                            sx={{ fontSize: ".78rem", fontWeight: 600 }}
                          >
                            View
                          </Typography>
                          <ArrowForwardIcon sx={{ fontSize: 13 }} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const sections = [
    {
      title: "Detection Engine",
      desc: "Configure core CV pipeline parameters",
      icon: "🔍",
      settings: [
        {
          label: "Alert Cooldown",
          desc: "Minimum frames between alerts for same person ID",
          val: "150 frames",
          tag: "ByteTrack",
        },
        {
          label: "Detection Confidence",
          desc: "Minimum YOLO confidence score (0–1)",
          val: "0.50",
          tag: "YOLOv8",
        },
        {
          label: "ByteTrack Buffer",
          desc: "Frames to retain lost track IDs",
          val: "30 frames",
          tag: "Tracking",
        },
      ],
    },
    {
      title: "Alert System",
      desc: "Configure how and where alerts are dispatched",
      icon: "🔔",
      settings: [
        {
          label: "Alert Channels",
          desc: "Where to send violation notifications",
          val: "Dashboard",
          tag: "Active",
        },
        {
          label: "Alert Deduplication",
          desc: "Prevent duplicate alerts for same event",
          val: "Enabled",
          tag: "ByteTrack",
        },
      ],
    },
    {
      title: "AI Model",
      desc: "Computer vision model configuration",
      icon: "🧠",
      settings: [
        {
          label: "Active Models",
          desc: "Currently loaded detection models",
          val: "Helmet + Vest + Base YOLO",
          tag: "Running",
        },
        {
          label: "Vest Model",
          desc: "Trained on Roboflow safety vest dataset",
          val: "79% mAP@50",
          tag: "POC",
        },
        {
          label: "Frame Sampling",
          desc: "Process every N frames for performance",
          val: "Every frame",
          tag: "Max Quality",
        },
      ],
    },
    {
      title: "Platform",
      desc: "General platform settings",
      icon: "⚙️",
      settings: [
        {
          label: "LLM Model",
          desc: "AI model for rule parsing",
          val: "Claude Haiku (planned)",
          tag: "Anthropic",
        },
        {
          label: "Site Name",
          desc: "Current monitoring site identifier",
          val: "Site A — Construction",
          tag: "Active",
        },
        {
          label: "API Endpoint",
          desc: "Backend API server",
          val: "http://localhost:8000",
          tag: "Local",
        },
      ],
    },
  ];

  return (
    <Box>
      <TopBar
        title="Settings"
        subtitle="Platform configuration — OMNIX POC v0.1"
      >
        {saved && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.8,
              borderRadius: "8px",
              background: "rgba(110,231,183,0.08)",
              border: "1px solid rgba(110,231,183,0.2)",
            }}
          >
            <Typography
              sx={{ color: "#6ee7b7", fontSize: ".78rem", fontWeight: 600 }}
            >
              ✓ Saved
            </Typography>
          </Box>
        )}
        <Box
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          sx={{
            px: 2.5,
            py: 0.9,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1, #7c3aed)",
            border: "1px solid rgba(99,102,241,0.3)",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
            transition: "all .2s",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 6px 18px rgba(99,102,241,0.35)",
            },
          }}
        >
          <Typography
            sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 600 }}
          >
            Save Changes
          </Typography>
        </Box>
      </TopBar>

      <Box sx={{ p: 4 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 4,
          }}
        >
          {[
            { val: "v0.1", label: "Version", c: "#818cf8", icon: "🚀" },
            { val: "YOLOv8", label: "Engine", c: "#6ee7b7", icon: "🧠" },
            { val: "79%", label: "Vest mAP", c: "#fbbf24", icon: "🎯" },
            { val: "Online", label: "Status", c: "#6ee7b7", icon: "✅" },
          ].map((s, i) => (
            <Box
              key={i}
              sx={{
                p: "18px 20px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box component="span" sx={{ fontSize: "1.4rem" }}>
                {s.icon}
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: s.c,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {s.val}
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: ".7rem",
                    mt: 0.3,
                  }}
                >
                  {s.label}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
          {sections.map((section, si) => (
            <Box
              key={si}
              sx={{
                borderRadius: "16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <Box component="span" sx={{ fontSize: "1rem" }}>
                  {section.icon}
                </Box>
                <Box>
                  <Typography
                    sx={{ color: "#fff", fontSize: ".88rem", fontWeight: 700 }}
                  >
                    {section.title}
                  </Typography>
                  <Typography
                    sx={{ color: "rgba(255,255,255,0.22)", fontSize: ".72rem" }}
                  >
                    {section.desc}
                  </Typography>
                </Box>
              </Box>
              {section.settings.map((s, i) => (
                <Box
                  key={i}
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom:
                      i < section.settings.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    transition: "all .2s",
                    "&:hover": { background: "rgba(99,102,241,0.04)" },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: "#fff",
                        fontSize: ".82rem",
                        fontWeight: 500,
                        mb: 0.2,
                      }}
                    >
                      {s.label}
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.22)",
                        fontSize: ".7rem",
                        lineHeight: 1.4,
                      }}
                    >
                      {s.desc}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        px: 0.8,
                        py: 0.2,
                        borderRadius: "4px",
                        background: "rgba(110,231,183,0.08)",
                        border: "1px solid rgba(110,231,183,0.15)",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "rgba(110,231,183,0.6)",
                          fontSize: ".58rem",
                          fontWeight: 600,
                        }}
                      >
                        {s.tag}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.6,
                        borderRadius: "7px",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#a5b4fc",
                          fontSize: ".75rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.val}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const [selected, setSelected] = useState("Alerts");
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "#08080a",
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <Box
        sx={{
          width: DRAWER,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#0d0d10",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 3,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(99,102,241,0.4)",
              flexShrink: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <ellipse
                cx="12"
                cy="12"
                rx="10"
                ry="6.5"
                stroke="white"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="3.5" fill="white" />
              <circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1" />
            </svg>
          </Box>
          <Box>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: ".95rem",
                letterSpacing: "-.2px",
                lineHeight: 1,
              }}
            >
              OMNIX
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.25)",
                fontSize: ".58rem",
                letterSpacing: ".06em",
              }}
            >
              ENTERPRISE
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, py: 2 }}>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.18)",
              fontSize: ".6rem",
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              px: 3,
              mb: 1,
            }}
          >
            Navigation
          </Typography>
          {menuItems.map((item) => {
            const isSelected = selected === item.text;
            return (
              <Box
                key={item.text}
                onClick={() => {
                  setSelected(item.text);
                  if (item.text === "Rules") navigate("/rules");
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 3,
                  py: 1.4,
                  mx: 1.5,
                  mb: 0.5,
                  borderRadius: "10px",
                  cursor: "pointer",
                  position: "relative",
                  background: isSelected
                    ? "rgba(99,102,241,0.12)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid rgba(99,102,241,0.2)"
                    : "1px solid transparent",
                  transition: "all .2s",
                  "&:hover": {
                    background: isSelected
                      ? "rgba(99,102,241,0.12)"
                      : "rgba(255,255,255,0.04)",
                  },
                }}
              >
                {isSelected && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "25%",
                      bottom: "25%",
                      width: 3,
                      borderRadius: "0 3px 3px 0",
                      background: "#6366f1",
                      boxShadow: "0 0 8px #6366f1",
                    }}
                  />
                )}
                <Box
                  sx={{
                    color: isSelected ? "#818cf8" : "rgba(255,255,255,0.3)",
                    display: "flex",
                    transition: "color .2s",
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  sx={{
                    color: isSelected ? "#fff" : "rgba(255,255,255,0.4)",
                    fontSize: ".85rem",
                    fontWeight: isSelected ? 600 : 400,
                    transition: "all .2s",
                  }}
                >
                  {item.text}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: "10px 12px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{ color: "#fff", fontSize: ".72rem", fontWeight: 700 }}
              >
                A
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: "#fff",
                  fontSize: ".78rem",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                Admin
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.25)",
                  fontSize: ".65rem",
                  mt: 0.2,
                }}
                noWrap
              >
                admin@omnix.ai
              </Typography>
            </Box>
          </Box>
          <Box
            onClick={() => navigate("/login")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: "8px",
              cursor: "pointer",
              "&:hover": { background: "rgba(255,255,255,0.04)" },
              transition: "all .2s",
            }}
          >
            <LogoutIcon sx={{ color: "rgba(255,255,255,0.2)", fontSize: 15 }} />
            <Typography
              sx={{ color: "rgba(255,255,255,0.25)", fontSize: ".75rem" }}
            >
              Sign out
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          ml: `${DRAWER}px`,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {selected === "Alerts" && <AlertsPage navigate={navigate} />}
        {selected === "Cameras" && <CamerasPage />}
        {selected === "Settings" && <SettingsPage />}
        {selected === "Rules" && <AlertsPage navigate={navigate} />}
      </Box>
    </Box>
  );
}
