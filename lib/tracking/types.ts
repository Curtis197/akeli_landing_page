export type TrackingSource = 'feed' | 'search' | 'meal_planner';

export interface ImpressionPayload {
  recipe_id: string;
  source: TrackingSource;
}

export interface OpenPayload {
  recipe_id: string;
  source: TrackingSource;
}

export interface OpenResponse {
  id: string;
}

export interface ClosePayload {
  closed_at: string;
  session_duration_seconds: number;
}
