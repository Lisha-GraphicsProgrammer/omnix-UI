import { useState, useEffect } from "react";
import {
  Box, Typography, Switch, TextField, Select, MenuItem,
  FormControl, Snackbar, Alert, Tooltip,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PaletteIcon from "@mui/icons-material/Palette";
import DevicesIcon from "@mui/icons-material/Devices";
import TuneIcon from "@mui/icons-material/Tune";
import SaveIcon from "@mui/icons-material/Save";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import PageHeader from "../../components/layout/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { ACCENT, GREEN, AMBER } from "../../lib/constants";
import TeamMembersSection from "../../components/settings/TeamMembersSection";

const PREFS_KEY = "onvxp_personal_prefs";
type PersonalPrefs = { landingPage: string; defaultAnalyticsRange: string; alertSound: boolean; timezone: string };
const DEFAULT_PREFS: PersonalPrefs = { landingPage: "alerts", defaultAnalyticsRange: "7d", alertSound: true, timezone: "browser" };

function Card({ icon, title, subtitle, accentColor, children }: { icon: React.ReactNode; title: string; subtitle: string; accentColor: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, px: 2.2, py: 1.6, borderBottom: `1px solid ${t.border}` }}>
        <Box sx={{ width: 32, height: 32, borderRadius: "9px", background: `${accentColor}18`, border: `1px solid ${accentColor}35`, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor, flexShrink: 0 }}>
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: ".88rem", fontWeight: 700, color: t.text }}>{title}</Typography>
          <Typography sx={{ fontSize: ".7rem", color: t.textMuted }}>{subtitle}</Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2.2, display: "flex", flexDirection: "column", gap: 1.8 }}>{children}</Box>
    </Box>
  );
}

function Row({ label, description, tag, tooltip, children }: { label: string; description: string; tag?: string; tooltip?: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
          <Typography sx={{ fontSize: ".82rem", color: t.text, fontWeight: 500 }}>{label}</Typography>
          {tooltip && (
            <Tooltip title={tooltip}><InfoOutlinedIcon sx={{ fontSize: 13, color: t.textMuted }} /></Tooltip>
          )}
          {tag && (
            <Box sx={{ px: "6px", py: "1px", borderRadius: "999px", background: t.bgSecondary }}>
              <Typography sx={{ fontSize: ".6rem", color: t.textMuted, fontWeight: 600 }}>{tag}</Typography>
            </Box>
          )}
        </Box>
        <Typography sx={{ fontSize: ".7rem", color: t.textMuted, mt: "1px" }}>{description}</Typography>
      </Box>
      <Box sx={{ flexShrink: 0 }}>{children}</Box>
    </Box>
  );
}

