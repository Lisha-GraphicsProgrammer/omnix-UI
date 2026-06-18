import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
  Snackbar,
  Alert as MuiAlert,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SecurityIcon from "@mui/icons-material/Security";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BarChartIcon from "@mui/icons-material/BarChart";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import EditNoteIcon from "@mui/icons-material/EditNote";
import PsychologyIcon from "@mui/icons-material/Psychology";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RuleIcon from "@mui/icons-material/Rule";
import SettingsIcon from "@mui/icons-material/Settings";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ReportProblemOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import { useTheme } from "./ThemeContext";

const API_BASE = "http://localhost:8000";
const CYAN = "#00D4FF";
const PURPLE = "#7C3AED";
const GREEN = "#00E676";
const AMBER = "#FFB300";
const DRAWER_OPEN = 220;
const DRAWER_CLOSED = 56;
const HISTORY_KEY = "omnix_rule_history";
const DRAFT_KEY = "omnix_rule_draft";
const CHAT_HISTORY_KEY = "omnix_chat_history";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RuleHistoryItem {
  id: number;
  instruction: string;
  status: "pending" | "active";
  time: string;
  pipeline: string;
  alerts: number;
  config?: any;
  isNew?: boolean;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "discarded";
  text: string;
  config?: any;
  instruction?: string;
  time: string;
}

// ─── Intent classification (regex, no LLM call) ───────────────────────────────
const POSITIVE_STARTERS =
  /^(yes|yep|yeah|yup|sure|ok|okay|alright|confirm(ed)?|apply|approved|done|go ahead|do it|looks good|sounds good|proceed|continue|let'?s (go|do it)|that'?s right|that is right|correct|perfect|great)\b/i;
const NUANCE_AFTER =
  /\b(but|except|change|modify|update|make it|set it|adjust|instead|increase|decrease|reduce|raise|also|with)\b/i;
const SHORT_NEGATIVE_RE =
  /^(no|nope|nah|cancel|stop|wait|never ?mind|abort|forget it|discard)[.!?\s]*$/i;
const FRESH_RULE_STARTER =
  /^(alert|warn|notify|send|trigger|detect|flag|monitor|track|count|measure|watch)\b/i;

type Intent = "confirm" | "negate" | "fresh" | "refine";

function classifyIntent(text: string, hasPending: boolean): Intent {
  const t = text.trim();
  if (SHORT_NEGATIVE_RE.test(t)) return "negate";
  if (POSITIVE_STARTERS.test(t)) {
    if (NUANCE_AFTER.test(t)) return "refine";
    if (t.split(/\s+/).length <= 5) return "confirm";
    return "refine";
  }
  if (hasPending && FRESH_RULE_STARTER.test(t) && t.split(/\s+/).length >= 5) {
    return "fresh";
  }
  return "refine";
}

// ─── Summary builder ──────────────────────────────────────────────────────────
function buildSummary(config: any): string {
  if (!config) return "";
  const zones = config.zones || [];
  const alert = config.alert || {};
  const rules = config.rules || [];
  const cooldown = config.cooldown_seconds ?? 30;
  const zoneName = zones[0]?.name?.replace(/_/g, " ") || "the monitored zone";
  const severity = alert.severity || "high";
  const rule = rules[0] || {};
  const ruleType = rule.type || "";
  const required: string[] = rule.required || [];

  let action = "";
  if (ruleType === "missing_in_zone") {
    const gear = required
      .map((g: string) => g.replace(/_/g, " "))
      .join(" and ");
    action = `alert you whenever a person is detected without ${gear || "required safety gear"}`;
  } else if (ruleType === "person_in_zone") {
    action = "alert you whenever a person enters the zone";
  } else if (ruleType === "count_exceeded") {
    action = "alert you when the person count limit is exceeded";
  } else {
    action = "monitor the zone and alert you on violations";
  }
  return `Got it! I'll watch the **${zoneName}** and ${action}. Severity will be **${severity}**, and I'll wait **${cooldown} seconds** between repeat alerts for the same person.`;
}

function SummaryText({ text, color }: { text: string; color: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Typography sx={{ fontSize: ".92rem", lineHeight: 1.75, color }}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Box key={i} component="span" sx={{ fontWeight: 700, color: CYAN }}>
            {part}
          </Box>
        ) : (
          part
        ),
      )}
    </Typography>
  );
}

