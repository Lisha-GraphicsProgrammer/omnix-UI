// src/components/layout/PageHeader.tsx
//
// Shared page header used by every page (Dashboard sub-pages, Rules, and
// eventually detail pages). Renders title + description on the left, and
// an optional "add" action + the dark/light toggle + the notification bell
// on the right — the same three things every page needs, in the same place.
//
// Deliberately does NOT render its own bottom border. The visual line under
// it comes from Sidebar's single full-width divider (position: fixed, same
// 72px offset), so the line under the logo and the line under this header
// are literally the same line, not two separately-drawn ones that happen to
// look similar.
import { Box, Typography, Tooltip, IconButton } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "../../context/ThemeContext";
import { ACCENT } from "../../lib/constants";
import NotificationBell from "./NotificationBell";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

// Shared height every page's header uses, matching Sidebar's logo box
// (minHeight: 72) exactly — this is what makes the divider line land in
// the same place regardless of which page is showing.
export const PAGE_HEADER_HEIGHT = 72;

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: PageHeaderAction;
}) {
  const { t, mode, toggleMode } = useTheme();

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: PAGE_HEADER_HEIGHT,
        flexShrink: 0,
        px: 4,
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: t.topbarBg,
        backdropFilter: "blur(20px)",
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            color: t.text,
            fontSize: "1.15rem",
            fontWeight: 700,
            letterSpacing: "-.3px",
            lineHeight: 1.25,
          }}
          noWrap
        >
          {title}
        </Typography>
        {description && (
          <Typography
            sx={{ color: t.textMuted, fontSize: ".78rem", mt: "2px" }}
            noWrap
          >
            {description}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexShrink: 0 }}>
        {action && (
          <Box
            onClick={action.onClick}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              px: "14px",
              py: "8px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`,
              color: "#fff",
              fontSize: ".82rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: `0 4px 14px ${ACCENT}45`,
              transition: "transform .15s",
              "&:hover": { transform: "translateY(-1px)" },
            }}
          >
            {action.icon || <AddIcon sx={{ fontSize: 16 }} />}
            {action.label}
          </Box>
        )}
        <Tooltip
          title={mode === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
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
        <NotificationBell />
      </Box>
    </Box>
  );
}
