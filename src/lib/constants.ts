// Shared design tokens and config used across ONVXP pages.

export const DRAWER_OPEN = 220;
export const DRAWER_CLOSED = 56;

// ── Brand palette — locked navy + gold theme ──
// ACCENT is the single source of truth for the brand's primary color.
// It stays constant across light/dark mode for simple cases (charts,
// badges, static config) where a mode-aware variant isn't practical.
// For real interactive UI (buttons, links) that needs proper contrast
// in both modes, use t.accent from ThemeContext instead — it's lighter
// in dark mode, since this navy is too dark to read well on near-black.
export const ACCENT = "#173e76";
export const GOLD = "#F2B705";        // Punchy gold — light mode, sparing use only
export const GOLD_MUTED = "#D9A544";  // Muted gold — dark mode, sparing use only
export const GREEN = "#27AE60";       // Unchanged — success / active
export const AMBER = "#D4891A";       // Unchanged — warning / in-progress
export const RED = "#E74C3C";         // Unchanged — danger / critical

// ── Deprecated aliases — kept only so any file still importing these old
// names (from the previous burgundy/terracotta palette) automatically
// picks up the new palette instead of showing a stray leftover color. Any
// NEW code should use ACCENT / GOLD / GOLD_MUTED directly, not these. ──
export const CYAN = ACCENT;
export const PURPLE = ACCENT;
export const CREAM = GOLD_MUTED;
export const ACCENT_LIGHT = GOLD_MUTED;

// Zones no longer carry a color of their own (removed in the zone/camera
// restructure) — kept only in case something unseen still imports this.
export const ZONE_COLORS = [ACCENT, GREEN, AMBER, GOLD, RED, GOLD_MUTED];

export const severityConfig = {
  critical: { color: RED, bg: `${RED}1F`, border: `${RED}4D` },
  high: { color: AMBER, bg: `${AMBER}1F`, border: `${AMBER}4D` },
  medium: { color: GOLD_MUTED, bg: `${GOLD_MUTED}1A`, border: `${GOLD_MUTED}40` },
};