function SkeletonLoader({ t }: { t: any }) {
  const pulse = (delay = 0) => ({
    animation: `skpulse 1.6s ease-in-out ${delay}s infinite`,
    "@keyframes skpulse": {
      "0%,100%": { opacity: 0.35 },
      "50%": { opacity: 0.8 },
    },
  });
  const skBg = t.border;
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: `${CYAN}25`,
          flexShrink: 0,
          mt: 0.5,
          ...pulse(),
        }}
      />
      <Box
        sx={{
          flex: 1,
          borderRadius: "16px 16px 16px 4px",
          overflow: "hidden",
          border: `1px solid ${CYAN}25`,
          background: `${CYAN}04`,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: "14px",
            background: `${CYAN}08`,
            borderBottom: `1px solid ${CYAN}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              height: 12,
              width: 200,
              borderRadius: 6,
              background: skBg,
              ...pulse(0.1),
            }}
          />
          <Box
            sx={{
              height: 18,
              width: 100,
              borderRadius: 6,
              background: skBg,
              ...pulse(0.2),
            }}
          />
        </Box>
        <Box sx={{ p: "16px 20px" }}>
          <Box
            sx={{
              p: "14px 16px",
              borderRadius: "10px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              mb: 2,
            }}
          >
            {[92, 78, 60, 40].map((w, i) => (
              <Box
                key={i}
                sx={{
                  height: 11,
                  width: `${w}%`,
                  borderRadius: 6,
                  background: skBg,
                  mb: i < 3 ? 1.1 : 0,
                  ...pulse(i * 0.12),
                }}
              />
            ))}
          </Box>
          <Box
            sx={{
              height: 10,
              width: 220,
              borderRadius: 5,
              background: skBg,
              ...pulse(0.5),
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

const suggestions = [
  {
    icon: <SecurityIcon sx={{ fontSize: 16 }} />,
    iconColor: AMBER,
    text: "Alert when worker without helmet enters loading zone",
    tag: "PPE Safety",
    tagColor: AMBER,
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 16 }} />,
    iconColor: CYAN,
    text: "Alert if more than 5 people are in the restricted area",
    tag: "Crowd Control",
    tagColor: CYAN,
  },
  {
    icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
    iconColor: "#FF4444",
    text: "Alert when forklift comes within 5 meters of a worker",
    tag: "Proximity",
    tagColor: "#FF4444",
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 16 }} />,
    iconColor: GREEN,
    text: "Alert if worker count exceeds 10 in warehouse zone",
    tag: "Count Logic",
    tagColor: GREEN,
  },
];

const howItWorks = [
  {
    n: "01",
    icon: <EditNoteIcon sx={{ fontSize: 14 }} />,
    text: "Type your instruction in plain English",
    color: "#818cf8",
  },
  {
    n: "02",
    icon: <PsychologyIcon sx={{ fontSize: 14 }} />,
    text: "AI extracts intent, objects & logic",
    color: "#a78bfa",
  },
  {
    n: "03",
    icon: <AccountTreeIcon sx={{ fontSize: 14 }} />,
    text: "OMNIX generates JSON pipeline config",
    color: CYAN,
  },
  {
    n: "04",
    icon: <RocketLaunchIcon sx={{ fontSize: 14 }} />,
    text: "Reply 'yes' to deploy, or describe a change",
    color: GREEN,
  },
];

const navItems = [
  {
    text: "Cameras",
    icon: <CameraAltIcon sx={{ fontSize: 18 }} />,
    path: "/dashboard",
  },
  { text: "Rules", icon: <RuleIcon sx={{ fontSize: 18 }} />, path: "/rules" },
  {
    text: "Alert Dashboard",
    icon: <DashboardIcon sx={{ fontSize: 18 }} />,
    path: "/dashboard",
  },
  {
    text: "Settings",
    icon: <SettingsIcon sx={{ fontSize: 18 }} />,
    path: "/dashboard",
  },
];

const markPendingAsDiscarded = (msgs: ChatMessage[]): ChatMessage[] =>
  msgs.map((m) =>
    m.role === "assistant" ? { ...m, role: "discarded" as const } : m,
  );

export default function Rules() {
  const [instruction, setInstruction] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) || "";
    } catch {
      return "";
    }
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const s = localStorage.getItem(CHAT_HISTORY_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  // Lisha's pattern: load persisted rule history on init
  const [history, setHistory] = useState<RuleHistoryItem[]>(() => {
    try {
      const s = localStorage.getItem(HISTORY_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [expandedTechIds, setExpandedTechIds] = useState<Set<number>>(
    new Set(),
  );
  const [appliedToast, setAppliedToast] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { t, mode, toggleMode } = useTheme();

  const drawerWidth = sidebarOpen ? DRAWER_OPEN : DRAWER_CLOSED;

  const lastMsg = chatHistory[chatHistory.length - 1];
  const hasPending = lastMsg?.role === "assistant" && !!lastMsg.config;

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, instruction);
    } catch {}
  }, [instruction]);
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch {}
  }, [chatHistory]);
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, processing]);

  useEffect(() => {
    const newOnes = history.filter((h) => h.isNew);
    if (newOnes.length === 0) return;
    const tm = setTimeout(() => {
      setHistory((prev) =>
        prev.map((h) => (h.isNew ? { ...h, isNew: false } : h)),
      );
    }, 1800);
    return () => clearTimeout(tm);
  }, [history]);

  useEffect(() => {
    if (!processing) inputRef.current?.focus();
  }, [processing]);

  const toggleTech = (id: number) => {
    setExpandedTechIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const callLLM = async (
    llmInstruction: string,
    displayInstruction: string,
  ) => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/rules/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: llmInstruction }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: buildSummary(data.config),
        config: data.config,
        instruction: displayInstruction,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setError(e.message || "Failed to generate rule");
    } finally {
      setProcessing(false);
    }
  };

  const applyPendingRule = async (config: any, instruction: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/rules/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const newRule: RuleHistoryItem = {
        id: Date.now(),
        instruction,
        status: "active",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pipeline: config.pipeline_id || "YOLOv8 + ByteTrack",
        alerts: 0,
        config,
        isNew: true,
      };
      setHistory((prev) => {
        const updated = [newRule, ...prev];
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setChatHistory([]);
      try {
        localStorage.removeItem(CHAT_HISTORY_KEY);
      } catch {}
      setExpandedTechIds(new Set());
      setAppliedToast(instruction);
    } catch (e: any) {
      setError(e.message || "Failed to apply rule");
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!instruction.trim() || processing) return;
    const userMsg = instruction.trim();
    setInstruction("");
    setError(null);

    const userChatMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: userMsg,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const intent = classifyIntent(userMsg, hasPending);

    if (!hasPending && (intent === "confirm" || intent === "negate")) {
      setError(
        'Type a complete rule to begin — e.g. "Alert when a worker without a helmet enters the loading zone".',
      );
      setInstruction(userMsg);
      return;
    }

    if (intent === "confirm" && hasPending) {
      setChatHistory((prev) => [...prev, userChatMsg]);
      await applyPendingRule(lastMsg.config, lastMsg.instruction || userMsg);
      return;
    }

    if (intent === "negate" && hasPending) {
      setChatHistory((prev) => [...markPendingAsDiscarded(prev), userChatMsg]);
      return;
    }

    if (intent === "fresh" && hasPending) {
      setChatHistory((prev) => [...markPendingAsDiscarded(prev), userChatMsg]);
      await callLLM(userMsg, userMsg);
      return;
    }

    if (intent === "refine" && hasPending) {
      const combined = `${lastMsg.instruction}, ${userMsg}`;
      setChatHistory((prev) => [...markPendingAsDiscarded(prev), userChatMsg]);
      await callLLM(combined, combined);
      return;
    }

    setChatHistory((prev) => [...prev, userChatMsg]);
    await callLLM(userMsg, userMsg);
  };

  // Lisha's Reset functionality — wired through confirmation dialog
  const handleResetRules = async () => {
    try {
      await fetch(`${API_BASE}/api/rules/reset`, { method: "POST" });
    } catch (e) {
      console.error("Reset API call failed", e);
    }
    setHistory([]);
    setChatHistory([]);
    setInstruction("");
    setError(null);
    setExpandedTechIds(new Set());
    try {
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {}
    setResetConfirmOpen(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem("omnix_auth");
    navigate("/login");
  };
  const canSend = !!instruction.trim() && !processing;

  const inputBorder = processing
    ? t.border
    : hasPending
      ? `${CYAN}55`
      : instruction
        ? `${PURPLE}40`
        : t.border;
  const inputShadow =
    hasPending && !processing
      ? `0 0 0 4px ${CYAN}12, 0 0 24px ${CYAN}20`
      : instruction
        ? `0 0 0 4px ${PURPLE}10`
        : "none";
  const inputPlaceholder = hasPending
    ? "Type 'yes' to apply, or describe what to change..."
    : chatHistory.length > 0
      ? "Continue refining, or start a new rule..."
      : "e.g. Alert me when a worker without a helmet enters the loading zone...";

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        background: t.bg,
        fontFamily: '"Inter", system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* ── SIDEBAR ── */}
      <Box
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: t.sidebarBg,
          borderRight: `1px solid ${t.border}`,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          transition: "width .25s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: sidebarOpen ? 3 : 1.5,
            py: 3,
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minHeight: 72,
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
          {sidebarOpen && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  color: t.text,
                  fontWeight: 700,
                  fontSize: ".95rem",
                  lineHeight: 1,
                }}
              >
                OMNIX
              </Typography>
              <Typography
                sx={{
                  color: t.textMuted,
                  fontSize: ".58rem",
                  letterSpacing: ".06em",
                }}
              >
                ENTERPRISE
              </Typography>
            </Box>
          )}
          <IconButton
            size="small"
            onClick={() => setSidebarOpen((o) => !o)}
            sx={{
              color: t.textMuted,
              ml: sidebarOpen ? 0 : "-4px",
              "&:hover": { color: t.text },
            }}
          >
            {sidebarOpen ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <MenuIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, py: 2, overflowX: "hidden" }}>
          {sidebarOpen && (
            <Typography
              sx={{
                color: t.textMuted,
                fontSize: ".6rem",
                fontWeight: 600,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                px: 3,
                mb: 1,
                opacity: 0.6,
              }}
            >
              Navigation
            </Typography>
          )}
          {navItems.map((item) => {
            const isSel = item.text === "Rules";
            return (
              <Tooltip
                key={item.text}
                title={!sidebarOpen ? item.text : ""}
                placement="right"
              >
                <Box
                  onClick={() => {
                    if (item.text !== "Rules") navigate(item.path);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: sidebarOpen ? 3 : 1.5,
                    py: 1.4,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: "10px",
                    cursor: "pointer",
                    position: "relative",
                    background: isSel ? "rgba(99,102,241,0.12)" : "transparent",
                    border: isSel
                      ? "1px solid rgba(99,102,241,0.2)"
                      : "1px solid transparent",
                    transition: "all .2s",
                    "&:hover": {
                      background: isSel
                        ? "rgba(99,102,241,0.12)"
                        : t.surfaceHover,
                    },
                  }}
                >
                  {isSel && (
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
                      color: isSel ? "#818cf8" : t.textMuted,
                      display: "flex",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  {sidebarOpen && (
                    <Typography
                      sx={{
                        color: isSel ? t.text : t.textSecondary,
                        fontSize: ".85rem",
                        fontWeight: isSel ? 600 : 400,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.text}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
        <Box
          sx={{ p: sidebarOpen ? 2 : 1, borderTop: `1px solid ${t.border}` }}
        >
          {sidebarOpen ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: "10px 12px",
                  borderRadius: "10px",
                  background: t.surface,
                  border: `1px solid ${t.border}`,
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
                      color: t.text,
                      fontSize: ".78rem",
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    Admin
                  </Typography>
                  <Typography
                    sx={{ color: t.textMuted, fontSize: ".65rem", mt: 0.2 }}
                    noWrap
                  >
                    admin@omnix.ai
                  </Typography>
                </Box>
              </Box>
              <Box
                onClick={() => setSignOutOpen(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: "8px",
                  cursor: "pointer",
                  "&:hover": { background: t.surfaceHover },
                  transition: "all .2s",
                }}
              >
                <LogoutIcon sx={{ color: t.textMuted, fontSize: 15 }} />
                <Typography sx={{ color: t.textMuted, fontSize: ".75rem" }}>
                  Sign out
                </Typography>
              </Box>
            </>
          ) : (
            <Tooltip title="Sign out" placement="right">
              <Box
                onClick={() => setSignOutOpen(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 1,
                  borderRadius: "8px",
                  cursor: "pointer",
                  "&:hover": { background: t.surfaceHover },
                }}
              >
                <LogoutIcon sx={{ color: t.textMuted, fontSize: 18 }} />
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* ── MAIN ── */}
      <Box
        sx={{
          flex: 1,
          ml: `${drawerWidth}px`,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left .25s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
          height: "100vh",
        }}
      >
        <Box
          sx={{
            px: 4,
            height: 64,
            flexShrink: 0,
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: t.topbarBg,
            backdropFilter: "blur(20px)",
            zIndex: 50,
            boxShadow: `0 -1px 0 0 ${PURPLE}50 inset`,
          }}
        >
          <Box
            sx={{
              width: "1px",
              height: 20,
              background: t.border,
              flexShrink: 0,
            }}
          />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "7px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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
            <Typography
              sx={{
                color: t.text,
                fontWeight: 700,
                fontSize: ".92rem",
                letterSpacing: "-.2px",
              }}
            >
              OMNIX
            </Typography>
            <Box
              sx={{
                width: "1px",
                height: 16,
                background: t.border,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>
              Rule Creation
            </Typography>
          </Box>
          <Box
            sx={{
              ml: "auto",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Tooltip
              title={
                mode === "dark" ? "Switch to Light mode" : "Switch to Dark mode"
              }
            >
              <IconButton
                onClick={toggleMode}
                size="small"
                sx={{
                  border: `1px solid ${t.border}`,
                  borderRadius: "8px",
                  color: t.textMuted,
                  "&:hover": { color: t.text },
                }}
              >
                {mode === "dark" ? (
                  <LightModeIcon fontSize="small" />
                ) : (
                  <DarkModeIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: GREEN,
                  boxShadow: `0 0 8px ${GREEN}`,
                  animation: "p 2s infinite",
                  "@keyframes p": {
                    "0%,100%": { opacity: 1 },
                    "50%": { opacity: 0.3 },
                  },
                }}
              />
              <Typography sx={{ color: t.textMuted, fontSize: ".72rem" }}>
                AI Engine Online
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.4,
                borderRadius: "6px",
                background: `${GREEN}10`,
                border: `1px solid ${GREEN}25`,
              }}
            >
              <Typography
                sx={{
                  color: GREEN,
                  fontSize: ".6rem",
                  fontWeight: 800,
                  letterSpacing: ".08em",
                }}
              >
                LIVE
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ── LEFT panel ── */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              borderRight: `1px solid ${t.border}`,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: `${PURPLE}35`,
                borderRadius: "4px",
              },
            }}
          >
            <Box sx={{ p: "40px 48px" }}>
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 0.6,
                    borderRadius: "20px",
                    mb: 2.5,
                    background: `${PURPLE}15`,
                    border: `1px solid ${PURPLE}40`,
                    boxShadow: `0 0 16px ${PURPLE}20`,
                  }}
                >
                  <AutoFixHighIcon sx={{ fontSize: 12, color: "#a5b4fc" }} />
                  <Typography
                    sx={{
                      color: "#a5b4fc",
                      fontSize: ".7rem",
                      fontWeight: 600,
                      letterSpacing: ".04em",
                    }}
                  >
                    Powered by OMNIX AI Engine
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color: t.text,
                    fontSize: "2.2rem",
                    fontWeight: 800,
                    letterSpacing: "-1.2px",
                    lineHeight: 1.1,
                    mb: 1.5,
                  }}
                >
                  Create Detection Rule
                </Typography>
                <Typography
                  sx={{
                    color: t.textMuted,
                    fontSize: ".9rem",
                    lineHeight: 1.7,
                    maxWidth: 480,
                  }}
                >
                  Type a plain English instruction. OMNIX converts it into a
                  production-grade YOLOv8 + ByteTrack computer vision pipeline
                  automatically.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography
                  sx={{
                    color: t.textMuted,
                    fontSize: ".65rem",
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    mb: 2,
                  }}
                >
                  Quick examples — click to use
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  {suggestions.map((s, i) => (
                    <Box
                      key={i}
                      onClick={() => setInstruction(s.text)}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                        p: "14px 16px",
                        borderRadius: "14px",
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        cursor: "pointer",
                        transition: "all .2s",
                        "&:hover": {
                          background: `${s.iconColor}08`,
                          borderColor: `${s.iconColor}30`,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "9px",
                          background: `${s.iconColor}18`,
                          border: `1px solid ${s.iconColor}35`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: s.iconColor,
                        }}
                      >
                        {s.icon}
                      </Box>
                      <Box>
                        <Box
                          sx={{
                            display: "inline-flex",
                            px: 1,
                            py: 0.2,
                            borderRadius: "5px",
                            background: `${s.tagColor}15`,
                            border: `1px solid ${s.tagColor}30`,
                            mb: 0.7,
                          }}
                        >
                          <Typography
                            sx={{
                              color: s.tagColor,
                              fontSize: ".6rem",
                              fontWeight: 700,
                            }}
                          >
                            {s.tag}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            color: t.textSecondary,
                            fontSize: ".8rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {s.text}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {chatHistory.length > 0 && (
                <Box
                  sx={{
                    mb: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {chatHistory.map((msg) => (
                    <Box key={msg.id}>
                      {msg.role === "user" && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: "80%",
                              p: "12px 16px",
                              borderRadius: "16px 16px 4px 16px",
                              background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`,
                              boxShadow: `0 4px 12px ${PURPLE}30`,
                            }}
                          >
                            <Typography
                              sx={{
                                color: "#fff",
                                fontSize: ".85rem",
                                lineHeight: 1.6,
                              }}
                            >
                              {msg.text}
                            </Typography>
                            <Typography
                              sx={{
                                color: "rgba(255,255,255,0.45)",
                                fontSize: ".62rem",
                                mt: 0.5,
                                textAlign: "right",
                              }}
                            >
                              {msg.time}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background:
                                "linear-gradient(135deg, #6366f1, #8b5cf6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              mt: 0.5,
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 15, color: "#fff" }} />
                          </Box>
                        </Box>
                      )}

                      {(msg.role === "assistant" || msg.role === "discarded") &&
                        msg.config && (
                          <Box sx={{ display: "flex", gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: `linear-gradient(135deg, ${CYAN}40, ${PURPLE}40)`,
                                border: `1px solid ${CYAN}40`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                mt: 0.5,
                                opacity: msg.role === "assistant" ? 1 : 0.45,
                              }}
                            >
                              <SmartToyIcon
                                sx={{ fontSize: 15, color: CYAN }}
                              />
                            </Box>
                            <Box sx={{ flex: 1, maxWidth: "90%" }}>
                              {msg.role === "discarded" ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.2,
                                    p: "8px 14px",
                                    borderRadius: "10px",
                                    background: t.surface,
                                    border: `1px solid ${t.border}`,
                                    opacity: 0.4,
                                    transition: "opacity .2s",
                                    "&:hover": { opacity: 0.8 },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 14,
                                      height: 14,
                                      borderRadius: "50%",
                                      border: `1.5px solid ${t.textMuted}`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 6,
                                        height: 1.5,
                                        background: t.textMuted,
                                        borderRadius: 1,
                                      }}
                                    />
                                  </Box>
                                  <Typography
                                    sx={{
                                      color: t.textMuted,
                                      fontSize: ".78rem",
                                      flex: 1,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      textDecoration: "line-through",
                                    }}
                                  >
                                    <Box
                                      component="span"
                                      sx={{ fontWeight: 600, mr: 0.5 }}
                                    >
                                      Discarded:
                                    </Box>
                                    {msg.instruction}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      color: t.textMuted,
                                      fontSize: ".62rem",
                                      flexShrink: 0,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {msg.time}
                                  </Typography>
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    borderRadius: "16px 16px 16px 4px",
                                    overflow: "hidden",
                                    border: `1px solid ${CYAN}30`,
                                    background: `${CYAN}05`,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      px: 2.5,
                                      py: "12px",
                                      background: `${CYAN}10`,
                                      borderBottom: `1px solid ${CYAN}20`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        color: t.text,
                                        fontSize: ".82rem",
                                        fontWeight: 700,
                                      }}
                                    >
                                      OMNIX understood your instruction
                                    </Typography>
                                    <Box
                                      sx={{
                                        px: 1,
                                        py: 0.2,
                                        borderRadius: "5px",
                                        background: `${PURPLE}15`,
                                        border: `1px solid ${PURPLE}30`,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          color: "#a5b4fc",
                                          fontSize: ".58rem",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {msg.config.pipeline_id || "auto_rule"}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Box sx={{ p: "16px 20px" }}>
                                    <Box
                                      sx={{
                                        p: "14px 16px",
                                        borderRadius: "10px",
                                        background: t.surface,
                                        border: `1px solid ${t.border}`,
                                        mb: 2,
                                      }}
                                    >
                                      <SummaryText
                                        text={msg.text}
                                        color={t.text}
                                      />
                                    </Box>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mb: 1.5,
                                        p: "8px 12px",
                                        borderRadius: "8px",
                                        background: `${CYAN}08`,
                                        border: `1px solid ${CYAN}20`,
                                      }}
                                    >
                                      <SubdirectoryArrowRightIcon
                                        sx={{ fontSize: 14, color: CYAN }}
                                      />
                                      <Typography
                                        sx={{
                                          color: t.textSecondary,
                                          fontSize: ".75rem",
                                        }}
                                      >
                                        Reply below — type{" "}
                                        <Box
                                          component="span"
                                          sx={{ color: GREEN, fontWeight: 700 }}
                                        >
                                          "yes"
                                        </Box>{" "}
                                        to apply, or describe what to change.
                                      </Typography>
                                    </Box>
                                    <Box
                                      onClick={() => toggleTech(msg.id)}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.8,
                                        cursor: "pointer",
                                        width: "fit-content",
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: "6px",
                                        "&:hover": {
                                          background: t.surfaceHover,
                                        },
                                      }}
                                    >
                                      {expandedTechIds.has(msg.id) ? (
                                        <ExpandLessIcon
                                          sx={{
                                            fontSize: 14,
                                            color: t.textMuted,
                                          }}
                                        />
                                      ) : (
                                        <ExpandMoreIcon
                                          sx={{
                                            fontSize: 14,
                                            color: t.textMuted,
                                          }}
                                        />
                                      )}
                                      <Typography
                                        sx={{
                                          color: t.textMuted,
                                          fontSize: ".72rem",
                                        }}
                                      >
                                        {expandedTechIds.has(msg.id)
                                          ? "Hide"
                                          : "Show"}{" "}
                                        technical details
                                      </Typography>
                                    </Box>
                                    <Collapse in={expandedTechIds.has(msg.id)}>
                                      <Box sx={{ mt: 1 }}>
                                        <pre
                                          style={{
                                            margin: 0,
                                            fontFamily:
                                              '"JetBrains Mono", monospace',
                                            fontSize: "0.68rem",
                                            lineHeight: 1.5,
                                            color: t.textSecondary,
                                            background: "rgba(0,0,0,0.2)",
                                            padding: "12px 14px",
                                            borderRadius: "8px",
                                            maxHeight: 220,
                                            overflow: "auto",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            border: `1px solid ${t.border}`,
                                          }}
                                        >
                                          {JSON.stringify(msg.config, null, 2)}
                                        </pre>
                                      </Box>
                                    </Collapse>
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        )}
                    </Box>
                  ))}
                  {processing && <SkeletonLoader t={t} />}
                  <div ref={chatBottomRef} />
                </Box>
              )}

              {error && (
                <Box
                  sx={{
                    mb: 2,
                    p: "14px 18px",
                    borderRadius: "12px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  <ErrorOutlineIcon
                    sx={{ color: "#fca5a5", fontSize: 18, mt: 0.2 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        color: "#fca5a5",
                        fontSize: ".85rem",
                        fontWeight: 600,
                        mb: 0.5,
                      }}
                    >
                      Heads up
                    </Typography>
                    <Typography
                      sx={{ color: t.textSecondary, fontSize: ".78rem" }}
                    >
                      {error}
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => setError(null)}
                    sx={{
                      cursor: "pointer",
                      color: t.textMuted,
                      px: 1,
                      "&:hover": { color: t.text },
                    }}
                  >
                    ✕
                  </Box>
                </Box>
              )}

              <Box
                sx={{
                  borderRadius: "16px",
                  background: t.surface,
                  border: `1px solid ${inputBorder}`,
                  overflow: "hidden",
                  transition: "all .25s",
                  boxShadow: inputShadow,
                  ...(hasPending &&
                    !processing && {
                      animation: "inputPulse 2.4s ease-in-out infinite",
                      "@keyframes inputPulse": {
                        "0%, 100%": {
                          boxShadow: `0 0 0 4px ${CYAN}12, 0 0 18px ${CYAN}20`,
                        },
                        "50%": {
                          boxShadow: `0 0 0 6px ${CYAN}18, 0 0 28px ${CYAN}30`,
                        },
                      },
                    }),
                }}
              >
                <textarea
                  ref={inputRef}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={inputPlaceholder}
                  rows={hasPending ? 2 : chatHistory.length > 0 ? 3 : 5}
                  disabled={processing}
                  autoFocus
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    color: t.text,
                    fontSize: "0.92rem",
                    lineHeight: 1.75,
                    padding: "16px 20px 10px",
                    fontFamily: '"Inter", system-ui, sans-serif',
                    opacity: processing ? 0.5 : 1,
                  }}
                />
                <style>{`textarea::placeholder { color: ${t.textMuted}; }`}</style>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2.5,
                    py: 1.2,
                    borderTop: `1px solid ${t.border}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography
                      sx={{
                        color: t.textMuted,
                        fontSize: ".7rem",
                        opacity: 0.5,
                      }}
                    >
                      ↵ Enter to send
                    </Typography>
                    <Typography
                      sx={{
                        color: t.textMuted,
                        fontSize: ".7rem",
                        opacity: 0.3,
                      }}
                    >
                      ⇧↵ New line
                    </Typography>
                    {chatHistory.length > 0 && (
                      <Box
                        onClick={() => {
                          setChatHistory([]);
                          setInstruction("");
                          setError(null);
                          try {
                            localStorage.removeItem(CHAT_HISTORY_KEY);
                          } catch {}
                        }}
                        sx={{
                          cursor: "pointer",
                          px: 1,
                          py: 0.3,
                          borderRadius: "5px",
                          "&:hover": { background: t.surfaceHover },
                        }}
                      >
                        <Typography
                          sx={{
                            color: t.textMuted,
                            fontSize: ".68rem",
                            opacity: 0.6,
                          }}
                        >
                          Clear chat
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box
                    onClick={canSend ? handleSend : undefined}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: "16px",
                      py: "8px",
                      borderRadius: "10px",
                      background: processing
                        ? `linear-gradient(135deg, ${CYAN}, #0099CC)`
                        : canSend
                          ? `linear-gradient(135deg, ${PURPLE}, #5B21B6)`
                          : t.surface,
                      border: `1px solid ${processing ? CYAN : canSend ? PURPLE + "70" : t.border}`,
                      cursor: canSend ? "pointer" : "default",
                      boxShadow:
                        canSend && !processing
                          ? `0 4px 16px ${PURPLE}40`
                          : processing
                            ? `0 4px 16px ${CYAN}30`
                            : "none",
                      transition: "all .2s",
                      "&:hover":
                        canSend && !processing
                          ? { transform: "translateY(-1px)" }
                          : {},
                    }}
                  >
                    {processing ? (
                      <SettingsIcon
                        sx={{
                          fontSize: 15,
                          color: "#fff",
                          animation: "gearSpin 1.4s linear infinite",
                          "@keyframes gearSpin": {
                            "100%": { transform: "rotate(360deg)" },
                          },
                        }}
                      />
                    ) : (
                      <SendIcon
                        sx={{
                          fontSize: 14,
                          color: canSend ? "#fff" : t.textMuted,
                        }}
                      />
                    )}
                    <Typography
                      sx={{
                        fontSize: ".82rem",
                        fontWeight: 600,
                        color: processing || canSend ? "#fff" : t.textMuted,
                      }}
                    >
                      {processing ? "Calling AI Engine" : "Send"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ height: 40 }} />
            </Box>
          </Box>

          {/* ── RIGHT panel ── */}
          <Box
            sx={{
              width: 380,
              flexShrink: 0,
              overflowY: "auto",
              background: t.surface,
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: `${PURPLE}35`,
                borderRadius: "4px",
              },
            }}
          >
            <Box sx={{ p: "40px 28px" }}>
              <Box
                sx={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  mb: 3,
                  background: t.bgSecondary,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: "16px",
                    background: `linear-gradient(135deg, ${PURPLE}12 0%, transparent 60%)`,
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: t.text,
                        fontWeight: 700,
                        fontSize: ".95rem",
                      }}
                    >
                      Active Rules
                    </Typography>
                    <Typography
                      sx={{
                        color: t.textMuted,
                        fontSize: ".72rem",
                        mt: ".2rem",
                      }}
                    >
                      Applied to pipeline
                    </Typography>
                  </Box>
                  {/* Lisha's Reset control — now with confirmation dialog */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.4,
                        borderRadius: "20px",
                        background: `${GREEN}12`,
                        border: `1px solid ${GREEN}25`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: GREEN,
                          fontSize: ".65rem",
                          fontWeight: 700,
                        }}
                      >
                        {history.length} rules
                      </Typography>
                    </Box>
                    {history.length > 0 && (
                      <Tooltip title="Clear all rules and start fresh">
                        <Box
                          onClick={() => setResetConfirmOpen(true)}
                          sx={{
                            px: 1,
                            py: 0.3,
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: "1px solid rgba(239,68,68,0.2)",
                            "&:hover": {
                              background: "rgba(239,68,68,0.08)",
                              borderColor: "rgba(239,68,68,0.4)",
                            },
                            transition: "all .2s",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "rgba(239,68,68,0.8)",
                              fontSize: ".6rem",
                              fontWeight: 600,
                            }}
                          >
                            Reset
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <Box sx={{ p: "8px 12px 12px" }}>
                  {history.length === 0 ? (
                    <Box sx={{ p: "24px 16px", textAlign: "center" }}>
                      <Typography
                        sx={{ color: t.textMuted, fontSize: ".82rem" }}
                      >
                        No rules generated yet
                      </Typography>
                      <Typography
                        sx={{
                          color: t.textMuted,
                          fontSize: ".7rem",
                          mt: 0.5,
                          opacity: 0.7,
                        }}
                      >
                        Type an instruction to begin
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {history.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            p: "14px 16px",
                            borderRadius: "12px",
                            background: t.surface,
                            border: `1px solid ${item.isNew ? GREEN : t.border}`,
                            transition: "all .25s",
                            ...(item.isNew && {
                              animation: "ruleFlash 1.6s ease-out",
                              "@keyframes ruleFlash": {
                                "0%": {
                                  borderColor: GREEN,
                                  boxShadow: `0 0 0 0 ${GREEN}80, 0 0 18px ${GREEN}55`,
                                },
                                "70%": {
                                  borderColor: GREEN,
                                  boxShadow: `0 0 0 6px ${GREEN}00, 0 0 6px ${GREEN}30`,
                                },
                                "100%": {
                                  borderColor: t.border,
                                  boxShadow: "none",
                                },
                              },
                            }),
                            "&:hover": { borderColor: `${PURPLE}25` },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 0.8,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.7,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: GREEN,
                                  boxShadow: `0 0 6px ${GREEN}`,
                                }}
                              />
                              <Typography
                                sx={{
                                  color: GREEN,
                                  fontSize: ".62rem",
                                  fontWeight: 700,
                                  letterSpacing: ".05em",
                                }}
                              >
                                ACTIVE
                              </Typography>
                            </Box>
                            <Typography
                              sx={{
                                color: t.textMuted,
                                fontSize: ".65rem",
                                fontFamily: "monospace",
                              }}
                            >
                              {item.time}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              color: t.textSecondary,
                              fontSize: ".82rem",
                              lineHeight: 1.55,
                              mb: 1,
                            }}
                          >
                            {item.instruction}
                          </Typography>
                          <Box
                            sx={{
                              px: 1,
                              py: 0.3,
                              borderRadius: "5px",
                              background: t.surface,
                              border: `1px solid ${t.border}`,
                              display: "inline-block",
                            }}
                          >
                            <Typography
                              sx={{
                                color: t.textMuted,
                                fontSize: ".6rem",
                                fontFamily: "monospace",
                              }}
                            >
                              {item.pipeline}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: t.bgSecondary,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: "16px",
                    background: `linear-gradient(135deg, ${CYAN}10 0%, transparent 60%)`,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <Typography
                    sx={{ color: t.text, fontWeight: 700, fontSize: ".95rem" }}
                  >
                    How It Works
                  </Typography>
                  <Typography
                    sx={{ color: t.textMuted, fontSize: ".72rem", mt: ".2rem" }}
                  >
                    From words to pipeline in seconds
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: "12px 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {howItWorks.map((s, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "center",
                        p: "10px 12px",
                        borderRadius: "10px",
                        transition: "background .2s",
                        "&:hover": { background: t.surfaceHover },
                      }}
                    >
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "10px",
                          background: `${s.color}18`,
                          border: `1px solid ${s.color}35`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: s.color,
                          position: "relative",
                        }}
                      >
                        {s.icon}
                        <Box
                          sx={{
                            position: "absolute",
                            top: -5,
                            right: -5,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: t.bg,
                            border: `1px solid ${s.color}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              color: s.color,
                              fontSize: ".48rem",
                              fontWeight: 800,
                              lineHeight: 1,
                            }}
                          >
                            {s.n}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography
                        sx={{
                          color: t.textSecondary,
                          fontSize: ".8rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {s.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ height: 40 }} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={!!appliedToast}
        autoHideDuration={3000}
        onClose={() => setAppliedToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MuiAlert
          onClose={() => setAppliedToast(null)}
          severity="success"
          icon={<CheckCircleIcon sx={{ color: GREEN }} />}
          sx={{
            background: `${GREEN}12`,
            border: `1px solid ${GREEN}30`,
            color: GREEN,
            fontWeight: 600,
          }}
        >
          Rule applied: {appliedToast}
        </MuiAlert>
      </Snackbar>

      {/* Reset confirmation dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            background: t.bgSecondary,
            border: `1px solid ${t.border}`,
            borderRadius: "16px",
            minWidth: 400,
          },
        }}
      >
        <DialogTitle
          sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}
        >
          Reset all rules?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ color: t.textSecondary, fontSize: ".88rem", lineHeight: 1.6 }}
          >
            This will clear all active rules from the pipeline and reset the
            chat. Detection will stop until you create a new rule. This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setResetConfirmOpen(false)}
            sx={{
              color: t.textSecondary,
              borderRadius: "9px",
              textTransform: "none",
              border: `1px solid ${t.border}`,
              px: 2.5,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResetRules}
            variant="contained"
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              px: 2.5,
            }}
          >
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        sx={{
          "& .MuiDialog-paper": {
            background: t.bgSecondary,
            border: `1px solid ${t.border}`,
            borderRadius: "16px",
            minWidth: 360,
          },
        }}
      >
        <DialogTitle
          sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}
        >
          Sign out of OMNIX?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ color: t.textSecondary, fontSize: ".88rem", lineHeight: 1.6 }}
          >
            You'll be returned to the login screen.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setSignOutOpen(false)}
            sx={{
              color: t.textSecondary,
              borderRadius: "9px",
              textTransform: "none",
              border: `1px solid ${t.border}`,
              px: 2.5,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignOut}
            variant="contained"
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              px: 2.5,
            }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
