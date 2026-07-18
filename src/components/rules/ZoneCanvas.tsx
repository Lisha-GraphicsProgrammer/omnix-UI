import { useEffect, useMemo, useState } from "react";
import { Box, Typography, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GestureIcon from "@mui/icons-material/Gesture";
import UndoIcon from "@mui/icons-material/Undo";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { API_BASE } from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";
import { CYAN, GREEN } from "../../lib/constants";
import { createZone, deleteZone, type ZoneLite } from "../../api/zones";

const VIEW_W = 854;
const VIEW_H = 480;
const CLOSE_RADIUS = 16;
const RED = "#f87171";

const norm = (s: string) =>
  s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();

export default function ZoneCanvas({
  cameraId,
  zones,
  selectedZoneId,
  onSelectZone,
  onZoneCreated,
  onZoneDeleted,
  ruleText = "",
}: {
  cameraId: number;
  zones: ZoneLite[];
  selectedZoneId: number | null;
  onSelectZone: (zone: ZoneLite | null) => void;
  onZoneCreated: (zone: ZoneLite) => void;
  onZoneDeleted: (zoneId: number) => void;
  ruleText?: string;
}) {
  const { t } = useTheme();
  const [snapTs] = useState(() => Date.now());
  const [drawing, setDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<"rect" | "poly">("rect");
  const [points, setPoints] = useState<number[][]>([]);
  const [mousePos, setMousePos] = useState<number[] | null>(null);
  const [naming, setNaming] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  // ── Prompt-driven visibility: only zones MENTIONED in the rule text render.
  // The selected zone always renders. "Show all" is the escape hatch. ──
  const mentionedZones = useMemo(() => {
    const text = norm(ruleText);
    if (!text) return [];
    return zones.filter((z) => text.includes(norm(z.name)));
  }, [ruleText, zones]);

  const visibleZones = useMemo(() => {
    if (drawing) return []; // clean canvas while drawing
    if (showAll) return zones;
    const map = new Map<number, ZoneLite>();
    mentionedZones.forEach((z) => map.set(z.id, z));
    if (selectedZone) map.set(selectedZone.id, selectedZone);
    return [...map.values()];
  }, [drawing, showAll, zones, mentionedZones, selectedZone]);

  const hiddenCount = zones.length - visibleZones.length;

  // ── Auto-preselect when the rule text mentions exactly one existing zone ──
  useEffect(() => {
    if (selectedZoneId != null) return;
    if (mentionedZones.length === 1) onSelectZone(mentionedZones[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionedZones.length, zones.length]);

  const toViewPoint = (e: React.MouseEvent<SVGSVGElement>): number[] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(((e.clientX - rect.left) / rect.width) * VIEW_W),
      Math.round(((e.clientY - rect.top) / rect.height) * VIEW_H),
    ];
  };

  const nearFirstPoint = (x: number, y: number) =>
    points.length >= 3 &&
    Math.hypot(x - points[0][0], y - points[0][1]) <= CLOSE_RADIUS;

  const closeShape = () => {
    if (points.length >= 3) setNaming(true);
  };

  const rectCorners = (a: number[], b: number[]): number[][] => {
    const x1 = Math.min(a[0], b[0]);
    const y1 = Math.min(a[1], b[1]);
    const x2 = Math.max(a[0], b[0]);
    const y2 = Math.max(a[1], b[1]);
    return [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ];
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (naming) return;
    const [x, y] = toViewPoint(e);
    if (!drawing) {
      // clicking an empty canvas starts a box by default — simplest path
      onSelectZone(null);
      setDrawing(true);
      setDrawMode("rect");
      setPoints([[x, y]]);
      setErr(null);
      return;
    }
    if (drawMode === "rect") {
      if (points.length === 0) {
        setPoints([[x, y]]);
        return;
      }
      const corners = rectCorners(points[0], [x, y]);
      const w = Math.abs(corners[1][0] - corners[0][0]);
      const h = Math.abs(corners[2][1] - corners[1][1]);
      if (w < 12 || h < 12) {
        setErr(
          "That box is too small — click further away for the opposite corner.",
        );
        return;
      }
      setErr(null);
      setPoints(corners);
      setNaming(true);
      return;
    }
    // polygon mode
    if (nearFirstPoint(x, y)) {
      closeShape();
      return;
    }
    setPoints((prev) => [...prev, [x, y]]);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing || naming) return;
    setMousePos(toViewPoint(e));
  };

  const undoPoint = () => {
    setPoints((prev) => {
      if (prev.length <= 1) {
        setDrawing(false);
        return [];
      }
      return prev.slice(0, -1);
    });
  };

  const startDrawing = (mode: "rect" | "poly") => {
    onSelectZone(null);
    setDrawMode(mode);
    setDrawing(true);
    setPoints([]);
    setNaming(false);
    setZoneName("");
    setErr(null);
  };

  const cancelDrawing = () => {
    setDrawing(false);
    setPoints([]);
    setMousePos(null);
    setNaming(false);
    setZoneName("");
    setErr(null);
  };

  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      if (naming) {
        if (e.key === "Escape") {
          setNaming(false);
        }
        return;
      }
      if (e.key === "Escape") cancelDrawing();
      else if (e.key === "Enter" && drawMode === "poly") closeShape();
      else if (
        e.key === "Backspace" ||
        (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        undoPoint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, naming, points.length, drawMode]);

  const saveZone = async () => {
    const name = zoneName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) {
      setErr("Give the zone a name");
      return;
    }
    if (points.length < 3) {
      setErr("A zone needs at least 3 points");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const zone = await createZone({
        name,
        polygon: points,
        camera_id: cameraId,
      });
      onZoneCreated(zone);
      onSelectZone(zone);
      cancelDrawing();
    } catch (e: any) {
      setErr(e?.message || "Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  const removeSelectedZone = async () => {
    if (!selectedZone || deleting) return;
    if (
      !window.confirm(`Delete zone "${selectedZone.name.replace(/_/g, " ")}"?`)
    )
      return;
    setDeleting(true);
    setErr(null);
    try {
      await deleteZone(selectedZone.id);
      onZoneDeleted(selectedZone.id);
      onSelectZone(null);
    } catch (e: any) {
      setErr(e?.message || "Failed to delete zone");
    } finally {
      setDeleting(false);
    }
  };

  const hoveringClose =
    drawing &&
    !naming &&
    drawMode === "poly" &&
    mousePos != null &&
    nearFirstPoint(mousePos[0], mousePos[1]);

  // live rectangle preview while in rect mode with one anchor placed
  const rectPreview =
    drawing && !naming && drawMode === "rect" && points.length === 1 && mousePos
      ? rectCorners(points[0], mousePos)
      : null;

  const statusText = () => {
    if (drawMode === "rect") {
      return points.length === 0
        ? "Click where the area STARTS"
        : "Now click the OPPOSITE corner to finish the box";
    }
    return points.length < 3
      ? `Click to add points — ${points.length}/3 minimum · right-click to undo · Esc to cancel`
      : hoveringClose
        ? "Click to close the shape"
        : "Click the green point (or press Enter) to close · right-click to undo";
  };

  return (
    <Box>
      {/* Context line: what the rule text matched */}
      {!drawing && ruleText.trim() && (
        <Box
          sx={{
            mb: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {mentionedZones.length > 0 ? (
            <Typography sx={{ color: t.textMuted, fontSize: ".74rem" }}>
              Showing {mentionedZones.length} zone
              {mentionedZones.length !== 1 ? "s" : ""} mentioned in your rule
              {hiddenCount > 0
                ? ` · ${hiddenCount} other${hiddenCount !== 1 ? "s" : ""} hidden`
                : ""}
            </Typography>
          ) : (
            <Typography sx={{ color: t.textMuted, fontSize: ".74rem" }}>
              No existing zone matches your rule text — draw one below
              {zones.length > 0 ? `, or show all ${zones.length} zones` : ""}
            </Typography>
          )}
          {zones.length > 0 && (
            <Box
              onClick={() => setShowAll((v) => !v)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.1,
                py: 0.3,
                borderRadius: "6px",
                border: `1px solid ${t.border}`,
                cursor: "pointer",
                "&:hover": { background: t.surfaceHover },
              }}
            >
              {showAll ? (
                <VisibilityOffIcon sx={{ fontSize: 13, color: t.textMuted }} />
              ) : (
                <VisibilityIcon sx={{ fontSize: 13, color: t.textMuted }} />
              )}
              <Typography
                sx={{
                  color: t.textSecondary,
                  fontSize: ".68rem",
                  fontWeight: 600,
                }}
              >
                {showAll
                  ? "Show only mentioned"
                  : `Show all ${zones.length} zones`}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          position: "relative",
          background: "#000",
          aspectRatio: "16/9",
          borderRadius: "12px",
          overflow: "hidden",
          border: `1px solid ${t.border}`,
        }}
      >
        <img
          src={`${API_BASE}/api/video/snapshot?camera_id=${cameraId}&t=${snapTs}`}
          alt="Camera frame"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            position: "absolute",
            inset: 0,
          }}
        />
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          onClick={handleSvgClick}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setMousePos(null)}
          onContextMenu={(e) => {
            if (drawing && !naming) {
              e.preventDefault();
              undoPoint();
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: naming ? "default" : "crosshair",
          }}
        >
          {visibleZones.map(
            (zone) =>
              zone.polygon?.length >= 3 && (
                <g key={zone.id}>
                  <polygon
                    points={zone.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill={
                      (zone.color || CYAN) +
                      (zone.id === selectedZoneId ? "55" : "22")
                    }
                    stroke={zone.color || CYAN}
                    strokeWidth={zone.id === selectedZoneId ? 3.5 : 2}
                    style={{
                      pointerEvents: drawing ? "none" : "auto",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectZone(zone.id === selectedZoneId ? null : zone);
                    }}
                  />
                  <text
                    x={
                      zone.polygon.reduce((s, p) => s + p[0], 0) /
                      zone.polygon.length
                    }
                    y={
                      zone.polygon.reduce((s, p) => s + p[1], 0) /
                      zone.polygon.length
                    }
                    fill="#fff"
                    fontSize="15"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      pointerEvents: "none",
                      filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))",
                    }}
                  >
                    {zone.name.replace(/_/g, " ")}
                  </text>
                </g>
              ),
          )}

          {/* rect live preview */}
          {rectPreview && (
            <polygon
              points={rectPreview.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={CYAN + "20"}
              stroke={CYAN}
              strokeWidth={2}
              strokeDasharray="6 4"
              style={{ pointerEvents: "none" }}
            />
          )}

          {drawing && points.length > 0 && (
            <g style={{ pointerEvents: "none" }}>
              {naming ? (
                <polygon
                  points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill={CYAN + "30"}
                  stroke={CYAN}
                  strokeWidth={2.5}
                />
              ) : drawMode === "poly" ? (
                <>
                  <polyline
                    points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill={CYAN + "18"}
                    stroke={CYAN}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {mousePos && (
                    <line
                      x1={points[points.length - 1][0]}
                      y1={points[points.length - 1][1]}
                      x2={hoveringClose ? points[0][0] : mousePos[0]}
                      y2={hoveringClose ? points[0][1] : mousePos[1]}
                      stroke={hoveringClose ? GREEN : CYAN + "90"}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  )}
                </>
              ) : null}
              {(drawMode === "poly" || !naming) &&
                points.map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={
                      drawMode === "poly" && i === 0 && points.length >= 3
                        ? hoveringClose
                          ? 11
                          : 9
                        : 5
                    }
                    fill={
                      drawMode === "poly" && i === 0 && points.length >= 3
                        ? GREEN
                        : CYAN
                    }
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                ))}
            </g>
          )}

          {drawing && !naming && mousePos && !hoveringClose && (
            <circle
              cx={mousePos[0]}
              cy={mousePos[1]}
              r={4}
              fill="none"
              stroke={CYAN}
              strokeWidth={1.5}
              style={{ pointerEvents: "none" }}
            />
          )}
        </svg>

        {drawing && !naming && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              px: 2,
              py: 0.6,
              borderRadius: "8px",
              background: "rgba(0,0,0,0.75)",
              border: `1px solid ${CYAN}50`,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Typography
              sx={{ color: "#fff", fontSize: ".72rem", fontWeight: 600 }}
            >
              {statusText()}
            </Typography>
          </Box>
        )}
        {!drawing && !naming && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              px: 2,
              py: 0.6,
              borderRadius: "8px",
              background: "rgba(0,0,0,0.65)",
              border: `1px solid ${t.border}`,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Typography
              sx={{ color: "#e5e7eb", fontSize: ".72rem", fontWeight: 600 }}
            >
              {visibleZones.length > 0
                ? "Click a highlighted zone to select it, or click empty space to draw a box"
                : "Click anywhere on the video, then click the opposite corner — that's your zone"}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          minHeight: 40,
        }}
      >
        {!drawing ? (
          <>
            <Box
              onClick={() => startDrawing("rect")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.7,
                px: 1.8,
                py: 0.7,
                borderRadius: "9px",
                background: `${CYAN}12`,
                border: `1px solid ${CYAN}35`,
                cursor: "pointer",
                "&:hover": { background: `${CYAN}22` },
              }}
            >
              <AddIcon sx={{ fontSize: 16, color: CYAN }} />
              <Typography
                sx={{ color: CYAN, fontSize: ".78rem", fontWeight: 700 }}
              >
                Draw box (2 clicks)
              </Typography>
            </Box>
            <Box
              onClick={() => startDrawing("poly")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.7,
                px: 1.5,
                py: 0.7,
                borderRadius: "9px",
                border: `1px solid ${t.border}`,
                cursor: "pointer",
                "&:hover": { background: t.surfaceHover },
              }}
            >
              <GestureIcon sx={{ fontSize: 15, color: t.textSecondary }} />
              <Typography
                sx={{
                  color: t.textSecondary,
                  fontSize: ".78rem",
                  fontWeight: 600,
                }}
              >
                Custom shape
              </Typography>
            </Box>
            {selectedZone && (
              <Box
                onClick={removeSelectedZone}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.7,
                  px: 1.8,
                  py: 0.7,
                  borderRadius: "9px",
                  background: `${RED}12`,
                  border: `1px solid ${RED}40`,
                  cursor: deleting ? "default" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                  "&:hover": { background: `${RED}22` },
                }}
              >
                <DeleteIcon sx={{ fontSize: 16, color: RED }} />
                <Typography
                  sx={{ color: RED, fontSize: ".78rem", fontWeight: 700 }}
                >
                  {deleting
                    ? "Deleting..."
                    : `Delete "${selectedZone.name.replace(/_/g, " ")}"`}
                </Typography>
              </Box>
            )}
          </>
        ) : naming ? (
          <>
            <TextField
              autoFocus
              size="small"
              placeholder="Zone name (e.g. loading zone)"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveZone();
              }}
              sx={{
                minWidth: 240,
                "& .MuiOutlinedInput-root": {
                  height: 36,
                  fontSize: ".82rem",
                  color: t.text,
                  background: t.surface,
                  borderRadius: "9px",
                  "& fieldset": { borderColor: t.border },
                },
              }}
            />
            <Box
              onClick={saving ? undefined : saveZone}
              sx={{
                px: 1.8,
                py: 0.7,
                borderRadius: "9px",
                background: `${GREEN}18`,
                border: `1px solid ${GREEN}45`,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
                "&:hover": { background: `${GREEN}28` },
              }}
            >
              <Typography
                sx={{ color: GREEN, fontSize: ".78rem", fontWeight: 700 }}
              >
                {saving ? "Saving..." : "Save zone"}
              </Typography>
            </Box>
            <Box
              onClick={cancelDrawing}
              sx={{
                px: 1.5,
                py: 0.7,
                borderRadius: "9px",
                border: `1px solid ${t.border}`,
                cursor: "pointer",
                "&:hover": { background: t.surfaceHover },
              }}
            >
              <Typography
                sx={{
                  color: t.textSecondary,
                  fontSize: ".78rem",
                  fontWeight: 600,
                }}
              >
                Cancel
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Box
              onClick={undoPoint}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.7,
                px: 1.5,
                py: 0.7,
                borderRadius: "9px",
                border: `1px solid ${t.border}`,
                cursor: "pointer",
                opacity: points.length === 0 ? 0.5 : 1,
                "&:hover": { background: t.surfaceHover },
              }}
            >
              <UndoIcon sx={{ fontSize: 15, color: t.textSecondary }} />
              <Typography
                sx={{
                  color: t.textSecondary,
                  fontSize: ".78rem",
                  fontWeight: 600,
                }}
              >
                Undo point
              </Typography>
            </Box>
            <Box
              onClick={cancelDrawing}
              sx={{
                px: 1.5,
                py: 0.7,
                borderRadius: "9px",
                border: `1px solid ${t.border}`,
                cursor: "pointer",
                "&:hover": { background: t.surfaceHover },
              }}
            >
              <Typography
                sx={{
                  color: t.textSecondary,
                  fontSize: ".78rem",
                  fontWeight: 600,
                }}
              >
                Cancel drawing
              </Typography>
            </Box>
            <Typography sx={{ color: t.textMuted, fontSize: ".74rem" }}>
              {drawMode === "rect"
                ? points.length === 0
                  ? "click the first corner"
                  : "click the opposite corner"
                : `${points.length} point${points.length === 1 ? "" : "s"} placed`}
            </Typography>
          </>
        )}
        {err && (
          <Typography sx={{ color: "#fca5a5", fontSize: ".74rem" }}>
            {err}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
