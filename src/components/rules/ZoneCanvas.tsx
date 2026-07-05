import { useState } from "react";
import { Box, Typography, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { API_BASE } from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";
import { CYAN, GREEN } from "../../lib/constants";
import { createZone, type ZoneLite } from "../../api/zones";

// All zone polygons live in 854x480 "snapshot space" — the same coordinate
// system the backend scales to video resolution at detection time.
const VIEW_W = 854;
const VIEW_H = 480;
const CLOSE_RADIUS = 16; // px in view space: clicking this close to the first point closes the polygon

export default function ZoneCanvas({
  cameraId,
  zones,
  selectedZoneId,
  onSelectZone,
  onZoneCreated,
}: {
  cameraId: number;
  zones: ZoneLite[];
  selectedZoneId: number | null;
  onSelectZone: (zone: ZoneLite | null) => void;
  onZoneCreated: (zone: ZoneLite) => void;
}) {
  const { t } = useTheme();
  const [snapTs] = useState(() => Date.now()); // fresh frame per mount
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<number[][]>([]);
  const [naming, setNaming] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toViewPoint = (e: React.MouseEvent<SVGSVGElement>): number[] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(((e.clientX - rect.left) / rect.width) * VIEW_W),
      Math.round(((e.clientY - rect.top) / rect.height) * VIEW_H),
    ];
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing || naming) return;
    const [x, y] = toViewPoint(e);
    if (points.length >= 3) {
      const [fx, fy] = points[0];
      if (Math.hypot(x - fx, y - fy) <= CLOSE_RADIUS) {
        setNaming(true);
        return;
      }
    }
    setPoints((prev) => [...prev, [x, y]]);
  };

  const startDrawing = () => {
    onSelectZone(null);
    setDrawing(true);
    setPoints([]);
    setNaming(false);
    setZoneName("");
    setErr(null);
  };

  const cancelDrawing = () => {
    setDrawing(false);
    setPoints([]);
    setNaming(false);
    setZoneName("");
    setErr(null);
  };

  const saveZone = async () => {
    const name = zoneName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { setErr("Give the zone a name"); return; }
    if (points.length < 3) { setErr("A zone needs at least 3 points"); return; }
    setSaving(true);
    setErr(null);
    try {
      const zone = await createZone({ name, polygon: points, camera_id: cameraId });
      onZoneCreated(zone);
      onSelectZone(zone);
      cancelDrawing();
    } catch (e: any) {
      setErr(e?.message || "Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Live view + zone overlay */}
      <Box sx={{ position: "relative", background: "#000", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", border: `1px solid ${t.border}` }}>
        {/* Latest frame, frozen for stable drawing (cache-busted per mount) */}
        <img
          src={`${API_BASE}/api/video/snapshot?camera_id=${cameraId}&t=${snapTs}`}
          alt="Camera frame"
          style={{ width: "100%", height: "100%", objectFit: "fill", position: "absolute", inset: 0 }}
        />
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          onClick={handleSvgClick}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: drawing && !naming ? "crosshair" : "default" }}
        >
          {/* Existing zones */}
          {zones.map((zone) => zone.polygon?.length >= 3 && (
            <g key={zone.id}>
              <polygon
                points={zone.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={(zone.color || CYAN) + (zone.id === selectedZoneId ? "55" : "22")}
                stroke={zone.color || CYAN}
                strokeWidth={zone.id === selectedZoneId ? 3.5 : 2}
                style={{ pointerEvents: drawing ? "none" : "auto", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectZone(zone.id === selectedZoneId ? null : zone);
                }}
              />
              <text
                x={zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length}
                y={zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length}
                fill="#fff" fontSize="15" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
                style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }}
              >
                {zone.name.replace(/_/g, " ")}
              </text>
            </g>
          ))}

          {/* In-progress polygon */}
          {drawing && points.length > 0 && (
            <g>
              <polyline
                points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={CYAN + "18"} stroke={CYAN} strokeWidth={2} strokeDasharray="6 4"
                style={{ pointerEvents: "none" }}
              />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i === 0 && points.length >= 3 ? 9 : 5}
                  fill={i === 0 && points.length >= 3 ? GREEN : CYAN}
                  stroke="#fff" strokeWidth={1.5} style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}
        </svg>

        {/* Drawing hint */}
        {drawing && !naming && (
          <Box sx={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", px: 2, py: 0.6, borderRadius: "8px", background: "rgba(0,0,0,0.75)", border: `1px solid ${CYAN}50`, pointerEvents: "none" }}>
            <Typography sx={{ color: "#fff", fontSize: ".72rem", fontWeight: 600 }}>
              {points.length < 3 ? `Click to add points (${points.length}/3 minimum)` : "Click the green point to close the shape"}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", minHeight: 40 }}>
        {!drawing ? (
          <>
            <Box onClick={startDrawing} sx={{ display: "flex", alignItems: "center", gap: 0.7, px: 1.8, py: 0.7, borderRadius: "9px", background: `${CYAN}12`, border: `1px solid ${CYAN}35`, cursor: "pointer", "&:hover": { background: `${CYAN}22` } }}>
              <AddIcon sx={{ fontSize: 16, color: CYAN }} />
              <Typography sx={{ color: CYAN, fontSize: ".78rem", fontWeight: 700 }}>Draw new zone</Typography>
            </Box>
            <Typography sx={{ color: t.textMuted, fontSize: ".74rem" }}>
              {zones.length > 0 ? "or click a zone on the video to select it" : "no zones on this camera yet"}
            </Typography>
          </>
        ) : naming ? (
          <>
            <TextField
              autoFocus size="small" placeholder="Zone name (e.g. loading zone)" value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveZone(); }}
              sx={{ minWidth: 240, "& .MuiOutlinedInput-root": { height: 36, fontSize: ".82rem", color: t.text, background: t.surface, borderRadius: "9px", "& fieldset": { borderColor: t.border } } }}
            />
            <Box onClick={saving ? undefined : saveZone} sx={{ px: 1.8, py: 0.7, borderRadius: "9px", background: `${GREEN}18`, border: `1px solid ${GREEN}45`, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, "&:hover": { background: `${GREEN}28` } }}>
              <Typography sx={{ color: GREEN, fontSize: ".78rem", fontWeight: 700 }}>{saving ? "Saving..." : "Save zone"}</Typography>
            </Box>
            <Box onClick={cancelDrawing} sx={{ px: 1.5, py: 0.7, borderRadius: "9px", border: `1px solid ${t.border}`, cursor: "pointer", "&:hover": { background: t.surfaceHover } }}>
              <Typography sx={{ color: t.textSecondary, fontSize: ".78rem", fontWeight: 600 }}>Cancel</Typography>
            </Box>
          </>
        ) : (
          <>
            <Typography sx={{ color: t.textSecondary, fontSize: ".78rem" }}>
              Click on the video to outline the zone
            </Typography>
            <Box onClick={cancelDrawing} sx={{ px: 1.5, py: 0.7, borderRadius: "9px", border: `1px solid ${t.border}`, cursor: "pointer", "&:hover": { background: t.surfaceHover } }}>
              <Typography sx={{ color: t.textSecondary, fontSize: ".78rem", fontWeight: 600 }}>Cancel drawing</Typography>
            </Box>
          </>
        )}
        {err && <Typography sx={{ color: "#fca5a5", fontSize: ".74rem" }}>{err}</Typography>}
      </Box>
    </Box>
  );
}
