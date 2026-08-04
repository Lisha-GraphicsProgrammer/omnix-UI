import { apiGet } from '../lib/api'

export interface TrainingJobStage {
  name: string
  status: 'done' | 'running' | 'failed' | 'pending'
  detail?: string
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

export const fetchTrainingJobs = (): Promise<TrainingJob[]> =>
  apiGet('/api/training-jobs')

export const fetchTrainingJob = (id: number): Promise<TrainingJob> =>
  apiGet(`/api/training-jobs/${id}`)