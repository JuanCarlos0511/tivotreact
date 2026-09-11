export interface OverviewMetrics {
  total_participants: number;
  completed_participants: number;
  active_sessions: number;
  completion_rate: number;
  avg_time_level_1_s: number;
  avg_time_level_4_s: number;
  time_reduction_pct: number;
  avg_sus_score: number;
  sus_acceptable_threshold: number;
  dropout_rate_by_level: Record<string, number>;
}

export interface LearningCurveLevel {
  level_id: number;
  level_name: string;
  median_attempts: number;
  mean_attempts: number;
  median_time_s: number;
  mean_time_s: number;
  first_try_success_pct: number;
  sample_size: number;
}

export interface ScaffoldingItem {
  hint_type: string;
  total_requested: number;
  effective_count: number;
  ineffective_count: number;
  efficacy_pct: number;
}

export interface ErrorCategoryItem {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ErrorTaxonomy {
  total_errors: number;
  categories: ErrorCategoryItem[];
}

export interface LikertDimension {
  label: string;
  mean: number;
  std: number;
  distribution: Record<number, number>;
}

export interface SurveySummary {
  sample_size: number;
  tam: {
    perceived_usefulness?: LikertDimension;
    perceived_ease_of_use?: LikertDimension;
    ai_trust?: LikertDimension;
    [key: string]: LikertDimension | undefined;
  };
  sus: {
    mean: number;
    acceptable_pct: number;
    distribution: number[];
  };
}

export interface ParticipantItem {
  id: string;
  participant_id: string;
  group_id: string;
  has_assent: boolean;
  max_level: number;
  total_active_time_s: number;
  total_hints_used: number;
  status: string;
  started_at: string | null;
}

export interface ParticipantsResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ParticipantItem[];
}

export type ActiveTab = 'dashboard' | 'participants' | 'export';
