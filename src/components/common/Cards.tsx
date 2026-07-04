import * as React from "react";
import { Box, Typography, Chip, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTheme } from "../../context/ThemeContext";
import { CYAN } from "../../lib/constants";

export function MetricTile({ icon, value, label, color, pulse = false }: { icon: React.ReactNode; value: string; label: string; color: string; pulse?: boolean }) {
  const { t } = useTheme();
  return (
    <Box sx={{ flex: 1, minWidth: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", p: "20px 24px", display: "flex", alignItems: "center", gap: 2, position: "relative", overflow: "hidden", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${color}, transparent)` } }}>
      <Box sx={{ width: 44, height: 44, borderRadius: "12px", background: `${color}18`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...(pulse && { animation: "omnix-pulse 2.4s ease-in-out infinite", "@keyframes omnix-pulse": { "0%, 100%": { boxShadow: `0 0 0 0 ${color}40` }, "50%": { boxShadow: "0 0 0 8px transparent" } } }) }}>
        <Box sx={{ color, display: "flex" }}>{icon}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: "1.35rem", fontWeight: 700, color, lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: t.textMuted, mt: "2px", letterSpacing: "0.04em" }}>{label}</Typography>
      </Box>
    </Box>
  );
}

export function SectionCard({ icon, title, subtitle, accentColor, children }: { icon: React.ReactNode; title: string; subtitle: string; accentColor: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 3, py: "18px", background: `linear-gradient(135deg, ${accentColor}12 0%, transparent 60%)`, borderBottom: `1px solid ${accentColor}20`, display: "flex", alignItems: "center", gap: "14px" }}>
        <Box sx={{ width: 38, height: 38, borderRadius: "10px", background: `${accentColor}20`, border: `1px solid ${accentColor}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Box sx={{ color: accentColor, display: "flex", fontSize: 18 }}>{icon}</Box>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: t.text }}>{title}</Typography>
          <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "1px" }}>{subtitle}</Typography>
        </Box>
      </Box>
      <Box sx={{ px: 3, py: 2 }}>{children}</Box>
    </Box>
  );
}

export function SettingRow({ label, description, tag, tagColor = CYAN, children, tooltip }: { label: string; description: string; tag?: string; tagColor?: string; children: React.ReactNode; tooltip?: string }) {
  const { t } = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: "14px", gap: 2, "&:not(:last-child)": { borderBottom: `1px solid ${t.border}` } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: t.text }}>{label}</Typography>
          {tooltip && <Tooltip title={tooltip} arrow placement="top"><InfoOutlinedIcon sx={{ fontSize: 14, color: t.textMuted, cursor: "help" }} /></Tooltip>}
        </Box>
        <Typography sx={{ fontSize: "0.73rem", color: t.textMuted, mt: "2px" }}>{description}</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {tag && <Chip label={tag} size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.04em", background: `${tagColor}18`, color: tagColor, border: `1px solid ${tagColor}30`, borderRadius: "5px" }} />}
        {children}
      </Box>
    </Box>
  );
}

export function ValuePill({ value, highlight = false }: { value: string; highlight?: boolean }) {
  const { t } = useTheme();
  return (
    <Box sx={{ px: "14px", py: "5px", borderRadius: "8px", background: highlight ? `${CYAN}15` : t.surface, border: `1px solid ${highlight ? CYAN + "35" : t.border}`, color: highlight ? CYAN : t.textSecondary, fontSize: "0.82rem", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', whiteSpace: "nowrap" }}>
      {value}
    </Box>
  );
}
