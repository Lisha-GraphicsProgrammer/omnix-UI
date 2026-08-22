// src/components/layout/Sidebar.tsx
import { Box, Typography, Tooltip, IconButton } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RuleIcon from "@mui/icons-material/Rule";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { useTheme } from "../../context/ThemeContext";
import { DRAWER_OPEN, ACCENT } from "../../lib/constants";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";

export default function Sidebar({
  selected,
  onSelect,
  open,
  onToggle,
  onSignOut,
  userName,
  userEmail,
}: {
  selected: string;
  onSelect: (s: string) => void;
  open: boolean;
  onToggle: () => void;
  onSignOut: () => void;
  userName: string;
  userEmail: string;
}) {
  const { t, mode } = useTheme();
  const sidebarHover =
    mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const sidebarCardBg =
    mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const menuItems = [
    { text: "Cameras", icon: <CameraAltIcon sx={{ fontSize: 18 }} /> },
    { text: "Rules", icon: <RuleIcon sx={{ fontSize: 18 }} /> },
    {
      text: "Self-Learning",
      icon: <ModelTrainingIcon sx={{ fontSize: 18 }} />,
    },
    { text: "Alert Dashboard", icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
    { text: "Analytics", icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
    { text: "Settings", icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box
      sx={{
        width: open ? DRAWER_OPEN : 56,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: t.sidebarBg,
        borderRight: `1px solid ${t.sidebarBorder}`,
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        transition: "width .25s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: open ? 3 : 1.5,
          py: 3,
          borderBottom: `1px solid ${t.sidebarBorder}`,
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
            background: `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 16px ${ACCENT}50`,
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
            <circle cx="13.5" cy="10.5" r="1.4" fill={ACCENT} />
          </svg>
        </Box>
        {open && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                color: t.sidebarText,
                fontWeight: 700,
                fontSize: ".95rem",
                letterSpacing: "-.2px",
                lineHeight: 1,
              }}
            >
              ONVXP
            </Typography>
            <Typography
              sx={{
                color: t.sidebarTextMuted,
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
          onClick={onToggle}
          sx={{
            color: t.sidebarTextMuted,
            ml: open ? 0 : "-4px",
            "&:hover": { color: t.sidebarText },
          }}
        >
          {open ? (
            <ChevronLeftIcon fontSize="small" />
          ) : (
            <MenuIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      {/* Nav items */}
      <Box sx={{ flex: 1, py: 2, overflowX: "hidden" }}>
        {open && (
          <Typography
            sx={{
              color: t.sidebarTextMuted,
              fontSize: ".6rem",
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              px: 3,
              mb: 1,
              opacity: 0.8,
            }}
          >
            Navigation
          </Typography>
        )}
        {menuItems.map((item) => {
          const isSel = selected === item.text;
          return (
            <Tooltip
              key={item.text}
              title={!open ? item.text : ""}
              placement="right"
            >
              <Box
                onClick={() => onSelect(item.text)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: open ? 3 : 1.5,
                  py: 1.4,
                  mx: 1,
                  mb: 0.5,
                  borderRadius: "10px",
                  cursor: "pointer",
                  position: "relative",
                  background: isSel ? `${ACCENT}30` : "transparent",
                  border: isSel
                    ? `1px solid ${ACCENT}55`
                    : "1px solid transparent",
                  transition: "all .2s",
                  "&:hover": {
                    background: isSel ? `${ACCENT}30` : sidebarHover,
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
                      background: ACCENT,
                      boxShadow: `0 0 8px ${ACCENT}`,
                    }}
                  />
                )}
                <Box
                  sx={{
                    color: isSel ? ACCENT : t.sidebarTextMuted,
                    display: "flex",
                    transition: "color .2s",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                {open && (
                  <Typography
                    sx={{
                      color: isSel ? t.sidebarText : t.sidebarTextMuted,
                      fontSize: ".85rem",
                      fontWeight: isSel ? 600 : 400,
                      transition: "all .2s",
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

      {/* User section */}
      <Box sx={{ p: open ? 2 : 1, borderTop: `1px solid ${t.sidebarBorder}` }}>
        {open ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: "10px 12px",
                borderRadius: "10px",
                background: sidebarCardBg,
                border: `1px solid ${t.sidebarBorder}`,
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ color: "#fff", fontSize: ".72rem", fontWeight: 700 }}
                >
                  {(userName || "A").charAt(0).toUpperCase()}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: t.sidebarText,
                    fontSize: ".78rem",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {userName || "Admin"}
                </Typography>
                <Typography
                  sx={{
                    color: t.sidebarTextMuted,
                    fontSize: ".65rem",
                    mt: 0.2,
                  }}
                  noWrap
                >
                  {userEmail || ""}
                </Typography>
              </Box>
            </Box>
            <Box
              onClick={onSignOut}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: "8px",
                cursor: "pointer",
                "&:hover": { background: sidebarHover },
                transition: "all .2s",
              }}
            >
              <LogoutIcon sx={{ color: t.sidebarTextMuted, fontSize: 15 }} />
              <Typography
                sx={{ color: t.sidebarTextMuted, fontSize: ".75rem" }}
              >
                Sign out
              </Typography>
            </Box>
          </>
        ) : (
          <Tooltip title="Sign out" placement="right">
            <Box
              onClick={onSignOut}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
                borderRadius: "8px",
                cursor: "pointer",
                "&:hover": { background: sidebarHover },
              }}
            >
              <LogoutIcon sx={{ color: t.sidebarTextMuted, fontSize: 18 }} />
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
