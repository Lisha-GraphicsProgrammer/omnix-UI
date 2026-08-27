// src/components/common/Dropdown.tsx
//
// Shared filter dropdown — same visual sizing as Self-Learning's original
// (height 42, 10px radius, .82rem label), generalized to accept custom
// options so it also covers Alerts' Rule/Camera/Review/Severity filters.
// One component, imported everywhere a filter dropdown is needed, so
// sizing can't quietly drift apart between pages again.
import { useState } from "react";
import { Box, Typography, ClickAwayListener } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "../../context/ThemeContext";
import { ACCENT } from "../../lib/constants";

export interface DropdownOption {
  value: string;
  label: React.ReactNode;
}

export function FilterDropdown({
  value,
  options,
  placeholder = "Select…",
  onChange,
  minWidth = 160,
  flex,
  align = "left",
  closedLabel,
}: {
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (v: string) => void;
  minWidth?: number;
  flex?: number | string;
  align?: "left" | "right";
  closedLabel?: React.ReactNode;
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const closedContent = value ? (closedLabel ?? current?.label ?? placeholder) : placeholder;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative", flexShrink: flex ? 0 : undefined, flex, minWidth }}>
        <Box
          onClick={() => setOpen((o) => !o)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: "14px",
            height: 42,
            borderRadius: "10px",
            background: t.surface,
            border: `1px solid ${open ? ACCENT + "60" : t.border}`,
            cursor: "pointer",
            userSelect: "none",
            transition: "border-color .15s",
          }}
        >
          <Typography
            sx={{
              fontSize: ".82rem",
              color: value ? t.textSecondary : t.textMuted,
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {closedContent}
          </Typography>
          <ExpandMoreIcon
            sx={{
              fontSize: 17,
              color: t.textMuted,
              transition: "transform .15s",
              transform: open ? "rotate(180deg)" : "none",
              flexShrink: 0,
            }}
          />
        </Box>
        {open && (
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 6px)",
              [align]: 0,
              minWidth: Math.max(minWidth, 200),
              maxWidth: 420,
              maxHeight: 320,
              overflowY: "auto",
              borderRadius: "10px",
              background: t.bgSecondary,
              border: `1px solid ${t.border}`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              zIndex: 30,
            }}
          >
            {options.map((o) => (
              <Box
                key={o.value || "__any"}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                sx={{
                  px: "14px",
                  py: "10px",
                  cursor: "pointer",
                  background: o.value === value ? `${ACCENT}14` : "transparent",
                  transition: "background .12s",
                  "&:hover": {
                    background: o.value === value ? `${ACCENT}20` : t.surfaceHover || `${ACCENT}08`,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: ".8rem",
                    color: o.value === value ? ACCENT : t.textSecondary,
                    fontWeight: o.value === value ? 700 : 500,
                  }}
                >
                  {o.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
