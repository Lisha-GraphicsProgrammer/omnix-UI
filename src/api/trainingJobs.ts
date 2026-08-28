import { apiGet, apiPost } from '../lib/api'

export interface TrainingJobStage {
  name: string
  status: 'done' | 'running' | 'failed' | 'pending'
  detail?: string
  progress_current?: number
  progress_total?: number
  started_at?: string
  finished_at?: string
}

export interface TrainingJob {
  id: number
  class_name: string
  status: string
  current_stage: string | null
  stages: TrainingJobStage[]
  metrics: Record<string, number> | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface TrainingJobsPage {
  items: TrainingJob[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ── Paginated + filterable list, matching the /api/training-jobs endpoint's
// page/page_size/status/search query params. Server does the filtering and
// paging now — no client-side slicing. ──
export const fetchTrainingJobs = (params: {
  page?: number
  pageSize?: number
  status?: string
  search?: string
} = {}): Promise<TrainingJobsPage> => {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 1))
  q.set('page_size', String(params.pageSize ?? 20))
  if (params.status && params.status !== 'all') q.set('status', params.status)
  if (params.search && params.search.trim()) q.set('search', params.search.trim())
  return apiGet(`/api/training-jobs?${q.toString()}`)
}

export const fetchTrainingJob = (id: number): Promise<TrainingJob> =>
  apiGet(`/api/training-jobs/${id}`)

export const approveTrainingJob = (id: number) =>
  apiPost(`/api/training-jobs/${id}/approve`, {})

export const rejectTrainingJob = (id: number) =>
  apiPost(`/api/training-jobs/${id}/reject`, {})
