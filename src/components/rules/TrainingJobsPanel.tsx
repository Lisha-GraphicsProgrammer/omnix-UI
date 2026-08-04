import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import { fetchTrainingJobs, TrainingJob } from "../../api/trainingJobs";

// Canonical pipeline order — stages the backend hasn't reached yet render as pending
const PIPELINE_STAGES = [
  { key: "queued", label: "Queued" },
  { key: "searching_data", label: "Searching datasets" },
  { key: "preparing_dataset", label: "Preparing dataset" },
  { key: "training", label: "Training model" },
  { key: "evaluating", label: "Evaluating" },
  { key: "awaiting_approval", label: "Awaiting your approval" },
];

const STATUS_COLORS: Record<
  string,
  "default" | "info" | "warning" | "success" | "error"
> = {
  pending: "info",
  searching_data: "info",
  preparing_dataset: "info",
  training: "warning",
  evaluating: "warning",
  awaiting_approval: "warning",
  approved: "success",
  failed: "error",
  cancelled: "default",
};

function StageRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: string;
  detail?: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.5, alignItems: "center" }}>
      {state === "done" && (
        <CheckCircleIcon sx={{ fontSize: 20 }} color="success" />
      )}
      {state === "running" && <CircularProgress size={16} thickness={5} />}
      {state === "failed" && <CancelIcon sx={{ fontSize: 20 }} color="error" />}
      {state === "pending" && (
        <RadioButtonUncheckedIcon
          sx={{ fontSize: 20, color: "text.disabled" }}
        />
      )}
      <Typography
        variant="body2"
        sx={{
          color: state === "pending" ? "text.disabled" : "text.primary",
          fontWeight: state === "running" ? 600 : 400,
        }}
      >
        {label}
      </Typography>
      {detail && (
        <Typography variant="caption" color="text.secondary">
          — {detail}
        </Typography>
      )}
    </Stack>
  );
}

function JobCard({ job }: { job: TrainingJob }) {
  const stageMap: Record<string, { status: string; detail?: string }> = {};
  for (const s of job.stages || [])
    stageMap[s.name] = { status: s.status, detail: s.detail };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ mb: 1, alignItems: "center" }}
        >
          <ModelTrainingIcon color="primary" />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, textTransform: "capitalize" }}
          >
            Teaching itself: {job.class_name}
          </Typography>
          <Chip
            size="small"
            label={job.status.replace(/_/g, " ")}
            color={STATUS_COLORS[job.status] || "default"}
          />
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          OMNIX has never seen “{job.class_name}” — building a new detection
          ability for it. Training runs in the background; your rule activates
          once the new model is approved.
        </Typography>
        <Box sx={{ pl: 0.5 }}>
          {PIPELINE_STAGES.map((st) => {
            const entry = stageMap[st.key];
            let state = "pending";
            if (entry) state = entry.status;
            else if (job.current_stage === st.key) state = "running";
            if (job.status === "failed" && job.current_stage === st.key)
              state = "failed";
            return (
              <StageRow
                key={st.key}
                label={st.label}
                state={state}
                detail={entry?.detail}
              />
            );
          })}
        </Box>
        {job.error && (
          <Tooltip title={job.error}>
            <Typography
              variant="caption"
              color="error"
              sx={{ mt: 1, display: "block" }}
            >
              {job.error}
            </Typography>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrainingJobsPanel() {
  const { data: jobs } = useQuery({
    queryKey: ["training-jobs"],
    queryFn: fetchTrainingJobs,
    refetchInterval: 3000,
  });

  const active = (jobs || []).filter((j) => !["cancelled"].includes(j.status));

  return (
    <Box sx={{ p: 4, maxWidth: 900 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: "center" }}>
        <ModelTrainingIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Self-Learning Pipeline
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        When a rule asks for something OMNIX hasn't been taught to see yet, it
        builds the ability itself — no engineers, no manual training.
      </Typography>
      {active.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No training jobs right now. Ask for a rule involving something new,
          and it'll show up here.
        </Typography>
      ) : (
        active.map((j) => <JobCard key={j.id} job={j} />)
      )}
    </Box>
  );
}
