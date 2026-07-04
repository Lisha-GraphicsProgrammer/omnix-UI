import { useState, useEffect } from "react";
import { Box, Typography, Chip, TextField } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { CYAN, PURPLE, GREEN } from "../../lib/constants";
import type { TeamMember } from "../../types";

export default function TeamMembersSection() {
  const { t } = useTheme();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const isAdmin = user?.role === "admin";

  const fetchMembers = async () => {
    try {
      const res = await apiFetch("/api/users");
      if (res.ok) setMembers(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteMsg(null);
    try {
      const res = await apiFetch("/api/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() }) });
      if (res.ok) {
        setInviteMsg({ type: "success", text: `Invite sent to ${inviteEmail}. Default password: changeme123` });
        setInviteEmail(""); setInviteName(""); fetchMembers();
      } else {
        const data = await res.json().catch(() => ({}));
        setInviteMsg({ type: "error", text: data.detail || "Failed to invite user" });
      }
    } catch { setInviteMsg({ type: "error", text: "Could not reach server" }); }
    setInviting(false);
  };

  return (
    <Box sx={{ mt: 3, mb: 3, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
      <Box sx={{ px: 3, py: "18px", background: `linear-gradient(135deg, ${PURPLE}12 0%, transparent 60%)`, borderBottom: `1px solid ${PURPLE}20`, display: "flex", alignItems: "center", gap: "14px" }}>
        <Box sx={{ width: 38, height: 38, borderRadius: "10px", background: `${PURPLE}20`, border: `1px solid ${PURPLE}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <GroupIcon sx={{ color: PURPLE, fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: t.text }}>Team Members</Typography>
          <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "1px" }}>Users with access to this site</Typography>
        </Box>
        <Chip label={`${members.length} members`} size="small" sx={{ height: 22, fontSize: "0.65rem", fontWeight: 600, background: `${PURPLE}18`, color: PURPLE, border: `1px solid ${PURPLE}30`, borderRadius: "6px" }} />
      </Box>
      <Box sx={{ px: 3, py: 2 }}>
        {loading ? (
          <Typography sx={{ color: t.textMuted, fontSize: ".82rem", py: 2 }}>Loading team...</Typography>
        ) : members.length === 0 ? (
          <Typography sx={{ color: t.textMuted, fontSize: ".82rem", py: 2 }}>No team members found.</Typography>
        ) : (
          <Box sx={{ mb: 3 }}>
            {members.map((m) => (
              <Box key={m.id} sx={{ display: "flex", alignItems: "center", gap: 2, py: "12px", borderBottom: `1px solid ${t.border}`, "&:last-child": { borderBottom: "none" } }}>
                <Box sx={{ width: 36, height: 36, borderRadius: "50%", background: m.role === "admin" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : `linear-gradient(135deg, ${CYAN}80, ${CYAN})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Typography sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 700 }}>{(m.name || m.email).charAt(0).toUpperCase()}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: t.text, fontSize: ".85rem", fontWeight: 600 }}>{m.name || m.email}</Typography>
                  <Typography sx={{ color: t.textMuted, fontSize: ".72rem" }}>{m.email}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {m.role === "admin" ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.2, py: 0.4, borderRadius: "6px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
                      <AdminPanelSettingsIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                      <Typography sx={{ color: "#818cf8", fontSize: ".68rem", fontWeight: 700 }}>Admin</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.2, py: 0.4, borderRadius: "6px", background: `${CYAN}10`, border: `1px solid ${CYAN}25` }}>
                      <PersonIcon sx={{ fontSize: 13, color: CYAN }} />
                      <Typography sx={{ color: CYAN, fontSize: ".68rem", fontWeight: 700 }}>Viewer</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {isAdmin && (
          <Box sx={{ pt: 2, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ color: t.text, fontSize: ".85rem", fontWeight: 600, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <PersonAddIcon sx={{ fontSize: 16, color: PURPLE }} /> Invite a viewer
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <TextField placeholder="Name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} size="small" sx={{ flex: 1, minWidth: 140, "& .MuiOutlinedInput-root": { fontSize: "0.82rem", background: t.surface, borderRadius: "8px", color: t.text, "& fieldset": { borderColor: t.border }, "&:hover fieldset": { borderColor: t.borderStrong }, "&.Mui-focused fieldset": { borderColor: PURPLE } } }} />
              <TextField placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} size="small" sx={{ flex: 2, minWidth: 200, "& .MuiOutlinedInput-root": { fontSize: "0.82rem", background: t.surface, borderRadius: "8px", color: t.text, "& fieldset": { borderColor: t.border }, "&:hover fieldset": { borderColor: t.borderStrong }, "&.Mui-focused fieldset": { borderColor: PURPLE } } }} />
              <Box onClick={!inviting ? handleInvite : undefined} sx={{ display: "flex", alignItems: "center", gap: 1, px: "16px", py: "8px", borderRadius: "8px", background: inviting ? t.surface : `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, border: `1px solid ${PURPLE}60`, cursor: inviting ? "default" : "pointer", opacity: inviting ? 0.6 : 1, transition: "all .2s", "&:hover": !inviting ? { boxShadow: `0 0 16px ${PURPLE}40` } : {} }}>
                <PersonAddIcon sx={{ fontSize: 15, color: "#fff" }} />
                <Typography sx={{ color: "#fff", fontSize: ".82rem", fontWeight: 600 }}>{inviting ? "Inviting..." : "Send Invite"}</Typography>
              </Box>
            </Box>
            {inviteMsg && (
              <Box sx={{ mt: 1.5, px: 2, py: 1, borderRadius: "8px", background: inviteMsg.type === "success" ? `${GREEN}10` : "rgba(239,68,68,0.08)", border: `1px solid ${inviteMsg.type === "success" ? GREEN + "30" : "rgba(239,68,68,0.2)"}` }}>
                <Typography sx={{ color: inviteMsg.type === "success" ? GREEN : "#fca5a5", fontSize: ".78rem" }}>{inviteMsg.text}</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

