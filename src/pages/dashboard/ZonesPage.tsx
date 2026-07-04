import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Typography, TextField, Snackbar, Alert, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { CYAN, GREEN } from "../../lib/constants";
import type { ZoneData, RuleItem } from "../../types";

export default function ZonesPage() {
  const { t } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [zones, setZones] = useState<ZoneData[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [nameDialog, setNameDialog] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<[number, number][]>([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [imgSize] = useState({ w: 854, h: 480 });
  const [deleteConfirm, setDeleteConfirm] = useState<ZoneData | null>(null);
  const [editingZone, setEditingZone] = useState<ZoneData | null>(null);
  const [editPolygon, setEditPolygon] = useState<[number, number][]>([]);
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);

  const fetchZones = async () => {
    try {
      const res = await apiFetch("/api/zones");
      if (res.ok) setZones(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);
  useEffect(() => {
    apiFetch("/api/rules").then(r => r.json()).then(setRules).catch(() => {});
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width / imgSize.w;
    const scaleY = canvas.height / imgSize.h;

    zones.forEach((zone) => {
      if (zone.polygon.length < 3) return;
      const isEditing = editingZone?.id === zone.id;
      const polygon = isEditing ? editPolygon : zone.polygon;
      const isHovered = hoveredZone === zone.id;
      const isSelected = selectedZone?.id === zone.id;

      ctx.beginPath();
      ctx.moveTo(polygon[0][0] * scaleX, polygon[0][1] * scaleY);
      polygon.slice(1).forEach(([x, y]) => ctx.lineTo(x * scaleX, y * scaleY));
      ctx.closePath();
      ctx.fillStyle = zone.color + (isHovered || isSelected || isEditing ? "50" : "28");
      ctx.fill();
      ctx.strokeStyle = isEditing ? "#ffffff" : zone.color;
      ctx.lineWidth = isHovered || isSelected || isEditing ? 2.5 : 1.5;
      if (isEditing) ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      polygon.forEach(([x, y], i) => {
        ctx.beginPath();
        const r = isEditing ? 8 : 4;
        ctx.arc(x * scaleX, y * scaleY, r, 0, Math.PI * 2);
        ctx.fillStyle = isEditing ? (draggingPointIdx === i ? "#ffffff" : zone.color) : zone.color;
        ctx.fill();
        if (isEditing) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke(); }
      });

      const cx = polygon.reduce((s, p) => s + p[0], 0) / polygon.length * scaleX;
      const cy = polygon.reduce((s, p) => s + p[1], 0) / polygon.length * scaleY;
      ctx.font = `600 12px Inter, sans-serif`;
      const tw = ctx.measureText(zone.name).width;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(cx - tw / 2 - 6, cy - 10, tw + 12, 22);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(zone.name, cx, cy + 1);
    });

    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0][0] * scaleX, currentPoints[0][1] * scaleY);
      currentPoints.slice(1).forEach(([x, y]) => ctx.lineTo(x * scaleX, y * scaleY));
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
      currentPoints.forEach(([x, y], i) => {
        ctx.beginPath();
        ctx.arc(x * scaleX, y * scaleY, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "#00E676" : "#fff"; ctx.fill();
      });
    }
  }, [zones, currentPoints, hoveredZone, selectedZone, imgSize, editingZone, editPolygon, draggingPointIdx]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return [(e.clientX - rect.left) * (imgSize.w / rect.width), (e.clientY - rect.top) * (imgSize.h / rect.height)];
  };

  const findDragHandle = (pt: [number, number], polygon: [number, number][]): number | null => {
    for (let i = 0; i < polygon.length; i++) {
      const dx = pt[0] - polygon[i][0], dy = pt[1] - polygon[i][1];
      if (Math.sqrt(dx * dx + dy * dy) < 20) return i;
    }
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAdmin) return;
    if (drawing) {
      const pt = getCanvasPoint(e);
      if (currentPoints.length >= 3) {
        const dx = pt[0] - currentPoints[0][0], dy = pt[1] - currentPoints[0][1];
        if (Math.sqrt(dx * dx + dy * dy) < 40) { setPendingPolygon(currentPoints); setCurrentPoints([]); setDrawing(false); setNameDialog(true); return; }
      }
      setCurrentPoints((prev) => [...prev, pt]); return;
    }
    if (editingZone) {
      const pt = getCanvasPoint(e);
      const idx = findDragHandle(pt, editPolygon);
      if (idx !== null) setDraggingPointIdx(idx); return;
    }
    const pt = getCanvasPoint(e);
    if (hoveredZone !== null) {
      const z = zones.find((z) => z.id === hoveredZone) || null;
      if (z) {
        if (selectedZone?.id === z.id) { setEditingZone(z); setEditPolygon([...z.polygon]); setSelectedZone(null); setSnack({ msg: `Editing "${z.name}" — drag corner handles to reshape`, type: "success" }); }
        else setSelectedZone(z);
      }
    } else setSelectedZone(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (editingZone && draggingPointIdx !== null) {
      setEditPolygon((prev) => { const next = [...prev] as [number, number][]; next[draggingPointIdx] = pt; return next; }); return;
    }
    if (drawing || editingZone) return;
    const canvas = canvasRef.current!;
    const scaleX = canvas.width / imgSize.w, scaleY = canvas.height / imgSize.h;
    let found: number | null = null;
    for (const zone of zones) {
      if (zone.polygon.length < 3) continue;
      let inside = false;
      const poly = zone.polygon;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0] * scaleX, yi = poly[i][1] * scaleY, xj = poly[j][0] * scaleX, yj = poly[j][1] * scaleY;
        const px = pt[0] * scaleX, py = pt[1] * scaleY;
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) { found = zone.id; break; }
    }
    setHoveredZone(found);
  };

  const handleCanvasMouseUp = () => { if (draggingPointIdx !== null) setDraggingPointIdx(null); };

  const handleSaveZone = async () => {
    if (!newZoneName.trim() || pendingPolygon.length < 3) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/zones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newZoneName.trim(), polygon: pendingPolygon, camera_id: null }) });
      if (res.ok) { setSnack({ msg: `Zone "${newZoneName}" saved!`, type: "success" }); setNameDialog(false); setNewZoneName(""); setPendingPolygon([]); fetchZones(); }
      else { const d = await res.json().catch(() => ({})); setSnack({ msg: d.detail || "Failed to save zone", type: "error" }); }
    } catch { setSnack({ msg: "Could not reach server", type: "error" }); }
    setSaving(false);
  };

  const handleSaveEditedZone = async () => {
    if (!editingZone) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/zones/${editingZone.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ polygon: editPolygon }) });
      if (res.ok) { setSnack({ msg: `Zone "${editingZone.name}" updated!`, type: "success" }); setEditingZone(null); setEditPolygon([]); fetchZones(); }
      else setSnack({ msg: "Failed to save zone edits", type: "error" });
    } catch { setSnack({ msg: "Could not reach server", type: "error" }); }
    setSaving(false);
  };

  const handleDeleteZone = async (zone: ZoneData) => {
    try {
      const res = await apiFetch(`/api/zones/${zone.id}`, { method: "DELETE" });
      if (res.ok) { setSnack({ msg: `Zone "${zone.name}" deleted`, type: "success" }); setSelectedZone(null); setDeleteConfirm(null); if (editingZone?.id === zone.id) { setEditingZone(null); setEditPolygon([]); } fetchZones(); }
    } catch { setSnack({ msg: "Could not reach server", type: "error" }); }
  };

  const startDrawing = () => { setDrawing(true); setCurrentPoints([]); setSelectedZone(null); setEditingZone(null); setEditPolygon([]); setSnack({ msg: "Click to place points. Click the first point (green) to close the zone.", type: "success" }); };
  const cancelEdit = () => { setEditingZone(null); setEditPolygon([]); setDraggingPointIdx(null); };
  const getCursor = () => { if (drawing) return "crosshair"; if (editingZone) return draggingPointIdx !== null ? "grabbing" : "grab"; if (hoveredZone !== null) return "pointer"; return "default"; };

  return (
    <Box>
      <Box sx={{ px: 4, py: 2.5, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.topbarBg, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Box>
          <Typography sx={{ color: t.text, fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.3px" }}>Zone Manager</Typography>
          <Typography sx={{ color: t.textMuted, fontSize: ".78rem", mt: 0.2 }}>{editingZone ? `Editing "${editingZone.name}" — drag corner handles to reshape` : "Draw detection zones on your camera feed"}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {editingZone ? (
            <>
              <Box onClick={cancelEdit} sx={{ px: 2, py: 1, borderRadius: "10px", border: `1px solid ${t.border}`, cursor: "pointer", "&:hover": { background: t.surfaceHover } }}><Typography sx={{ color: t.textMuted, fontSize: ".78rem", fontWeight: 600 }}>Cancel</Typography></Box>
              <Box onClick={handleSaveEditedZone} sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 1, borderRadius: "10px", background: "linear-gradient(135deg, #00E676, #00C853)", border: "1px solid rgba(0,230,118,0.3)", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(0,230,118,0.25)", transition: "all .2s", "&:hover": !saving ? { transform: "translateY(-1px)" } : {} }}>
                <Typography sx={{ color: "#000", fontSize: ".78rem", fontWeight: 700 }}>{saving ? "Saving..." : "✓ Save Changes"}</Typography>
              </Box>
            </>
          ) : drawing ? (
            <>
              <Box onClick={() => { setDrawing(false); setCurrentPoints([]); }} sx={{ px: 2, py: 1, borderRadius: "10px", border: `1px solid ${t.border}`, cursor: "pointer", "&:hover": { background: t.surfaceHover } }}><Typography sx={{ color: t.textMuted, fontSize: ".78rem", fontWeight: 600 }}>Cancel</Typography></Box>
              <Box sx={{ px: 2, py: 1, borderRadius: "10px", background: "rgba(0,230,118,0.1)", border: `1px solid ${GREEN}40` }}><Typography sx={{ color: GREEN, fontSize: ".78rem", fontWeight: 600 }}>● Drawing... ({currentPoints.length} pts)</Typography></Box>
            </>
          ) : isAdmin ? (
            <Box onClick={startDrawing} sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 1, borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.25)", transition: "all .2s", "&:hover": { transform: "translateY(-1px)" } }}>
              <AddIcon sx={{ fontSize: 16, color: "#fff" }} />
              <Typography sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 600 }}>Draw Zone</Typography>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ display: "flex", height: "calc(100vh - 73px)" }}>
        <Box sx={{ flex: 1, position: "relative", background: "#000", overflow: "hidden" }}>
          <img ref={imgRef} src="http://localhost:8000/api/video/snapshot" alt="Camera feed" style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0 }} />
          <canvas ref={canvasRef} width={854} height={480} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: getCursor(), zIndex: 10 }} />
          {(drawing || editingZone) && (
            <Box sx={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", px: 3, py: 1.5, borderRadius: "12px", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", zIndex: 20 }}>
              <Typography sx={{ color: "#fff", fontSize: ".8rem", textAlign: "center" }}>
                {editingZone ? "Drag the corner handles to reshape • Click Save Changes when done" : currentPoints.length === 0 ? "Click to place the first point" : currentPoints.length < 3 ? `${currentPoints.length} point${currentPoints.length > 1 ? "s" : ""} placed — keep clicking` : "Click the green point to close the zone"}
              </Typography>
            </Box>
          )}
          {selectedZone && !editingZone && !drawing && (
            <Box sx={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", px: 3, py: 1.5, borderRadius: "12px", background: "rgba(0,0,0,0.75)", border: `1px solid ${selectedZone.color}40`, backdropFilter: "blur(8px)", zIndex: 20 }}>
              <Typography sx={{ color: "#fff", fontSize: ".8rem", textAlign: "center" }}>Click again to enter edit mode • Drag corner handles to reshape</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ width: 300, borderLeft: `1px solid ${t.border}`, background: t.sidebarBg, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${t.border}` }}>
            <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>Zones <Chip label={zones.length} size="small" sx={{ ml: 1, height: 18, fontSize: ".6rem", background: `${CYAN}18`, color: CYAN, border: `1px solid ${CYAN}30` }} /></Typography>
            <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: 0.3 }}>{editingZone ? "Editing mode — drag handles on canvas" : "Click once to select • Click again to edit"}</Typography>
          </Box>
          {loading ? (
            <Box sx={{ p: 3 }}><Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>Loading zones...</Typography></Box>
          ) : zones.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <MyLocationIcon sx={{ fontSize: 40, color: t.textMuted, opacity: 0.3, mb: 1 }} />
              <Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>No zones yet</Typography>
              {isAdmin && <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: 0.5 }}>Click "Draw Zone" to start</Typography>}
            </Box>
          ) : (
            <Box sx={{ flex: 1 }}>
              {zones.map((zone) => {
                const isSel = selectedZone?.id === zone.id;
                const isEdit = editingZone?.id === zone.id;
                const ruleCount = rules.filter(r => r.zone_id === zone.id).length;
                return (
                  <Box key={zone.id} onClick={() => { if (drawing || editingZone) return; if (isSel) { setEditingZone(zone); setEditPolygon([...zone.polygon]); setSelectedZone(null); setSnack({ msg: `Editing "${zone.name}" — drag corner handles to reshape`, type: "success" }); } else setSelectedZone(zone); }} sx={{ px: 3, py: 2, borderBottom: `1px solid ${t.border}`, cursor: drawing || editingZone ? "default" : "pointer", background: isEdit ? `${zone.color}15` : isSel ? `${zone.color}08` : "transparent", borderLeft: isEdit ? `3px solid ${zone.color}` : isSel ? `3px solid ${zone.color}80` : "3px solid transparent", transition: "all .15s", "&:hover": !drawing && !editingZone ? { background: `${zone.color}08` } : {} }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "3px", background: zone.color, flexShrink: 0 }} />
                      <Typography sx={{ color: t.text, fontSize: ".85rem", fontWeight: isEdit ? 700 : isSel ? 600 : 500, flex: 1 }}>{zone.name}</Typography>
                      {isEdit && <Chip label="Editing" size="small" sx={{ height: 16, fontSize: ".55rem", background: `${zone.color}20`, color: zone.color, border: `1px solid ${zone.color}40` }} />}
                      {isAdmin && !isEdit && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(zone); }} sx={{ color: t.textMuted, "&:hover": { color: "#ef4444" }, p: 0.5 }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, ml: "27px" }}>
                      <Typography sx={{ color: t.textMuted, fontSize: ".7rem" }}>
                        {zone.polygon.length} points
                        {isSel && !isEdit && <Box component="span" sx={{ color: zone.color, ml: 1 }}>• click again to edit</Box>}
                      </Typography>
                      {ruleCount > 0 && (
                        <Box sx={{ px: 1, py: 0.2, borderRadius: "5px", background: `${zone.color}15`, border: `1px solid ${zone.color}30` }}>
                          <Typography sx={{ color: zone.color, fontSize: ".6rem", fontWeight: 700 }}>{ruleCount} rule{ruleCount > 1 ? "s" : ""}</Typography>
                        </Box>
                      )}
                    </Box>
                    {(isSel || isEdit) && (
                      <Box sx={{ mt: 1.5, ml: "27px", display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {(isEdit ? editPolygon : zone.polygon).map(([x, y], i) => (
                          <Box key={i} sx={{ px: 1, py: 0.3, borderRadius: "4px", background: `${zone.color}15`, border: `1px solid ${zone.color}30` }}>
                            <Typography sx={{ color: zone.color, fontSize: ".6rem", fontFamily: "monospace" }}>{Math.round(x)},{Math.round(y)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={nameDialog} onClose={() => { setNameDialog(false); setPendingPolygon([]); setNewZoneName(""); }} sx={{ "& .MuiDialog-paper": { background: t.bgSecondary || t.sidebarBg, border: `1px solid ${t.border}`, borderRadius: "16px", minWidth: 360 } }}>
        <DialogTitle sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}>Name this zone</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textMuted, fontSize: ".85rem", mb: 2 }}>{pendingPolygon.length} points drawn. Give this zone a name.</Typography>
          <TextField autoFocus fullWidth placeholder="e.g. Loading Zone, Warehouse, Entry Gate" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveZone()} size="small" sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.9rem", borderRadius: "10px", color: t.text, "& fieldset": { borderColor: t.border }, "&.Mui-focused fieldset": { borderColor: CYAN } } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setNameDialog(false); setPendingPolygon([]); setNewZoneName(""); }} sx={{ color: t.textMuted, borderRadius: "9px", textTransform: "none", border: `1px solid ${t.border}`, px: 2.5 }}>Cancel</Button>
          <Button onClick={handleSaveZone} disabled={!newZoneName.trim() || saving} variant="contained" sx={{ borderRadius: "9px", textTransform: "none", background: "linear-gradient(135deg, #6366f1, #7c3aed)", px: 2.5 }}>{saving ? "Saving..." : "Save Zone"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} sx={{ "& .MuiDialog-paper": { background: t.bgSecondary || t.sidebarBg, border: `1px solid ${t.border}`, borderRadius: "16px", minWidth: 340 } }}>
        <DialogTitle sx={{ color: t.text, fontWeight: 700, fontSize: "1rem", pb: 1 }}>Delete zone?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.textMuted, fontSize: ".88rem" }}>Delete <strong style={{ color: deleteConfirm?.color }}>{deleteConfirm?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(null)} sx={{ color: t.textMuted, borderRadius: "9px", textTransform: "none", border: `1px solid ${t.border}`, px: 2.5 }}>Cancel</Button>
          <Button onClick={() => deleteConfirm && handleDeleteZone(deleteConfirm)} variant="contained" sx={{ borderRadius: "9px", textTransform: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", px: 2.5 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack?.type || "success"} onClose={() => setSnack(null)} sx={{ borderRadius: "10px" }}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

