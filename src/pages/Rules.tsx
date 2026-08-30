import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Collapse,
  Snackbar,
  ClickAwayListener,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import SearchIcon from "@mui/icons-material/Search";
import StopIcon from "@mui/icons-material/Stop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ReportProblemOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { useTheme } from "../context/ThemeContext";
import { apiGet, apiPost, API_BASE } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import { DRAWER_OPEN, DRAWER_CLOSED, ACCENT, GREEN, AMBER } from "../lib/constants";
import { useSidebarOpen } from "../lib/sidebarState";
const DRAFT_KEY = "omnix_rule_draft";
const CHAT_HISTORY_KEY = "omnix_chat_history";
// ── Set right before redirecting to a training job's detail page, cleared
// once its outcome has been shown as a notification. Lets Rules.tsx notice
// "training finished" even after the person navigated away and came back
// later, without needing a full global notification system. ──
const PENDING_TRAINING_KEY = "omnix_pending_training_job";
const CONTEXT_KEY = "omnix_rule_context";
// ── The in-progress picker (camera/distance selections, and the config
// they belong to) was previously pure in-memory state — navigating away
// and back reset it to nothing, even though the chat text itself
// persisted fine via CHAT_HISTORY_KEY. This makes the picker survive
// navigation the same way. ──
const PICKER_STATE_KEY = "omnix_picker_state";

// ── Rotating status messages shown under the skeleton loader while the
// rule-generation request is in flight, instead of a silent/plain spinner. ──
const RULE_LOADING_MESSAGES = [
  "Reading your instruction...",
  "Figuring out which zone and gear apply...",
  "Checking available detection models...",
  "Drafting the pipeline config...",
  "Almost there...",
];

interface RuleCameraRef {
  id: number;
  name: string;
  zone_id: number | null;
  zone_name: string | null;
}

interface RuleHistoryItem {
  id: number;
  instruction: string;
  status: "pending" | "pending_training" | "active" | "inactive";
  time: string;
  pipeline: string;
  alerts: number;
  config?: any;
  cameras: RuleCameraRef[];
  trainingJobId?: number | null;
  isNew?: boolean;
}

interface TrainingJobRef {
  id: number;
  class_name: string;
  status: string;
  reused: boolean;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "discarded";
  text: string;
  config?: any;
  instruction?: string;
  time: string;
  // ── unknown-model visibility: when the LLM's response mentions a class
  // ONVXP hasn't been trained on yet, the generate call already kicks off
  // training in the background — these fields let the chat message show
  // that clearly instead of hiding it, with a direct link to watch it. ──
  unknownClasses?: string[];
  trainingJobs?: TrainingJobRef[];
}

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

function buildSummary(config: any): string {
  if (!config) return "";
  const alert = config.alert || {};
  const rules = config.rules || [];
  const cooldown = config.cooldown_seconds ?? 30;
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
    action = "alert you whenever a person is detected";
  } else if (ruleType === "count_exceeded") {
    action = "alert you when the person count limit is exceeded";
  } else {
    action = "monitor and alert you on violations";
  }
  return `Got it! I'll ${action}. Severity will be **${severity}**, and I'll wait **${cooldown} seconds** between repeat alerts for the same person. Next, pick which camera(s) this should watch.`;
}

function SummaryText({ text, color }: { text: string; color: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Typography sx={{ fontSize: ".92rem", lineHeight: 1.75, color }}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Box key={i} component="span" sx={{ fontWeight: 700, color: ACCENT }}>
            {part}
          </Box>
        ) : (
          part
        ),
      )}
    </Typography>
  );
}

// ── Humanize a snake_case class name ("ear_protection" -> "Ear Protection")
// same convention as the Self-Learning page, kept in sync deliberately. ──
function humanizeClassName(name: string): string {
  return name
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Three tiny bouncing dots, like a normal chat's "typing…" indicator —
// replaces the old skeleton-card loader, which imitated a whole fake
// response instead of just saying "thinking". ──
// ── Same custom icon as the left sidebar's toggle — a panel frame with
// the chevron drawn inside the narrow section, rather than a separate
// floating arrow. Kept in sync deliberately with Sidebar.tsx's copy. ──
function PanelToggleIcon({
  direction,
  arrowClassName,
  showArrow,
}: {
  direction: "left" | "right";
  arrowClassName?: string;
  showArrow?: boolean;
}) {
  const dividerX = direction === "left" ? 9 : 15;
  const arrowD =
    direction === "left" ? "M7.5 9.5L5.5 12L7.5 14.5" : "M16.5 9.5L18.5 12L16.5 14.5";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1={dividerX} y1="5" x2={dividerX} y2="19" stroke="currentColor" strokeWidth="1.5" />
      <path
        className={arrowClassName}
        d={arrowD}
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={showArrow ? 1 : 0}
        style={{ transition: "opacity .15s" }}
      />
    </svg>
  );
}

// ── One reusable toast for every kind of notification — success, error,
// warning, info — instead of several bespoke Snackbar blocks each doing
// almost the same thing with slightly different colors. Always top-right. ──
function AlertToast({
  open,
  severity,
  title,
  message,
  onClose,
  t,
  autoHideDuration = 4500,
}: {
  open: boolean;
  severity: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose: () => void;
  t: any;
  autoHideDuration?: number;
}) {
  const palette: Record<string, { color: string; Icon: any }> = {
    success: { color: GREEN, Icon: CheckCircleIcon },
    error: { color: "#E74C3C", Icon: ErrorOutlineIcon },
    warning: { color: AMBER, Icon: WarningAmberIcon },
    info: { color: ACCENT, Icon: ErrorOutlineIcon },
  };
  const { color, Icon } = palette[severity];
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.3,
          minWidth: 280,
          maxWidth: 420,
          p: "13px 16px",
          borderRadius: "12px",
          background: t.bgSecondary,
          border: `1px solid ${t.border}`,
          borderLeft: `3px solid ${color}`,
          boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 15, color }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: ".82rem", fontWeight: 700, color: t.text }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: ".74rem", color: t.textMuted, lineHeight: 1.4 }}>
            {message}
          </Typography>
        </Box>
        <Box
          onClick={onClose}
          sx={{ cursor: "pointer", color: t.textMuted, display: "flex", "&:hover": { color: t.text } }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    </Snackbar>
  );
}

