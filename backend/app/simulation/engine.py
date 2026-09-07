"""
RailPulse ETA - Simulation Engine

Simulates real-time train movement, speed changes, delays, and operational events.
Designed to be replaceable with real Indian Railways data feeds.
"""

import asyncio
import json
import math
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set

from sqlalchemy import select, func, delete
from app.database.db import async_session_maker
from app.models.database_models import (
    Train, Station, RouteStop, TrainPosition,
    OperationalEvent, Alert, CongestionSection, ETAPrediction,
    RealTrain, RealTrainStop
)
from app.config import settings


class SimulationEngine:
    """
    Background simulation engine that mimics real-time train operations.

    For SIH prototype, simulated data is used because Indian Railways
    operational APIs are not publicly available to the development team.

    Architecture note: This class can be replaced by a RealDataAdapter
    that consumes actual GPS/AVL feeds, signal data, and NTES information.
    """

    def __init__(self):
        self._is_running = False
        self._task: Optional[asyncio.Task] = None
        self._tick_count = 0
        self._last_update = datetime.now(timezone.utc)
        self._ws_clients: List = []  # WebSocket connections
        self._active_events: Dict[str, dict] = {}  # train_id -> active events
        self._registered_real_trains: Set[str] = set()  # actively simulated real train numbers
        self._eta_predictor = None

    @property
    def is_running(self):
        return self._is_running

    @property
    def tick_count(self):
        return self._tick_count

    @property
    def last_update(self):
        return self._last_update

    def register_ws_client(self, ws):
        if ws not in self._ws_clients:
            self._ws_clients.append(ws)

    def unregister_ws_client(self, ws):
        if ws in self._ws_clients:
            self._ws_clients.remove(ws)

    def set_predictor(self, predictor):
        self._eta_predictor = predictor

    async def start(self):
        if self._is_running:
            return {"status": "already_running"}
        self._is_running = True
        self._task = asyncio.create_task(self._run_loop())
        print(f"[Simulation] Started. Interval: {settings.SIMULATION_INTERVAL}s")
        return {"status": "started"}

    async def stop(self):
        self._is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        print("[Simulation] Stopped.")
        return {"status": "stopped"}

    async def _run_loop(self):
        while self._is_running:
            try:
                await self.tick()
            except Exception as e:
                print(f"[Simulation] Tick error: {e}")
            await asyncio.sleep(settings.SIMULATION_INTERVAL)

    async def tick(self):
        """One simulation step - updates all train states."""
        self._tick_count += 1
        self._last_update = datetime.now(timezone.utc)

        async with async_session_maker() as session:
            # 1. Get all train positions
            positions_result = await session.execute(select(TrainPosition))
            positions = positions_result.scalars().all()

            if not positions:
                return

            updates = []

            for pos in positions:
                update_data = await self._update_train_position(session, pos)
                if update_data:
                    updates.append(update_data)

            # 2. Update congestion
            await self._update_congestion(session)

            # 3. Expire old events
            await self._expire_events(session)

            # 4. Calculate ETAs
            await self._calculate_all_etas(session)

            # 5. Check for alert-worthy conditions
            await self._check_alerts(session)

            await session.commit()

        # 6. Broadcast to WebSocket clients
        if updates:
            await self._broadcast_updates(updates)

    async def _update_train_position(self, session, pos: TrainPosition) -> Optional[dict]:
        """Update a single train's position, speed, and delay."""
        # Get route stops
        stops_result = await session.execute(
            select(RouteStop)
            .where(RouteStop.train_id == pos.train_id)
            .order_by(RouteStop.stop_number)
        )
        stops = stops_result.scalars().all()

        if not stops or pos.current_stop_index >= len(stops) - 1:
            return None

        current_stop = stops[pos.current_stop_index]
        next_idx = min(pos.current_stop_index + 1, len(stops) - 1)
        next_stop = stops[next_idx]

        # Get train info for speed limits
        train_result = await session.execute(
            select(Train).where(Train.train_id == pos.train_id)
        )
        train = train_result.scalar_one_or_none()
        if not train:
            return None

        # Simulation time step (accelerated: each tick = ~1 minute of real time)
        sim_minutes = 1.0

        if pos.at_station:
            # Handle station dwell
            pos.dwell_remaining_seconds -= settings.SIMULATION_INTERVAL
            if pos.dwell_remaining_seconds <= 0:
                pos.at_station = False
                pos.dwell_remaining_seconds = 0
                pos.current_stop_index = next_idx
                pos.speed_kmph = train.avg_speed_kmph * random.uniform(0.5, 0.8)
        else:
            # Calculate section distance
            section_distance = next_stop.distance_from_source - current_stop.distance_from_source
            if section_distance <= 0:
                section_distance = 20  # fallback

            distance_in_section = pos.distance_covered_km - current_stop.distance_from_source
            remaining_in_section = max(0, section_distance - distance_in_section)

            # Speed variation (realistic)
            target_speed = train.avg_speed_kmph
            # Check for active events affecting speed
            speed_factor = 1.0
            if pos.train_id in self._active_events:
                events = self._active_events[pos.train_id]
                for evt in events.values():
                    if evt.get("event_type") == "speed_restriction":
                        speed_factor *= (1.0 - evt.get("severity", 0.3) * 0.5)
                    elif evt.get("event_type") == "signal_congestion":
                        speed_factor *= (1.0 - evt.get("severity", 0.3) * 0.4)
                    elif evt.get("event_type") == "heavy_rain":
                        speed_factor *= (1.0 - evt.get("severity", 0.3) * 0.3)
                    elif evt.get("event_type") in ("unscheduled_halt", "level_crossing_delay"):
                        speed_factor *= 0.1

            target_speed *= speed_factor
            # Add random variation
            target_speed *= random.uniform(0.9, 1.1)
            target_speed = max(5, min(target_speed, train.max_speed_kmph))

            # Smooth speed change
            speed_change = (target_speed - pos.speed_kmph) * 0.3
            pos.speed_kmph = round(max(0, pos.speed_kmph + speed_change), 1)

            # Slow down near station
            if remaining_in_section < 5:
                pos.speed_kmph = min(pos.speed_kmph, 40)
            if remaining_in_section < 1:
                pos.speed_kmph = min(pos.speed_kmph, 15)

            # Move train
            distance_moved = (pos.speed_kmph / 60.0) * sim_minutes
            pos.distance_covered_km = round(pos.distance_covered_km + distance_moved, 2)

            # Check if reached next station
            if pos.distance_covered_km >= next_stop.distance_from_source:
                pos.distance_covered_km = next_stop.distance_from_source
                pos.at_station = True
                pos.dwell_remaining_seconds = (next_stop.halt_minutes or 2) * settings.SIMULATION_INTERVAL
                pos.current_station_code = next_stop.station_code
                pos.current_station_name = next_stop.station_name
                pos.speed_kmph = 0

                # Update next station
                if next_idx + 1 < len(stops):
                    pos.next_station_code = stops[next_idx + 1].station_code
                    pos.next_station_name = stops[next_idx + 1].station_name
                else:
                    pos.next_station_code = next_stop.station_code
                    pos.next_station_name = next_stop.station_name

            # Interpolate lat/lng
            if section_distance > 0:
                progress = min(1.0, max(0, distance_in_section / section_distance))
            else:
                progress = 0

            # Get station coordinates
            curr_st = await session.execute(
                select(Station).where(Station.station_code == current_stop.station_code)
            )
            next_st = await session.execute(
                select(Station).where(Station.station_code == next_stop.station_code)
            )
            curr_station = curr_st.scalar_one_or_none()
            next_station = next_st.scalar_one_or_none()

            if curr_station and next_station:
                pos.latitude = round(
                    curr_station.latitude + (next_station.latitude - curr_station.latitude) * progress, 4
                )
                pos.longitude = round(
                    curr_station.longitude + (next_station.longitude - curr_station.longitude) * progress, 4
                )

        # Update delay - gradual changes with some recovery tendency
        delay_change = random.gauss(0, 0.5)
        # Events cause delay to increase
        if pos.train_id in self._active_events:
            for evt in self._active_events[pos.train_id].values():
                severity = evt.get("severity", 0.3)
                delay_change += severity * random.uniform(0.1, 0.5)
        else:
            # Natural recovery tendency
            if pos.delay_minutes > 5:
                delay_change -= random.uniform(0, 0.3)

        pos.delay_minutes = round(max(0, pos.delay_minutes + delay_change), 1)

        # Update status
        if pos.delay_minutes <= 2:
            pos.status = "On Time"
        elif pos.delay_minutes <= 10:
            pos.status = "Slight Delay"
        elif pos.delay_minutes <= 30:
            pos.status = "Delayed"
        else:
            pos.status = "Critical Delay"

        is_real = pos.train_id in self._registered_real_trains
        telemetry_source = (
            "Simulated Telemetry (No Authorized Live Feed)"
            if is_real
            else "Simulated Live Telemetry"
        )
        data_source = (
            "Real Train Master (NTES/DataMeet)"
            if is_real
            else "Demo Simulation Engine"
        )

        return {
            "train_id": pos.train_id,
            "latitude": pos.latitude,
            "longitude": pos.longitude,
            "speed_kmph": pos.speed_kmph,
            "delay_minutes": pos.delay_minutes,
            "status": pos.status,
            "current_station": pos.current_station_name,
            "next_station": pos.next_station_name,
            "distance_covered_km": pos.distance_covered_km,
            "journey_progress": round(
                (pos.distance_covered_km / pos.total_distance_km * 100)
                if pos.total_distance_km > 0 else 0, 1
            ),
            "telemetry_source": telemetry_source,
            "data_source": data_source,
            "is_simulated": True,
        }

    async def _update_congestion(self, session):
        """Update network congestion levels."""
        sections_result = await session.execute(select(CongestionSection))
        sections = sections_result.scalars().all()

        for section in sections:
            # Gradually change congestion (random walk)
            change = random.gauss(0, 0.02)
            section.congestion_score = round(
                max(0, min(1, section.congestion_score + change)), 3
            )

            # Update status based on score
            if section.congestion_score < 0.25:
                section.status = "Normal"
                section.delay_impact_minutes = 0
            elif section.congestion_score < 0.5:
                section.status = "Moderate"
                section.delay_impact_minutes = round(section.congestion_score * 5, 1)
            elif section.congestion_score < 0.75:
                section.status = "High"
                section.delay_impact_minutes = round(section.congestion_score * 10, 1)
            else:
                section.status = "Critical"
                section.delay_impact_minutes = round(section.congestion_score * 15, 1)

            # Adjust average speed inversely with congestion
            section.avg_speed_kmph = round(
                max(20, 100 * (1 - section.congestion_score * 0.6)), 1
            )

    async def _expire_events(self, session):
        """Expire old operational events."""
        now = datetime.now(timezone.utc)
        events_result = await session.execute(
            select(OperationalEvent).where(OperationalEvent.active == True)
        )
        for event in events_result.scalars().all():
            exp = event.expires_at
            if exp:
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    event.active = False
                    # Remove from active events cache
                    if event.train_id in self._active_events:
                        self._active_events[event.train_id].pop(str(event.id), None)
                        if not self._active_events[event.train_id]:
                            del self._active_events[event.train_id]

    async def _calculate_all_etas(self, session):
        """Recalculate ETAs for all active trains."""
        positions_result = await session.execute(select(TrainPosition))

        for pos in positions_result.scalars().all():
            stops_result = await session.execute(
                select(RouteStop)
                .where(RouteStop.train_id == pos.train_id)
                .where(RouteStop.stop_number > pos.current_stop_index)
                .order_by(RouteStop.stop_number)
            )
            upcoming_stops = stops_result.scalars().all()

            cumulative_delay = pos.delay_minutes
            cumulative_distance = pos.distance_covered_km

            for stop in upcoming_stops[:10]:  # Limit to next 10 stops
                # Calculate running time to this stop
                distance = stop.distance_from_source - cumulative_distance
                if distance <= 0:
                    continue

                # Get train for avg speed
                train_result = await session.execute(
                    select(Train).where(Train.train_id == pos.train_id)
                )
                train = train_result.scalar_one_or_none()
                if not train:
                    break

                avg_speed = max(30, pos.speed_kmph if pos.speed_kmph > 0 else train.avg_speed_kmph)
                running_time_minutes = (distance / avg_speed) * 60

                # ML prediction or fallback
                predicted_additional = await self._predict_additional_delay(
                    pos, train, stop, distance
                )
                total_predicted_delay = round(cumulative_delay + predicted_additional, 1)

                # Confidence calculation
                confidence = self._calculate_confidence(pos, distance, predicted_additional)
                if confidence >= 80:
                    confidence_level = "High"
                elif confidence >= 60:
                    confidence_level = "Medium"
                else:
                    confidence_level = "Low"

                # Prediction factors
                factors = self._get_prediction_factors(pos, train, distance, predicted_additional)

                # Calculate predicted arrival time
                scheduled = stop.arrival or stop.departure or "00:00"
                try:
                    sched_parts = scheduled.split(":")
                    sched_hour = int(sched_parts[0])
                    sched_min = int(sched_parts[1])
                    pred_min = sched_min + int(total_predicted_delay)
                    pred_hour = sched_hour + pred_min // 60
                    pred_min = pred_min % 60
                    pred_hour = pred_hour % 24
                    predicted_arrival = f"{pred_hour:02d}:{pred_min:02d}"
                except (ValueError, IndexError):
                    predicted_arrival = scheduled

                # Upsert ETA prediction
                existing = await session.execute(
                    select(ETAPrediction)
                    .where(ETAPrediction.train_id == pos.train_id)
                    .where(ETAPrediction.station_code == stop.station_code)
                )
                eta = existing.scalar_one_or_none()
                if eta:
                    eta.predicted_arrival = predicted_arrival
                    eta.predicted_delay_minutes = total_predicted_delay
                    eta.confidence = confidence
                    eta.confidence_level = confidence_level
                    eta.factors_json = json.dumps([f.__dict__ if hasattr(f, '__dict__') else f for f in factors])
                    eta.created_at = datetime.now(timezone.utc)
                else:
                    eta = ETAPrediction(
                        train_id=pos.train_id,
                        station_code=stop.station_code,
                        station_name=stop.station_name,
                        scheduled_arrival=scheduled,
                        predicted_arrival=predicted_arrival,
                        predicted_delay_minutes=total_predicted_delay,
                        confidence=confidence,
                        confidence_level=confidence_level,
                        factors_json=json.dumps(factors),
                        created_at=datetime.now(timezone.utc),
                    )
                    session.add(eta)

    async def _predict_additional_delay(self, pos, train, stop, distance) -> float:
        """Predict additional delay using ML model or fallback."""
        if self._eta_predictor and self._eta_predictor.is_model_loaded():
            try:
                features = {
                    "current_delay_minutes": pos.delay_minutes,
                    "current_speed_kmph": pos.speed_kmph,
                    "avg_speed_section_kmph": train.avg_speed_kmph,
                    "distance_to_next_station_km": distance,
                    "distance_to_destination_km": max(0, train.total_distance_km - pos.distance_covered_km),
                    "historical_avg_delay_minutes": pos.delay_minutes * 0.8,
                    "historical_section_delay_minutes": pos.delay_minutes * 0.5,
                    "station_dwell_minutes": stop.halt_minutes or 2,
                    "congestion_score": 0.3,
                    "weather_severity": 0.1,
                    "speed_restriction_active": 1 if pos.train_id in self._active_events else 0,
                    "speed_restriction_severity": 0.0,
                    "preceding_train_delay_minutes": random.uniform(0, 10),
                    "hour_of_day": datetime.now().hour,
                    "day_of_week": datetime.now().weekday(),
                    "number_of_stops_remaining": 5,
                    "train_type": train.train_type,
                    "zone": train.zone,
                    "is_holiday": 0,
                    "recent_speed_trend": 0.0,
                    "recent_delay_trend": 0.1,
                }

                # Check for active events
                if pos.train_id in self._active_events:
                    for evt in self._active_events[pos.train_id].values():
                        if evt.get("event_type") == "speed_restriction":
                            features["speed_restriction_active"] = 1
                            features["speed_restriction_severity"] = evt.get("severity", 0.5)
                        if evt.get("event_type") in ("signal_congestion", "station_overcrowding"):
                            features["congestion_score"] = max(features["congestion_score"], evt.get("severity", 0.5))
                        if evt.get("event_type") == "heavy_rain":
                            features["weather_severity"] = max(features["weather_severity"], evt.get("severity", 0.5))

                result = self._eta_predictor.predict(features)
                return max(0, result.get("predicted_additional_delay", 0))
            except Exception as e:
                print(f"[ML Prediction] Error: {e}")

        # Fallback: rule-based prediction
        return self._fallback_predict(pos, train, distance)

    def _fallback_predict(self, pos, train, distance) -> float:
        """Simple rule-based fallback when ML model is unavailable."""
        additional = 0.0

        # Longer distances = more chance of additional delay
        if distance > 200:
            additional += random.uniform(0, 3)
        elif distance > 100:
            additional += random.uniform(0, 2)

        # Currently delayed trains tend to accumulate more delay
        if pos.delay_minutes > 15:
            additional += random.uniform(0, 2)
        elif pos.delay_minutes > 5:
            additional += random.uniform(-1, 1)

        # Events cause additional delay
        if pos.train_id in self._active_events:
            for evt in self._active_events[pos.train_id].values():
                severity = evt.get("severity", 0.3)
                additional += severity * random.uniform(2, 8)

        # Slow trains accumulate more delay
        if pos.speed_kmph > 0 and pos.speed_kmph < train.avg_speed_kmph * 0.6:
            additional += random.uniform(1, 3)

        # Recovery tendency for moderate delays
        if pos.delay_minutes > 3 and pos.delay_minutes < 15:
            additional -= random.uniform(0, 1)

        return max(0, round(additional, 1))

    def _calculate_confidence(self, pos, distance, predicted_additional) -> float:
        """Calculate prediction confidence score."""
        confidence = 90.0

        # Distance reduces confidence
        if distance > 500:
            confidence -= 15
        elif distance > 200:
            confidence -= 10
        elif distance > 100:
            confidence -= 5

        # High delay reduces confidence
        if pos.delay_minutes > 30:
            confidence -= 15
        elif pos.delay_minutes > 15:
            confidence -= 10
        elif pos.delay_minutes > 5:
            confidence -= 5

        # Active events reduce confidence
        if pos.train_id in self._active_events:
            confidence -= len(self._active_events[pos.train_id]) * 5

        # Low speed = uncertain
        if pos.speed_kmph > 0 and pos.speed_kmph < 20:
            confidence -= 10

        # Recent data = higher confidence
        last_up = pos.last_updated
        if last_up.tzinfo is None:
            last_up = last_up.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - last_up).total_seconds()
        if age > 60:
            confidence -= 5

        return round(max(30, min(98, confidence)), 1)

    def _get_prediction_factors(self, pos, train, distance, predicted_additional) -> list:
        """Get factors contributing to the prediction."""
        factors = []

        # Current delay factor
        if pos.delay_minutes > 0:
            factors.append({
                "factor_name": "Current Delay",
                "impact_minutes": round(pos.delay_minutes * 0.3, 1),
                "description": f"Train is currently {pos.delay_minutes:.0f} min behind schedule",
                "severity": "high" if pos.delay_minutes > 15 else "medium" if pos.delay_minutes > 5 else "low"
            })

        # Speed factor
        if pos.speed_kmph > 0 and pos.speed_kmph < train.avg_speed_kmph * 0.7:
            impact = round((1 - pos.speed_kmph / train.avg_speed_kmph) * 5, 1)
            factors.append({
                "factor_name": "Reduced Speed",
                "impact_minutes": impact,
                "description": f"Running at {pos.speed_kmph:.0f} km/h vs avg {train.avg_speed_kmph:.0f} km/h",
                "severity": "medium"
            })

        # Event factors
        if pos.train_id in self._active_events:
            for evt in self._active_events[pos.train_id].values():
                event_names = {
                    "signal_congestion": "Signal Congestion",
                    "speed_restriction": "Speed Restriction",
                    "unscheduled_halt": "Unscheduled Halt",
                    "track_maintenance": "Track Maintenance",
                    "heavy_rain": "Heavy Rain",
                    "station_overcrowding": "Station Overcrowding",
                    "preceding_train_delay": "Preceding Train Delay",
                    "level_crossing_delay": "Level Crossing Delay",
                }
                name = event_names.get(evt.get("event_type", ""), evt.get("event_type", "Unknown"))
                severity = evt.get("severity", 0.3)
                impact = round(severity * random.uniform(3, 8), 1)
                factors.append({
                    "factor_name": name,
                    "impact_minutes": impact,
                    "description": evt.get("description", f"{name} detected"),
                    "severity": "high" if severity > 0.7 else "medium" if severity > 0.3 else "low"
                })

        # Distance factor
        if distance > 200:
            factors.append({
                "factor_name": "Long Distance Remaining",
                "impact_minutes": round(distance * 0.005, 1),
                "description": f"{distance:.0f} km remaining - uncertainty increases with distance",
                "severity": "low"
            })

        # Historical pattern factor
        if pos.delay_minutes > 3:
            factors.append({
                "factor_name": "Historical Pattern",
                "impact_minutes": round(pos.delay_minutes * 0.15, 1),
                "description": "Similar delays observed in historical data for this route",
                "severity": "low"
            })

        # If no factors, add a baseline
        if not factors:
            factors.append({
                "factor_name": "Normal Operations",
                "impact_minutes": 0.0,
                "description": "Train running within normal parameters",
                "severity": "low"
            })

        return factors

    async def _check_alerts(self, session):
        """Generate alerts for significant conditions."""
        if self._tick_count % 5 != 0:  # Check every 5 ticks
            return

        positions_result = await session.execute(select(TrainPosition))
        for pos in positions_result.scalars().all():
            train_result = await session.execute(
                select(Train).where(Train.train_id == pos.train_id)
            )
            train = train_result.scalar_one_or_none()
            train_name = train.train_name if train else pos.train_id

            if pos.delay_minutes > 30 and random.random() < 0.3:
                alert = Alert(
                    train_id=pos.train_id,
                    train_name=train_name,
                    severity="critical",
                    alert_type="critical_delay",
                    message=f"Critical delay of {pos.delay_minutes:.0f} minutes predicted for {train_name}",
                    location=pos.current_station_name or "En route",
                    eta_impact_minutes=pos.delay_minutes,
                )
                session.add(alert)
            elif pos.delay_minutes > 15 and random.random() < 0.2:
                alert = Alert(
                    train_id=pos.train_id,
                    train_name=train_name,
                    severity="warning",
                    alert_type="significant_delay",
                    message=f"ETA increased significantly for {train_name} (+{pos.delay_minutes:.0f} min)",
                    location=pos.current_station_name or "En route",
                    eta_impact_minutes=pos.delay_minutes,
                )
                session.add(alert)
            elif pos.delay_minutes <= 2 and random.random() < 0.1:
                alert = Alert(
                    train_id=pos.train_id,
                    train_name=train_name,
                    severity="success",
                    alert_type="on_schedule",
                    message=f"{train_name} is running on schedule",
                    location=pos.current_station_name or "En route",
                    eta_impact_minutes=0,
                )
                session.add(alert)

    async def inject_event(self, event_data: dict) -> dict:
        """Inject an operational event into the simulation."""
        async with async_session_maker() as session:
            # Calculate impact delay based on event type and severity
            severity = float(event_data.get("severity", 0.5))
            event_type = event_data.get("event_type", "")
            duration = int(event_data.get("duration_minutes", 30))

            # Resolve 'random' train_id to an actual active train
            train_id = event_data.get("train_id", "")
            if not train_id or train_id.lower() == "random":
                positions_res = await session.execute(select(TrainPosition))
                all_positions = positions_res.scalars().all()
                if all_positions:
                    train_id = random.choice(all_positions).train_id
                    event_data["train_id"] = train_id
                else:
                    return {"error": "No active trains to apply event to"}

            # Different event types have different delay impacts
            impact_multipliers = {
                "signal_congestion": 8,
                "speed_restriction": 6,
                "unscheduled_halt": 10,
                "track_maintenance": 12,
                "heavy_rain": 5,
                "station_overcrowding": 4,
                "preceding_train_delay": 7,
                "level_crossing_delay": 3,
            }
            multiplier = impact_multipliers.get(event_type, 5)
            impact_delay = round(severity * multiplier, 1)

            description = event_data.get("description", "")
            if not description:
                event_descriptions = {
                    "signal_congestion": f"Signal congestion detected with severity {severity:.1f}",
                    "speed_restriction": f"Temporary speed restriction imposed (severity: {severity:.1f})",
                    "unscheduled_halt": f"Unscheduled halt for {duration} minutes",
                    "track_maintenance": f"Track maintenance block for {duration} minutes",
                    "heavy_rain": f"Heavy rain affecting operations (severity: {severity:.1f})",
                    "station_overcrowding": f"Station overcrowding causing delays",
                    "preceding_train_delay": f"Preceding train delayed, causing cascading effect",
                    "level_crossing_delay": f"Level crossing delay for {duration} minutes",
                }
                description = event_descriptions.get(event_type, f"Operational event: {event_type}")

            event = OperationalEvent(
                event_type=event_type,
                train_id=event_data["train_id"],
                location=event_data.get("location", "En route"),
                severity=severity,
                duration_minutes=duration,
                description=description,
                impact_delay_minutes=impact_delay,
                active=True,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=duration),
            )
            session.add(event)

            # Apply immediate effects
            pos_result = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == event_data["train_id"])
            )
            pos = pos_result.scalar_one_or_none()
            if pos:
                pos.delay_minutes = round(pos.delay_minutes + impact_delay, 1)
                if pos.delay_minutes > 30:
                    pos.status = "Critical Delay"
                elif pos.delay_minutes > 10:
                    pos.status = "Delayed"
                elif pos.delay_minutes > 2:
                    pos.status = "Slight Delay"

                # Update congestion on section corresponding to train's current/next station
                if pos.current_station_code and pos.next_station_code:
                    sec_id_1 = f"{pos.current_station_code}-{pos.next_station_code}"
                    sec_id_2 = f"{pos.next_station_code}-{pos.current_station_code}"
                    sec_res = await session.execute(
                        select(CongestionSection).where(
                            (CongestionSection.section_id == sec_id_1) | (CongestionSection.section_id == sec_id_2)
                        )
                    )
                    affected_sec = sec_res.scalar_one_or_none()
                    if affected_sec:
                        affected_sec.congestion_score = round(min(1.0, max(affected_sec.congestion_score, severity)), 3)
                        affected_sec.status = "Critical" if affected_sec.congestion_score >= 0.75 else "High" if affected_sec.congestion_score >= 0.5 else "Moderate"
                        affected_sec.delay_impact_minutes = round(affected_sec.congestion_score * 15, 1)

            # Get train name for alert
            train_result = await session.execute(
                select(Train).where(Train.train_id == event_data["train_id"])
            )
            train = train_result.scalar_one_or_none()
            train_name = train.train_name if train else event_data["train_id"]

            # Generate alert
            alert = Alert(
                train_id=event_data["train_id"],
                train_name=train_name,
                severity="warning" if severity < 0.7 else "critical",
                alert_type=event_type,
                message=f"{description} - ETA impact: +{impact_delay:.0f} min for {train_name}",
                location=event_data.get("location", "En route"),
                eta_impact_minutes=impact_delay,
            )
            session.add(alert)

            # Cache active event
            if event_data["train_id"] not in self._active_events:
                self._active_events[event_data["train_id"]] = {}
            self._active_events[event_data["train_id"]][str(event.id)] = {
                "event_type": event_type,
                "severity": severity,
                "description": description,
                "impact_delay": impact_delay,
            }

            # Immediately recalculate ETAs so the UI immediately reflects the disruption
            await self._calculate_all_etas(session)
            await session.commit()

            # Broadcast event and updated train telemetry
            await self._broadcast_event({
                "type": "alert",
                "alert": {
                    "id": str(alert.id),
                    "train_id": event_data["train_id"],
                    "train_name": train_name,
                    "severity": alert.severity,
                    "alert_type": event_type,
                    "message": alert.message,
                    "location": alert.location,
                    "eta_impact_minutes": impact_delay,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "acknowledged": False,
                }
            })

            if pos:
                is_real = pos.train_id in self._registered_real_trains
                await self._broadcast_event({
                    "type": "train_update",
                    "position": {
                        "train_id": pos.train_id,
                        "latitude": pos.latitude,
                        "longitude": pos.longitude,
                        "speed_kmph": pos.speed_kmph,
                        "delay_minutes": pos.delay_minutes,
                        "status": pos.status,
                        "current_station": pos.current_station_name,
                        "next_station": pos.next_station_name,
                        "distance_covered_km": pos.distance_covered_km,
                        "journey_progress": round(
                            (pos.distance_covered_km / pos.total_distance_km * 100)
                            if pos.total_distance_km > 0 else 0, 1
                        ),
                        "last_updated": datetime.now(timezone.utc).isoformat(),
                        "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)" if is_real else "Simulated Live Telemetry",
                        "data_source": "Real Train Master (NTES/DataMeet)" if is_real else "Demo Simulation Engine",
                    }
                })

            return {
                "event_id": event.id,
                "impact_delay_minutes": impact_delay,
                "description": description,
                "message": f"Event applied. ETA for {train_name} increased by {impact_delay:.0f} minutes.",
            }

    async def _broadcast_event(self, event_payload: dict):
        """Broadcast a single structured message to all WebSocket clients."""
        if not self._ws_clients:
            return

        message = json.dumps(event_payload)
        disconnected = []
        for ws in self._ws_clients:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self._ws_clients.remove(ws)

    async def _broadcast_updates(self, updates: list):
        """Broadcast updates to all connected WebSocket clients."""
        if not self._ws_clients:
            return

        # 1. Standard batch update
        message = json.dumps({
            "type": "simulation_update",
            "data": {
                "trains": updates,
                "tick": self._tick_count,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        })

        disconnected = []
        for ws in self._ws_clients:
            try:
                await ws.send_text(message)
                # Also send individual train_update messages so hooks listening to onTrainUpdate receive them
                for u in updates:
                    await ws.send_text(json.dumps({
                        "type": "train_update",
                        "position": u
                    }))
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self._ws_clients.remove(ws)

    def get_state(self) -> dict:
        return {
            "running": self._is_running,
            "tick_count": self._tick_count,
            "interval_seconds": settings.SIMULATION_INTERVAL,
            "last_update": self._last_update.isoformat(),
            "active_events": len(self._active_events),
            "simulated_real_trains": list(self._registered_real_trains),
        }

    def is_train_simulated(self, train_id: str) -> bool:
        """Check if a real train is actively being simulated in the engine."""
        return train_id in self._registered_real_trains

    def get_registered_real_trains(self) -> List[str]:
        """Return list of actively simulated real train numbers."""
        return list(self._registered_real_trains)

    async def register_real_train(self, train_number: str) -> dict:
        """
        Dynamically register a real train from the real_trains catalog into the simulation engine.
        Binds its authentic timetable/station sequence into active simulation structures,
        allowing it to continuously tick, move along route, compute delay, feed ML features, and broadcast.
        """
        async with async_session_maker() as session:
            # 1. Check if real train exists
            res = await session.execute(
                select(RealTrain).where(RealTrain.train_number == train_number)
            )
            real_t = res.scalar_one_or_none()
            if not real_t:
                return {
                    "success": False,
                    "error": f"Real train {train_number} not found in master catalog."
                }

            # 2. Check stops
            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number == train_number)
                .order_by(RealTrainStop.sequence)
            )
            real_stops = stops_res.scalars().all()
            if not real_stops:
                return {
                    "success": False,
                    "error": f"No timetable stops found for real train {train_number}."
                }

            # 3. Upsert Train record
            dep_time = real_stops[0].departure_time or "00:00"
            arr_time = real_stops[-1].arrival_time or "00:00"
            total_dist = real_t.distance or (real_stops[-1].distance if real_stops else 500.0)

            t_res = await session.execute(
                select(Train).where(Train.train_id == train_number)
            )
            t_obj = t_res.scalar_one_or_none()
            if not t_obj:
                t_obj = Train(
                    train_id=train_number,
                    train_name=real_t.train_name,
                    train_number=train_number,
                    train_type=real_t.train_type or "superfast",
                    source=real_t.source_station_name or real_t.source_station,
                    source_code=real_t.source_station,
                    destination=real_t.destination_station_name or real_t.destination_station,
                    destination_code=real_t.destination_station,
                    zone="NWR",
                    total_distance_km=total_dist,
                    scheduled_departure=dep_time,
                    scheduled_arrival=arr_time,
                    avg_speed_kmph=65.0,
                    max_speed_kmph=110.0,
                    days_of_run=real_t.running_days or "Daily",
                )
                session.add(t_obj)

            # 4. Upsert RouteStops
            for s in real_stops:
                # Ensure Station entry exists for coordinate interpolation
                st_res = await session.execute(
                    select(Station).where(Station.station_code == s.station_code)
                )
                st = st_res.scalar_one_or_none()
                if not st:
                    # Provide realistic coordinates if missing
                    base_lat = 26.9 + (s.sequence * 0.15)
                    base_lon = 70.9 + (s.sequence * 0.12)
                    st = Station(
                        station_code=s.station_code,
                        station_name=s.station_name,
                        city=s.station_name,
                        state="Rajasthan",
                        zone="NWR",
                        latitude=round(base_lat, 4),
                        longitude=round(base_lon, 4),
                        platform_count=4,
                        is_junction=False,
                    )
                    session.add(st)

                rs_res = await session.execute(
                    select(RouteStop)
                    .where(RouteStop.train_id == train_number)
                    .where(RouteStop.stop_number == s.sequence)
                )
                rs = rs_res.scalar_one_or_none()
                if not rs:
                    rs = RouteStop(
                        train_id=train_number,
                        station_code=s.station_code,
                        station_name=s.station_name,
                        arrival=s.arrival_time,
                        departure=s.departure_time,
                        distance_from_source=s.distance,
                        day=s.day_offset or 1,
                        stop_number=s.sequence,
                        halt_minutes=s.halt_minutes or 2,
                    )
                    session.add(rs)

            # 5. Upsert TrainPosition
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_number)
            )
            pos = pos_res.scalar_one_or_none()
            if not pos:
                # Get origin station coordinates
                first_st_code = real_stops[0].station_code
                st_res = await session.execute(
                    select(Station).where(Station.station_code == first_st_code)
                )
                origin_st = st_res.scalar_one_or_none()
                init_lat = origin_st.latitude if origin_st else 26.9165
                init_lon = origin_st.longitude if origin_st else 70.9282

                next_name = real_stops[1].station_name if len(real_stops) > 1 else real_stops[0].station_name
                next_code = real_stops[1].station_code if len(real_stops) > 1 else real_stops[0].station_code

                pos = TrainPosition(
                    train_id=train_number,
                    latitude=init_lat,
                    longitude=init_lon,
                    speed_kmph=0.0,
                    delay_minutes=0.0,
                    status="On Time",
                    current_station_code=real_stops[0].station_code,
                    current_station_name=real_stops[0].station_name,
                    next_station_code=next_code,
                    next_station_name=next_name,
                    distance_covered_km=0.0,
                    total_distance_km=total_dist,
                    last_updated=datetime.now(timezone.utc),
                    current_stop_index=0,
                    at_station=True,
                    dwell_remaining_seconds=real_stops[0].halt_minutes * settings.SIMULATION_INTERVAL if real_stops[0].halt_minutes else settings.SIMULATION_INTERVAL,
                )
                session.add(pos)

            await session.commit()

            self._registered_real_trains.add(train_number)

            # If simulation is not running, start it
            if not self._is_running:
                await self.start()

            return {
                "success": True,
                "train_number": train_number,
                "train_name": real_t.train_name,
                "status": "registered",
                "message": f"Real train {train_number} ({real_t.train_name}) successfully registered in dynamic simulation.",
                "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                "data_source": f"Real Train Master ({real_t.data_source})",
            }

    async def unregister_real_train(self, train_number: str) -> dict:
        """
        Unregister a real train from active simulation.
        Removes its live TrainPosition and active operational events while preserving master timetable records.
        """
        async with async_session_maker() as session:
            # Delete TrainPosition
            await session.execute(
                delete(TrainPosition).where(TrainPosition.train_id == train_number)
            )
            # Delete any active events
            await session.execute(
                delete(OperationalEvent).where(OperationalEvent.train_id == train_number)
            )
            # Delete cached ETA predictions
            await session.execute(
                delete(ETAPrediction).where(ETAPrediction.train_id == train_number)
            )
            # Delete simulation Train and RouteStop entries so real_source resumes authority
            await session.execute(
                delete(RouteStop).where(RouteStop.train_id == train_number)
            )
            await session.execute(
                delete(Train).where(Train.train_id == train_number)
            )
            await session.commit()

        self._registered_real_trains.discard(train_number)
        self._active_events.pop(train_number, None)

        return {
            "success": True,
            "train_number": train_number,
            "status": "unregistered",
            "message": f"Real train {train_number} unregistered from dynamic simulation. Master schedule preserved.",
        }

    async def resolve_train_issue(self, train_id: str) -> dict:
        """
        Resolve active operational issues for a train.
        Deactivates associated operational events, removes them from active events cache,
        recovers the train delay out of critical status using operational delay rollback,
        recalculates ETAs, updates train status, and broadcasts live telemetry.
        """
        async with async_session_maker() as session:
            # 1. Fetch train position
            pos_result = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = pos_result.scalar_one_or_none()
            if not pos:
                return {"success": False, "error": f"Train {train_id} not found in active simulation"}

            # 2. Deactivate active operational events for this train
            events_result = await session.execute(
                select(OperationalEvent).where(
                    (OperationalEvent.train_id == train_id) & (OperationalEvent.active == True)
                )
            )
            active_events = events_result.scalars().all()
            total_impact = sum(e.impact_delay_minutes or 0.0 for e in active_events)
            for event in active_events:
                event.active = False

            # Clear from active events cache
            self._active_events.pop(train_id, None)

            # 3. Recover train delay out of critical state
            # If explicit events were active, subtract their accumulated impact;
            # if delay is still critical (>30m), relieve the bottleneck into moderate delay (~12-18m)
            if total_impact > 0:
                pos.delay_minutes = max(0.0, pos.delay_minutes - total_impact)
            if pos.delay_minutes > 30.0:
                # Relief clearance: bring critical delay below 30 threshold
                pos.delay_minutes = round(max(2.0, pos.delay_minutes - 25.0), 1)
            else:
                pos.delay_minutes = round(pos.delay_minutes, 1)

            # 4. Update status according to canonical thresholds
            if pos.delay_minutes <= 2.0:
                pos.status = "On Time"
            elif pos.delay_minutes <= 10.0:
                pos.status = "Slight Delay"
            elif pos.delay_minutes <= 30.0:
                pos.status = "Delayed"
            else:
                pos.status = "Critical Delay"

            # 5. Add resolution operational event / info alert
            train_result = await session.execute(
                select(Train).where(Train.train_id == train_id)
            )
            train = train_result.scalar_one_or_none()
            train_name = train.train_name if train else train_id

            resolution_alert = Alert(
                train_id=train_id,
                train_name=train_name,
                severity="success",
                alert_type="issue_resolved",
                message=f"Operational issue resolved for {train_name}. Speed restored, delay reduced to {pos.delay_minutes} min.",
                location=pos.current_station_name or "En route",
                eta_impact_minutes=-round(total_impact, 1),
                created_at=datetime.now(timezone.utc),
            )
            session.add(resolution_alert)

            # 6. Recalculate ETAs immediately
            await self._calculate_all_etas(session)
            await session.commit()

            # 7. Broadcast updated train telemetry and resolution alert
            is_real = pos.train_id in self._registered_real_trains
            telemetry_source = (
                "Simulated Telemetry (No Authorized Live Feed)"
                if is_real
                else "Simulated Live Telemetry"
            )
            data_source = (
                "Real Train Master (NTES/DataMeet)"
                if is_real
                else "Demo Simulation Engine"
            )

            updated_pos = {
                "train_id": pos.train_id,
                "latitude": pos.latitude,
                "longitude": pos.longitude,
                "speed_kmph": pos.speed_kmph,
                "delay_minutes": pos.delay_minutes,
                "status": pos.status,
                "current_station": pos.current_station_name,
                "next_station": pos.next_station_name,
                "distance_covered_km": pos.distance_covered_km,
                "journey_progress": round(
                    (pos.distance_covered_km / pos.total_distance_km * 100)
                    if pos.total_distance_km > 0 else 0, 1
                ),
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "telemetry_source": telemetry_source,
                "data_source": data_source,
                "is_simulated": True,
            }

            await self._broadcast_event({
                "type": "train_update",
                "position": updated_pos,
            })
            await self._broadcast_event({
                "type": "alert",
                "alert": {
                    "id": str(resolution_alert.id),
                    "train_id": train_id,
                    "train_name": train_name,
                    "severity": "success",
                    "alert_type": "issue_resolved",
                    "message": resolution_alert.message,
                    "location": resolution_alert.location,
                    "eta_impact_minutes": -round(total_impact, 1),
                    "created_at": resolution_alert.created_at.isoformat(),
                    "acknowledged": False,
                }
            })

            return {
                "success": True,
                "train_id": train_id,
                "train_name": train_name,
                "delay_minutes": pos.delay_minutes,
                "status": pos.status,
                "message": f"Issue resolved for Train {train_id} ({train_name}).",
                "position": updated_pos,
            }


# Singleton
simulation_engine = SimulationEngine()

