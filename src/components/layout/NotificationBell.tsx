// src/components/layout/NotificationBell.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Badge, IconButton, Popover, Typography, Divider, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications, NotificationIncident } from "../../hooks/useNotifications";
import { ACCENT } from "../../lib/constants";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#E74C3C",
  high: ACCENT,
  medium: "#D4891A",
  low: "#00C853",
};

const READ_KEY = "omnix_notif_read";

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
  const { incidents, muted, toggleMuted, markAllRead, markOneRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  // ── Per-item read state, persisted, self-contained. A notification stays
  // "unread" (tinted) until ITS row is clicked or "mark all read" is used —
  // merely opening/closing the panel no longer clears everything. ──
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
    } catch {
      return new Set<string>();
    }
  });
  useEffect(() => {
    try {
      // keep the persisted set from growing forever: cap at the last 500 ids
      const arr = [...readIds].slice(-500);
      localStorage.setItem(READ_KEY, JSON.stringify(arr));
    } catch {}
  }, [readIds]);

  const isRead = (inc: NotificationIncident) => readIds.has(String(inc.id));
  const unread = incidents.filter((i) => !isRead(i));

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAll = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      incidents.forEach((i) => next.add(String(i.id)));
      return next;
    });
    markAllRead();
  };

  const handleItemClick = (incident: NotificationIncident) => {
    setReadIds((prev) => new Set(prev).add(String(incident.id)));
    markOneRead(incident.id);
    setAnchorEl(null);
    navigate(`/alert/${incident.id}`);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} size="small" sx={{ color: t.textMuted, "&:hover": { color: t.text } }}>
          <Badge
            badgeContent={unread.length}
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
              width: 420,
              maxHeight: "60vh",
              background: t.bgSecondary,
              border: `1px solid ${t.border}`,
              borderRadius: "14px",
              mt: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: ".85rem", fontWeight: 700, color: t.text }}>Notifications</Typography>
            {unread.length > 0 && (
              <Box sx={{ px: 1, py: 0.2, borderRadius: "10px", background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
                <Typography sx={{ fontSize: ".62rem", fontWeight: 700, color: ACCENT }}>{unread.length} new</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {unread.length > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={handleMarkAll} sx={{ color: t.textMuted }}>
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={muted ? "Unmute alert sound" : "Mute alert sound"}>
              <IconButton size="small" onClick={toggleMuted} sx={{ color: t.textMuted }}>
                {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Divider sx={{ borderColor: t.border }} />

        {/* ── Bigger list with the same thin scrollbar the data grid uses ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            scrollbarWidth: "thin",
            scrollbarColor: `${ACCENT}40 transparent`,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": { background: `${ACCENT}35`, borderRadius: "8px" },
            "&::-webkit-scrollbar-thumb:hover": { background: `${ACCENT}60` },
          }}
        >
          {incidents.length === 0 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <NotificationsOffIcon sx={{ fontSize: 28, color: t.textMuted, mb: 1 }} />
              <Typography sx={{ fontSize: ".8rem", color: t.textMuted }}>No violations yet</Typography>
            </Box>
          )}
          {incidents.map((inc) => {
            const read = isRead(inc);
            return (
              <Box
                key={inc.id}
                onClick={() => handleItemClick(inc)}
                sx={{
                  display: "flex",
                  gap: 1.2,
                  px: 2,
                  py: 1.3,
                  cursor: "pointer",
                  borderBottom: `1px solid ${t.border}`,
                  transition: "background .15s",
                  // ── Read/unread differentiation: unread rows carry a mild tint ──
                  background: read ? "transparent" : `${ACCENT}0A`,
                  "&:hover": { background: read ? t.surfaceHover : `${ACCENT}14` },
                }}
              >
                {inc.screenshot_url ? (
                  <Box
                    component="img"
                    src={inc.screenshot_url}
                    alt=""
                    sx={{ width: 56, height: 42, borderRadius: "6px", objectFit: "cover", flexShrink: 0, background: t.surface, opacity: read ? 0.75 : 1 }}
                  />
                ) : (
                  <Box sx={{ width: 56, height: 42, borderRadius: "6px", background: t.surface, flexShrink: 0 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 0.3 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: severityColor(inc.severity), flexShrink: 0 }} />
                    <Typography
                      sx={{
                        fontSize: ".78rem",
                        fontWeight: read ? 500 : 700,
                        color: read ? t.textSecondary : t.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {(inc.violation || "violation").replace(/_/g, " ")}
                    </Typography>
                    {!read && (
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT, flexShrink: 0, ml: "auto", boxShadow: `0 0 6px ${ACCENT}` }} />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: ".7rem", color: t.textMuted }}>
                    Camera {inc.camera_id ?? "—"} · {timeAgo(inc.timestamp)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