function TypingDots() {
  return (
    <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#fff",
            animation: `typingBounce 1.1s ease-in-out ${i * 0.15}s infinite`,
            "@keyframes typingBounce": {
              "0%, 60%, 100%": { transform: "translateY(0)", opacity: 0.45 },
              "30%": { transform: "translateY(-4px)", opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  );
}

// ── Rotating status text with a shimmer sweep — grey base, a band of
// white light passing over it on a loop, no box/background around it.
// Self-contained so it can sit right beside the typing dots rather than
// stacked below them. ──
function ShimmerText({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(timer);
  }, [messages.length]);
  return (
    <Typography
      sx={{
        fontSize: ".82rem",
        fontWeight: 500,
        background: "linear-gradient(90deg, #8a8a8a 35%, #ffffff 50%, #8a8a8a 65%)",
        backgroundSize: "200% 100%",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "shimmerWave 2s linear infinite",
        "@keyframes shimmerWave": {
          "0%": { backgroundPosition: "150% 0" },
          "100%": { backgroundPosition: "-50% 0" },
        },
      }}
    >
      {messages[idx]}
    </Typography>
  );
}

// ── New: shown directly under the normal understanding-card whenever the
// LLM's response mentions a class ONVXP hasn't been trained on yet. Training
// already started automatically in the backend — this card exists so the
// person actually SEES that, instead of it happening silently and only
// being discoverable by clicking into Self-Learning on their own. ──
function MissingModelCard({
  classes,
  jobs,
  onView,
}: {
  classes: string[];
  jobs: TrainingJobRef[];
  onView: (jobId: number) => void;
}) {
  const primaryJob = jobs[0];
  return (
    <Box
      sx={{
        mt: 1.5,
        borderRadius: "14px",
        overflow: "hidden",
        border: `1px solid ${AMBER}40`,
        background: `${AMBER}08`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, px: 2.2, py: "12px", background: `${AMBER}12`, borderBottom: `1px solid ${AMBER}25` }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "8px",
            background: `${AMBER}20`,
            border: `1px solid ${AMBER}45`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ModelTrainingIcon sx={{ fontSize: 14, color: AMBER }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: ".82rem", fontWeight: 700, color: "#fff" }}>
            ONVXP is learning something new
          </Typography>
          <Typography sx={{ fontSize: ".68rem", color: "rgba(255,255,255,0.5)" }}>
            Training started automatically — no action needed
          </Typography>
        </Box>
      </Box>
      <Box sx={{ px: 2.2, py: "14px" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.7, mb: 1.6 }}>
          {classes.map((cls) => (
            <Box key={cls} sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />
              <Typography sx={{ fontSize: ".8rem", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                {humanizeClassName(cls)}
              </Typography>
              <Typography sx={{ fontSize: ".68rem", color: "rgba(255,255,255,0.4)" }}>
                not recognized yet
              </Typography>
            </Box>
          ))}
        </Box>
        {primaryJob && (
          <Box
            onClick={() => onView(primaryJob.id)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.8,
              px: 2,
              py: "9px",
              borderRadius: "10px",
              background: `${AMBER}18`,
              border: `1px solid ${AMBER}45`,
              cursor: "pointer",
              transition: "all .15s",
              "&:hover": { background: `${AMBER}28` },
            }}
          >
            <Typography sx={{ fontSize: ".78rem", fontWeight: 700, color: AMBER }}>
              Watch it learn
            </Typography>
            <ArrowForwardIcon sx={{ fontSize: 13, color: AMBER }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Friendly bucket for the distance row — the actual pixel number is an
// implementation detail nobody using this form should have to think in. ──
const DISTANCE_OPTIONS = [
  { value: 60, label: "Very close (~1m)" },
  { value: 120, label: "Close (~2m)" },
  { value: 220, label: "Nearby (~4m)" },
  { value: 380, label: "Wide area (~8m)" },
];

// ── Multiselect input — looks like a text field, selected items show as
// removable chips inside it, clicking anywhere else opens a dropdown of
// remaining options. Used for both zones and cameras in the picker, so
// there's one selection pattern instead of a plain checkbox list. ──
function MultiSelectInput({
  t,
  options,
  selectedIds,
  onToggle,
  placeholder,
  getSublabel,
}: {
  t: any;
  options: { id: number; name: string }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  placeholder: string;
  getSublabel?: (opt: { id: number; name: string }) => string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => selectedIds.includes(o.id));

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <Box
          onClick={() => setOpen((o) => !o)}
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px",
            minHeight: 42,
            px: "10px",
            py: "6px",
            borderRadius: "10px",
            background: t.bgSecondary,
            border: `1px solid ${open ? ACCENT + "60" : t.border}`,
            cursor: "pointer",
          }}
        >
          {selected.length === 0 ? (
            <Typography sx={{ fontSize: ".82rem", color: t.textMuted, px: "4px" }}>
              {placeholder}
            </Typography>
          ) : (
            selected.map((opt) => (
              <Box
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(opt.id);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  px: "9px",
                  py: "4px",
                  borderRadius: "999px",
                  background: `${ACCENT}14`,
                  border: `1px solid ${ACCENT}35`,
                }}
              >
                <Typography sx={{ fontSize: ".76rem", color: ACCENT, fontWeight: 600 }}>
                  {opt.name}
                  {getSublabel && getSublabel(opt) ? ` - ${getSublabel(opt)}` : ""}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: ACCENT,
                    cursor: "pointer",
                    "&:hover": { opacity: 0.7 },
                  }}
                >
                  ×
                </Box>
              </Box>
            ))
          )}
          <ExpandMoreIcon
            sx={{
              fontSize: 17,
              color: t.textMuted,
              ml: "auto",
              flexShrink: 0,
              transition: "transform .15s",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        </Box>
        {open && (
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              borderRadius: "10px",
              background: t.bgSecondary,
              border: `1px solid ${t.border}`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              zIndex: 30,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {options.length === 0 ? (
              <Typography sx={{ fontSize: ".8rem", color: t.textMuted, px: "14px", py: "12px" }}>
                No options available
              </Typography>
            ) : (
              options.map((opt) => {
                const checked = selectedIds.includes(opt.id);
                return (
                  <Box
                    key={opt.id}
                    onClick={() => onToggle(opt.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: "14px",
                      py: "10px",
                      cursor: "pointer",
                      background: checked ? `${ACCENT}14` : "transparent",
                      "&:hover": { background: checked ? `${ACCENT}20` : t.surfaceHover },
                    }}
                  >
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "5px",
                        flexShrink: 0,
                        border: `1.5px solid ${checked ? ACCENT : t.border}`,
                        background: checked ? ACCENT : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {checked && <CheckIcon sx={{ fontSize: 11, color: "#fff" }} />}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: ".82rem",
                        color: checked ? t.text : t.textSecondary,
                        fontWeight: checked ? 600 : 500,
                      }}
                    >
                      {opt.name}
                      {getSublabel && getSublabel(opt) ? ` - ${getSublabel(opt)}` : ""}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}

// ── One shared tappable-chip renderer for every picker step (zone, camera,
// sensitivity, distance) — plain text, no icons, ACCENT-highlighted when
// selected, same visual language as the site's own FilterDropdown. ──
// ── Compact single-line dropdown for the distance row — same visual
// convention as the site's own FilterDropdown (accent border on open,
// plain text options, no icons). ──
function CompactDropdown({
  t,
  value,
  options,
  onChange,
}: {
  t: any;
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <Box
          onClick={() => setOpen((o) => !o)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            height: 42,
            px: "14px",
            borderRadius: "10px",
            background: t.bgSecondary,
            border: `1px solid ${open ? ACCENT + "60" : t.border}`,
            cursor: "pointer",
          }}
        >
          <Typography sx={{ fontSize: ".82rem", color: t.text, flex: 1 }}>{current?.label}</Typography>
          <ExpandMoreIcon
            sx={{
              fontSize: 17,
              color: t.textMuted,
              transition: "transform .15s",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        </Box>
        {open && (
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              borderRadius: "10px",
              background: t.bgSecondary,
              border: `1px solid ${t.border}`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              zIndex: 30,
              overflow: "hidden",
            }}
          >
            {options.map((opt) => (
              <Box
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                sx={{
                  px: "14px",
                  py: "10px",
                  cursor: "pointer",
                  background: opt.value === value ? `${ACCENT}14` : "transparent",
                  "&:hover": { background: opt.value === value ? `${ACCENT}20` : t.surfaceHover },
                }}
              >
                <Typography
                  sx={{
                    fontSize: ".82rem",
                    color: opt.value === value ? ACCENT : t.textSecondary,
                    fontWeight: opt.value === value ? 700 : 500,
                  }}
                >
                  {opt.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}

const markPendingAsDiscarded = (msgs: ChatMessage[]): ChatMessage[] =>
  msgs.map((m) =>
    m.role === "assistant" ? { ...m, role: "discarded" as const } : m,
  );

export default function Rules() {
  const { user, logout } = useAuth();

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

  const [history, setHistory] = useState<RuleHistoryItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, toggleSidebar] = useSidebarOpen();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [expandedTechIds, setExpandedTechIds] = useState<Set<number>>(
    new Set(),
  );
  const [appliedToast, setAppliedToast] = useState<string | null>(null);
  const [trainingOutcome, setTrainingOutcome] = useState<{ success: boolean; message: string } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [togglingRuleIds, setTogglingRuleIds] = useState<Set<number>>(new Set());
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleToggleErrors, setRuleToggleErrors] = useState<Record<number, string>>({});
  const [orderedRuleIds, setOrderedRuleIds] = useState<number[]>([]);
  // ── Single rectangular block, not a multi-step tap-through flow. Once
  // the LLM understands a rule, one block appears with every camera listed
  // (its zone shown inline, since a camera only ever belongs to one zone —
  // no separate zone-picking step needed) plus the alert distance, and one
  // Apply button submits everything at once. ──
  const [showPicker, setShowPicker] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PICKER_STATE_KEY) || "null");
      return s?.showPicker || false;
    } catch {
      return false;
    }
  });
  const [cameraOptions, setCameraOptions] = useState<
    { id: number; name: string; zone_id: number | null; zone_name: string | null }[]
  >([]);
  const [zoneOptions, setZoneOptions] = useState<{ id: number; name: string }[]>([]);
  const [pickerZoneIds, setPickerZoneIds] = useState<number[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PICKER_STATE_KEY) || "null");
      return Array.isArray(s?.pickerZoneIds) ? s.pickerZoneIds : [];
    } catch {
      return [];
    }
  });
  const [pickerCameraIds, setPickerCameraIds] = useState<number[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PICKER_STATE_KEY) || "null");
      return Array.isArray(s?.pickerCameraIds) ? s.pickerCameraIds : [];
    } catch {
      return [];
    }
  });
  const [pickerDistance, setPickerDistance] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PICKER_STATE_KEY) || "null");
      return typeof s?.pickerDistance === "number" ? s.pickerDistance : 120;
    } catch {
      return 120;
    }
  });
  // ── Confirmation modal shown when the LLM understood the rule but it
  // depends on a detection class ONVXP doesn't have a model for yet —
  // training only starts if the person explicitly says yes. ──
  const [trainConfirmOpen, setTrainConfirmOpen] = useState(false);
  const [pendingUnknownClasses, setPendingUnknownClasses] = useState<string[]>([]);
  // ── Right-panel accordions — closed by default, per request ──
  // Whole right panel (Active Rules / Camera Zones / How It Works column) —
  // independent of each section's own open/closed state.
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [snapTs] = useState(() => Date.now());
  // ── The rule currently being configured through the picker flow — set
  // once when the LLM responds, read by every flow step, cleared once
  // applied/abandoned. Deliberately NOT derived from chatHistory's last
  // message: every zone/camera/sensitivity pick gets recorded as its own
  // chat bubble so the conversation reads naturally, which means "the last
  // message" keeps shifting away from the actual rule config as the person
  // taps through the flow. Tracking it separately keeps it stable
  // throughout the whole flow regardless of what's been said since. ──
  const [activeRuleConfig, setActiveRuleConfig] = useState<any>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PICKER_STATE_KEY) || "null");
      return s?.activeRuleConfig ?? null;
    } catch {
      return null;
    }
  });
  const [activeRuleInstruction, setActiveRuleInstruction] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PICKER_STATE_KEY) || "null");
      return s?.activeRuleInstruction ?? "";
    } catch {
      return "";
    }
  });
  const [ruleContext, setRuleContext] = useState<{
    cameras: { id: number; name: string; zone_id: number | null; zone_name: string | null }[];
    persistence: number;
    proximity: number;
  }>(() => {
    const fallback = { cameras: [], persistence: 5, proximity: 120 };
    try {
      const parsed = JSON.parse(localStorage.getItem(CONTEXT_KEY) || "null");
      // Old sessions (before this rewrite) stored { camera, zone } instead
      // of { cameras: [...] } — only trust what's cached if it actually
      // matches today's shape, otherwise fall back cleanly instead of
      // crashing later on ruleContext.cameras.length.
      return parsed && Array.isArray(parsed.cameras) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopRequestedRef = useRef(false);
  const pendingInstructionRef = useRef("");
  const navigate = useNavigate();
  const { t, mode } = useTheme();

  // ── Voice input: getUserMedia + AnalyserNode drive a real scrolling
  // waveform (actual mic amplitude, not a fake animation) — new samples
  // enter on the left and drift right as more come in, like a live
  // waveform. The Web Speech API separately provides live transcription,
  // shown directly in the input area as it comes in (in italics, appended
  // after anything already typed) rather than hidden behind a separate
  // recording-only screen. Both run client-side — no backend changes. ──
  const speechSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const [isRecording, setIsRecording] = useState(false);
  const MAX_WAVE_BARS = 40;
  const [voiceBuffer, setVoiceBuffer] = useState<number[]>(
    Array(MAX_WAVE_BARS).fill(0.05),
  );
  const smoothedLevelRef = useRef(0.05);
  const [preRecordingText, setPreRecordingText] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const TEXTAREA_MAX_HEIGHT = 200;

  const finalTranscriptRef = useRef("");

  const stopRecordingInternals = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((tr) => tr.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    smoothedLevelRef.current = 0.05;
    setVoiceBuffer(Array(MAX_WAVE_BARS).fill(0.05));
    setIsRecording(false);
  };

  // Tick (accept) — keeps the transcript, appended after whatever was
  // already typed.
  const acceptRecording = () => {
    const combined = preRecordingText
      ? `${preRecordingText} ${voiceTranscript}`.trim()
      : voiceTranscript.trim();
    setInstruction(combined);
    setVoiceTranscript("");
    setPreRecordingText("");
    stopRecordingInternals();
  };

  // X (cancel) — discards the transcript, restores exactly what was typed
  // before recording started.
  const cancelRecording = () => {
    setInstruction(preRecordingText);
    setVoiceTranscript("");
    setPreRecordingText("");
    stopRecordingInternals();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setPreRecordingText(instruction);
      setVoiceTranscript("");
      finalTranscriptRef.current = "";

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // One aggregate loudness value per frame (smoothed against the
      // previous frame so it doesn't flicker), pushed onto the left of a
      // rolling buffer — new samples enter on the left and drift toward
      // the right as more come in, like a real scrolling waveform.
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const raw = Math.max(0.05, sum / dataArray.length / 255);
        const smoothed = smoothedLevelRef.current * 0.7 + raw * 0.3;
        smoothedLevelRef.current = smoothed;
        setVoiceBuffer((prev) => [smoothed, ...prev].slice(0, MAX_WAVE_BARS));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          setVoiceTranscript((finalTranscriptRef.current + interimTranscript).trim());
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsRecording(true);
    } catch (e) {
      console.error("Microphone permission denied or unavailable", e);
    }
  };

  // Stop any active recording if the page is left mid-recording.
  useEffect(() => {
    return () => stopRecordingInternals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-grow the textarea with typed content, up to a capped height —
  // beyond that it scrolls internally instead of growing indefinitely.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, [instruction]);

  const drawerWidth = sidebarOpen ? DRAWER_OPEN : DRAWER_CLOSED;
  const hasPending = !!activeRuleConfig;

  // ── Navigate straight into the Self-Learning detail view for one job,
  // same URL convention (?page=Self-Learning&job=<id>) TrainingJobsPanel
  // reads on its own — no new routes needed. ──
  const goToTrainingJob = (jobId: number) => {
    navigate(`/dashboard?page=Self-Learning&job=${jobId}`);
  };

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
      localStorage.setItem(
        PICKER_STATE_KEY,
        JSON.stringify({
          showPicker,
          pickerZoneIds,
          pickerCameraIds,
          pickerDistance,
          activeRuleConfig,
          activeRuleInstruction,
        }),
      );
    } catch {}
  }, [showPicker, pickerZoneIds, pickerCameraIds, pickerDistance, activeRuleConfig, activeRuleInstruction]);
  useEffect(() => {
    try {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(ruleContext));
    } catch {}
  }, [ruleContext]);

  // ── Flow fix: one helper that fully clears the per-rule context ──
  const resetRuleContext = () => {
    setRuleContext({ cameras: [], persistence: 5, proximity: 120 });
    try {
      localStorage.removeItem(CONTEXT_KEY);
    } catch {}
  };

  // Load camera + zone options once on mount — cameras already carry
  // their own zone name for display, but zones are fetched separately
  // now since zone selection is its own step in the picker.
  useEffect(() => {
    apiGet("/api/cameras").then((c: any[]) => setCameraOptions(c)).catch(() => {});
    apiGet("/api/zones").then((z: any[]) => setZoneOptions(z)).catch(() => {});
  }, []);

  // ── Best-effort cross-page training notification. There's no global
  // notification system in this app (no shared layout/context wraps the
  // routes — just bare pages), so this checks localStorage for a job
  // stashed right before redirecting to Self-Learning, then polls that
  // job's status every 10s for as long as the person stays on this page —
  // catching the moment it finishes even if they're just sitting here,
  // not only "the next time they happen to land on Rules". It does NOT
  // catch the outcome while they're on some other page entirely with this
  // one unmounted — that would need an app-wide notification system,
  // which doesn't exist yet. ──
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkOnce = async () => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(PENDING_TRAINING_KEY);
      } catch {}
      if (!raw) {
        console.log("[training-check] nothing stashed in localStorage — stopping poll");
        if (intervalId) clearInterval(intervalId);
        return;
      }
      let pending: { jobId: number; instruction: string; startedAt: number };
      try {
        pending = JSON.parse(raw);
      } catch {
        console.log("[training-check] stashed value wasn't valid JSON, clearing it:", raw);
        try { localStorage.removeItem(PENDING_TRAINING_KEY); } catch {}
        if (intervalId) clearInterval(intervalId);
        return;
      }
      console.log("[training-check] checking job", pending.jobId, "for instruction:", pending.instruction);
      try {
        const job = await apiGet(`/api/training-jobs/${pending.jobId}`);
        if (cancelled) return;
        console.log("[training-check] job", pending.jobId, "status is:", job.status);
        if (job.status === "approved") {
          console.log("[training-check] approved — showing success toast");
          setTrainingOutcome({
            success: true,
            message: `Training finished — "${pending.instruction}" is now live.`,
          });
          try { localStorage.removeItem(PENDING_TRAINING_KEY); } catch {}
          if (intervalId) clearInterval(intervalId);
        } else if (job.status === "failed" || job.status === "cancelled") {
          console.log("[training-check]", job.status, "— showing failure toast");
          setTrainingOutcome({
            success: false,
            message:
              job.status === "cancelled"
                ? `Training for "${pending.instruction}" was rejected — that rule won't go live.`
                : `Training failed for "${pending.instruction}". Check Self-Learning for details.`,
          });
          try { localStorage.removeItem(PENDING_TRAINING_KEY); } catch {}
          if (intervalId) clearInterval(intervalId);
        } else {
          console.log("[training-check] still in progress (stage:", job.current_stage, ") — will check again in 10s");
        }
      } catch (e) {
        console.log("[training-check] apiGet threw — job id may be wrong, or a network/auth issue:", e);
      }
    };

    checkOnce();
    intervalId = setInterval(checkOnce, 10000);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Load active rules from DB on mount
  useEffect(() => {
    apiGet("/api/rules?all=true")
      .then((rules: any[]) => {
        const mapped: RuleHistoryItem[] = rules
          .filter(
            (r) =>
              r.status === "active" ||
              r.status === "inactive" ||
              r.status === "pending_training",
          )
          .map((r) => ({
            id: r.id,
            instruction: r.instruction,
            status: r.status,
            time: r.created_at
              ? new Date(r.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            pipeline: r.pipeline_id || "YOLOv8 + ByteTrack",
            alerts: 0,
            config: r.config_json,
            cameras: r.cameras || [],
            trainingJobId: r.training_job_id,
          }));
        setHistory(mapped);
      })
      .catch((e) => console.error("Failed to load rules from DB", e));
  }, []);

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
    stopRequestedRef.current = false;
    pendingInstructionRef.current = displayInstruction;
    setProcessing(true);
    setError(null);
    try {
      const data = await apiPost("/api/rules/generate", {
        instruction: llmInstruction,
      });

      // ── If the person hit stop while this was in flight, discard
      // whatever came back rather than acting on a response they already
      // dismissed — even though the underlying request may have still
      // completed on the server. ──
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        return;
      }

      // ── The LLM call can "succeed" (no thrown error) while still
      // returning no usable config — e.g. the instruction wasn't a rule
      // at all, or was too vague/unsupported. Whenever this happens, clear
      // the whole conversation, not just the one message that failed. ──
      if (!data.config) {
        setChatHistory([]);
        try {
          localStorage.removeItem(CHAT_HISTORY_KEY);
        } catch {}
        setInstruction(displayInstruction);
        setError(
          "Couldn't turn that into a rule — try describing it more specifically, e.g. \"Alert when a worker without a helmet enters the loading zone\".",
        );
        return;
      }

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
        // ── carry through which classes are new + their training job ids,
        // so the render below can show the "learning something new" card ──
        unknownClasses: data.unknown_classes || [],
        trainingJobs: data.training_jobs || [],
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
      // ── The picker flow starts immediately — no "type yes" step. Once
      // ONVXP understands the rule, the very next thing is one block with
      // every camera + the alert distance, and one Apply button. If the
      // rule depends on a class with no model yet, ask permission to train
      // it first — this used to start automatically with no confirmation. ──
      setActiveRuleConfig(data.config);
      setActiveRuleInstruction(displayInstruction);
      setPickerZoneIds([]);
      setPickerCameraIds([]);
      setPickerDistance(120);
      if (data.unknown_classes && data.unknown_classes.length > 0) {
        setPendingUnknownClasses(data.unknown_classes);
        setTrainConfirmOpen(true);
      } else {
        setShowPicker(true);
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate rule");
      // ── Failed generate: remove the just-sent user bubble from history,
      // restore the text to the input box, and release camera/zone/sensitivity
      // so the next attempt selects fresh. ──
      setChatHistory((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "user" ? prev.slice(0, -1) : prev;
      });
      setInstruction(displayInstruction);
      setActiveRuleConfig(null);
      setActiveRuleInstruction("");
      resetRuleContext();
    } finally {
      setProcessing(false);
    }
  };

  const applyPendingRule = async (
    config: any,
    instruction: string,
    cameras: { id: number; name: string; zone_id: number | null; zone_name: string | null }[],
    persistence: number,
    proximity: number,
  ) => {
    setProcessing(true);
    try {
      // ── Per-rule sensitivity: stamp the flow's choices into every rule ──
      if (config?.rules?.length) {
        config = {
          ...config,
          rules: config.rules.map((r: any) => ({
            ...r,
            persistence_frames: persistence,
            ...(r.type === "person_near_object"
              ? { proximity_px: proximity }
              : {}),
          })),
        };
      }
      const data = await apiPost("/api/rules/apply", {
        config,
        instruction,
        camera_ids: cameras.map((c) => c.id),
      });

      if (data.status === "pending_training") {
        // Not active, not inactive — this rule doesn't exist in the Rules
        // list at all yet. It'll appear automatically, already active,
        // once every model it depends on is approved.
        const jobs: TrainingJobRef[] = data.training_jobs || [];
        const primaryJob = jobs[0];
        console.log("[apply] pending_training — training_jobs from server:", jobs);

        // Show it landing in the panel — with the training indicator —
        // right before redirecting, not just silently on the next visit.
        const pendingRule: RuleHistoryItem = {
          id: data.rule_id,
          instruction,
          status: "pending_training",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          pipeline: config.pipeline_id || "YOLOv8 + ByteTrack",
          alerts: 0,
          config,
          cameras,
          trainingJobId: primaryJob?.id ?? null,
          isNew: true,
        };
        setHistory((prev) => [pendingRule, ...prev]);
        setRightPanelOpen(true);

        setChatHistory([]);
        try {
          localStorage.removeItem(CHAT_HISTORY_KEY);
        } catch {}
        setExpandedTechIds(new Set());
        resetRuleContext();
        if (primaryJob) {
          // Best-effort cross-page notice: tracked regardless of whether
          // we navigate anywhere — if training finishes while the person
          // is elsewhere, the poll in the mount effect still catches it.
          try {
            localStorage.setItem(
              PENDING_TRAINING_KEY,
              JSON.stringify({ jobId: primaryJob.id, instruction, startedAt: Date.now() }),
            );
            console.log("[apply] stashed pending job", primaryJob.id, "— visible in the right panel, click it to view training");
          } catch (e) {
            console.log("[apply] localStorage.setItem threw:", e);
          }
        } else {
          // This shouldn't happen — the server said training is needed
          // but didn't say which job. Surfacing this rather than silently
          // doing nothing, which would look identical to the whole
          // feature being broken with zero clues why.
          console.log("[apply] pending_training but no training_jobs in response — this is a backend inconsistency");
          setError(
            "Saved, but couldn't find the training job to redirect you to. Check Self-Learning manually.",
          );
        }
        return;
      }

      const newRule: RuleHistoryItem = {
        id: data.rule_id,
        instruction,
        status: "active",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pipeline:
          data.pipeline_id || config.pipeline_id || "YOLOv8 + ByteTrack",
        alerts: 0,
        config,
        cameras,
        isNew: true,
      };
      setHistory((prev) => [newRule, ...prev]);
      setRightPanelOpen(true);
      setChatHistory([]);
      try {
        localStorage.removeItem(CHAT_HISTORY_KEY);
      } catch {}
      setExpandedTechIds(new Set());
      setAppliedToast(instruction);
      resetRuleContext();
    } catch (e: any) {
      setError(e.message || "Failed to apply rule");
      resetRuleContext();
    } finally {
      setProcessing(false);
    }
  };

  // ── Stops waiting on the in-flight generation. The message is treated
  // as never sent: its chat bubble is removed and its text goes back into
  // the input box to edit or resend, exactly like it hadn't gone out yet.
  // If the request is still running server-side, its eventual response is
  // discarded by the check in callLLM rather than silently applied after
  // the fact. ──
  const handleStopGeneration = () => {
    stopRequestedRef.current = true;
    setProcessing(false);
    setChatHistory((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === "user" ? prev.slice(0, -1) : prev;
    });
    setInstruction(pendingInstructionRef.current);
  };

  const handleSend = async () => {
    if (!instruction.trim() || processing) return;
    const userMsg = instruction.trim();
    const intent = classifyIntent(userMsg, hasPending);

    const userChatMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: userMsg,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (!hasPending && (intent === "confirm" || intent === "negate")) {
      setError(
        'Type a complete rule to begin — e.g. "Alert when a worker without a helmet enters the loading zone".',
      );
      setInstruction(userMsg);
      return;
    }

    // ── A brand-new, unrelated rule while one's still being set up —
    // discard the old one (including any in-progress picker step) and
    // start fresh with this one instead. ──
    if (intent === "fresh" && hasPending) {
      setChatHistory((prev) => [...markPendingAsDiscarded(prev), userChatMsg]);
      resetRuleContext();
      setShowPicker(false);
      setActiveRuleConfig(null);
      setActiveRuleInstruction("");
      setInstruction("");
      setError(null);
      await callLLM(userMsg, userMsg);
      return;
    }

    if (hasPending && intent === "negate") {
      setChatHistory((prev) => [...markPendingAsDiscarded(prev), userChatMsg]);
      resetRuleContext();
      setShowPicker(false);
      setActiveRuleConfig(null);
      setActiveRuleInstruction("");
      setInstruction("");
      setError(null);
      return;
    }

    if (hasPending) {
      // Anything else typed while a rule is being set up is a refinement
      // to the understanding itself — cameras and distance are chosen in
      // the block below, never by typing.
      const combined = `${activeRuleInstruction}, ${userMsg}`;
      setChatHistory((prev) => [...markPendingAsDiscarded(prev), userChatMsg]);
      setShowPicker(false);
      setActiveRuleConfig(null);
      setActiveRuleInstruction("");
      setInstruction("");
      setError(null);
      await callLLM(combined, combined);
      return;
    }

    setInstruction("");
    setError(null);
    setChatHistory((prev) => [...prev, userChatMsg]);
    await callLLM(userMsg, userMsg);
  };

  // ── Single-block picker handlers ──
  const recordPickedAsUserMessage = (text: string) => {
    setChatHistory((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const togglePickerZone = (id: number) => {
    setPickerZoneIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setPickerCameraIds((prevCams) =>
        prevCams.filter((camId) => {
          const cam = cameraOptions.find((c) => c.id === camId);
          return !!cam && cam.zone_id != null && next.includes(cam.zone_id);
        }),
      );
      return next;
    });
  };

  const togglePickerCamera = (id: number) => {
    setPickerCameraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ── Training confirmation modal — cameras are still required either
  // way (a pending-training rule still needs to know which camera(s) it'll
  // watch once the model's ready), so "yes" just proceeds to the normal
  // picker rather than skipping straight to applying. ──
  const handleConfirmTraining = () => {
    setTrainConfirmOpen(false);
    setShowPicker(true);
  };
  const handleDeclineTraining = () => {
    setTrainConfirmOpen(false);
    setPendingUnknownClasses([]);
    setChatHistory((prev) => markPendingAsDiscarded(prev));
    setActiveRuleConfig(null);
    setActiveRuleInstruction("");
    resetRuleContext();
  };

  // Fixed hold-duration default — sensitivity isn't part of this block,
  // matching the system's existing default (5 frames, ~briefly).
  const DEFAULT_SENSITIVITY = 5;

  const handleApplyPicker = async () => {
    const cameras = cameraOptions
      .filter((c) => pickerCameraIds.includes(c.id))
      .map((c) => ({ id: c.id, name: c.name, zone_id: c.zone_id, zone_name: c.zone_name }));
    const distanceLabel = DISTANCE_OPTIONS.find((o) => o.value === pickerDistance)?.label || `${pickerDistance}px`;
    recordPickedAsUserMessage(
      `${cameras.map((c) => `${c.name} - ${c.zone_name || "No zone"}`).join(", ")} · Within ${distanceLabel}`,
    );
    setShowPicker(false);
    setRuleContext({ cameras, persistence: DEFAULT_SENSITIVITY, proximity: pickerDistance });
    const config = activeRuleConfig;
    const instruction = activeRuleInstruction;
    setActiveRuleConfig(null);
    setActiveRuleInstruction("");
    if (!config) return;
    await applyPendingRule(config, instruction, cameras, DEFAULT_SENSITIVITY, pickerDistance);
  };

  const handleDisableAllRules = async () => {
    try {
      await apiPost("/api/rules/reset");
      setHistory((prev) => prev.map((r) => ({ ...r, status: "inactive" as const })));
      setError(null);
    } catch (e: any) {
      console.error("Disable all rules failed", e);
      setError(e.message || "Couldn't disable all rules — please try again.");
    } finally {
      setResetConfirmOpen(false);
    }
  };

  // ── Enable All — there's no bulk-activate endpoint, so this calls the
  // same per-rule /activate endpoint the individual toggle already uses,
  // once per currently-inactive rule. Same optimistic-update-then-roll-
  // back-on-failure pattern as the single toggle: a rule whose model isn't
  // ready yet will correctly fail and revert, with its own inline error,
  // rather than silently appearing to succeed. ──
  const handleEnableAllRules = async () => {
    const inactiveRules = history.filter((r) => r.status === "inactive");
    if (inactiveRules.length === 0) return;
    setHistory((prev) =>
      prev.map((r) => (r.status === "inactive" ? { ...r, status: "active" as const } : r)),
    );
    setRuleToggleErrors({});
    const results = await Promise.allSettled(
      inactiveRules.map((r) => apiPost(`/api/rules/${r.id}/activate`)),
    );
    const failures: Record<number, string> = {};
    results.forEach((res, i) => {
      if (res.status === "rejected") {
        failures[inactiveRules[i].id] = res.reason?.message || "Couldn't activate this rule.";
      }
    });
    if (Object.keys(failures).length > 0) {
      setHistory((prev) =>
        prev.map((r) => (failures[r.id] ? { ...r, status: "inactive" as const } : r)),
      );
      setRuleToggleErrors((prev) => ({ ...prev, ...failures }));
    }
  };

  // ── Per-rule activate/deactivate — flips just one rule's status via the
  // dedicated backend endpoints, rather than the all-or-nothing Reset. ──
  const handleToggleRule = async (rule: RuleHistoryItem) => {
    if (togglingRuleIds.has(rule.id)) return;
    const goingActive = rule.status !== "active";
    const previousStatus = rule.status;

    // Clear any previous inline error for this rule the moment they try again.
    setRuleToggleErrors((prev) => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });

    // Optimistic — flip it the instant you click, don't wait on the
    // network for the switch to move. Only rolled back below if the
    // request actually fails.
    setHistory((prev) =>
      prev.map((r) =>
        r.id === rule.id ? { ...r, status: goingActive ? "active" : "inactive" } : r,
      ),
    );
    setTogglingRuleIds((prev) => new Set(prev).add(rule.id));
    const endpoint = goingActive
      ? `/api/rules/${rule.id}/activate`
      : `/api/rules/${rule.id}/deactivate`;
    try {
      await apiPost(endpoint);
    } catch (e: any) {
      console.error("Failed to toggle rule", e);
      setHistory((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, status: previousStatus } : r)),
      );
      // Shown right on this rule's own row, not as a page-level banner —
      // the reason (e.g. a model still training) is specific to this one
      // rule, so the feedback should be too.
      setRuleToggleErrors((prev) => ({
        ...prev,
        [rule.id]: e.message || "Couldn't update this rule's status.",
      }));
    } finally {
      setTogglingRuleIds((prev) => {
        const next = new Set(prev);
        next.delete(rule.id);
        return next;
      });
    }
  };

  const handleSignOut = () => {
    logout();
  };

  const canSend = !!instruction.trim() && !processing;
  const inputBorder = processing
    ? t.border
    : hasPending
      ? `${ACCENT}55`
      : instruction
        ? `${ACCENT}40`
        : t.border;
  const inputShadow =
    hasPending && !processing
      ? `0 0 0 4px ${ACCENT}12, 0 0 24px ${ACCENT}20`
      : instruction
        ? `0 0 0 4px ${ACCENT}10`
        : "none";

  // ── Active-first order is computed exactly once, the moment rules first
  // load on this page visit — never recomputed again afterward, no matter
  // how many times a rule gets toggled. A rule stays right where it is
  // when you activate/deactivate it; the list only re-sorts itself the
  // next time you land on this page fresh (this component remounting on
  // navigation naturally resets orderedRuleIds to empty, which is what
  // triggers this to run again). Repositioning happens purely via CSS
  // `order`, so the underlying DOM order never changes either way. ──
  useEffect(() => {
    if (orderedRuleIds.length > 0) return;
    if (history.length === 0) return;
    const sorted = [...history]
      .sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1))
      .map((r) => r.id);
    setOrderedRuleIds(sorted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const orderIndexById = new Map(orderedRuleIds.map((id, idx) => [id, idx]));

  const displayedRules = history.filter((r) =>
    ruleSearch.trim()
      ? r.instruction.toLowerCase().includes(ruleSearch.trim().toLowerCase())
      : true,
  );

  const inputPlaceholder = hasPending
    ? "Type 'yes' to apply, or describe what to change..."
    : chatHistory.length > 0
      ? "Continue refining, or start a new rule..."
      : "e.g. Alert me when a worker without a helmet enters the loading zone...";

  // ── Shared input box — same component whether it's centered on the
  // empty page or pinned in the footer once a conversation has started. ──
  const renderInputBox = () => (
    <Box sx={{ position: "relative" }}>
      {/* Glow — sits behind the input and extends beyond its edges, not a
      border. The input itself stays a normal opaque surface with a
      regular subtle border; this layer is purely a soft halo around it. */}
      <Box
        sx={{
          position: "absolute",
          inset: "-14px",
          borderRadius: "36px",
          background: isRecording
            ? `linear-gradient(135deg, ${AMBER}, ${ACCENT}, ${AMBER})`
            : `linear-gradient(135deg, ${ACCENT}, ${AMBER}, ${ACCENT})`,
          backgroundSize: "200% 200%",
          animation: "geminiGradientFlow 6s ease infinite",
          "@keyframes geminiGradientFlow": {
            "0%": { backgroundPosition: "0% 50%" },
            "50%": { backgroundPosition: "100% 50%" },
            "100%": { backgroundPosition: "0% 50%" },
          },
          filter: "blur(22px)",
          opacity: isRecording ? 0.5 : 0.32,
          zIndex: 0,
          pointerEvents: "none",
          transition: "opacity .3s",
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          borderRadius: "28px",
          background: t.bgSecondary,
          border: `1px solid ${t.border}`,
          overflow: "hidden",
        }}
      >
        {isRecording ? (
          <>
            {/* Live transcript — same position/padding as the textarea it
            replaces. Empty input shows "Listening...", existing text stays
            put with the new voice text appended in italics after it. */}
            <Box sx={{ padding: "18px 20px 6px", minHeight: 28 }}>
              <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                {!preRecordingText && !voiceTranscript ? (
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "5px", color: t.textMuted }}>
                    Listening
                    <Box component="span" sx={{ display: "inline-flex", gap: "3px", ml: "2px" }}>
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          component="span"
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: t.textMuted,
                            display: "inline-block",
                            animation: `listeningDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                            "@keyframes listeningDot": {
                              "0%, 80%, 100%": { opacity: 0.25 },
                              "40%": { opacity: 1 },
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <>
                    {preRecordingText && (
                      <Box component="span" sx={{ color: t.text }}>
                        {preRecordingText}{" "}
                      </Box>
                    )}
                    <Box
                      component="span"
                      sx={{
                        color: preRecordingText ? t.textSecondary : t.text,
                        fontStyle: preRecordingText ? "italic" : "normal",
                      }}
                    >
                      {voiceTranscript}
                    </Box>
                  </>
                )}
              </Typography>
            </Box>

            {/* Scrolling waveform + accept/cancel — same position as the
            mic/send toolbar it replaces. New samples enter on the left and
            drift right, height reacting to real mic amplitude. */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, pb: 1.4, pt: 0.5 }}>
              <Box sx={{ flex: 1, height: 32, display: "flex", alignItems: "center", gap: "3px", overflow: "hidden" }}>
                {voiceBuffer.map((lvl, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 3,
                      flexShrink: 0,
                      borderRadius: "2px",
                      height: `${Math.max(4, Math.min(1, lvl) * 28)}px`,
                      background: ACCENT,
                      opacity: 0.5 + Math.min(1, lvl) * 0.5,
                    }}
                  />
                ))}
              </Box>
              <Tooltip title="Cancel">
                <Box
                  onClick={cancelRecording}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: t.border,
                    cursor: "pointer",
                    transition: "transform .15s",
                    "&:hover": { transform: "scale(1.06)" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18, color: t.textSecondary }} />
                </Box>
              </Tooltip>
              <Tooltip title="Use this">
                <Box
                  onClick={acceptRecording}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: GREEN,
                    cursor: "pointer",
                    transition: "transform .15s",
                    "&:hover": { transform: "scale(1.06)" },
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 20, color: "#fff" }} />
                </Box>
              </Tooltip>
            </Box>
          </>
        ) : (
          <>
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
              rows={1}
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
                fontSize: "0.95rem",
                lineHeight: 1.6,
                padding: "18px 20px 6px",
                fontFamily: '"Inter", system-ui, sans-serif',
                opacity: processing ? 0.5 : 1,
                minHeight: 28,
                maxHeight: TEXTAREA_MAX_HEIGHT,
              }}
            />
            <style>{`textarea::placeholder { color: ${t.textMuted}; }`}</style>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, pb: 1.4, pt: 0.5 }}>
              {speechSupported && (
                <Tooltip title="Voice input">
                  <Box
                    onClick={startRecording}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: t.textMuted,
                      cursor: "pointer",
                      transition: "all .15s",
                      "&:hover": { background: t.surfaceHover, color: t.text },
                    }}
                  >
                    <MicIcon sx={{ fontSize: 19 }} />
                  </Box>
                </Tooltip>
              )}
              <Box
                onClick={processing ? handleStopGeneration : canSend ? handleSend : undefined}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: processing
                    ? ACCENT
                    : canSend
                      ? ACCENT
                      : t.border,
                  cursor: processing || canSend ? "pointer" : "default",
                  transition: "all .2s",
                  "&:hover": (processing || canSend) ? { transform: "scale(1.08)" } : {},
                }}
              >
                {processing ? (
                  <StopIcon sx={{ fontSize: 16, color: "#fff" }} />
                ) : (
                  <ArrowUpwardIcon sx={{ fontSize: 18, color: canSend ? "#fff" : t.textMuted }} />
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );

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
      {/* SIDEBAR (shared component) */}
      <Sidebar
        selected="Rule Creation"
        onSelect={(item) => {
          if (item === "Rule Creation") return;
          if (processing) {
            setError(
              "Please wait for the AI to finish before navigating away.",
            );
            return;
          }
          navigate(`/dashboard?page=${encodeURIComponent(item)}`, {
            replace: false,
          });
        }}
        open={sidebarOpen}
        onToggle={toggleSidebar}
        onSignOut={() => setSignOutOpen(true)}
        userName={user?.name || "Admin"}
        userEmail={user?.email || ""}
      />

      {/* MAIN */}
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
        <PageHeader
          title="Rule Creation"
          description="Describe what you want your cameras to watch for, and we'll set up the alert for you"
        />

        <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* LEFT panel — Gemini-style chat. Empty state centers just the
          input; once a conversation starts, messages scroll in their own
          contained region while the input stays pinned at the bottom —
          the page itself never scrolls. */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRight: `1px solid ${t.border}`,
            }}
          >
            {chatHistory.length === 0 ? (
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
                <Box sx={{ width: "100%", maxWidth: 720 }}>
                  <Typography
                    sx={{
                      textAlign: "center",
                      fontSize: "1.7rem",
                      fontWeight: 700,
                      letterSpacing: "-.5px",
                      mb: 4,
                      background: `linear-gradient(135deg, ${ACCENT}, ${AMBER})`,
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Hi {user?.name || "there"}, what should we watch for?
                  </Typography>
                  {renderInputBox()}
                </Box>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    p: "32px 48px 16px",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                  }}
                >
                <Box
                  sx={{
                    maxWidth: 760,
                    mx: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {chatHistory.map((msg) => (
                    <Box key={msg.id}>
                      {msg.role === "user" && (
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                          <Box
                            sx={{
                              maxWidth: "80%",
                              p: "10px 15px",
                              borderRadius: "16px 16px 4px 16px",
                              background: t.surface,
                              border: `1px solid ${t.border}`,
                            }}
                          >
                            <Typography sx={{ color: t.text, fontSize: ".85rem", lineHeight: 1.6 }}>
                              {msg.text}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      {(msg.role === "assistant" || msg.role === "discarded") &&
                        msg.config && (
                          <Box sx={{ maxWidth: "90%", opacity: msg.role === "assistant" ? 1 : 0.4 }}>
                            {msg.role === "discarded" ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.2,
                                  py: "6px",
                                  transition: "opacity .2s",
                                  "&:hover": { opacity: 0.7 },
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
                                  <Box sx={{ width: 6, height: 1.5, background: t.textMuted, borderRadius: 1 }} />
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
                                  <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>
                                    Discarded:
                                  </Box>
                                  {msg.instruction}
                                </Typography>
                              </Box>
                            ) : (
                              <Box>
                                <SummaryText text={msg.text} color={t.text} />

                                {msg.unknownClasses && msg.unknownClasses.length > 0 && (
                                  <MissingModelCard
                                    classes={msg.unknownClasses}
                                    jobs={msg.trainingJobs || []}
                                    onView={goToTrainingJob}
                                  />
                                )}

                                <Box
                                  onClick={() => toggleTech(msg.id)}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.6,
                                    cursor: "pointer",
                                    width: "fit-content",
                                    mt: 1,
                                    py: 0.4,
                                    px: 0.8,
                                    borderRadius: "6px",
                                    "&:hover": { background: t.surfaceHover },
                                  }}
                                >
                                  {expandedTechIds.has(msg.id) ? (
                                    <ExpandLessIcon sx={{ fontSize: 13, color: t.textMuted }} />
                                  ) : (
                                    <ExpandMoreIcon sx={{ fontSize: 13, color: t.textMuted }} />
                                  )}
                                  <Typography sx={{ color: t.textMuted, fontSize: ".7rem" }}>
                                    {expandedTechIds.has(msg.id) ? "Hide" : "Show"} technical details
                                  </Typography>
                                </Box>
                                <Collapse in={expandedTechIds.has(msg.id)}>
                                  <Box sx={{ mt: 1 }}>
                                    <Box
                                      component="pre"
                                      sx={{
                                        m: 0,
                                        fontFamily: '"JetBrains Mono", monospace',
                                        fontSize: "0.68rem",
                                        lineHeight: 1.5,
                                        color: t.textSecondary,
                                        background: t.surface,
                                        p: "12px 14px",
                                        borderRadius: "8px",
                                        maxHeight: 220,
                                        overflow: "auto",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        border: `1px solid ${t.border}`,
                                        "&::-webkit-scrollbar": { width: "4px" },
                                        "&::-webkit-scrollbar-thumb": {
                                          background: `${ACCENT}35`,
                                          borderRadius: "4px",
                                        },
                                      }}
                                    >
                                      {JSON.stringify(msg.config, null, 2)}
                                    </Box>
                                  </Box>
                                </Collapse>
                              </Box>
                            )}
                          </Box>
                        )}
                    </Box>
                  ))}

                  {/* ── Single block — every camera listed with its zone
                  inline, the alert distance, and one Apply button. Appears
                  once, right after ONVXP's understood-rule message. ── */}
                  {!processing && showPicker && (
                    <Box
                      sx={{
                        maxWidth: 440,
                        borderRadius: "16px",
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        boxShadow:
                          mode === "dark"
                            ? "0 10px 28px rgba(0,0,0,0.28)"
                            : "0 10px 28px rgba(0,0,0,0.07)",
                      }}
                    >
                      <Box sx={{ px: 2.4, py: 1.8, borderBottom: `1px solid ${t.border}` }}>
                        <Typography sx={{ fontSize: ".92rem", fontWeight: 700, color: t.text }}>
                          Configure this rule
                        </Typography>
                        <Typography sx={{ fontSize: ".74rem", color: t.textMuted, mt: "2px" }}>
                          Choose where this should watch
                        </Typography>
                      </Box>

                      {/* Zones */}
                      <Box sx={{ px: 2.4, py: 1.8, borderBottom: `1px solid ${t.border}` }}>
                        <Typography
                          sx={{
                            fontSize: ".68rem",
                            fontWeight: 700,
                            color: t.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            mb: 1.1,
                          }}
                        >
                          Zones
                        </Typography>
                        <MultiSelectInput
                          t={t}
                          options={zoneOptions}
                          selectedIds={pickerZoneIds}
                          onToggle={togglePickerZone}
                          placeholder="Select zone(s)"
                        />
                      </Box>

                      {/* Cameras — filtered to the selected zone(s); each row still
                      shows its own zone name too, so a multi-zone selection never
                      reads ambiguously about which camera belongs to which zone. */}
                      <Box sx={{ px: 2.4, py: 1.8 }}>
                        <Typography
                          sx={{
                            fontSize: ".68rem",
                            fontWeight: 700,
                            color: t.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            mb: 1.1,
                          }}
                        >
                          Cameras
                        </Typography>
                        <MultiSelectInput
                          t={t}
                          options={cameraOptions.filter(
                            (c) => c.zone_id != null && pickerZoneIds.includes(c.zone_id),
                          )}
                          selectedIds={pickerCameraIds}
                          onToggle={togglePickerCamera}
                          placeholder={
                            pickerZoneIds.length === 0
                              ? "Select a zone above first"
                              : "Select camera(s)"
                          }
                          getSublabel={(cam: any) => cam.zone_name || "No zone"}
                        />
                      </Box>

                      <Box sx={{ height: "1px", background: t.border, mx: 2.4 }} />

                      {/* Alert distance */}
                      <Box sx={{ px: 2.4, py: 1.8 }}>
                        <Typography
                          sx={{
                            fontSize: ".68rem",
                            fontWeight: 700,
                            color: t.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            mb: 1.1,
                          }}
                        >
                          Alert distance
                        </Typography>
                        <CompactDropdown
                          t={t}
                          value={pickerDistance}
                          options={DISTANCE_OPTIONS}
                          onChange={setPickerDistance}
                        />
                      </Box>

                      {/* Apply */}
                      <Box sx={{ px: 2.4, py: 1.8, background: t.bgSecondary, borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
                        <Button
                          fullWidth
                          disabled={pickerCameraIds.length === 0}
                          onClick={handleApplyPicker}
                          variant="contained"
                          sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: ".88rem",
                            background: ACCENT,
                            py: 1.1,
                            "&:hover": { background: ACCENT, opacity: 0.88 },
                            "&.Mui-disabled": { background: t.border, color: t.textMuted },
                          }}
                        >
                          Apply
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {processing && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TypingDots />
                      <ShimmerText messages={RULE_LOADING_MESSAGES} />
                    </Box>
                  )}
                  <div ref={chatBottomRef} />
                </Box>
                </Box>

                {/* Pinned footer — never scrolls away, matching Gemini's
                layout once a conversation is underway. */}
                <Box sx={{ flexShrink: 0, p: "12px 48px 28px" }}>
                  <Box sx={{ maxWidth: 760, mx: "auto" }}>


                    {renderInputBox()}

                    <Box sx={{ display: "flex", justifyContent: "center", mt: 1.2 }}>
                      <Box
                        onClick={() => {
                          setChatHistory([]);
                          setInstruction("");
                          setError(null);
                          resetRuleContext();
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
                            opacity: 0.55,
                          }}
                        >
                          Clear chat
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </Box>

          {/* RIGHT panel — collapsible as a whole, independent of each
          accordion's own open/closed state. Starts closed; the toggle is
          a properly visible colored tab, not a barely-there outline, so
          it's obvious there's something to open. */}
          <Box
            sx={{
              width: rightPanelOpen ? 380 : 68,
              flexShrink: 0,
              overflowY: rightPanelOpen ? "auto" : "hidden",
              scrollbarGutter: "stable",
              background: t.surface,
              borderLeft: `1px solid ${t.border}`,
              transition: "width .22s cubic-bezier(.4,0,.2,1)",
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: `${ACCENT}35`,
                borderRadius: "4px",
              },
            }}
          >
            {rightPanelOpen ? (
              // Header — separated from the accordion content below by the
              // first accordion's own border (kept to exactly one line).
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: "14px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: ".7rem",
                    fontWeight: 700,
                    color: t.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  Rule Info
                </Typography>
                <Tooltip title="Collapse panel">
                  <Box
                    onClick={() => setRightPanelOpen(false)}
                    sx={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: t.textMuted,
                      transition: "color .2s",
                      "&:hover": { color: t.text },
                      "&:hover .toggle-arrow": { opacity: 1 },
                    }}
                  >
                    <PanelToggleIcon direction="right" arrowClassName="toggle-arrow" />
                  </Box>
                </Tooltip>
              </Box>
            ) : (
              // Collapsed — mirrored direction from the left sidebar: this
              // panel expands leftward (pulling content in from the right
              // edge).
              <Box sx={{ display: "flex", justifyContent: "center", pt: "20px" }}>
                <Tooltip title="Show rule info & active rules" placement="left">
                  <Box
                    onClick={() => setRightPanelOpen(true)}
                    sx={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: t.textMuted,
                      transition: "color .2s",
                      "&:hover": { color: t.text },
                      "&:hover .toggle-arrow": { opacity: 1 },
                    }}
                  >
                    <PanelToggleIcon direction="left" arrowClassName="toggle-arrow" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            {rightPanelOpen && (
            <Box sx={{ p: "6px" }}>
              {/* Rules — the whole panel is this list now, no accordion
              wrapper around it. Each row has its own activate/deactivate
              toggle, calling the dedicated per-rule endpoints rather than
              the all-or-nothing Reset. Camera Zones intentionally removed
              from this panel per request. */}
              <Box
                sx={{
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: t.bgSecondary,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: "16px",
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".95rem" }}>
                      Rules
                    </Typography>
                    <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: ".2rem" }}>
                      {history.filter((r) => r.status === "active").length} active of {history.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    {history.some((r) => r.status === "inactive") && (
                      <Tooltip title="Turn on every inactive rule">
                        <Box
                          onClick={handleEnableAllRules}
                          sx={{
                            px: 1,
                            py: 0.3,
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: `1px solid ${GREEN}30`,
                            "&:hover": {
                              background: `${GREEN}12`,
                              borderColor: `${GREEN}55`,
                            },
                            transition: "all .2s",
                          }}
                        >
                          <Typography sx={{ color: GREEN, fontSize: ".6rem", fontWeight: 600 }}>
                            Enable all
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                    {history.some((r) => r.status === "active") && (
                      <Tooltip title="Turn off every active rule (reversible)">
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
                          <Typography sx={{ color: "rgba(239,68,68,0.8)", fontSize: ".6rem", fontWeight: 600 }}>
                            Disable all
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {history.length > 0 && (
                  <Box sx={{ p: "12px 12px 4px" }}>
                    <Box
                      sx={{
                        height: 38,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.6,
                        borderRadius: "9px",
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 15, color: t.textMuted, flexShrink: 0 }} />
                      <input
                        value={ruleSearch}
                        onChange={(e) => setRuleSearch(e.target.value)}
                        placeholder="Search rules..."
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          color: t.text,
                          fontSize: ".78rem",
                          padding: "8px 0",
                          fontFamily: "inherit",
                        }}
                      />
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: "flex", flexDirection: "column" }}>
                {history.length === 0 ? (
                  <Box sx={{ p: "24px 16px", textAlign: "center" }}>
                    <Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>
                      No rules yet
                    </Typography>
                    <Typography sx={{ color: t.textMuted, fontSize: ".7rem", mt: 0.5, opacity: 0.7 }}>
                      Type an instruction to begin
                    </Typography>
                  </Box>
                ) : displayedRules.length === 0 ? (
                  <Box sx={{ p: "24px 16px", textAlign: "center" }}>
                    <Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>
                      No rules match "{ruleSearch}"
                    </Typography>
                    <Box
                      onClick={() => setRuleSearch("")}
                      sx={{ display: "inline-block", mt: 1, cursor: "pointer" }}
                    >
                      <Typography sx={{ color: ACCENT, fontSize: ".72rem", fontWeight: 600 }}>
                        Clear search
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  displayedRules.map((item) => {
                    const isActive = item.status === "active";
                    const isPendingTraining = item.status === "pending_training";
                    return (
                      <Box
                        key={item.id}
                        onClick={
                          isPendingTraining && item.trainingJobId
                            ? () => goToTrainingJob(item.trainingJobId!)
                            : undefined
                        }
                        sx={{
                          order: orderIndexById.has(item.id) ? orderIndexById.get(item.id) : -1,
                          px: 3,
                          py: "14px",
                          borderBottom: `1px solid ${t.border}`,
                          "&:last-child": { borderBottom: "none" },
                          opacity: isActive || isPendingTraining ? 1 : 0.6,
                          transition: "opacity .2s, background .15s",
                          ...(isPendingTraining &&
                            item.trainingJobId && {
                              cursor: "pointer",
                              "&:hover": { background: t.surfaceHover },
                            }),
                          ...(item.isNew && {
                            animation: "ruleFlash 1.6s ease-out",
                            "@keyframes ruleFlash": {
                              "0%": { background: `${GREEN}18` },
                              "100%": { background: "transparent" },
                            },
                          }),
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 0.5 }}>
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: isPendingTraining ? AMBER : isActive ? GREEN : t.textMuted,
                                  boxShadow: isPendingTraining
                                    ? `0 0 6px ${AMBER}`
                                    : isActive
                                      ? `0 0 6px ${GREEN}`
                                      : "none",
                                  flexShrink: 0,
                                  ...(isPendingTraining && {
                                    animation: "trainingPulse 1.4s ease-in-out infinite",
                                    "@keyframes trainingPulse": {
                                      "0%, 100%": { opacity: 1 },
                                      "50%": { opacity: 0.3 },
                                    },
                                  }),
                                }}
                              />
                              <Typography
                                sx={{
                                  color: isPendingTraining ? AMBER : isActive ? GREEN : t.textMuted,
                                  fontSize: ".62rem",
                                  fontWeight: 700,
                                  letterSpacing: ".05em",
                                }}
                              >
                                {isPendingTraining ? "TRAINING" : isActive ? "ACTIVE" : "INACTIVE"}
                              </Typography>
                            </Box>
                            <Typography sx={{ color: t.textSecondary, fontSize: ".82rem", lineHeight: 1.5 }}>
                              {item.instruction}
                            </Typography>
                            {item.cameras && item.cameras.length > 0 && (
                              <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap", mt: 0.8 }}>
                                {item.cameras.map((cam) => (
                                  <Box
                                    key={cam.id}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      px: 1,
                                      py: 0.2,
                                      borderRadius: "5px",
                                      background: `${ACCENT}08`,
                                      border: `1px solid ${ACCENT}20`,
                                    }}
                                  >
                                    <CameraAltIcon sx={{ fontSize: 10, color: ACCENT }} />
                                    <Typography
                                      sx={{
                                        color: ACCENT,
                                        fontSize: ".6rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {cam.name}
                                      {cam.zone_name ? ` · ${cam.zone_name}` : ""}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                            {ruleToggleErrors[item.id] && (
                              <Typography
                                sx={{
                                  color: "#ef4444",
                                  fontSize: ".68rem",
                                  lineHeight: 1.4,
                                  mt: 0.7,
                                }}
                              >
                                ⚠ {ruleToggleErrors[item.id]}
                              </Typography>
                            )}
                          </Box>

                          {isPendingTraining ? (
                            <Tooltip title="Training in progress — this rule will go live automatically once it's ready">
                              <Box
                                sx={{
                                  width: 38,
                                  height: 22,
                                  flexShrink: 0,
                                  mt: "2px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <AutorenewIcon
                                  sx={{
                                    fontSize: 18,
                                    color: AMBER,
                                    animation: "trainingSpin 1.6s linear infinite",
                                    "@keyframes trainingSpin": {
                                      "100%": { transform: "rotate(360deg)" },
                                    },
                                  }}
                                />
                              </Box>
                            </Tooltip>
                          ) : (
                            <Tooltip title={isActive ? "Deactivate this rule" : "Activate this rule"}>
                              <Box
                                onClick={() => handleToggleRule(item)}
                                sx={{
                                  width: 38,
                                  height: 22,
                                  borderRadius: "999px",
                                  flexShrink: 0,
                                  mt: "2px",
                                  background: isActive ? GREEN : t.border,
                                  position: "relative",
                                  cursor: "pointer",
                                  transition: "background .2s",
                                }}
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: "2px",
                                    left: isActive ? "18px" : "2px",
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left .2s cubic-bezier(.4,0,.2,1)",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  }}
                                />
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
                </Box>
              </Box>

            </Box>
            )}
          </Box>
        </Box>
      </Box>

      <AlertToast
        open={!!appliedToast}
        severity="success"
        title="Rule applied"
        message={appliedToast || ""}
        onClose={() => setAppliedToast(null)}
        t={t}
      />

      <AlertToast
        open={!!trainingOutcome}
        severity={trainingOutcome?.success ? "success" : "error"}
        title={trainingOutcome?.success ? "Training complete" : "Training didn't finish"}
        message={trainingOutcome?.message || ""}
        onClose={() => setTrainingOutcome(null)}
        t={t}
        autoHideDuration={5000}
      />

      <AlertToast
        open={!!error}
        severity="error"
        title="Heads up"
        message={error || ""}
        onClose={() => setError(null)}
        t={t}
      />

      <Dialog
        open={trainConfirmOpen}
        onClose={handleDeclineTraining}
        sx={{
          "& .MuiDialog-paper": {
            background: t.bgSecondary,
            border: `1px solid ${t.border}`,
            borderRadius: "16px",
            minWidth: 400,
            maxWidth: 460,
          },
        }}
      >
        <DialogTitle sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}>
          Train a new detection model?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textSecondary, fontSize: ".88rem", lineHeight: 1.6 }}>
            ONVXP doesn't recognize{" "}
            <Box component="span" sx={{ color: t.text, fontWeight: 600 }}>
              {pendingUnknownClasses.map((c) => humanizeClassName(c)).join(", ")}
            </Box>{" "}
            yet. I can start training a model for{" "}
            {pendingUnknownClasses.length > 1 ? "these" : "this"} now — it takes some time, and
            this rule will go live automatically the moment it's ready.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={handleDeclineTraining}
            sx={{
              color: t.textSecondary,
              borderRadius: "9px",
              textTransform: "none",
              border: `1px solid ${t.border}`,
              px: 2.5,
            }}
          >
            Not now
          </Button>
          <Button
            onClick={handleConfirmTraining}
            variant="contained"
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              fontWeight: 600,
              background: ACCENT,
              px: 2.5,
              "&:hover": { background: ACCENT, opacity: 0.88 },
            }}
          >
            Yes, train it
          </Button>
        </DialogActions>
      </Dialog>

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
          Disable all rules?
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ color: t.textSecondary, fontSize: ".88rem", lineHeight: 1.6 }}
          >
            Every active rule will be turned off and live detection will stop.
            Nothing is deleted — the rules stay in this list and you can
            reactivate any of them individually at any time.
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
            onClick={handleDisableAllRules}
            variant="contained"
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              px: 2.5,
            }}
          >
            Disable All
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
