import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, TextField, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const API_BASE = "http://localhost:8000";

const suggestions = [
  {
    icon: "⛑️",
    text: "Alert when worker without helmet enters loading zone",
    tag: "PPE Safety",
  },
  {
    icon: "👥",
    text: "Alert if more than 5 people are in the restricted area",
    tag: "Crowd Control",
  },
  {
    icon: "🚜",
    text: "Alert when forklift comes within 5 meters of a worker",
    tag: "Proximity",
  },
  {
    icon: "📊",
    text: "Alert if worker count exceeds 10 in warehouse zone",
    tag: "Count Logic",
  },
];

interface RuleHistoryItem {
  id: number;
  instruction: string;
  status: string;
  time: string;
  pipeline: string;
  alerts: number;
  config?: any;
  applied?: boolean;
}

export default function Rules() {
  const [instruction, setInstruction] = useState("");
  const [history, setHistory] = useState<RuleHistoryItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastSent, setLastSent] = useState("");
  const [generatedConfig, setGeneratedConfig] = useState<any>(null);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState("");
  const navigate = useNavigate();

  const buildPipelineDescription = (config: any) => {
    if (!config) return "YOLOv8 + ByteTrack";
    const parts = ["YOLOv8", "ByteTrack"];
    const modelCount = Object.keys(config.models || {}).length;
    if (modelCount > 0) {
      parts.push(`${modelCount} custom model${modelCount > 1 ? "s" : ""}`);
    }
    const ruleType = config.rules?.[0]?.type;
    if (ruleType === "missing_in_zone") parts.push("PPE Detection");
    else if (ruleType === "count_exceeded") parts.push("Count Logic");
    else if (ruleType === "person_in_zone") parts.push("Zone Logic");
    return parts.join(" + ");
  };

  const handleSend = async () => {
    if (!instruction.trim()) return;

    setProcessing(true);
    setLastSent(instruction);
    setError("");
    setGeneratedConfig(null);
    setAppliedMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/rules/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });

      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(errData.detail || "Failed to generate rule");
      }

      const data = await response.json();
      setGeneratedConfig(data.config);

      const newItem: RuleHistoryItem = {
        id: Date.now(),
        instruction,
        status: "generated",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pipeline: buildPipelineDescription(data.config),
        alerts: 0,
        config: data.config,
        applied: false,
      };

      setHistory((prev) => [newItem, ...prev]);
      setInstruction("");
    } catch (err: any) {
      setError(err.message || "Failed to connect to OMNIX AI Engine");
    } finally {
      setProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!generatedConfig) return;

    setApplying(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/rules/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: generatedConfig }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply rule");
      }

      const data = await response.json();
      setAppliedMessage(data.message || "Rule applied successfully");

      // Mark the most recent rule as applied
      setHistory((prev) =>
        prev.map((item, idx) =>
          idx === 0 ? { ...item, applied: true, status: "active" } : item,
        ),
      );

      setTimeout(() => setAppliedMessage(""), 6000);
    } catch (err: any) {
      setError(err.message || "Failed to apply rule");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#08080a",
        display: "flex",
        flexDirection: "column",
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* TOP BAR */}
      <Box
        sx={{
          px: 4,
          py: 0,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          height: 64,
          gap: 2,
          background: "rgba(13,13,16,0.95)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Box
          onClick={() => navigate("/dashboard")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: "pointer",
            px: 1.5,
            py: 0.7,
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.03)",
            transition: "all .2s",
            flexShrink: 0,
            "&:hover": {
              background: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.12)",
            },
          }}
        >
          <ArrowBackIcon
            sx={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}
          />
          <Typography
            sx={{ color: "rgba(255,255,255,0.4)", fontSize: ".78rem" }}
          >
            Dashboard
          </Typography>
        </Box>

        <Box
          sx={{
            width: "1px",
            height: 20,
            background: "rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "7px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 14px rgba(99,102,241,0.4)",
              flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <ellipse
                cx="12"
                cy="12"
                rx="10"
                ry="6.5"
                stroke="white"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="3.5" fill="white" />
              <circle cx="13.5" cy="10.5" r="1.4" fill="#6366f1" />
            </svg>
          </Box>
          <Typography
            sx={{
              color: "#fff",
              fontWeight: 700,
              fontSize: ".92rem",
              letterSpacing: "-.2px",
            }}
          >
            OMNIX
          </Typography>
          <Box
            sx={{
              width: "1px",
              height: 16,
              background: "rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{ color: "rgba(255,255,255,0.35)", fontSize: ".82rem" }}
          >
            Rule Creation
          </Typography>
        </Box>

        <Box
          sx={{
            ml: "auto",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px rgba(34,197,94,0.6)",
                animation: "p 2s infinite",
                "@keyframes p": {
                  "0%,100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
              }}
            />
            <Typography
              sx={{ color: "rgba(255,255,255,0.2)", fontSize: ".72rem" }}
            >
              AI Engine Online
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.4,
              borderRadius: "6px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.15)",
            }}
          >
            <Typography
              sx={{
                color: "rgba(34,197,94,0.7)",
                fontSize: ".6rem",
                fontWeight: 700,
                letterSpacing: ".06em",
              }}
            >
              LIVE
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* CONTENT */}
      <Box sx={{ flex: 1, display: "flex" }}>
        {/* LEFT */}
        <Box
          sx={{
            flex: 1,
            p: "40px 48px",
            borderRight: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <Box sx={{ mb: 6 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: "20px",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#818cf8",
                  boxShadow: "0 0 6px #818cf8",
                }}
              />
              <Typography
                sx={{
                  color: "#a5b4fc",
                  fontSize: ".7rem",
                  fontWeight: 600,
                  letterSpacing: ".04em",
                }}
              >
                Powered by OMNIX AI Engine
              </Typography>
            </Box>
            <Typography
              sx={{
                color: "#fff",
                fontSize: "2.2rem",
                fontWeight: 800,
                letterSpacing: "-1.2px",
                lineHeight: 1.1,
                mb: 1.5,
              }}
            >
              Create Detection Rule
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.3)",
                fontSize: ".9rem",
                lineHeight: 1.7,
                maxWidth: 480,
              }}
            >
              Type a plain English instruction. OMNIX converts it into a
              production-grade YOLOv8 + ByteTrack computer vision pipeline
              automatically.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.18)",
                fontSize: ".65rem",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                mb: 2,
              }}
            >
              Quick examples — click to use
            </Typography>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
            >
              {suggestions.map((s, i) => (
                <Box
                  key={i}
                  onClick={() => setInstruction(s.text)}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    p: "12px 14px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    transition: "all .2s",
                    "&:hover": {
                      background: "rgba(99,102,241,0.07)",
                      borderColor: "rgba(99,102,241,0.2)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{ fontSize: ".9rem", mt: 0.1, flexShrink: 0 }}
                  >
                    {s.icon}
                  </Box>
                  <Box>
                    <Box
                      sx={{
                        display: "inline-block",
                        px: 1,
                        py: 0.15,
                        borderRadius: "4px",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.15)",
                        mb: 0.6,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#a5b4fc",
                          fontSize: ".58rem",
                          fontWeight: 600,
                        }}
                      >
                        {s.tag}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: ".8rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {s.text}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              borderRadius: "16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              overflow: "hidden",
              transition: "all .2s",
              "&:focus-within": {
                borderColor: "rgba(99,102,241,0.4)",
                boxShadow: "0 0 0 4px rgba(99,102,241,0.06)",
              },
            }}
          >
            <TextField
              fullWidth
              multiline
              rows={5}
              placeholder="e.g. Alert me when a worker without a helmet enters the loading zone..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              variant="standard"
              autoFocus={false}
              sx={{
                px: 2.5,
                pt: 2.5,
                pb: 1,
                "& .MuiInput-root": {
                  color: "#fff",
                  fontSize: ".92rem",
                  lineHeight: 1.75,
                  "&:before": { display: "none" },
                  "&:after": { display: "none" },
                },
                "& textarea::placeholder": {
                  color: "rgba(255,255,255,0.18)",
                  fontSize: ".88rem",
                },
              }}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 1.5,
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography
                  sx={{ color: "rgba(255,255,255,0.12)", fontSize: ".7rem" }}
                >
                  ↵ Enter to send
                </Typography>
                <Typography
                  sx={{ color: "rgba(255,255,255,0.08)", fontSize: ".7rem" }}
                >
                  ⇧↵ New line
                </Typography>
              </Box>
              <Button
                onClick={handleSend}
                disabled={!instruction.trim() || processing}
                variant="contained"
                startIcon={
                  processing ? undefined : <SendIcon sx={{ fontSize: 15 }} />
                }
                sx={{
                  px: 2.5,
                  py: 1,
                  borderRadius: "9px",
                  fontWeight: 600,
                  fontSize: ".82rem",
                  textTransform: "none",
                  background: processing
                    ? "rgba(99,102,241,0.2)"
                    : "linear-gradient(135deg, #6366f1, #7c3aed)",
                  boxShadow: processing
                    ? "none"
                    : "0 4px 14px rgba(99,102,241,0.3)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  transition: "all .2s",
                  "&:hover": {
                    background: "linear-gradient(135deg, #5558e8, #6d28d9)",
                    transform: "translateY(-1px)",
                  },
                  "&.Mui-disabled": {
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  },
                }}
              >
                {processing ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 13,
                        height: 13,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTopColor: "#fff",
                        animation: "sp 1s linear infinite",
                        "@keyframes sp": {
                          "100%": { transform: "rotate(360deg)" },
                        },
                      }}
                    />
                    Generating...
                  </Box>
                ) : (
                  "Generate Rule"
                )}
              </Button>
            </Box>
          </Box>

          {/* PROCESSING STATE */}
          {processing && (
            <Box
              sx={{
                mt: 2.5,
                p: "16px 18px",
                borderRadius: "12px",
                background: "rgba(99,102,241,0.07)",
                border: "1px solid rgba(99,102,241,0.2)",
                animation: "fadeIn .3s ease",
                "@keyframes fadeIn": {
                  from: { opacity: 0, transform: "translateY(6px)" },
                  to: { opacity: 1, transform: "none" },
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {[0, 1, 2].map((d) => (
                    <Box
                      key={d}
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#818cf8",
                        animation: `dot 1.2s ease ${d * 0.2}s infinite`,
                        "@keyframes dot": {
                          "0%,100%": { opacity: 0.2 },
                          "50%": { opacity: 1 },
                        },
                      }}
                    />
                  ))}
                </Box>
                <Typography
                  sx={{ color: "#a5b4fc", fontSize: ".8rem", fontWeight: 600 }}
                >
                  OMNIX AI is analyzing your instruction...
                </Typography>
              </Box>
              <Box
                sx={{
                  p: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: ".78rem",
                    fontStyle: "italic",
                  }}
                >
                  "{lastSent}"
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                {[
                  "Extracting intent...",
                  "Identifying objects...",
                  "Building pipeline...",
                ].map((t, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 1,
                      py: 0.3,
                      borderRadius: "4px",
                      background: "rgba(99,102,241,0.1)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      animation: `fi .4s ease ${i * 0.3}s both`,
                      "@keyframes fi": {
                        from: { opacity: 0 },
                        to: { opacity: 1 },
                      },
                    }}
                  >
                    <Typography sx={{ color: "#a5b4fc", fontSize: ".62rem" }}>
                      {t}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* ERROR STATE */}
          {error && !processing && (
            <Box
              sx={{
                mt: 2.5,
                p: "14px 18px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <Typography
                sx={{
                  color: "#fca5a5",
                  fontSize: ".78rem",
                  fontWeight: 600,
                  mb: 0.5,
                }}
              >
                ⚠ Generation failed
              </Typography>
              <Typography
                sx={{
                  color: "rgba(252,165,165,0.7)",
                  fontSize: ".75rem",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </Typography>
            </Box>
          )}

          {/* GENERATED CONFIG STATE */}
          {generatedConfig && !processing && (
            <Box
              sx={{
                mt: 2.5,
                borderRadius: "14px",
                background: "rgba(110,231,183,0.04)",
                border: "1px solid rgba(110,231,183,0.18)",
                overflow: "hidden",
                animation: "fadeIn .4s ease",
              }}
            >
              <Box
                sx={{
                  px: 2.2,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(110,231,183,0.1)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: "#6ee7b7" }} />
                  <Typography
                    sx={{
                      color: "#6ee7b7",
                      fontSize: ".78rem",
                      fontWeight: 700,
                    }}
                  >
                    Pipeline Generated
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color: "rgba(110,231,183,0.5)",
                    fontSize: ".68rem",
                    fontFamily: "monospace",
                  }}
                >
                  {generatedConfig.pipeline_id}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: "12px 16px",
                  background: "rgba(0,0,0,0.3)",
                  maxHeight: 280,
                  overflow: "auto",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: ".72rem",
                    lineHeight: 1.6,
                    fontFamily: "monospace",
                  }}
                >
                  {JSON.stringify(generatedConfig, null, 2)}
                </pre>
              </Box>

              <Box
                sx={{
                  px: 2.2,
                  py: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  sx={{ color: "rgba(255,255,255,0.3)", fontSize: ".7rem" }}
                >
                  Review the pipeline and click apply to deploy
                </Typography>
                <Button
                  onClick={handleApply}
                  disabled={applying}
                  variant="contained"
                  sx={{
                    px: 2.5,
                    py: 0.8,
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: ".78rem",
                    textTransform: "none",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #059669, #047857)",
                    },
                    "&.Mui-disabled": {
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.2)",
                    },
                  }}
                >
                  {applying ? "Applying..." : "✓ Apply Rule"}
                </Button>
              </Box>
            </Box>
          )}

          {/* APPLIED MESSAGE */}
          {appliedMessage && (
            <Box
              sx={{
                mt: 2.5,
                p: "14px 18px",
                borderRadius: "12px",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                animation: "fadeIn .3s ease",
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 18, color: "#6ee7b7" }} />
              <Typography
                sx={{ color: "#6ee7b7", fontSize: ".82rem", fontWeight: 600 }}
              >
                {appliedMessage}
              </Typography>
            </Box>
          )}
        </Box>

        {/* RIGHT */}
        <Box
          sx={{
            width: 380,
            flexShrink: 0,
            p: "40px 32px",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  letterSpacing: "-.3px",
                }}
              >
                Generated Rules
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.25)",
                  fontSize: ".75rem",
                  mt: 0.3,
                }}
              >
                Session history
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.4,
                borderRadius: "20px",
                background: "rgba(110,231,183,0.1)",
                border: "1px solid rgba(110,231,183,0.2)",
              }}
            >
              <Typography
                sx={{ color: "#6ee7b7", fontSize: ".65rem", fontWeight: 700 }}
              >
                {history.length} {history.length === 1 ? "rule" : "rules"}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}
          >
            {history.length === 0 ? (
              <Box
                sx={{
                  p: "24px 16px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.08)",
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{ color: "rgba(255,255,255,0.3)", fontSize: ".8rem" }}
                >
                  No rules generated yet
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.15)",
                    fontSize: ".72rem",
                    mt: 0.5,
                  }}
                >
                  Try one of the quick examples
                </Typography>
              </Box>
            ) : (
              history.map((item, i) => (
                <Box
                  key={item.id}
                  sx={{
                    p: "16px",
                    borderRadius: "14px",
                    background:
                      i === 0 && !processing
                        ? "rgba(99,102,241,0.08)"
                        : "rgba(255,255,255,0.025)",
                    border: `1px solid ${i === 0 && !processing ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)"}`,
                    transition: "all .3s",
                    "&:hover": {
                      borderColor: "rgba(99,102,241,0.25)",
                      background: "rgba(99,102,241,0.06)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
                    >
                      {item.applied ? (
                        <>
                          <CheckCircleIcon
                            sx={{ fontSize: 13, color: "#6ee7b7" }}
                          />
                          <Typography
                            sx={{
                              color: "#6ee7b7",
                              fontSize: ".65rem",
                              fontWeight: 700,
                            }}
                          >
                            ACTIVE
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              border: "1.5px solid #fbbf24",
                              background: "rgba(251,191,36,0.2)",
                            }}
                          />
                          <Typography
                            sx={{
                              color: "#fbbf24",
                              fontSize: ".65rem",
                              fontWeight: 700,
                            }}
                          >
                            PENDING
                          </Typography>
                        </>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.18)",
                        fontSize: ".65rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {item.time}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.75)",
                      fontSize: ".82rem",
                      lineHeight: 1.55,
                      mb: 1.2,
                    }}
                  >
                    {item.instruction}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.3,
                        borderRadius: "5px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "rgba(255,255,255,0.25)",
                          fontSize: ".62rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.pipeline}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          <Box
            sx={{
              p: "20px",
              borderRadius: "14px",
              background: "rgba(99,102,241,0.04)",
              border: "1px solid rgba(99,102,241,0.1)",
            }}
          >
            <Typography
              sx={{
                color: "#a5b4fc",
                fontSize: ".72rem",
                fontWeight: 700,
                mb: 2,
                letterSpacing: ".04em",
                textTransform: "uppercase",
              }}
            >
              How it works
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[
                {
                  n: "01",
                  t: "Type your instruction in plain English",
                  c: "#818cf8",
                },
                {
                  n: "02",
                  t: "AI extracts intent, objects & logic",
                  c: "#a78bfa",
                },
                {
                  n: "03",
                  t: "OMNIX generates JSON pipeline config",
                  c: "#c4b5fd",
                },
                {
                  n: "04",
                  t: "Review, then deploy with one click",
                  c: "#6ee7b7",
                },
              ].map((s, i) => (
                <Box
                  key={i}
                  sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "6px",
                      background: `${s.c}18`,
                      border: `1px solid ${s.c}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: 0.1,
                    }}
                  >
                    <Typography
                      sx={{ color: s.c, fontSize: ".6rem", fontWeight: 800 }}
                    >
                      {s.n}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: ".78rem",
                      lineHeight: 1.5,
                      mt: 0.2,
                    }}
                  >
                    {s.t}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
