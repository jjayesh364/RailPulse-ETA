from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TrainResponse(BaseModel):
    train_id: str
    train_name: str
    train_number: str
    train_type: str
    source: str
    source_code: str
    destination: str
    destination_code: str
    zone: str
    total_distance_km: float
    scheduled_departure: str
    scheduled_arrival: str
    avg_speed_kmph: float
    max_speed_kmph: float
    status: str = "Unknown"
    current_delay_minutes: int = 0
    days_of_run: Optional[str] = "Daily"
    data_source: str = "Demo Dataset"
    telemetry_source: str = "Simulated GPS/AVL"

    class Config:
        from_attributes = True


class TrainListResponse(BaseModel):
    trains: List[TrainResponse]
    total: int


class TrainPositionResponse(BaseModel):
    train_id: str
    latitude: float
    longitude: float
    speed_kmph: float
    delay_minutes: int
    status: str
    current_station: Optional[str] = None
    current_station_name: Optional[str] = None
    next_station: Optional[str] = None
    next_station_name: Optional[str] = None
    distance_covered_km: float
    distance_remaining_km: float
    journey_progress: float
    last_updated: str

    class Config:
        from_attributes = True


class PredictionFactorResponse(BaseModel):
    factor_name: str
    impact_minutes: float
    description: str
    severity: str = "low"


class ETAPredictionResponse(BaseModel):
    train_id: str
    station_code: str
    station_name: str
    scheduled_arrival: str
    predicted_arrival: str
    predicted_delay_minutes: float
    confidence: float
    confidence_level: str
    factors: List[PredictionFactorResponse] = []

    class Config:
        from_attributes = True


class RouteStopResponse(BaseModel):
    station_code: str
    station_name: str
    arrival: Optional[str] = None
    departure: Optional[str] = None
    distance_from_source: Optional[float] = None
    day: int
    stop_number: int
    halt_minutes: int
    status: str = "upcoming"
    predicted_arrival: Optional[str] = None
    predicted_delay_minutes: Optional[float] = None

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    train_id: str
    train_name: str = ""
    severity: str
    alert_type: str
    message: str
    location: str
    eta_impact_minutes: float
    created_at: str
    acknowledged: bool = False

    class Config:
        from_attributes = True


class CongestionSectionResponse(BaseModel):
    section_id: str
    from_station: str
    to_station: str
    congestion_score: float
    avg_speed_kmph: float
    active_trains: int
    status: str
    delay_impact_minutes: float = 0.0

    class Config:
        from_attributes = True


class EventCreateRequest(BaseModel):
    event_type: str = Field(..., description="Type: signal_congestion, speed_restriction, unscheduled_halt, track_maintenance, heavy_rain, station_overcrowding, preceding_train_delay, level_crossing_delay")
    train_id: str = Field(..., description="Affected train ID")
    location: str = Field(default="En route", description="Location of event")
    severity: float = Field(default=0.5, ge=0.0, le=1.0, description="Severity 0-1")
    duration_minutes: int = Field(default=30, ge=1, le=300, description="Duration in minutes")
    description: str = Field(default="", description="Event description")


class EventResponse(BaseModel):
    id: int
    event_type: str
    train_id: str
    location: str
    severity: float
    duration_minutes: int
    description: str
    impact_delay_minutes: float
    active: bool
    created_at: str

    class Config:
        from_attributes = True


class DelayByRouteItem(BaseModel):
    route: str
    avg_delay: float
    train_count: int


class DelayByHourItem(BaseModel):
    hour: int
    avg_delay: float


class ModelPerformanceResponse(BaseModel):
    mae: float
    rmse: float
    r_squared: float
    model_type: str
    feature_count: int
    training_samples: int
    note: str = "Model evaluation on simulated demo dataset"


class AnalyticsResponse(BaseModel):
    total_trains: int
    active_trains: int
    on_time_trains: int
    delayed_trains: int
    critical_trains: int
    avg_delay_minutes: float
    prediction_accuracy: float
    active_alerts: int
    delay_by_route: List[DelayByRouteItem] = []
    delay_by_hour: List[DelayByHourItem] = []
    delay_distribution: List[Dict[str, Any]] = []
    punctuality: Dict[str, int] = {}
    model_performance: Optional[ModelPerformanceResponse] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    demo_mode: bool
    simulation_running: bool
    ml_model_loaded: bool
    database_ok: bool
    active_trains: int
    last_update: str


class SimulationStatusResponse(BaseModel):
    running: bool
    tick_count: int
    train_count: int
    interval_seconds: int
    last_update: str
    events_active: int


class KPIResponse(BaseModel):
    active_trains: int
    on_time: int
    delayed: int
    critical: int
    avg_delay_minutes: float
    prediction_accuracy: float
    active_alerts: int


class TrainDetailResponse(BaseModel):
    train: TrainResponse
    position: Optional[TrainPositionResponse] = None
    route: List[RouteStopResponse] = []
    etas: List[ETAPredictionResponse] = []
    factors: List[PredictionFactorResponse] = []
    recent_alerts: List[AlertResponse] = []


class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: str
