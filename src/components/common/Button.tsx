import { Box, Typography } from "@mui/material";
import { useTheme } from "../../context/ThemeContext";

type ButtonVariant = "primary" | "secondary" | "gold" | "danger";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  size?: "sm" | "md";
}

// ── Shared button — every button site-wide should use this instead of a
// hand-styled Box with an onClick. Four variants:
// - primary: solid navy fill, the default action on any given screen
// - secondary: outlined, for the less-emphasized action alongside primary
// - gold: sparing emphasis only — a highlighted/featured action, never
//   more than one per screen, matching the "gold used sparingly" rule
//   from the locked theme direction
// - danger: solid red fill, for destructive actions (delete, disable all)
export default function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  startIcon,
  size = "md",
}: ButtonProps) {
  const { t, mode } = useTheme();

  const palette: Record<ButtonVariant, { bg: string; bgHover: string; color: string; border?: string }> = {
    primary: { bg: t.accent, bgHover: t.accentHover, color: "#FFFFFF" },
    secondary: { bg: "transparent", bgHover: t.surfaceHover, color: t.accent, border: t.borderStrong },
    gold: { bg: t.gold, bgHover: t.gold, color: mode === "dark" ? "#1B1C33" : t.accent },
    danger: { bg: "#E74C3C", bgHover: "#E74C3C", color: "#FFFFFF" },
  };
  const p = palette[variant];

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: startIcon ? 1 : 0,
        width: fullWidth ? "100%" : "auto",
        borderRadius: "9px",
        px: size === "sm" ? 2 : 2.5,
        py: size === "sm" ? 0.9 : 1.1,
        background: disabled ? t.border : p.bg,
        border: p.border ? `1px solid ${disabled ? t.border : p.border}` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background .15s, opacity .15s",
        "&:hover": disabled ? {} : { background: p.bgHover, opacity: variant === "gold" ? 0.9 : 1 },
      }}
    >
      {startIcon}
      <Typography
        sx={{
          color: disabled ? t.textMuted : p.color,
          fontSize: size === "sm" ? ".82rem" : ".88rem",
          fontWeight: 600,
          textTransform: "none",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}
