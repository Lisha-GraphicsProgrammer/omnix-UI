import { useQuery } from "@tanstack/react-query";
import { Box, Typography, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useTheme } from "../../context/ThemeContext";
import { fetchTrainingJobs, TrainingJob } from "../../api/trainingJobs";

// ── OMNIX accent palette — matches AlertDetail / Alerts / Rules pages ──
const ACCENT = "#C0392B";
const GREEN = "#27AE60";
const AMBER = "#D4891A";
const CYAN = "#3498DB";
const RED = "#E74C3C";

// Canonical pipeline order — stages the backend hasn't reached yet render as pending
const PIPELINE_STAGES = [
  { key: "queued", label: "Queued" },
  { key: "searching_data", label: "Searching datasets" },
  { key: "preparing_dataset", label: "Preparing dataset" },
  { key: "training", label: "Training model" },
  { key: "evaluating", label: "Evaluating" },
  { key: "awaiting_approval", label: "Awaiting your approval" },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Queued", color: CYAN },
  searching_data: { label: "Searching datasets", color: CYAN },
  preparing_dataset: { label: "Preparing dataset", color: CYAN },
  training: { label: "Training", color: AMBER },
  evaluating: { label: "Evaluating", color: AMBER },
  awaiting_approval: { label: "Awaiting approval", color: AMBER },
  approved: { label: "Approved", color: GREEN },
  failed: { label: "Failed", color: RED },
  cancelled: { label: "Cancelled", color: "#8a8a8a" },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status.replace(/_/g, " "), color: CYAN };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.7,
        px: "10px",
        py: "4px",
        borderRadius: "999px",
        background: `${meta.color}18`,
        border: `1px solid ${meta.color}40`,
        flexShrink: 0,
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
      <Typography sx={{ color: meta.color, fontSize: ".68rem", fontWeight: 700, letterSpacing: ".02em", textTransform: "capitalize" }}>
        {meta.label}
      </Typography>
    </Box>
  );
}

