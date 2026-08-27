import { useMemo, useState, useEffect } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PageHeader from "../../components/layout/PageHeader";
import { TableCard, TablePagination } from "../../components/common/DataTable";
import { FilterDropdown } from "../../components/common/Dropdown";
import { humanizeViolation } from "../../lib/humanize";
import { useTheme } from "../../context/ThemeContext";
import { useStats } from "../../hooks/queries";
import { apiGet } from "../../lib/api";
import { GREEN, AMBER, ACCENT, severityConfig } from "../../lib/constants";
import { transformIncident } from "../../lib/format";
import type { DashboardAlert } from "../../types";

type AlertRow = DashboardAlert & {
  rule_instruction?: string | null;
  violationRaw?: string;
  personId?: number | null;
  zoneRaw?: string | null;
};

export default function AlertsPage({
  navigate,
}: {
  navigate: (p: string) => void;
}) {
  const { t } = useTheme();

  // ── Filter bug fix: read initial filter state from the URL, so navigating
  // back from Alert Detail (via browser history) restores exactly what was applied ──
  const initParams = new URLSearchParams(window.location.search);
  const [filter, setFilter] = useState(initParams.get("f_sev") || "All"); // severity chips
  const [page, setPage] = useState(Number(initParams.get("f_page")) || 1);
  const [pageSize, setPageSize] = useState(25);

  // ── Alert usability: filter state ──
  const [ruleId, setRuleId] = useState<string>(initParams.get("f_rule") || ""); // "" = any
  const [cameraId, setCameraId] = useState<string>(initParams.get("f_camera") || "");
  const [review, setReview] = useState<string>(initParams.get("f_review") || "");
  const [dateFrom, setDateFrom] = useState<string>(initParams.get("f_from") || "");
  const [dateTo, setDateTo] = useState<string>(initParams.get("f_to") || "");

  // ── Filter bug fix: keep the URL's query string in sync with current filters,
  // using replaceState (not a router navigation) so this doesn't spam browser
  // history — only the "View" click to Alert Detail adds a real history entry. ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (ruleId) params.set("f_rule", ruleId); else params.delete("f_rule");
    if (cameraId) params.set("f_camera", cameraId); else params.delete("f_camera");
    if (review) params.set("f_review", review); else params.delete("f_review");
    if (dateFrom) params.set("f_from", dateFrom); else params.delete("f_from");
    if (dateTo) params.set("f_to", dateTo); else params.delete("f_to");
    if (filter !== "All") params.set("f_sev", filter); else params.delete("f_sev");
    if (page !== 1) params.set("f_page", String(page)); else params.delete("f_page");
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [ruleId, cameraId, review, dateFrom, dateTo, filter, page]);

  const resetFilters = () => {
    setRuleId("");
    setCameraId("");
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

  // Still needed for the offline-state description text below, even though
  // the standalone stat cards that used to show stats.* were removed.
  const { isError: statsError } = useStats();

  const rawItems: any[] = incidentsPage?.items ?? [];
  const alerts: AlertRow[] = rawItems.map((i) => ({
    ...transformIncident(i),
    rule_instruction: i.rule_instruction,
    violationRaw: i.violation,
    personId: i.person_id,
    zoneRaw: i.zone,
  }));
  const apiError = incidentsError || statsError;

  const total = incidentsPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filtered = alerts; // filtering is server-side now

  const dateInputStyle: React.CSSProperties = {
    height: 42,
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.text,
    fontSize: ".82rem",
    padding: "0 10px",
    outline: "none",
    colorScheme: "dark",
  };

  const activeFilterCount =
    (ruleId ? 1 : 0) +
    (cameraId ? 1 : 0) +
    (review ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (filter !== "All" ? 1 : 0);

  // ── Human-readable rule labels for the filter dropdown ──
  const ruleLabel = (r: any) => {
    const name = (r.instruction || "")
      .replace(/^alert( me)?( when| if| whenever)?/i, "")
      .trim();
    const date = r.created_at
      ? new Date(r.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "";
    return `${name} · ${r.incident_count ?? 0} alerts · ${date}`;
  };
  const ruleOptions = (allRules ?? []).filter((r: any) => r.status === "active");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <PageHeader
        title="Alerts"
        description={
          apiError
            ? "⚠️ API offline — showing cached state"
            : "Real-time violation monitoring across all cameras"
        }
        action={{ label: "New Rule", onClick: () => navigate("/rules") }}
      />

      <Box sx={{ p: 4 }}>
        {/* Filter bar — one straight row. Rule takes the remaining space
        so long rule names aren't cut off; everything else sits compactly
        to its right. Same dropdown component and sizing as Self-Learning. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 3, flexWrap: "wrap" }}>
          <FilterDropdown
            value={ruleId}
            placeholder="Rule: any"
            flex={1}
            minWidth={280}
            onChange={(v) => {
              setRuleId(v);
              setPage(1);
            }}
            closedLabel={
              ruleId
                ? (() => {
                    const r = (allRules ?? []).find(
                      (x: any) => String(x.id) === String(ruleId),
                    );
                    return r ? ruleLabel(r) : `Rule #${ruleId}`;
                  })()
                : undefined
            }
            options={[
              { value: "", label: "Any rule" },
              ...ruleOptions.map((r: any) => ({
                value: String(r.id),
                label: (
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
                ),
              })),
            ]}
          />

          <FilterDropdown
            value={cameraId}
            placeholder="Camera: any"
            minWidth={170}
            onChange={(v) => {
              setCameraId(v);
              setPage(1);
            }}
            closedLabel={
              cameraId
                ? (allCameras ?? []).find((x: any) => String(x.id) === String(cameraId))
                    ?.name || `Camera ${cameraId}`
                : undefined
            }
            options={[
              { value: "", label: "Any camera" },
              ...(allCameras ?? []).map((c: any) => ({
                value: String(c.id),
                label: c.name,
              })),
            ]}
          />

          <FilterDropdown
            value={filter}
            placeholder="Severity"
            minWidth={140}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            options={[
              { value: "All", label: "All" },
              { value: "Critical", label: "Critical" },
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
            ]}
          />

          <FilterDropdown
            value={review}
            placeholder="Review: any"
            minWidth={160}
            onChange={(v) => {
              setReview(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "Any status" },
              { value: "unreviewed", label: "Unreviewed" },
              { value: "reviewed", label: "Reviewed" },
              { value: "false_positive", label: "False positive" },
              { value: "dismissed", label: "Dismissed" },
            ]}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <input
              type="date"
              value={dateFrom}
              style={dateInputStyle}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
            <Typography sx={{ color: t.textMuted, fontSize: ".78rem" }}>
              to
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
            <>
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
                  flexShrink: 0,
                }}
              >
                <FilterAltIcon sx={{ fontSize: 12, color: AMBER }} />
                <Typography
                  sx={{ color: AMBER, fontSize: ".64rem", fontWeight: 700 }}
                >
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </Typography>
              </Box>
              <Tooltip title="Clear all filters">
                <Box
                  onClick={resetFilters}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    height: 42,
                    px: 1.4,
                    borderRadius: "10px",
                    border: `1px solid ${t.border}`,
                    cursor: "pointer",
                    flexShrink: 0,
                    "&:hover": {
                      background: t.surfaceHover,
                      borderColor: `${ACCENT}40`,
                    },
                  }}
                >
                  <RestartAltIcon sx={{ fontSize: 15, color: t.textMuted }} />
                  <Typography
                    sx={{
                      color: t.textMuted,
                      fontSize: ".76rem",
                      fontWeight: 600,
                    }}
                  >
                    Clear
                  </Typography>
                </Box>
              </Tooltip>
            </>
          )}
        </Box>

        <TableCard
          columns={["Camera", "Violation / Rule", "Time", "Status", "Severity", "Action"]}
          gridTemplateColumns="1.6fr 2fr 1fr 1fr 1fr 0.7fr"
          isLoading={loading}
          isEmpty={filtered.length === 0}
          emptyTitle={
            apiError
              ? "Cannot reach API at localhost:8000"
              : activeFilterCount > 0
                ? "No violations match these filters"
                : "No violations yet"
          }
        >
          {filtered.map((alert, idx) => {
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
                    {humanizeViolation({
                      violation: alert.violationRaw,
                      person_id: alert.personId,
                      zone: alert.zoneRaw,
                    })}
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
          })}
        </TableCard>

        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>
    </Box>
  );
}
