// Shared design tokens and config used across ONVXP pages.

export const DRAWER_OPEN = 220;
export const DRAWER_CLOSED = 56;

// ── New Premium Warm Palette ──
export const CYAN = "#C0392B";       // Deep burgundy red (replaces cyan)
export const PURPLE = "#8B2E1F";     // Dark terracotta (replaces purple)
export const GREEN = "#27AE60";      // Keep green for success/active
export const AMBER = "#D4891A";      // Warm amber (slightly warmer)
export const CREAM = "#E8D5B0";      // Warm cream for highlights
export const RED = "#E74C3C";        // Bright red for critical alerts

// Sidebar/accent color
export const ACCENT = "#C0392B";     // Primary brand red
export const ACCENT_LIGHT = "#E8D5B0"; // Cream for text on red

// Zone colors updated to warm palette
export const ZONE_COLORS = [
  "#C0392B", "#27AE60", "#D4891A", "#8B2E1F",
  "#E74C3C", "#E8D5B0", "#A93226", "#C07A1F"
];

export const severityConfig = {
  critical: { color: "#E74C3C", bg: "rgba(192,57,43,0.12)", border: "rgba(192,57,43,0.30)" },
  high:     { color: "#D4891A", bg: "rgba(212,137,26,0.12)", border: "rgba(212,137,26,0.30)" },
  medium:   { color: "#E8D5B0", bg: "rgba(232,213,176,0.10)", border: "rgba(232,213,176,0.25)" },
};