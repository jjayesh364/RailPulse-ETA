from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from app.database.db import Base


class Train(Base):
    __tablename__ = "trains"
    train_id = Column(String, primary_key=True, index=True)
    train_name = Column(String, nullable=False)
    train_number = Column(String, nullable=False)
    train_type = Column(String, nullable=False)  # rajdhani, shatabdi, express, superfast, mail
    source = Column(String, nullable=False)
    source_code = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    destination_code = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    total_distance_km = Column(Float, nullable=False)
    scheduled_departure = Column(String, nullable=False)
    scheduled_arrival = Column(String, nullable=False)
    avg_speed_kmph = Column(Float, default=60.0)
    max_speed_kmph = Column(Float, default=130.0)
    days_of_run = Column(String, default="Mon,Tue,Wed,Thu,Fri,Sat,Sun")


class Station(Base):
    __tablename__ = "stations"
    station_code = Column(String, primary_key=True, index=True)
    station_name = Column(String, nullable=False)
    city = Column(String)
    state = Column(String)
    zone = Column(String)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    platform_count = Column(Integer, default=4)
    is_junction = Column(Boolean, default=False)


class RouteStop(Base):
    __tablename__ = "route_stops"
    id = Column(Integer, primary_key=True, autoincrement=True)
    train_id = Column(String, index=True, nullable=False)
    station_code = Column(String, nullable=False)
    station_name = Column(String, nullable=False)
    arrival = Column(String)  # HH:MM format or null for origin
    departure = Column(String)  # HH:MM format or null for destination
    distance_from_source = Column(Float, nullable=False, default=0)
    day = Column(Integer, default=1)  # Day of journey
    stop_number = Column(Integer, nullable=False)
    halt_minutes = Column(Integer, default=2)


class TrainPosition(Base):
    __tablename__ = "train_positions"
    train_id = Column(String, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmph = Column(Float, default=0.0)
    delay_minutes = Column(Float, default=0.0)
    status = Column(String, default="On Time")  # On Time, Slight Delay, Delayed, Critical Delay
    current_station_code = Column(String)
    current_station_name = Column(String)
    next_station_code = Column(String)
    next_station_name = Column(String)
    distance_covered_km = Column(Float, default=0.0)
    total_distance_km = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Simulation state
    current_stop_index = Column(Integer, default=0)
    at_station = Column(Boolean, default=True)
    dwell_remaining_seconds = Column(Float, default=0)


class ETAPrediction(Base):
    __tablename__ = "eta_predictions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    train_id = Column(String, index=True)
    station_code = Column(String)
    station_name = Column(String)
    scheduled_arrival = Column(String)
    predicted_arrival = Column(String)
    predicted_delay_minutes = Column(Float)
    confidence = Column(Float, default=80.0)
    confidence_level = Column(String, default="Medium")
    factors_json = Column(Text, default="[]")  # JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OperationalEvent(Base):
    __tablename__ = "operational_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False)
    train_id = Column(String, nullable=False)
    location = Column(String, default="En route")
    severity = Column(Float, default=0.5)
    duration_minutes = Column(Integer, default=30)
    description = Column(String, default="")
    impact_delay_minutes = Column(Float, default=0.0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    train_id = Column(String)
    train_name = Column(String, default="")
    severity = Column(String, default="info")  # critical, warning, info, success
    alert_type = Column(String, default="delay")
    message = Column(String, nullable=False)
    location = Column(String, default="")
    eta_impact_minutes = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    acknowledged = Column(Boolean, default=False)


class CongestionSection(Base):
    __tablename__ = "congestion_sections"
    section_id = Column(String, primary_key=True)
    from_station = Column(String, nullable=False)
    to_station = Column(String, nullable=False)
    from_station_name = Column(String, default="")
    to_station_name = Column(String, default="")
    congestion_score = Column(Float, default=0.0)
    avg_speed_kmph = Column(Float, default=80.0)
    active_trains = Column(Integer, default=0)
    status = Column(String, default="Normal")  # Normal, Moderate, High, Critical
    delay_impact_minutes = Column(Float, default=0.0)


class RealTrain(Base):
    __tablename__ = "real_trains"
    train_number = Column(String, primary_key=True, index=True)
    train_name = Column(String, index=True, nullable=False)
    train_type = Column(String, default="Superfast")
    source_station = Column(String, nullable=False)
    source_station_name = Column(String, default="")
    destination_station = Column(String, nullable=False)
    destination_station_name = Column(String, default="")
    distance = Column(Float, default=0.0)
    running_days = Column(String, default="Daily")
    data_source = Column(String, default="NTES/DataMeet")
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RealTrainStop(Base):
    __tablename__ = "real_train_stops"
    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String, index=True, nullable=False)
    sequence = Column(Integer, nullable=False)
    station_code = Column(String, index=True, nullable=False)
    station_name = Column(String, nullable=False)
    arrival_time = Column(String, nullable=True)
    departure_time = Column(String, nullable=True)
    halt_minutes = Column(Integer, default=2)
    day_offset = Column(Integer, default=1)
    distance = Column(Float, nullable=True, default=None)

