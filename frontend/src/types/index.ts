export interface Train {
  train_id: string;
  train_name: string;
  train_number: string;
  train_type: string;
  source: string;
  destination: string;
  zone: string;
  total_distance_km: number;
  avg_speed_kmph?: number;
  max_speed_kmph?: number;
  days_of_run?: string;
  data_source?: string;
  telemetry_source?: string;
  scheduled_departure?: string;
  scheduled_arrival?: string;
}

export interface TrainPosition {
  train_id: string;
  latitude: number;
  longitude: number;
  speed_kmph: number;
  delay_minutes: number;
  status: 'ON_TIME' | 'DELAYED' | 'CRITICAL' | 'ARRIVED' | 'On Time' | 'Delayed' | 'Slight Delay' | 'Critical Delay' | string;
  current_station: string;
  next_station: string;
  next_station_name?: string;
  distance_covered_km: number;
  distance_remaining_km: number;
  journey_progress: number;
  last_updated: string;
  telemetry_source?: string;
  is_simulated?: boolean;
}

export interface PredictionFactor {
  factor_name: string;
  impact_minutes: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ETAPrediction {
  station_code: string;
  station_name: string;
  scheduled_arrival: string;
  predicted_arrival: string;
  predicted_delay_minutes: number;
  confidence: number;
  confidence_level: 'High' | 'Medium' | 'Low';
  factors: PredictionFactor[];
}

export interface RouteStop {
  station_code: string;
  station_name: string;
  arrival: string;
  departure: string;
  distance_from_source: number | null;
  stop_number: number;
  halt_minutes: number;
  status: 'completed' | 'current' | 'upcoming';
}

export interface Alert {
  id: string;
  train_id: string;
  train_name: string;
  severity: 'success' | 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  location: string;
  eta_impact_minutes: number;
  created_at: string;
  acknowledged: boolean;
}

export interface CongestionSection {
  section_id: string;
  from_station: string;
  to_station: string;
  congestion_score: number;
  avg_speed_kmph: number;
  active_trains: number;
  status: 'normal' | 'congested' | 'severe';
  delay_impact_minutes?: number;
}

export interface KPIData {
  active_trains: number;
  on_time: number;
  delayed: number;
  critical: number;
  avg_delay?: number;
  avg_delay_minutes?: number;
  prediction_accuracy: number;
  active_alerts: number;
}

export interface SimulationStatus {
  running: boolean;
  tick_count: number;
  train_count: number;
  last_update: string;
}

export interface OperationalEvent {
  event_type: string;
  train_id: string;
  location: string;
  severity: number;
  duration_minutes: number;
  description: string;
}

export interface AnalyticsData {
  total_trains?: number;
  active_trains?: number;
  on_time_trains?: number;
  delayed_trains?: number;
  critical_trains?: number;
  avg_delay_minutes?: number;
  prediction_accuracy?: number;
  active_alerts?: number;
  delay_by_route?: Array<{
    route: string;
    avg_delay: number;
    train_count: number;
  }>;
  delay_by_hour?: Array<{
    hour: number;
    avg_delay: number;
  }>;
  delay_distribution?: Array<{
    range: string;
    count: number;
  }>;
  punctuality?: Record<string, number> | Array<{ name: string; value: number }>;
  model_performance?: {
    mae: number;
    rmse: number;
    r_squared?: number;
    model_type?: string;
    feature_count?: number;
    training_samples?: number;
    note?: string;
  };
  modelPerformance?: {
    mae: number;
    rmse: number;
    r2: number;
  };
  delayByRoute?: Array<{ route: string; avgDelay: number }>;
  accuracyOverTime?: Array<{ time: string; accuracy: number }>;
}

