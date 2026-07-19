import { useMemo, useState } from "react";
import { Box, Typography, Select, MenuItem, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import VideocamIcon from "@mui/icons-material/Videocam";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useTheme } from "../../context/ThemeContext";
import { useStats } from "../../hooks/queries";
import { apiGet } from "../../lib/api";
import { GREEN, AMBER, ACCENT, severityConfig } from "../../lib/constants";
import { transformIncident } from "../../lib/format";
import type { ApiStats, DashboardAlert } from "../../types";

type AlertRow = DashboardAlert & {
  rule_instruction?: string | null;
  violationRaw?: string;
};

export default function AlertsPage({
  navigate,
}: {
  navigate: (p: string) => void;
}) {
  const { t } = useTheme();
  const [filter, setFilter] = useState("All"); // severity chips
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ── Alert usability: filter state ──
  const [ruleId, setRuleId] = useState<string>(""); // "" = any
  const [cameraId, setCameraId] = useState<string>("");
  const [violation, setViolation] = useState<string>("");
  const [review, setReview] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const resetFilters = () => {
    setRuleId("");
    setCameraId("");
    setViolation("");
    setReview("");
    setDateFrom("");
    setDateTo("");
    setFilter("All");
    setPage(1);
  };

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(pageSize));
    p.set("offset", String((page - 1) * pageSize));
    if (ruleId) p.set("rule_id", ruleId);
    if (cameraId) p.set("camera_id", cameraId);
    if (violation) p.set("violation", violation);
    if (filter !== "All") p.set("severity", filter.toLowerCase());
    if (review) p.set("review", review);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    return p.toString();
  }, [
    page,
    pageSize,
    ruleId,
    cameraId,
    violation,
    filter,
    review,
    dateFrom,
    dateTo,
  ]);

  const {
    data: incidentsPage,
    isLoading: loading,
    isError: incidentsError,
  } = useQuery({
    queryKey: ["incidents-filtered", queryString],
    queryFn: () => apiGet(`/api/incidents?${queryString}`),
    refetchInterval: 5000,
  });

  // Rules for the filter dropdown (includes replaced/inactive so old incidents stay findable)
  const { data: allRules } = useQuery({
    queryKey: ["rules-all"],
    queryFn: () => apiGet("/api/rules?all=true"),
    staleTime: 30_000,
  });

  const { data: allCameras } = useQuery({
    queryKey: ["cameras-for-filter"],
    queryFn: () => apiGet("/api/cameras"),
    staleTime: 30_000,
  });

  const { data: statsData, isError: statsError } = useStats();

  const rawItems: any[] = incidentsPage?.items ?? [];
  const alerts: AlertRow[] = rawItems.map((i) => ({
    ...transformIncident(i),
    rule_instruction: i.rule_instruction,
    violationRaw: i.violation,
  }));
  const stats: ApiStats = statsData ?? {
    total: 0,
    unique_persons: 0,
    zones_affected: [],
  };
  const apiError = incidentsError || statsError;

  const total = incidentsPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showTo = Math.min(page * pageSize, total);

  // Violation type options: distinct values seen on this page + current selection
  const violationOptions = useMemo(() => {
    const s = new Set<string>(rawItems.map((i) => i.violation).filter(Boolean));
    if (violation) s.add(violation);
    return [...s].sort();
  }, [rawItems, violation]);

  const filtered = alerts; // filtering is server-side now

  const selectSx = {
    height: 32,
    minWidth: 130,
    fontSize: ".74rem",
    color: t.text,
    borderRadius: "8px",
    background: t.surface,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: t.border },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: `${ACCENT}50` },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
    "& .MuiSvgIcon-root": { color: t.textMuted },
  };
  const menuProps = {
    slotProps: {
      paper: {
        sx: {
          background: t.bgSecondary,
          border: `1px solid ${t.border}`,
          maxWidth: 420,
          "& .MuiMenuItem-root": {
            fontSize: ".76rem",
            color: t.textSecondary,
            whiteSpace: "normal",
            "&.Mui-selected": { color: ACCENT, background: `${ACCENT}12` },
          },
        },
      },
    },
  };
  const dateInputStyle: React.CSSProperties = {
    height: 32,
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.text,
    fontSize: ".74rem",
    padding: "0 8px",
    outline: "none",
    colorScheme: "dark",
  };

  const activeFilterCount =
    (ruleId ? 1 : 0) +
    (cameraId ? 1 : 0) +
    (violation ? 1 : 0) +
    (review ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (filter !== "All" ? 1 : 0);

  // ── Human-readable rule labels for the filter dropdown ──
  const ruleLabel = (r: any) => {
    const name = (r.instruction || "")
      .replace(/^alert( me)?( when| if| whenever)?/i, "")
      .trim();
    const short = name.length > 32 ? name.slice(0, 32) + "…" : name;
    const date = r.created_at
      ? new Date(r.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "";
    return `${short} · ${r.incident_count ?? 0} alerts · ${date}`;
  };
  const ruleOptions = (allRules ?? [])
    .filter((r: any) => r.status === "active" || (r.incident_count ?? 0) > 0)
    .sort(
      (a: any, b: any) =>
        (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1),
    );

  const statCards = [
    {
      val: stats.total.toString(),
      label: "Total Violations",
      sub: "From detection pipeline",
      c: "#E74C3C",
      icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
    },
    {
      val: "8",
      label: "Active Cameras",
      sub: "100% online",
      c: "#E8D5B0",
      icon: <VideocamIcon sx={{ fontSize: 20 }} />,
    },
    {
      val: stats.zones_affected.length.toString(),
      label: "Zones Affected",
      sub: "With active violations",
      c: GREEN,
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
    },
    {
      val: stats.unique_persons.toString(),
      label: "Unique Persons",
      sub: "ByteTrack deduplicated",
      c: AMBER,
      icon: <PersonIcon sx={{ fontSize: 20 }} />,
    },
  ];

  return (
    <Box>
      {/* Topbar */}
      <Box
        sx={{
          px: 4,
          py: 2.5,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: t.topbarBg,
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: t.text,
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "-.3px",
            }}
          >
            Alert Dashboard
          </Typography>
          <Typography
            sx={{
              color: apiError ? "#fca5a5" : t.textMuted,
              fontSize: ".78rem",
              mt: 0.2,
            }}
          >
            {apiError
              ? "⚠️ API offline — showing cached state"
              : `Real-time violation monitoring — ${total} events`}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: apiError ? "#ef4444" : "#22c55e",
                boxShadow: `0 0 8px ${apiError ? "rgba(239,68,68,0.6)" : "rgba(34,197,94,0.6)"}`,
                animation: "pg 2s infinite",
                "@keyframes pg": {
                  "0%,100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
              }}
            />
            <Typography sx={{ color: t.textMuted, fontSize: ".75rem" }}>
              {apiError ? "Offline" : "Live"}
            </Typography>
          </Box>
          <Box
            onClick={() => navigate("/rules")}
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`,
              border: `1px solid ${ACCENT}50`,
              cursor: "pointer",
              boxShadow: `0 4px 14px ${ACCENT}30`,
              transition: "all .2s",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: `0 6px 20px ${ACCENT}40`,
              },
            }}
          >
            <Typography
              sx={{ color: "#fff", fontSize: ".78rem", fontWeight: 600 }}
            >
              + New Rule
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 4 }}>
        {/* Stat cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 4,
          }}
        >
          {statCards.map((s, i) => (
            <Box
              key={i}
              sx={{
                p: "20px 24px",
                borderRadius: "14px",
                background: t.surface,
                border: `1px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                gap: 2,
                position: "relative",
                overflow: "hidden",
                transition: "all .25s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 12px 32px ${s.c}18`,
                  borderColor: `${s.c}30`,
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${s.c}, transparent)`,
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: `${s.c}18`,
                  border: `1px solid ${s.c}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ color: s.c, display: "flex" }}>{s.icon}</Box>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "1.45rem",
                    fontWeight: 800,
                    color: s.c,
                    lineHeight: 1.1,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {s.val}
                </Typography>
                <Typography
                  sx={{
                    color: t.text,
                    fontSize: ".82rem",
                    fontWeight: 600,
                    mt: ".2rem",
                  }}
                >
                  {s.label}
                </Typography>
                <Typography
                  sx={{ color: t.textMuted, fontSize: ".68rem", mt: ".1rem" }}
                >
                  {s.sub}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Violation log table */}
        <Box
          sx={{
            borderRadius: "20px",
            background: t.surface,
            border: `1px solid ${t.border}`,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            position: "sticky",
            top: 104,
            height: "calc(100vh - 122px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Table header */}
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}
              >
                Violation Log
              </Typography>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.4,
                  borderRadius: "20px",
                  background: `${ACCENT}12`,
                  border: `1px solid ${ACCENT}25`,
                }}
              >
                <Typography
                  sx={{ color: ACCENT, fontSize: ".65rem", fontWeight: 700 }}
                >
                  {total} events
                </Typography>
              </Box>
              {activeFilterCount > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: 1.2,
                    py: 0.35,
                    borderRadius: "20px",
                    background: `${AMBER}12`,
                    border: `1px solid ${AMBER}30`,
                  }}
                >
                  <FilterAltIcon sx={{ fontSize: 12, color: AMBER }} />
                  <Typography
                    sx={{ color: AMBER, fontSize: ".64rem", fontWeight: 700 }}
                  >
                    {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["All", "Critical", "High", "Medium"].map((f) => (
                <Box
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "8px",
                    background: filter === f ? `${ACCENT}15` : "transparent",
                    border:
                      filter === f
                        ? `1px solid ${ACCENT}35`
                        : `1px solid ${t.border}`,
                    cursor: "pointer",
                    transition: "all .2s",
                  }}
                >
                  <Typography
                    sx={{
                      color: filter === f ? ACCENT : t.textMuted,
                      fontSize: ".72rem",
                      fontWeight: filter === f ? 700 : 400,
                    }}
                  >
                    {f}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ── Alert usability: FILTER BAR ── */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              flexWrap: "wrap",
              flexShrink: 0,
              background: t.surface,
            }}
          >
            <Select
              value={ruleId}
              displayEmpty
              size="small"
              sx={{ ...selectSx, minWidth: 250 }}
              MenuProps={menuProps}
              onChange={(e) => {
                setRuleId(String(e.target.value));
                setPage(1);
              }}
              renderValue={(v) => {
                if (!v) return <span style={{ opacity: 0.55 }}>Rule: any</span>;
                const r = (allRules ?? []).find(
                  (x: any) => String(x.id) === String(v),
                );
                return <span>{r ? ruleLabel(r) : `Rule #${v}`}</span>;
              }}
            >
              <MenuItem value="">Any rule</MenuItem>
              {ruleOptions.map((r: any) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: r.status === "active" ? GREEN : t.textMuted,
                        flexShrink: 0,
                      }}
                    />
                    {ruleLabel(r)}
                  </Box>
                </MenuItem>
              ))}
            </Select>

            <Select
              value={cameraId}
              displayEmpty
              size="small"
              sx={selectSx}
              MenuProps={menuProps}
              onChange={(e) => {
                setCameraId(String(e.target.value));
                setPage(1);
              }}
              renderValue={(v) => {
                if (!v)
                  return <span style={{ opacity: 0.55 }}>Camera: any</span>;
                const c = (allCameras ?? []).find(
                  (x: any) => String(x.id) === String(v),
                );
                return <span>{c?.name || `Camera ${v}`}</span>;
              }}
            >
              <MenuItem value="">Any camera</MenuItem>
              {(allCameras ?? []).map((c: any) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              value={violation}
              displayEmpty
              size="small"
              sx={selectSx}
              MenuProps={menuProps}
              onChange={(e) => {
                setViolation(String(e.target.value));
                setPage(1);
              }}
              renderValue={(v) =>
                v ? (
                  <span>{String(v).replace(/_/g, " ")}</span>
                ) : (
                  <span style={{ opacity: 0.55 }}>Violation: any</span>
                )
              }
            >
              <MenuItem value="">Any violation</MenuItem>
              {violationOptions.map((v) => (
                <MenuItem key={v} value={v}>
                  {v.replace(/_/g, " ")}
                </MenuItem>
              ))}
            </Select>

            <Select
              value={review}
              displayEmpty
              size="small"
              sx={selectSx}
              MenuProps={menuProps}
              onChange={(e) => {
                setReview(String(e.target.value));
                setPage(1);
              }}
              renderValue={(v) =>
                v ? (
                  <span>{String(v).replace(/_/g, " ")}</span>
                ) : (
                  <span style={{ opacity: 0.55 }}>Review: any</span>
                )
              }
            >
              <MenuItem value="">Any status</MenuItem>
              <MenuItem value="unreviewed">Unreviewed</MenuItem>
              <MenuItem value="reviewed">Reviewed</MenuItem>
              <MenuItem value="false_positive">False positive</MenuItem>
              <MenuItem value="dismissed">Dismissed</MenuItem>
            </Select>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
              <Typography sx={{ color: t.textMuted, fontSize: ".7rem" }}>
                From
              </Typography>
              <input
                type="date"
                value={dateFrom}
                style={dateInputStyle}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <Typography sx={{ color: t.textMuted, fontSize: ".7rem" }}>
                To
              </Typography>
              <input
                type="date"
                value={dateTo}
                style={dateInputStyle}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </Box>

            {activeFilterCount > 0 && (
              <Tooltip title="Clear all filters">
                <Box
                  onClick={resetFilters}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.2,
                    py: 0.5,
                    borderRadius: "8px",
                    border: `1px solid ${t.border}`,
                    cursor: "pointer",
                    "&:hover": {
                      background: t.surfaceHover,
                      borderColor: `${ACCENT}40`,
                    },
                  }}
                >
                  <RestartAltIcon sx={{ fontSize: 14, color: t.textMuted }} />
                  <Typography
                    sx={{
                      color: t.textMuted,
                      fontSize: ".7rem",
                      fontWeight: 600,
                    }}
                  >
                    Clear
                  </Typography>
                </Box>
              </Tooltip>
            )}
          </Box>

          {/* Column headers */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1.6fr 2fr 1fr 1fr 1fr 0.7fr",
              px: 3,
              py: 1.5,
              borderBottom: `1px solid ${t.border}`,
              background: t.surface,
              flexShrink: 0,
            }}
          >
            {[
              "Camera",
              "Violation / Rule",
              "Time",
              "Status",
              "Severity",
              "Action",
            ].map((h) => (
              <Typography
                key={h}
                sx={{
                  color: t.textMuted,
                  fontSize: ".65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          {/* Scrollable rows */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              scrollbarWidth: "thin",
              scrollbarColor: `${ACCENT}40 transparent`,
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: `${ACCENT}35`,
                borderRadius: "8px",
              },
              "&::-webkit-scrollbar-thumb:hover": { background: `${ACCENT}60` },
            }}
          >
            {loading ? (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `3px solid ${ACCENT}20`,
                    borderTopColor: ACCENT,
                    animation: "sp 1s linear infinite",
                    "@keyframes sp": {
                      "100%": { transform: "rotate(360deg)" },
                    },
                    mx: "auto",
                    mb: 2,
                  }}
                />
                <Typography sx={{ color: t.textMuted, fontSize: ".85rem" }}>
                  Loading incidents...
                </Typography>
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Typography
                  sx={{ color: t.textMuted, fontSize: ".9rem", mb: 0.5 }}
                >
                  {apiError
                    ? "Cannot reach API at localhost:8000"
                    : activeFilterCount > 0
                      ? "No violations match these filters"
                      : "No violations yet"}
                </Typography>
              </Box>
            ) : (
              filtered.map((alert, idx) => {
                const sev = severityConfig[alert.severity];
                return (
                  <Box
                    key={alert.id}
                    onClick={() => navigate(`/alert/${alert.id}`)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 2fr 1fr 1fr 1fr 0.7fr",
                      px: 3,
                      py: 2.5,
                      alignItems: "center",
                      borderBottom:
                        idx < filtered.length - 1
                          ? `1px solid ${t.border}`
                          : "none",
                      cursor: "pointer",
                      transition: "all .15s",
                      "&:hover": { background: t.surfaceHover },
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: ACCENT,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${ACCENT}`,
                          animation: "blink 1s infinite",
                          "@keyframes blink": {
                            "0%,100%": { opacity: 1 },
                            "50%": { opacity: 0.2 },
                          },
                        }}
                      />
                      <Typography
                        sx={{
                          color: t.text,
                          fontSize: ".84rem",
                          fontWeight: 500,
                        }}
                      >
                        {alert.camera}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography
                        sx={{ color: t.textSecondary, fontSize: ".82rem" }}
                      >
                        {alert.rule}
                      </Typography>
                      {alert.rule_instruction && (
                        <Tooltip title={alert.rule_instruction}>
                          <Typography
                            sx={{
                              color: t.textMuted,
                              fontSize: ".68rem",
                              fontStyle: "italic",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              mt: 0.3,
                            }}
                          >
                            “{alert.rule_instruction}”
                          </Typography>
                        </Tooltip>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        color: t.textMuted,
                        fontSize: ".8rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {alert.time}
                    </Typography>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.7,
                        px: 1.2,
                        py: 0.5,
                        borderRadius: "8px",
                        background: `${ACCENT}10`,
                        border: `1px solid ${ACCENT}25`,
                        width: "fit-content",
                      }}
                    >
                      <WarningAmberIcon sx={{ fontSize: 11, color: ACCENT }} />
                      <Typography
                        sx={{
                          color: ACCENT,
                          fontSize: ".68rem",
                          fontWeight: 600,
                        }}
                      >
                        Active
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "inline-flex",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "8px",
                        background: sev.bg,
                        border: `1px solid ${sev.border}`,
                        width: "fit-content",
                      }}
                    >
                      <Typography
                        sx={{
                          color: sev.color,
                          fontSize: ".7rem",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {alert.severity}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Typography
                        sx={{
                          fontSize: ".78rem",
                          fontWeight: 600,
                          color: ACCENT,
                        }}
                      >
                        View
                      </Typography>
                      <ArrowForwardIcon sx={{ fontSize: 13, color: ACCENT }} />
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* Pagination footer */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 3,
              py: 1.75,
              borderTop: `1px solid ${t.border}`,
              flexWrap: "wrap",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: t.textMuted, fontSize: ".75rem" }}>
              {total === 0
                ? "No violations"
                : `Showing ${showFrom}–${showTo} of ${total}`}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ color: t.textMuted, fontSize: ".72rem" }}>
                  Rows per page
                </Typography>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  size="small"
                  sx={{
                    height: 30,
                    minWidth: 68,
                    fontSize: ".75rem",
                    color: t.text,
                    borderRadius: "8px",
                    background: t.surface,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: t.border,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: `${ACCENT}50`,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: ACCENT,
                    },
                    "& .MuiSvgIcon-root": { color: t.textMuted },
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          background: t.bgSecondary,
                          border: `1px solid ${t.border}`,
                          "& .MuiMenuItem-root": {
                            fontSize: ".78rem",
                            color: t.textSecondary,
                            "&.Mui-selected": {
                              color: ACCENT,
                              background: `${ACCENT}12`,
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  {[10, 25, 50].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  onClick={() => page > 1 && setPage((p) => p - 1)}
                  sx={{
                    px: 1.4,
                    py: 0.4,
                    borderRadius: "7px",
                    cursor: page > 1 ? "pointer" : "default",
                    fontSize: ".72rem",
                    fontWeight: 600,
                    color: t.textSecondary,
                    opacity: page > 1 ? 1 : 0.35,
                    border: `1px solid ${t.border}`,
                    transition: "all .15s",
                    "&:hover":
                      page > 1
                        ? {
                            background: t.surfaceHover,
                            borderColor: `${ACCENT}40`,
                          }
                        : {},
                  }}
                >
                  ‹ Prev
                </Box>
                <Typography
                  sx={{
                    color: t.textSecondary,
                    fontSize: ".72rem",
                    fontWeight: 600,
                    minWidth: 54,
                    textAlign: "center",
                  }}
                >
                  {page} / {totalPages}
                </Typography>
                <Box
                  onClick={() => page < totalPages && setPage((p) => p + 1)}
                  sx={{
                    px: 1.4,
                    py: 0.4,
                    borderRadius: "7px",
                    cursor: page < totalPages ? "pointer" : "default",
                    fontSize: ".72rem",
                    fontWeight: 600,
                    color: t.textSecondary,
                    opacity: page < totalPages ? 1 : 0.35,
                    border: `1px solid ${t.border}`,
                    transition: "all .15s",
                    "&:hover":
                      page < totalPages
                        ? {
                            background: t.surfaceHover,
                            borderColor: `${ACCENT}40`,
                          }
                        : {},
                  }}
                >
                  Next ›
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