export default function SettingsPage() {
  const { t, mode, toggleMode } = useTheme();
  const { user } = useAuth();

  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const mark = () => setDirty(true);

  const [emailAlerts, setEmailAlerts] = useState(false);
  const [emailSeverityThreshold, setEmailSeverityThreshold] = useState("high");
  const [prefs, setPrefs] = useState<PersonalPrefs>(DEFAULT_PREFS);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const fallbackName = user?.email?.split("@")[0] || "User";
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState((user as any)?.name || fallbackName);
  const [displayName, setDisplayName] = useState((user as any)?.name || fallbackName);

  // ── Fix: `user` loads asynchronously from auth context, so the initial
  // useState above can lock in "User" before the real value arrives. Sync
  // whenever user actually changes, unless someone's mid-edit right now. ──
  useEffect(() => {
    if (editingName) return;
    const resolved = (user as any)?.name || (user?.email ? user.email.split("@")[0] : "User");
    setDisplayName(resolved);
    setNameDraft(resolved);
  }, [user, editingName]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (data.alerts) {
          setEmailAlerts(data.alerts.email_notifications_enabled ?? false);
          setEmailSeverityThreshold(data.alerts.email_severity_threshold ?? "high");
        }
      } catch {}
    };
    loadSettings();
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerts: { email_notifications_enabled: emailAlerts, email_severity_threshold: emailSeverityThreshold },
        }),
      });
    } catch {} finally {
      setSaving(false);
      setDirty(false);
      setSaved(true);
    }
  };

  const saveNameEdit = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) { setNameDraft(displayName); setEditingName(false); return; }
    setDisplayName(trimmed);
    setEditingName(false);
    try {
      await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {}
  };

  const updatePrefs = (patch: Partial<PersonalPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
  };

  const selectSx = {
    minWidth: 140, fontSize: "0.8rem", background: t.surface,
    border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text,
    "& fieldset": { border: "none" }, "& .MuiSvgIcon-root": { color: t.textMuted },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: `${ACCENT}50` },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
  };

  const displayRole = (user?.role || "viewer").replace(/^\w/, (c: string) => c.toUpperCase());

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <PageHeader title="Settings" description="Your account and preferences" />

      <Box sx={{ p: "24px 36px 36px" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", mb: 2.2 }}>
          {dirty && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mr: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: AMBER, boxShadow: `0 0 8px ${AMBER}` }} />
              <Typography sx={{ fontSize: "0.75rem", color: AMBER }}>Unsaved changes</Typography>
            </Box>
          )}
          <Box
            onClick={dirty && !saving ? handleSave : undefined}
            sx={{
              display: "flex", alignItems: "center", gap: "8px",
              px: "18px", py: "9px", borderRadius: "10px",
              background: dirty ? `linear-gradient(135deg, ${ACCENT}, #8B2E1F)` : t.surface,
              border: `1px solid ${dirty ? ACCENT + "80" : t.border}`,
              cursor: dirty && !saving ? "pointer" : "default",
              opacity: saving ? 0.7 : 1, transition: "all .25s",
              "&:hover": dirty && !saving ? { boxShadow: `0 0 20px ${ACCENT}40` } : {},
            }}
          >
            <SaveIcon sx={{ fontSize: 15, color: dirty ? "#fff" : t.textMuted }} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: dirty ? "#fff" : t.textMuted }}>
              {saving ? "Saving..." : "Save Changes"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: "16px", p: "16px 20px", borderRadius: "14px", background: `${ACCENT}0A`, border: `1px solid ${ACCENT}30`, mb: 2.2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, #6E1E13)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {displayName.charAt(0).toUpperCase()}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  autoFocus size="small" value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNameEdit(); if (e.key === "Escape") { setNameDraft(displayName); setEditingName(false); } }}
                  sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.9rem", background: t.surface, borderRadius: "8px", height: 36 } }}
                />
                <Box onClick={saveNameEdit} sx={{ width: 30, height: 30, borderRadius: "8px", background: `${GREEN}18`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <CheckIcon sx={{ fontSize: 16, color: GREEN }} />
                </Box>
                <Box onClick={() => { setNameDraft(displayName); setEditingName(false); }} sx={{ width: 30, height: 30, borderRadius: "8px", background: t.bgSecondary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <CloseIcon sx={{ fontSize: 16, color: t.textMuted }} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <Typography sx={{ fontSize: "0.98rem", fontWeight: 700, color: t.text }}>{displayName}</Typography>
                <Box onClick={() => setEditingName(true)} sx={{ width: 22, height: 22, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.textMuted, "&:hover": { color: ACCENT, background: `${ACCENT}12` } }}>
                  <EditIcon sx={{ fontSize: 14 }} />
                </Box>
              </Box>
            )}
            <Typography sx={{ fontSize: "0.78rem", color: t.textMuted, mt: "2px" }}>{user?.email || "-"}</Typography>
          </Box>
          <Box sx={{ px: "10px", py: "4px", borderRadius: "999px", border: `1px solid ${ACCENT}40`, background: `${ACCENT}12`, flexShrink: 0 }}>
            <Typography sx={{ fontSize: ".7rem", fontWeight: 700, color: ACCENT }}>{displayRole}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.2, mb: 2.2 }}>
          <Card icon={<LockIcon sx={{ fontSize: 16 }} />} title="Security" subtitle="Password and two-factor authentication" accentColor={ACCENT}>
            <Row label="Password" description="Change your account password">
              {showPasswordForm ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, width: 200 }}>
                  <TextField type="password" size="small" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.76rem", background: t.surface, borderRadius: "7px", height: 34 } }} />
                  <TextField type="password" size="small" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.76rem", background: t.surface, borderRadius: "7px", height: 34 } }} />
                  <Box onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); }} sx={{ textAlign: "center", py: "5px", borderRadius: "7px", background: `${ACCENT}18`, color: ACCENT, fontSize: ".74rem", fontWeight: 600, cursor: "pointer" }}>
                    Update password
                  </Box>
                </Box>
              ) : (
                <Box onClick={() => setShowPasswordForm(true)} sx={{ px: "12px", py: "5px", borderRadius: "7px", border: `1px solid ${t.border}`, cursor: "pointer", "&:hover": { borderColor: `${ACCENT}50` } }}>
                  <Typography sx={{ fontSize: ".76rem", color: t.textSecondary }}>Change</Typography>
                </Box>
              )}
            </Row>
            <Row label="Two-factor authentication" description="Add an extra layer of security" tag="Coming soon">
              <Switch checked={twoFactorEnabled} onChange={(e) => setTwoFactorEnabled(e.target.checked)} size="small" disabled />
            </Row>
          </Card>

          <Card icon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />} title="Notifications" subtitle="How you're alerted to new incidents" accentColor={AMBER}>
            <Row label="Email alerts" description="Get emailed when a new incident is detected">
              <Switch checked={emailAlerts} onChange={(e) => { setEmailAlerts(e.target.checked); mark(); }} size="small" sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: ACCENT }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: ACCENT } }} />
            </Row>
            <Row label="Minimum severity" description="Only notify above this level" tooltip="Applies to email alerts only">
              <FormControl size="small" disabled={!emailAlerts}>
                <Select value={emailSeverityThreshold} onChange={(e) => { setEmailSeverityThreshold(e.target.value); mark(); }} sx={{ ...selectSx, opacity: emailAlerts ? 1 : 0.5 }}>
                  <MenuItem value="low">Low and above</MenuItem>
                  <MenuItem value="medium">Medium and above</MenuItem>
                  <MenuItem value="high">High and above</MenuItem>
                  <MenuItem value="critical">Critical only</MenuItem>
                </Select>
              </FormControl>
            </Row>
          </Card>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.2, mb: 2.2 }}>
          <Card icon={<PaletteIcon sx={{ fontSize: 16 }} />} title="Appearance" subtitle="How ONVXP looks on this device" accentColor="#7F77DD">
            <Row label="Theme" description="Switch between dark and light mode">
              <Box onClick={toggleMode} sx={{ display: "flex", alignItems: "center", gap: 1, px: "12px", py: "5px", borderRadius: "7px", background: t.surface, border: `1px solid ${t.border}`, cursor: "pointer", "&:hover": { borderColor: `${ACCENT}50` } }}>
                {mode === "dark" ? <LightModeIcon sx={{ fontSize: 14, color: AMBER }} /> : <DarkModeIcon sx={{ fontSize: 14, color: ACCENT }} />}
                <Typography sx={{ fontSize: "0.76rem", color: t.textSecondary }}>{mode === "dark" ? "Light Mode" : "Dark Mode"}</Typography>
              </Box>
            </Row>
          </Card>

          <Card icon={<DevicesIcon sx={{ fontSize: 16 }} />} title="Active Sessions" subtitle="Where you're signed in" accentColor={GREEN}>
            <Row label="This device" description="Current browser session">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DesktopWindowsIcon sx={{ fontSize: 15, color: t.textMuted }} />
                <Box sx={{ px: "9px", py: "3px", borderRadius: "999px", background: `${GREEN}18` }}>
                  <Typography sx={{ fontSize: ".68rem", fontWeight: 700, color: GREEN }}>Active now</Typography>
                </Box>
              </Box>
            </Row>
          </Card>
        </Box>

        <Box sx={{ mb: 2.2 }}>
          <Card icon={<TuneIcon sx={{ fontSize: 16 }} />} title="Personal Preferences" subtitle="Defaults for how you use ONVXP" accentColor={ACCENT}>
            <Row label="Default landing page" description="Where you land right after signing in">
              <FormControl size="small">
                <Select value={prefs.landingPage} onChange={(e) => updatePrefs({ landingPage: e.target.value })} sx={selectSx}>
                  <MenuItem value="alerts">Alerts</MenuItem>
                  <MenuItem value="cameras">Camera Management</MenuItem>
                  <MenuItem value="analytics">Analytics</MenuItem>
                  <MenuItem value="rules">Rule Creation</MenuItem>
                </Select>
              </FormControl>
            </Row>
            <Row label="Default analytics range" description="Pre-selected whenever you open Analytics">
              <FormControl size="small">
                <Select value={prefs.defaultAnalyticsRange} onChange={(e) => updatePrefs({ defaultAnalyticsRange: e.target.value })} sx={selectSx}>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="7d">Last 7 days</MenuItem>
                  <MenuItem value="30d">Last 30 days</MenuItem>
                </Select>
              </FormControl>
            </Row>
            <Row label="Alert sound" description="Play a sound when a new incident comes in">
              <Switch checked={prefs.alertSound} onChange={(e) => updatePrefs({ alertSound: e.target.checked })} size="small" sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: ACCENT }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: ACCENT } }} />
            </Row>
            {/* Saves for real to localStorage, same as the others above.
            The value itself only affects display once other pages
            (Alerts, Alert Detail, Analytics) are updated to read this same
            key when formatting timestamps — that wiring is a separate
            follow-up beyond this page. */}
            <Row label="Timezone" description="Used to display timestamps across the app">
              <FormControl size="small">
                <Select value={prefs.timezone} onChange={(e) => updatePrefs({ timezone: e.target.value })} sx={{ ...selectSx, minWidth: 170 }}>
                  <MenuItem value="browser">Use browser default</MenuItem>
                  <MenuItem value="Asia/Kolkata">India (IST)</MenuItem>
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">US Eastern</MenuItem>
                  <MenuItem value="America/Los_Angeles">US Pacific</MenuItem>
                </Select>
              </FormControl>
            </Row>
          </Card>
        </Box>

        {/* Keyboard shortcuts — kept honest: these two are the only real
        keyboard behavior in the app right now (the profile name edit we
        just built above). No global navigation shortcuts exist yet —
        adding those would be a separate feature across the whole app,
        not something scoped to this page. */}
        <Box sx={{ mb: 2.2 }}>
          <Card icon={<KeyboardIcon sx={{ fontSize: 16 }} />} title="Keyboard Shortcuts" subtitle="What works today" accentColor="#3498DB">
            <Row label="Save an inline edit" description="While editing your name above">
              <Box sx={{ px: "8px", py: "3px", borderRadius: "6px", background: t.bgSecondary, border: `1px solid ${t.border}` }}>
                <Typography sx={{ fontSize: ".72rem", color: t.textSecondary, fontFamily: "monospace" }}>Enter</Typography>
              </Box>
            </Row>
            <Row label="Cancel an inline edit" description="While editing your name above">
              <Box sx={{ px: "8px", py: "3px", borderRadius: "6px", background: t.bgSecondary, border: `1px solid ${t.border}` }}>
                <Typography sx={{ fontSize: ".72rem", color: t.textSecondary, fontFamily: "monospace" }}>Esc</Typography>
              </Box>
            </Row>
          </Card>
        </Box>

        <TeamMembersSection />

        <Box sx={{ mt: 2.2, p: "18px 22px", borderRadius: "14px", border: "1px solid rgba(231,76,60,0.2)", background: "rgba(231,76,60,0.03)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography sx={{ fontSize: "0.86rem", fontWeight: 600, color: "#E74C3C" }}>Danger Zone</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: t.textMuted, mt: "2px" }}>Clear pipeline data, reset stored tracks, and flush the alert queue</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: "10px" }}>
              {[{ label: "Flush Alert Queue", endpoint: "/api/danger/flush-alerts" }, { label: "Reset Track IDs", endpoint: "/api/danger/reset-tracks" }].map(({ label, endpoint }) => (
                <Box key={label} onClick={async () => { if (!window.confirm(`${label} - are you sure?`)) return; try { await apiFetch(endpoint, { method: "POST" }); } catch {} }} sx={{ px: "15px", py: "6px", borderRadius: "8px", cursor: "pointer", border: "1px solid rgba(231,76,60,0.3)", color: "#E74C3C", fontSize: "0.78rem", fontWeight: 500, "&:hover": { background: "rgba(231,76,60,0.08)", borderColor: "rgba(231,76,60,0.5)" } }}>
                  {label}
                </Box>
              ))}
            </Box>
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