function StageRow({
  label,
  state,
  detail,
  isLast,
}: {
  label: string;
  state: string;
  detail?: string;
  isLast: boolean;
}) {
  const { t } = useTheme();
  const iconColor =
    state === "done" ? GREEN : state === "failed" ? RED : state === "running" ? ACCENT : t.textMuted;

  return (
    <Box sx={{ display: "flex", gap: 1.5 }}>
      {/* ── connector rail + status dot, so stages read as one continuous pipeline rather than a loose checklist ── */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: state === "pending" ? "transparent" : `${iconColor}18`,
            border: state === "pending" ? `1.5px solid ${t.border}` : `1.5px solid ${iconColor}55`,
            flexShrink: 0,
          }}
        >
          {state === "done" && <CheckCircleIcon sx={{ fontSize: 14, color: GREEN }} />}
          {state === "failed" && <CancelIcon sx={{ fontSize: 14, color: RED }} />}
          {state === "running" && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: ACCENT,
                boxShadow: `0 0 8px ${ACCENT}`,
                animation: "trainingPulse 1.4s ease-in-out infinite",
                "@keyframes trainingPulse": {
                  "0%, 100%": { opacity: 1, transform: "scale(1)" },
                  "50%": { opacity: 0.4, transform: "scale(0.7)" },
                },
              }}
            />
          )}
          {state === "pending" && <RadioButtonUncheckedIcon sx={{ fontSize: 12, color: t.textMuted }} />}
        </Box>
        {!isLast && (
          <Box sx={{ width: "1.5px", flex: 1, minHeight: 18, background: state === "pending" ? t.border : `${iconColor}40`, my: "2px" }} />
        )}
      </Box>

      <Box sx={{ pb: 2.2, flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: ".8rem",
            fontWeight: state === "running" ? 700 : 500,
            color: state === "pending" ? t.textMuted : t.text,
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        {detail && (
          <Typography sx={{ fontSize: ".72rem", color: t.textSecondary, mt: "2px" }}>
            {detail}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function JobCard({ job }: { job: TrainingJob }) {
  const { t } = useTheme();
  const stageMap: Record<string, { status: string; detail?: string }> = {};
  for (const s of job.stages || []) stageMap[s.name] = { status: s.status, detail: s.detail };

  return (
    <Box
      sx={{
        borderRadius: "16px",
        background: t.surface,
        border: `1px solid ${t.border}`,
        overflow: "hidden",
        mb: 2.5,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
      }}
    >
      {/* ── header, matching the accent-gradient card headers used across AlertDetail/Rules ── */}
      <Box
        sx={{
          px: 3,
          py: "16px",
          background: `linear-gradient(135deg, ${ACCENT}15 0%, transparent 60%)`,
          borderBottom: `1px solid ${ACCENT}25`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, minWidth: 0 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "9px",
              background: `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 14px ${ACCENT}45`,
            }}
          >
            <ModelTrainingIcon sx={{ fontSize: 16, color: "#fff" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: t.text, fontSize: ".88rem", fontWeight: 700, textTransform: "capitalize", lineHeight: 1.25 }} noWrap>
              Teaching itself: {job.class_name}
            </Typography>
            <Typography sx={{ color: t.textMuted, fontSize: ".68rem", mt: "1px" }}>
              OMNIX has never seen this before
            </Typography>
          </Box>
        </Box>
        <StatusPill status={job.status} />
      </Box>

      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        {PIPELINE_STAGES.map((st, i) => {
          const entry = stageMap[st.key];
          let state = "pending";
          if (entry) state = entry.status;
          else if (job.current_stage === st.key) state = "running";
          if (job.status === "failed" && job.current_stage === st.key) state = "failed";
          return (
            <StageRow
              key={st.key}
              label={st.label}
              state={state}
              detail={entry?.detail}
              isLast={i === PIPELINE_STAGES.length - 1}
            />
          );
        })}
      </Box>

      {job.error && (
        <Box sx={{ mx: 3, mb: 2.5, px: 2, py: 1.2, borderRadius: "10px", background: `${RED}12`, border: `1px solid ${RED}35` }}>
          <Tooltip title={job.error}>
            <Typography sx={{ color: RED, fontSize: ".72rem", fontWeight: 500, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {job.error}
            </Typography>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

export default function TrainingJobsPanel() {
  const { t } = useTheme();
  const { data: jobs } = useQuery({
    queryKey: ["training-jobs"],
    queryFn: fetchTrainingJobs,
    refetchInterval: 3000,
  });

  const active = (jobs || []).filter((j) => !["cancelled"].includes(j.status));

  return (
    <Box sx={{ p: 4, maxWidth: 900, position: "relative", zIndex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, mb: "6px" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            background: `linear-gradient(135deg, ${ACCENT}, #8B2E1F)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 18px ${ACCENT}45`,
            flexShrink: 0,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 19, color: "#fff" }} />
        </Box>
        <Typography sx={{ color: t.text, fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-.3px" }}>
          Self-Learning Pipeline
        </Typography>
      </Box>
      <Typography sx={{ color: t.textSecondary, fontSize: ".85rem", lineHeight: 1.6, mb: 3.5, maxWidth: 640 }}>
        When a rule asks for something OMNIX hasn't been taught to see yet, it builds the ability itself —
        finding a dataset, training a model, and evaluating it — no engineers, no manual training.
      </Typography>

      {active.length === 0 ? (
        <Box
          sx={{
            borderRadius: "16px",
            background: t.surface,
            border: `1px dashed ${t.border}`,
            px: 4,
            py: 5,
            textAlign: "center",
          }}
        >
          <ModelTrainingIcon sx={{ fontSize: 30, color: t.textMuted, mb: 1 }} />
          <Typography sx={{ color: t.textSecondary, fontSize: ".85rem" }}>
            No training jobs right now.
          </Typography>
          <Typography sx={{ color: t.textMuted, fontSize: ".76rem", mt: "4px" }}>
            Ask for a rule involving something new, and it'll show up here.
          </Typography>
        </Box>
      ) : (
        active.map((j) => <JobCard key={j.id} job={j} />)
      )}
    </Box>
  );
}