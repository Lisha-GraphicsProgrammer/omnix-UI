import { useEffect, useState } from "react";
import { Dialog, Box, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { API_BASE } from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";
import { useCameras } from "../../hooks/queries";
import { CYAN, PURPLE, GREEN } from "../../lib/constants";
import { fetchZones, type ZoneLite } from "../../api/zones";
import ZoneCanvas from "./ZoneCanvas";
import type { ApiCamera } from "../../types";

export default function RuleSetupWizard({
  open,
  onClose,
  onComplete,
  ruleText = "",
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (ctx: { camera: ApiCamera; zone: ZoneLite | null }) => void;
  ruleText?: string;
}) {
  const { t } = useTheme();
  const { data: cameras } = useCameras();
  const [step, setStep] = useState<"camera" | "zone">("camera");
  const [camera, setCamera] = useState<ApiCamera | null>(null);
  const [zones, setZones] = useState<ZoneLite[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneLite | null>(null);
  const [snapTs] = useState(() => Date.now());

  // Reset on every open
  useEffect(() => {
    if (open) {
      setStep("camera");
      setCamera(null);
      setZones([]);
      setSelectedZone(null);
    }
  }, [open]);

  const pickCamera = async (cam: ApiCamera) => {
    setCamera(cam);
    setSelectedZone(null);
    try {
      setZones(await fetchZones(cam.id));
    } catch {
      setZones([]);
    }
    setStep("zone");
  };

  const finish = (zone: ZoneLite | null) => {
    if (!camera) return;
    onComplete({ camera, zone });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          background: t.bgSecondary,
          border: `1px solid ${t.border}`,
          borderRadius: "18px",
          backgroundImage: "none",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.2,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        {step === "zone" && (
          <Box
            onClick={() => setStep("camera")}
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              color: t.textMuted,
              "&:hover": { color: t.text },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: t.text, fontWeight: 700, fontSize: "1rem" }}>
            {step === "camera"
              ? "Select a camera"
              : `Zone on ${camera?.name || "camera"}`}
          </Typography>
          <Typography sx={{ color: t.textMuted, fontSize: ".74rem", mt: 0.2 }}>
            {step === "camera"
              ? "Which camera should this rule watch?"
              : ruleText.trim()
                ? "Zones mentioned in your rule are shown — pick one, or draw a new area"
                : "Pick a zone, draw a new one, or skip to watch the whole frame"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.6 }}>
          {["camera", "zone"].map((s) => (
            <Box
              key={s}
              sx={{
                width: 26,
                height: 4,
                borderRadius: 2,
                background: step === s ? PURPLE : t.border,
              }}
            />
          ))}
        </Box>
        <Box
          onClick={onClose}
          sx={{
            ml: 1,
            width: 30,
            height: 30,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: t.textMuted,
            border: `1px solid ${t.border}`,
            "&:hover": { color: t.text, background: t.surfaceHover },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          p: 3,
          overflowY: "auto",
          minHeight: 0,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(99,102,241,0.4) transparent",
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(99,102,241,0.35)",
            borderRadius: "8px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgba(99,102,241,0.6)",
          },
        }}
      >
        {step === "camera" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 2,
            }}
          >
            {(cameras ?? []).map((cam) => {
              const online = cam.status === "online";
              return (
                <Box
                  key={cam.id}
                  onClick={online ? () => pickCamera(cam) : undefined}
                  sx={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: `1px solid ${t.border}`,
                    background: t.surface,
                    cursor: online ? "pointer" : "default",
                    opacity: online ? 1 : 0.45,
                    transition: "all .15s",
                    "&:hover": online
                      ? {
                          borderColor: `${CYAN}60`,
                          transform: "translateY(-2px)",
                        }
                      : {},
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      aspectRatio: "16/9",
                      background: "#000",
                    }}
                  >
                    <img
                      src={
                        online
                          ? `${API_BASE}/api/video/stream?camera_id=${cam.id}&t=${snapTs}`
                          : `${API_BASE}/api/video/snapshot?camera_id=${cam.id}&t=${snapTs}`
                      }
                      alt={cam.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        position: "absolute",
                        inset: 0,
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        px: 1,
                        py: 0.2,
                        borderRadius: "6px",
                        background: online
                          ? `${GREEN}22`
                          : "rgba(239,68,68,0.18)",
                        border: `1px solid ${online ? GREEN + "50" : "rgba(239,68,68,0.35)"}`,
                      }}
                    >
                      <Typography
                        sx={{
                          color: online ? GREEN : "#fca5a5",
                          fontSize: ".6rem",
                          fontWeight: 700,
                        }}
                      >
                        {online ? "LIVE" : "OFFLINE"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1.2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <CameraAltIcon sx={{ fontSize: 15, color: t.textMuted }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          color: t.text,
                          fontSize: ".78rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cam.name}
                      </Typography>
                      <Typography
                        sx={{ color: t.textMuted, fontSize: ".65rem" }}
                      >
                        {cam.location}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {step === "zone" && camera && (
          <>
            <ZoneCanvas
              cameraId={camera.id}
              zones={zones}
              selectedZoneId={selectedZone?.id ?? null}
              onSelectZone={setSelectedZone}
              onZoneCreated={(z) => setZones((prev) => [...prev, z])}
              onZoneDeleted={(zoneId) => {
                setZones((prev) => prev.filter((z) => z.id !== zoneId));
                if (selectedZone?.id === zoneId) setSelectedZone(null);
              }}
              ruleText={ruleText}
            />
            <Box
              sx={{
                mt: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1.5,
              }}
            >
              <Box
                onClick={() => finish(null)}
                sx={{
                  px: 2.2,
                  py: 1,
                  borderRadius: "10px",
                  border: `1px solid ${t.border}`,
                  cursor: "pointer",
                  "&:hover": { background: t.surfaceHover },
                }}
              >
                <Typography
                  sx={{
                    color: t.textSecondary,
                    fontSize: ".82rem",
                    fontWeight: 600,
                  }}
                >
                  Skip — watch whole frame
                </Typography>
              </Box>
              <Box
                onClick={selectedZone ? () => finish(selectedZone) : undefined}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 2.2,
                  py: 1,
                  borderRadius: "10px",
                  background: selectedZone
                    ? `linear-gradient(135deg, ${PURPLE}, #5B21B6)`
                    : t.surface,
                  border: `1px solid ${selectedZone ? PURPLE + "70" : t.border}`,
                  cursor: selectedZone ? "pointer" : "default",
                  boxShadow: selectedZone ? `0 4px 16px ${PURPLE}40` : "none",
                  "&:hover": selectedZone
                    ? { transform: "translateY(-1px)" }
                    : {},
                }}
              >
                <CheckCircleIcon
                  sx={{
                    fontSize: 16,
                    color: selectedZone ? "#fff" : t.textMuted,
                  }}
                />
                <Typography
                  sx={{
                    color: selectedZone ? "#fff" : t.textMuted,
                    fontSize: ".82rem",
                    fontWeight: 700,
                  }}
                >
                  {selectedZone
                    ? `Use "${selectedZone.name.replace(/_/g, " ")}"`
                    : "Select a zone"}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Dialog>
  );
}
