import { useState, useEffect } from "react";
import {
  Box, Typography, Slider, Switch, TextField, Select, MenuItem,
  FormControl, Snackbar, Alert, Tooltip, IconButton, LinearProgress,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SpeedIcon from "@mui/icons-material/Speed";
import SaveIcon from "@mui/icons-material/Save";
import MemoryIcon from "@mui/icons-material/Memory";
import RestoreIcon from "@mui/icons-material/Restore";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsIcon from "@mui/icons-material/Settings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import NotificationBell from "../../components/layout/NotificationBell";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../lib/api";
import { ACCENT, GREEN, AMBER } from "../../lib/constants";
import { MetricTile, SectionCard, SettingRow, ValuePill } from "../../components/common/Cards";
import TeamMembersSection from "../../components/settings/TeamMembersSection";

export default function SettingsPage() {
  const { t, mode, toggleMode } = useTheme();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(150);
  const [confidence, setConfidence] = useState(0.5);
  const [bytetrackBuffer, setBytetrackBuffer] = useState(30);
  const [persistenceFrames, setPersistenceFrames] = useState(5);
  const [dedup, setDedup] = useState(true);
  const [alertChannel, setAlertChannel] = useState("dashboard");
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [emailSeverityThreshold, setEmailSeverityThreshold] = useState("high");
  const [frameSampling, setFrameSampling] = useState("every");
  const [modelPrecision, setModelPrecision] = useState("balanced");
  const [siteName, setSiteName] = useState("Site A — Construction");
  const [apiEndpoint, setApiEndpoint] = useState("http://localhost:8000");
  const [llmModel, setLlmModel] = useState("claude-haiku");
  const mark = () => setDirty(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (data.detection) { setCooldown(data.detection.alert_cooldown_frames ?? 150); setConfidence(data.detection.detection_confidence ?? 0.5); setBytetrackBuffer(data.detection.bytetrack_buffer ?? 30); setPersistenceFrames(data.detection.persistence_frames ?? 5); }
        if (data.alerts) { setAlertChannel(data.alerts.channels ?? "dashboard"); setDedup(data.alerts.deduplication_enabled ?? true); setEmailAlerts(data.alerts.email_notifications_enabled ?? false); setEmailSeverityThreshold(data.alerts.email_severity_threshold ?? "high"); }
        if (data.ai_model) { setFrameSampling(data.ai_model.frame_sampling ?? "every"); setModelPrecision(data.ai_model.model_precision ?? "balanced"); }
        if (data.platform) { setLlmModel(data.platform.llm_model ?? "claude-haiku"); setSiteName(data.platform.site_name ?? "Site A — Construction"); setApiEndpoint(data.platform.api_endpoint ?? "http://localhost:8000"); }
      } catch {}
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ detection: { alert_cooldown_frames: cooldown, detection_confidence: confidence, bytetrack_buffer: bytetrackBuffer, persistence_frames: persistenceFrames }, alerts: { channels: alertChannel, deduplication_enabled: dedup, email_notifications_enabled: emailAlerts, email_severity_threshold: emailSeverityThreshold }, ai_model: { frame_sampling: frameSampling, model_precision: modelPrecision }, platform: { llm_model: llmModel, site_name: siteName, api_endpoint: apiEndpoint } }) });
    } catch {} finally { setSaving(false); setDirty(false); setSaved(true); }
  };

  const handleReset = () => { setCooldown(150); setConfidence(0.5); setBytetrackBuffer(30); setPersistenceFrames(5); setDedup(true); setAlertChannel("dashboard"); setEmailAlerts(false); setEmailSeverityThreshold("high"); setFrameSampling("every"); setModelPrecision("balanced"); setSiteName("Site A — Construction"); setApiEndpoint("http://localhost:8000"); setLlmModel("claude-haiku"); setDirty(false); };

  const selectSx = {
    minWidth: 160, fontSize: "0.82rem", background: t.surface,
    border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text,
    "& fieldset": { border: "none" }, "& .MuiSvgIcon-root": { color: t.textMuted },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: `${ACCENT}50` },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
  };

  return (
    <Box sx={{ p: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>Settings</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: t.textMuted, mt: "4px" }}>Platform configuration — ONVXP POC v0.1</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <NotificationBell />
          {dirty && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mr: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: AMBER, boxShadow: `0 0 8px ${AMBER}` }} />
              <Typography sx={{ fontSize: "0.75rem", color: AMBER }}>Unsaved changes</Typography>
            </Box>
          )}
          <Tooltip title={mode === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}>
            <IconButton onClick={toggleMode} size="small" sx={{ border: `1px solid ${t.border}`, borderRadius: "10px", color: t.textMuted, "&:hover": { borderColor: `${ACCENT}50`, color: t.text } }}>
              {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={handleReset} size="small" sx={{ border: `1px solid ${t.border}`, borderRadius: "10px", color: t.textMuted, "&:hover": { borderColor: `${ACCENT}50`, color: t.text } }}>
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box
            onClick={dirty && !saving ? handleSave : undefined}
            sx={{
              display: "flex", alignItems: "center", gap: "8px",
              px: "20px", py: "10px", borderRadius: "10px",
              background: dirty ? `linear-gradient(135deg, ${ACCENT}, #8B2E1F)` : t.surface,
              border: `1px solid ${dirty ? ACCENT + "80" : t.border}`,
              cursor: dirty && !saving ? "pointer" : "default",
              opacity: saving ? 0.7 : 1, transition: "all .25s",
              "&:hover": dirty && !saving ? { boxShadow: `0 0 20px ${ACCENT}40` } : {},
            }}
          >
            <SaveIcon sx={{ fontSize: 16, color: dirty ? "#fff" : t.textMuted }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: dirty ? "#fff" : t.textMuted }}>
              {saving ? "Saving…" : "Save Changes"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {saving && (
        <LinearProgress sx={{ mb: 3, borderRadius: 2, height: 2, background: `${ACCENT}15`, "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${ACCENT}, #D4891A)` } }} />
      )}

      {/* Metric tiles */}
      <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
        <MetricTile icon={<RocketLaunchIcon sx={{ fontSize: 20 }} />} value="v0.1" label="Version" color="#E8D5B0" />
        <MetricTile icon={<MemoryIcon sx={{ fontSize: 20 }} />} value="YOLOv8" label="Engine" color={ACCENT} />
        <MetricTile icon={<SpeedIcon sx={{ fontSize: 20 }} />} value="79%" label="Vest mAP" color={AMBER} />
        <MetricTile icon={<CheckCircleIcon sx={{ fontSize: 20 }} />} value="Online" label="Status" color={GREEN} pulse />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {/* Detection Engine */}
        <SectionCard icon={<TuneIcon fontSize="small" />} title="Detection Engine" subtitle="Configure core CV pipeline parameters" accentColor="#E8D5B0">
          <SettingRow label="Alert Cooldown" description="Minimum frames between alerts for same person ID" tag="ByteTrack" tooltip="Prevents alert flooding per person">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 210 }}>
              <Slider value={cooldown} min={30} max={500} step={10} onChange={(_, v) => { setCooldown(v as number); mark(); }} sx={{ color: ACCENT, flex: 1, "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-rail": { opacity: 0.2 } }} />
              <ValuePill value={`${cooldown} f`} highlight />
            </Box>
          </SettingRow>
          <SettingRow label="Persistence Frames" description="Consecutive frames a violation must hold before an incident fires" tag="Anti-flicker" tooltip="Higher = fewer false positives from single-frame misdetections, but slower to catch real violations">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 210 }}>
              <Slider value={persistenceFrames} min={1} max={30} step={1} onChange={(_, v) => { setPersistenceFrames(v as number); mark(); }} sx={{ color: ACCENT, flex: 1, "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-rail": { opacity: 0.2 } }} />
              <ValuePill value={`${persistenceFrames} f`} highlight />
            </Box>
          </SettingRow>
          <SettingRow label="Detection Confidence" description="Minimum YOLO confidence score (0–1)" tag="YOLOv8" tooltip="Lower = more detections but more false positives">
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: 210 }}>
              <Slider value={confidence} min={0.1} max={0.95} step={0.01} onChange={(_, v) => { setConfidence(v as number); mark(); }} sx={{ color: ACCENT, flex: 1, "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-rail": { opacity: 0.2 } }} />
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

        {/* Alert System */}
        <SectionCard icon={<NotificationsActiveIcon fontSize="small" />} title="Alert System" subtitle="Configure how and where alerts are dispatched" accentColor={AMBER}>
          <SettingRow label="Alert Channels" description="Where to send violation notifications" tag="Active" tagColor={GREEN}>
            <FormControl size="small">
              <Select value={alertChannel} onChange={(e) => { setAlertChannel(e.target.value); mark(); }} sx={selectSx}>
                <MenuItem value="dashboard">Dashboard Only</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="webhook">Webhook</MenuItem>
                <MenuItem value="all">All Channels</MenuItem>
              </Select>
            </FormControl>
          </SettingRow>
          <SettingRow label="Alert Deduplication" description="Prevent duplicate alerts for the same event" tag="ByteTrack" tooltip="Uses ByteTrack IDs to suppress repeated alerts">
            <Switch checked={dedup} onChange={(e) => { setDedup(e.target.checked); mark(); }} size="small" sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: GREEN }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: GREEN } }} />
          </SettingRow>
          <SettingRow label="Email Notifications" description="Send alert emails to registered admin address" tag="Optional" tagColor="rgba(255,200,170,0.4)">
            <Switch checked={emailAlerts} onChange={(e) => { setEmailAlerts(e.target.checked); mark(); }} size="small" sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: ACCENT }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: ACCENT } }} />
          </SettingRow>
          <SettingRow label="Email Severity Threshold" description="Minimum severity that triggers an email" tag="SMTP" tooltip="Only incidents at or above this severity will send an email, even when Email Notifications is on">
            <FormControl size="small" disabled={!emailAlerts}>
              <Select value={emailSeverityThreshold} onChange={(e) => { setEmailSeverityThreshold(e.target.value); mark(); }} sx={{ ...selectSx, opacity: emailAlerts ? 1 : 0.5 }}>
                <MenuItem value="low">Low and above</MenuItem>
                <MenuItem value="medium">Medium and above</MenuItem>
                <MenuItem value="high">High and above</MenuItem>
                <MenuItem value="critical">Critical only</MenuItem>
              </Select>
            </FormControl>
          </SettingRow>
        </SectionCard>

        {/* AI Model */}
        <SectionCard icon={<PsychologyIcon fontSize="small" />} title="AI Model" subtitle="Computer vision model configuration" accentColor={ACCENT}>
          <SettingRow label="Active Models" description="Currently loaded detection models" tag="Running" tagColor={GREEN}>
            <ValuePill value="Helmet + Vest + Base YOLO" />
          </SettingRow>
          <SettingRow label="Vest Model" description="Trained on Roboflow safety vest dataset" tag="POC" tagColor={AMBER}>
            <ValuePill value="79% mAP@50" highlight />
          </SettingRow>
          <SettingRow label="Frame Sampling" description="How frequently frames are processed" tag="Max Quality" tagColor="#E8D5B0" tooltip="Every frame = highest accuracy, higher GPU load">
            <FormControl size="small">
              <Select value={frameSampling} onChange={(e) => { setFrameSampling(e.target.value); mark(); }} sx={selectSx}>
                <MenuItem value="every">Every frame</MenuItem>
                <MenuItem value="2">Every 2nd frame</MenuItem>
                <MenuItem value="5">Every 5th frame</MenuItem>
                <MenuItem value="10">Every 10th frame</MenuItem>
              </Select>
            </FormControl>
          </SettingRow>
          <SettingRow label="Model Precision" description="Speed vs accuracy tradeoff">
            <FormControl size="small">
              <Select value={modelPrecision} onChange={(e) => { setModelPrecision(e.target.value); mark(); }} sx={selectSx}>
                <MenuItem value="fast">Fast (FP16)</MenuItem>
                <MenuItem value="balanced">Balanced (FP32)</MenuItem>
                <MenuItem value="accurate">Accurate (Full)</MenuItem>
              </Select>
            </FormControl>
          </SettingRow>
        </SectionCard>

        {/* Platform */}
        <SectionCard icon={<SettingsIcon fontSize="small" />} title="Platform" subtitle="General platform settings" accentColor="rgba(232,213,176,0.4)">
          <SettingRow label="LLM Model" description="AI model for natural language rule parsing" tag="Ollama" tagColor={ACCENT}>
            <FormControl size="small">
              <Select value={llmModel} onChange={(e) => { setLlmModel(e.target.value); mark(); }} sx={{ ...selectSx, minWidth: 200 }}>
                <MenuItem value="claude-haiku">Claude Haiku (planned)</MenuItem>
                <MenuItem value="claude-sonnet">Claude Sonnet</MenuItem>
                <MenuItem value="ollama-local">Ollama (local)</MenuItem>
              </Select>
            </FormControl>
          </SettingRow>
          <SettingRow label="Site Name" description="Current monitoring site identifier" tag="Active" tagColor={GREEN}>
            <TextField value={siteName} onChange={(e) => { setSiteName(e.target.value); mark(); }} size="small" sx={{ width: 220, "& .MuiOutlinedInput-root": { fontSize: "0.82rem", background: t.surface, borderRadius: "8px", color: t.text, "& fieldset": { borderColor: t.border }, "&:hover fieldset": { borderColor: `${ACCENT}50` }, "&.Mui-focused fieldset": { borderColor: ACCENT } } }} />
          </SettingRow>
          <SettingRow label="API Endpoint" description="Backend FastAPI server address" tag="Local" tagColor="rgba(232,213,176,0.5)">
            <TextField value={apiEndpoint} onChange={(e) => { setApiEndpoint(e.target.value); mark(); }} size="small" sx={{ width: 220, "& .MuiOutlinedInput-root": { fontSize: "0.78rem", fontFamily: "monospace", background: t.surface, borderRadius: "8px", color: ACCENT, "& fieldset": { borderColor: t.border }, "&:hover fieldset": { borderColor: `${ACCENT}50` }, "&.Mui-focused fieldset": { borderColor: ACCENT } } }} />
          </SettingRow>
          <SettingRow label="Interface Theme" description="Switch between dark and light mode">
            <Box onClick={toggleMode} sx={{ display: "flex", alignItems: "center", gap: 1, px: "14px", py: "6px", borderRadius: "8px", background: t.surface, border: `1px solid ${t.border}`, cursor: "pointer", transition: "all .2s", "&:hover": { borderColor: `${ACCENT}50`, background: `${ACCENT}08` } }}>
              {mode === "dark" ? <LightModeIcon sx={{ fontSize: 15, color: AMBER }} /> : <DarkModeIcon sx={{ fontSize: 15, color: ACCENT }} />}
              <Typography sx={{ fontSize: "0.8rem", color: t.textSecondary }}>{mode === "dark" ? "Light Mode" : "Dark Mode"}</Typography>
            </Box>
          </SettingRow>
        </SectionCard>
      </Box>

      <TeamMembersSection />

      {/* Danger Zone */}
      <Box sx={{ mt: 3, p: "20px 24px", borderRadius: "14px", border: "1px solid rgba(231,76,60,0.2)", background: "rgba(231,76,60,0.03)" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#E74C3C" }}>Danger Zone</Typography>
            <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "2px" }}>Clear pipeline data, reset stored tracks, and flush the alert queue</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: "10px" }}>
            {[{ label: "Flush Alert Queue", endpoint: "/api/danger/flush-alerts" }, { label: "Reset Track IDs", endpoint: "/api/danger/reset-tracks" }].map(({ label, endpoint }) => (
              <Box key={label} onClick={async () => { if (!window.confirm(`${label} — are you sure?`)) return; try { await apiFetch(endpoint, { method: "POST" }); } catch {} }} sx={{ px: "16px", py: "7px", borderRadius: "8px", cursor: "pointer", border: "1px solid rgba(231,76,60,0.3)", color: "#E74C3C", fontSize: "0.8rem", fontWeight: 500, transition: "all .2s", "&:hover": { background: "rgba(231,76,60,0.08)", borderColor: "rgba(231,76,60,0.5)" } }}>
                {label}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSaved(false)} sx={{ background: `${GREEN}12`, border: `1px solid ${GREEN}30`, color: GREEN, "& .MuiAlert-icon": { color: GREEN } }}>
          Settings saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
}
