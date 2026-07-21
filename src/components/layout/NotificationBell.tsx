import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Badge, IconButton, Popover, Typography, Divider, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications, NotificationIncident } from "../../hooks/useNotifications";
import { ACCENT } from "../../lib/constants";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#E74C3C",
  high: ACCENT,
  medium: "#D4891A",
  low: "#00C853",
};

function severityColor(severity: string): string {
  return SEVERITY_COLORS[severity?.toLowerCase()] || ACCENT;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { t } = useTheme();
  const navigate = useNavigate();
  const { incidents, unreadCount, muted, toggleMuted, markAllRead, markOneRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    markAllRead();
  };

  const handleItemClick = (incident: NotificationIncident) => {
    markOneRead(incident.id);
    setAnchorEl(null);
    navigate(`/alert/${incident.id}`);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} size="small" sx={{ color: t.textMuted, "&:hover": { color: t.text } }}>
          <Badge
            badgeContent={unreadCount}
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                background: "#E74C3C",
                color: "#fff",
                fontSize: ".65rem",
                fontWeight: 700,
                minWidth: 16,
                height: 16,
              },
            }}
          >
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              background: t.bgSecondary,
              border: `1px solid ${t.border}`,
              borderRadius: "14px",
              mt: 1,
              overflow: "hidden",
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: ".85rem", fontWeight: 700, color: t.text }}>Notifications</Typography>
          <Tooltip title={muted ? "Unmute alert sound" : "Mute alert sound"}>
            <IconButton size="small" onClick={toggleMuted} sx={{ color: t.textMuted }}>
              {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ borderColor: t.border }} />

        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {incidents.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <NotificationsOffIcon sx={{ fontSize: 28, color: t.textMuted, mb: 1 }} />
              <Typography sx={{ fontSize: ".8rem", color: t.textMuted }}>No violations yet</Typography>
            </Box>
          )}
          {incidents.map((inc) => (
            <Box
              key={inc.id}
              onClick={() => handleItemClick(inc)}
              sx={{
                display: "flex",
                gap: 1.2,
                px: 2,
                py: 1.2,
                cursor: "pointer",
                borderBottom: `1px solid ${t.border}`,
                transition: "background .15s",
                "&:hover": { background: t.surfaceHover },
              }}
            >
              {inc.screenshot_url ? (
                <Box
                  component="img"
                  src={inc.screenshot_url}
                  alt=""
                  sx={{ width: 48, height: 36, borderRadius: "6px", objectFit: "cover", flexShrink: 0, background: t.surface }}
                />
              ) : (
                <Box sx={{ width: 48, height: 36, borderRadius: "6px", background: t.surface, flexShrink: 0 }} />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 0.3 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: severityColor(inc.severity), flexShrink: 0 }} />
                  <Typography sx={{ fontSize: ".78rem", fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(inc.violation || "violation").replace(/_/g, " ")}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: ".7rem", color: t.textMuted }}>
                  Camera {inc.camera_id ?? "—"} · {timeAgo(inc.timestamp)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}