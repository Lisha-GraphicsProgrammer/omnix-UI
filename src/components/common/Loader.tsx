import { LinearProgress } from "@mui/material";
import { useTheme } from "../../context/ThemeContext";

// ── Shared loading indicator — the exact pattern from AnalyticsPage,
// now reusable everywhere instead of every page inlining its own copy.
// A thin gradient bar from the accent color into gold. ──
export default function Loader({ sx }: { sx?: object }) {
  const { t } = useTheme();
  return (
    <LinearProgress
      sx={{
        borderRadius: 2,
        height: 2,
        background: `${t.accent}15`,
        "& .MuiLinearProgress-bar": {
          background: `linear-gradient(90deg, ${t.accent}, ${t.gold})`,
        },
        ...sx,
      }}
    />
  );
}
