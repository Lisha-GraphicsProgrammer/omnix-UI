// src/components/common/DataTable.tsx
//
// Shared table chrome used by every list/log page (Self-Learning, Alerts,
// and future ones). This exists specifically so pages don't hand-copy
// similar-looking styles that quietly drift apart — TableCard and
// TablePagination are the literal same component everywhere they're used.
import { useState } from "react";
import { Box, Typography, ClickAwayListener } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "../../context/ThemeContext";
import { ACCENT } from "../../lib/constants";

// ============================================================
// TableCard — the bordered card, column header row, and empty/loading state.
// Rows themselves are passed as children so each page keeps full control
// over its own row layout; only the surrounding chrome is shared.
// ============================================================
export function TableCard({
  columns,
  gridTemplateColumns,
  children,
  isLoading,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: {
  columns: string[];
  gridTemplateColumns: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const { t, mode } = useTheme();

  return (
    <Box
      sx={{
        borderRadius: "16px",
        border: `1px solid ${t.border}`,
        overflow: "hidden",
        background: t.surface,
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns,
          gap: 2,
          px: 3,
          py: "12px",
          borderBottom: `1px solid ${t.border}`,
          // Locked to this exact color in dark mode (the app's default and
          // primary mode) rather than deriving it, so every table's header
          // is guaranteed pixel-identical regardless of any theme drift.
          background: mode === "dark" ? "#1A1412" : t.bgSecondary,
        }}
      >
        {columns.map((h, i) => (
          <Typography
            key={i}
            sx={{
              fontSize: ".68rem",
              fontWeight: 700,
              color: t.textMuted,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {h}
          </Typography>
        ))}
      </Box>

      {isEmpty ? (
        <Box sx={{ px: 4, py: 5, textAlign: "center" }}>
          {emptyIcon}
          <Typography sx={{ color: t.textSecondary, fontSize: ".85rem", mt: emptyIcon ? 1 : 0 }}>
            {isLoading ? "Loading…" : emptyTitle || "No results"}
          </Typography>
          {!isLoading && emptySubtitle && (
            <Typography sx={{ color: t.textMuted, fontSize: ".76rem", mt: "4px" }}>
              {emptySubtitle}
            </Typography>
          )}
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}

// ============================================================
// TablePagination — "Showing X–Y of Z" + rows-per-page dropdown on the
// left, Prev / Page N of M / Next on the right. Renders as its own element
// below TableCard (with a margin, not glued to it) — the same separated
// arrangement as the search/filter bar above the table.
// ============================================================
function PageSizeDropdown({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <Box
          onClick={() => setOpen((o) => !o)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
            px: "12px",
            height: 34,
            borderRadius: "8px",
            background: t.surface,
            border: `1px solid ${open ? ACCENT + "60" : t.border}`,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Typography sx={{ fontSize: ".76rem", color: t.textSecondary, whiteSpace: "nowrap" }}>
            {value} / page
          </Typography>
          <ExpandMoreIcon
            sx={{
              fontSize: 15,
              color: t.textMuted,
              transition: "transform .15s",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        </Box>
        {open && (
          <Box
            sx={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              right: 0,
              minWidth: 110,
              borderRadius: "10px",
              background: t.bgSecondary,
              border: `1px solid ${t.border}`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              overflow: "hidden",
              zIndex: 20,
            }}
          >
            {options.map((n) => (
              <Box
                key={n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                sx={{
                  px: "14px",
                  py: "9px",
                  cursor: "pointer",
                  background: n === value ? `${ACCENT}14` : "transparent",
                  "&:hover": {
                    background: n === value ? `${ACCENT}20` : t.surfaceHover || `${ACCENT}08`,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: ".8rem",
                    color: n === value ? ACCENT : t.textSecondary,
                    fontWeight: n === value ? 700 : 500,
                  }}
                >
                  {n} / page
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  pageSizeOptions?: number[];
}) {
  const { t } = useTheme();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const navBtn = (enabled: boolean, label: string, onClick: () => void) => (
    <Box
      onClick={enabled ? onClick : undefined}
      sx={{
        px: "14px",
        py: "7px",
        borderRadius: "8px",
        border: `1px solid ${t.border}`,
        background: t.surface,
        cursor: enabled ? "pointer" : "default",
        opacity: enabled ? 1 : 0.4,
        transition: "background .15s",
        "&:hover": enabled ? { background: t.surfaceHover } : {},
      }}
    >
      <Typography sx={{ fontSize: ".78rem", color: t.textSecondary, fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2, flexWrap: "wrap", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography sx={{ fontSize: ".76rem", color: t.textMuted }}>
          {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
        </Typography>
        <PageSizeDropdown value={pageSize} onChange={onPageSizeChange} options={pageSizeOptions} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {navBtn(page > 1, "Prev", () => onPageChange(page - 1))}
        <Typography sx={{ fontSize: ".78rem", color: t.textMuted, minWidth: 80, textAlign: "center" }}>
          Page {page} of {totalPages}
        </Typography>
        {navBtn(page < totalPages, "Next", () => onPageChange(page + 1))}
      </Box>
    </Box>
  );
}
