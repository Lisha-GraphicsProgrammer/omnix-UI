import { useState } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RuleIcon from "@mui/icons-material/Rule";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SpeedIcon from "@mui/icons-material/Speed";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";
import PageHeader from "../../components/layout/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useAnalytics } from "../../hooks/queries";
import { exportIncidents } from "../../api/analytics";
import { ACCENT, GREEN, AMBER } from "../../lib/constants";

export default function AnalyticsPage() {
  const { t } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [preset, setPreset] = useState<"today" | "7d" | "30d" | "custom">("7d");
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { data: analytics, isFetching: loading } = useAnalytics(fromDate, toDate, period);
  const overTime = analytics?.overTime ?? [];
  const byRule = analytics?.byRule ?? [];
  const byHour = analytics?.byHour ?? [];
  const fpRate = analytics?.fpRate ?? [];

  const applyPreset = (p: "today" | "7d" | "30d" | "custom") => {
    setPreset(p);
    const today = new Date().toISOString().split("T")[0];
    if (p === "today") { setFromDate(today); setToDate(today); setPeriod("day"); }
    else if (p === "7d") { const d = new Date(); d.setDate(d.getDate() - 7); setFromDate(d.toISOString().split("T")[0]); setToDate(today); setPeriod("day"); }
    else if (p === "30d") { const d = new Date(); d.setDate(d.getDate() - 30); setFromDate(d.toISOString().split("T")[0]); setToDate(today); setPeriod("day"); }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    setShowExportMenu(false);
    try {
      const blob = await exportIncidents(format, fromDate, toDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onvxp_report_Site_A_${fromDate}_to_${toDate}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export error", e); }
    setExporting(null);
  };

  const totalIncidents = overTime.reduce((s, d) => s + d.count, 0);
  const uniqueRules = byRule.length;
  const days = Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000));
  const avgPerDay = (totalIncidents / days).toFixed(1);
  const worstHour = byHour.reduce((a, b) => b.count > a.count ? b : a, { hour: 0, count: 0 });

  // Warm chart colors
  const CHART_COLORS = [ACCENT, "#D4891A", GREEN, "#E8D5B0", "#E74C3C", "#A93226", "#27AE60", "#C07A1F"];

  const gridColor = t.border;
  const textColor = t.textMuted;

  const CustomTooltipStyle = {
    background: t.bgSecondary || t.sidebarBg,
    border: `1px solid ${t.border}`,
    borderRadius: "10px",
    padding: "10px 14px",
    color: t.text,
    fontSize: "0.8rem",
  };

  const isEmpty = totalIncidents === 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <PageHeader title="Analytics" description="Historical safety monitoring insights" />

      <Box sx={{ p: 4 }}>
        {/* Date controls + export */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {(["today", "7d", "30d", "custom"] as const).map((p) => (
              <Box
                key={p}
                onClick={() => applyPreset(p)}
                sx={{ px: 2, py: 0.8, borderRadius: "8px", background: preset === p ? `${ACCENT}18` : t.surface, border: `1px solid ${preset === p ? ACCENT + "50" : t.border}`, cursor: "pointer", transition: "all .15s" }}
              >
                <Typography sx={{ color: preset === p ? ACCENT : t.textMuted, fontSize: ".78rem", fontWeight: preset === p ? 700 : 400 }}>
                  {p === "today" ? "Today" : p === "7d" ? "Last 7 days" : p === "30d" ? "Last 30 days" : "Custom"}
                </Typography>
              </Box>
            ))}
          </Box>
          {preset === "custom" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text, padding: "6px 10px", fontSize: "0.82rem", outline: "none" }} />
              <Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>to</Typography>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: "8px", color: t.text, padding: "6px 10px", fontSize: "0.82rem", outline: "none" }} />
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1, ml: "auto", alignItems: "center" }}>
            {(["day", "week", "month"] as const).map(p => (
              <Box
                key={p}
                onClick={() => setPeriod(p)}
                sx={{ px: 1.5, py: 0.6, borderRadius: "7px", background: period === p ? `${ACCENT}15` : "transparent", border: `1px solid ${period === p ? ACCENT + "40" : t.border}`, cursor: "pointer" }}
              >
                <Typography sx={{ color: period === p ? ACCENT : t.textMuted, fontSize: ".72rem", fontWeight: period === p ? 700 : 400 }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Typography>
              </Box>
            ))}
            {isAdmin && (
              <Box sx={{ position: "relative" }}>
                <Box
                  onClick={() => setShowExportMenu(o => !o)}
                  sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.9, borderRadius: "8px", background: exporting ? t.surface : `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`, border: `1px solid ${ACCENT}50`, cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.7 : 1, transition: "all .2s", "&:hover": !exporting ? { boxShadow: `0 4px 16px ${ACCENT}30` } : {} }}
                >
                  <FileDownloadIcon sx={{ fontSize: 15, color: "#fff" }} />
                  <Typography sx={{ color: "#fff", fontSize: ".76rem", fontWeight: 600 }}>
                    {exporting ? `Generating ${exporting.toUpperCase()}...` : "Export ▾"}
                  </Typography>
                </Box>
                {showExportMenu && (
                  <Box sx={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 100, minWidth: 140 }}>
                    {[{ label: "Download CSV", format: "csv" as const }, { label: "Download PDF", format: "pdf" as const }].map(opt => (
                      <Box key={opt.format} onClick={() => handleExport(opt.format)} sx={{ px: 2, py: 1.5, cursor: "pointer", "&:hover": { background: t.surfaceHover }, display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ color: t.text, fontSize: ".82rem" }}>{opt.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Loading bar */}
        {loading && (
          <LinearProgress sx={{ mb: 3, borderRadius: 2, height: 2, background: `${ACCENT}15`, "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${ACCENT}, #D4891A)` } }} />
        )}

        {/* Summary cards — genuine headline numbers for a charts page,
        distinct from Alert Dashboard's case: no table row already shows
        these at a glance here. */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 4 }}>
          {[
            { val: String(totalIncidents), label: "Total Incidents", sub: `${fromDate} → ${toDate}`, c: "#E74C3C", icon: <WarningAmberIcon sx={{ fontSize: 20 }} /> },
            { val: String(uniqueRules), label: "Unique Rules Triggered", sub: "Distinct violation types", c: ACCENT, icon: <RuleIcon sx={{ fontSize: 20 }} /> },
            { val: avgPerDay, label: "Avg per Day", sub: "Incidents per calendar day", c: "#E8D5B0", icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
            { val: `${worstHour.hour}:00`, label: "Worst Hour", sub: `${worstHour.count} incidents`, c: AMBER, icon: <SpeedIcon sx={{ fontSize: 20 }} /> },
          ].map((s, i) => (
            <Box key={i} sx={{ p: "20px 24px", borderRadius: "14px", background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 2, position: "relative", overflow: "hidden", transition: "all .25s", "&:hover": { transform: "translateY(-2px)", boxShadow: `0 12px 32px ${s.c}18`, borderColor: `${s.c}30` }, "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${s.c}, transparent)` } }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "12px", background: `${s.c}18`, border: `1px solid ${s.c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Box sx={{ color: s.c, display: "flex" }}>{s.icon}</Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "1.45rem", fontWeight: 800, color: s.c, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{s.val}</Typography>
                <Typography sx={{ color: t.text, fontSize: ".82rem", fontWeight: 600, mt: ".2rem" }}>{s.label}</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".68rem", mt: ".1rem" }}>{s.sub}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {isEmpty && !loading ? (
          <Box sx={{ textAlign: "center", py: 10, background: t.surface, borderRadius: "16px", border: `1px solid ${t.border}` }}>
            <TrendingUpIcon sx={{ fontSize: 48, color: t.textMuted, opacity: 0.3, mb: 2 }} />
            <Typography sx={{ color: t.textMuted, fontSize: "1rem", fontWeight: 600 }}>No incidents in selected range</Typography>
            <Typography sx={{ color: t.textMuted, fontSize: ".82rem", mt: 0.5 }}>Try selecting a wider date range or check that the pipeline has been running</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>

            {/* Incidents over time */}
            <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${t.border}`, background: `linear-gradient(135deg, ${ACCENT}10 0%, transparent 60%)` }}>
                <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>Incidents Over Time</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: 0.2 }}>Violation volume by {period}</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                {overTime.every(d => d.count === 0) ? (
                  <Box sx={{ textAlign: "center", py: 4 }}><Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>No data in range</Typography></Box>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={overTime} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 10 }} tickFormatter={v => v.length > 7 ? v.slice(5) : v} />
                      <YAxis tick={{ fill: textColor, fontSize: 10 }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={CustomTooltipStyle} />
                      <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Box>

            {/* Incidents by hour */}
            <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${t.border}`, background: `linear-gradient(135deg, ${AMBER}10 0%, transparent 60%)` }}>
                <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>Incidents by Hour of Day</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: 0.2 }}>Identify shift-based patterns</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                {byHour.every(d => d.count === 0) ? (
                  <Box sx={{ textAlign: "center", py: 4 }}><Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>No data in range</Typography></Box>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byHour} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="hour" tick={{ fill: textColor, fontSize: 10 }} tickFormatter={v => `${v}h`} />
                      <YAxis tick={{ fill: textColor, fontSize: 10 }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={CustomTooltipStyle} formatter={(v: any) => [v, "incidents"]} labelFormatter={(l: any) => `Hour ${l}:00`} />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {byHour.map((entry, index) => (
                          <Cell key={index} fill={entry.count === worstHour.count && entry.count > 0 ? "#E74C3C" : AMBER} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Box>

            {/* Incidents by rule */}
            <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${t.border}`, background: `linear-gradient(135deg, ${ACCENT}10 0%, transparent 60%)` }}>
                <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>Top Rules by Incidents</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: 0.2 }}>Top 10 most triggered rules</Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                {byRule.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}><Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>No data in range</Typography></Box>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart layout="vertical" data={byRule} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis type="number" tick={{ fill: textColor, fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="rule_name" tick={{ fill: textColor, fontSize: 9 }} width={110} tickFormatter={v => v.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()).slice(0, 14)} />
                      <RechartsTooltip contentStyle={CustomTooltipStyle} />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                        {byRule.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Box>

            {/* False positive rate */}
            <Box sx={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "16px", overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${t.border}`, background: `linear-gradient(135deg, ${GREEN}10 0%, transparent 60%)` }}>
                <Typography sx={{ color: t.text, fontWeight: 700, fontSize: ".92rem" }}>False Positive Rate by Rule</Typography>
                <Typography sx={{ color: t.textMuted, fontSize: ".72rem", mt: 0.2 }}>Which rules are most trustworthy</Typography>
              </Box>
              <Box sx={{ overflowY: "auto", maxHeight: 260 }}>
                {fpRate.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}><Typography sx={{ color: t.textMuted, fontSize: ".82rem" }}>No reviewed incidents yet</Typography></Box>
                ) : (
                  <>
                    <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", px: 3, py: 1.2, borderBottom: `1px solid ${t.border}`, background: t.surface, position: "sticky", top: 0 }}>
                      {["Rule", "TP", "FP", "FP %"].map(h => (
                        <Typography key={h} sx={{ color: t.textMuted, fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</Typography>
                      ))}
                    </Box>
                    {fpRate.map((row, i) => (
                      <Box key={i} sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", px: 3, py: 1.5, borderBottom: `1px solid ${t.border}`, "&:hover": { background: t.surfaceHover }, "&:last-child": { borderBottom: "none" } }}>
                        <Typography sx={{ color: t.text, fontSize: ".8rem" }} noWrap>{row.rule_name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</Typography>
                        <Typography sx={{ color: GREEN, fontSize: ".8rem", fontWeight: 600 }}>{row.tp_count}</Typography>
                        <Typography sx={{ color: "#fca5a5", fontSize: ".8rem", fontWeight: 600 }}>{row.fp_count}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                          <Box sx={{ flex: 1, height: 4, borderRadius: 2, background: t.border, overflow: "hidden" }}>
                            <Box sx={{ height: "100%", width: `${row.rate}%`, background: row.rate > 50 ? "#E74C3C" : row.rate > 20 ? AMBER : GREEN, borderRadius: 2 }} />
                          </Box>
                          <Typography sx={{ color: row.rate > 50 ? "#fca5a5" : row.rate > 20 ? AMBER : GREEN, fontSize: ".75rem", fontWeight: 700, minWidth: 36 }}>{row.rate}%</Typography>
                        </Box>
                      </Box>
                    ))}
                  </>
                )}
              </Box>
            </Box>
          </Box>
        )}
        <Box sx={{ height: 40 }} />
      </Box>
    </Box>
  );
}
