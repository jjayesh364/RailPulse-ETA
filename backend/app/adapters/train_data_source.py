"""
Data Source Adapter Layer for RailPulse ETA.

Clean abstraction supporting:
- DemoTrainDataSource: 10 pre-seeded trains connected to active simulation engine
- RealTrainDataSource: Master railway catalog of real Indian trains imported from NTES / DataMeet
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, or_, func
from app.database.db import async_session_maker
from app.models.database_models import (
    Train, TrainPosition, RouteStop, RealTrain, RealTrainStop, Station
)


class TrainDataSource(ABC):
    """Abstract train data source adapter."""

    @abstractmethod
    async def search_trains(self, query: str) -> List[dict]:
        """Search trains by number or name."""
        pass

    @abstractmethod
    async def get_train(self, train_id: str) -> Optional[dict]:
        """Get train metadata by train_id or train_number."""
        pass

    @abstractmethod
    async def get_route(self, train_id: str) -> List[dict]:
        """Get route stops for a train."""
        pass

    @abstractmethod
    async def get_position(self, train_id: str) -> Optional[dict]:
        """Get position telemetry for a train."""
        pass


class DemoTrainDataSource(TrainDataSource):
    """Data source for the 10 demo trains managed by the simulation engine."""

    async def search_trains(self, query: str) -> List[dict]:
        async with async_session_maker() as session:
            search = f"%{query}%"
            result = await session.execute(
                select(Train).where(
                    or_(
                        Train.train_name.ilike(search),
                        Train.train_number.ilike(search),
                        Train.train_id.ilike(search),
                        Train.source.ilike(search),
                        Train.destination.ilike(search),
                        Train.source_code.ilike(search),
                        Train.destination_code.ilike(search),
                    )
                )
            )
            trains = result.scalars().all()
            output = []
            for t in trains:
                pos_res = await session.execute(
                    select(TrainPosition).where(TrainPosition.train_id == t.train_id)
                )
                pos = pos_res.scalar_one_or_none()
                output.append({
                    "train_id": t.train_id,
                    "train_name": t.train_name,
                    "train_number": t.train_number,
                    "train_type": t.train_type,
                    "source": t.source,
                    "source_code": t.source_code,
                    "destination": t.destination,
                    "destination_code": t.destination_code,
                    "zone": t.zone,
                    "total_distance_km": t.total_distance_km,
                    "scheduled_departure": t.scheduled_departure,
                    "scheduled_arrival": t.scheduled_arrival,
                    "avg_speed_kmph": t.avg_speed_kmph,
                    "max_speed_kmph": t.max_speed_kmph,
                    "status": pos.status if pos else "Unknown",
                    "current_delay_minutes": int(pos.delay_minutes) if pos else 0,
                    "days_of_run": t.days_of_run or "Daily",
                    "data_source": "Demo Simulation Engine",
                    "telemetry_source": "Simulated Live Telemetry",
                })
            return output

    async def get_train(self, train_id: str) -> Optional[dict]:
        async with async_session_maker() as session:
            res = await session.execute(select(Train).where(Train.train_id == train_id))
            t = res.scalar_one_or_none()
            if not t:
                return None
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = pos_res.scalar_one_or_none()
            return {
                "train_id": t.train_id,
                "train_name": t.train_name,
                "train_number": t.train_number,
                "train_type": t.train_type,
                "source": t.source,
                "source_code": t.source_code,
                "destination": t.destination,
                "destination_code": t.destination_code,
                "zone": t.zone,
                "total_distance_km": t.total_distance_km,
                "scheduled_departure": t.scheduled_departure,
                "scheduled_arrival": t.scheduled_arrival,
                "avg_speed_kmph": t.avg_speed_kmph,
                "max_speed_kmph": t.max_speed_kmph,
                "status": pos.status if pos else "Unknown",
                "current_delay_minutes": int(pos.delay_minutes) if pos else 0,
                "days_of_run": t.days_of_run or "Daily",
                "data_source": "Demo Simulation Engine",
                "telemetry_source": "Simulated Live Telemetry",
            }

    async def get_route(self, train_id: str) -> List[dict]:
        async with async_session_maker() as session:
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = pos_res.scalar_one_or_none()
            curr_idx = pos.current_stop_index if pos else 0

            stops_res = await session.execute(
                select(RouteStop).where(RouteStop.train_id == train_id).order_by(RouteStop.stop_number)
            )
            stops = stops_res.scalars().all()
            output = []
            for i, s in enumerate(stops):
                status = "completed" if i < curr_idx else "current" if i == curr_idx else "upcoming"
                output.append({
                    "station_code": s.station_code,
                    "station_name": s.station_name,
                    "arrival": s.arrival,
                    "departure": s.departure,
                    "distance_from_source": s.distance_from_source,
                    "day": s.day,
                    "stop_number": s.stop_number,
                    "halt_minutes": s.halt_minutes,
                    "status": status,
                })
            return output

    async def get_position(self, train_id: str) -> Optional[dict]:
        async with async_session_maker() as session:
            res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = res.scalar_one_or_none()
            if not pos:
                return None
            from app.simulation.engine import simulation_engine
            is_sim_real = simulation_engine.is_train_simulated(train_id)
            telemetry_source = (
                "Simulated Telemetry (No Authorized Live Feed)"
                if is_sim_real
                else "Simulated Live Telemetry"
            )
            data_source = (
                "Real Train Master (NTES/DataMeet)"
                if is_sim_real
                else "Demo Simulation Engine"
            )

            total = pos.total_distance_km or 1
            progress = min(100, (pos.distance_covered_km / total) * 100)
            return {
                "train_id": pos.train_id,
                "latitude": pos.latitude,
                "longitude": pos.longitude,
                "speed_kmph": pos.speed_kmph,
                "delay_minutes": round(pos.delay_minutes, 1),
                "status": pos.status,
                "current_station": pos.current_station_code,
                "current_station_name": pos.current_station_name,
                "next_station": pos.next_station_code,
                "next_station_name": pos.next_station_name,
                "distance_covered_km": round(pos.distance_covered_km, 1),
                "distance_remaining_km": round(max(0, total - pos.distance_covered_km), 1),
                "journey_progress": round(progress, 1),
                "last_updated": pos.last_updated.isoformat() if pos.last_updated else datetime.now(timezone.utc).isoformat(),
                "telemetry_source": telemetry_source,
                "data_source": data_source,
                "is_simulated": True,
            }


class RealTrainDataSource(TrainDataSource):
    async def count_trains(self, query: str = "", exclude_numbers: Optional[set] = None) -> int:
        """Count total matching real trains using SQL COUNT(*) without loading records."""
        async with async_session_maker() as session:
            stmt = select(func.count(RealTrain.train_number))
            if query and query.strip():
                search = f"%{query.strip()}%"
                stmt = stmt.where(
                    or_(
                        RealTrain.train_number.ilike(search),
                        RealTrain.train_name.ilike(search),
                        RealTrain.source_station.ilike(search),
                        RealTrain.destination_station.ilike(search),
                        RealTrain.source_station_name.ilike(search),
                        RealTrain.destination_station_name.ilike(search),
                    )
                )
            if exclude_numbers:
                stmt = stmt.where(~RealTrain.train_number.in_(exclude_numbers))
            res = await session.execute(stmt)
            return res.scalar() or 0

    async def search_trains(self, query: str = "", limit: int = 50, offset: int = 0, exclude_numbers: Optional[set] = None) -> List[dict]:
        # Enforce safe bounds: default 50, maximum 100
        safe_limit = max(1, min(100, limit if limit is not None else 50))
        safe_offset = max(0, offset if offset is not None else 0)

        async with async_session_maker() as session:
            stmt = select(RealTrain)
            if query and query.strip():
                search = f"%{query.strip()}%"
                stmt = stmt.where(
                    or_(
                        RealTrain.train_number.ilike(search),
                        RealTrain.train_name.ilike(search),
                        RealTrain.source_station.ilike(search),
                        RealTrain.destination_station.ilike(search),
                        RealTrain.source_station_name.ilike(search),
                        RealTrain.destination_station_name.ilike(search),
                    )
                )

            if exclude_numbers:
                stmt = stmt.where(~RealTrain.train_number.in_(exclude_numbers))

            stmt = stmt.order_by(RealTrain.train_number).limit(safe_limit).offset(safe_offset)
            res = await session.execute(stmt)
            real_trains = res.scalars().all()

            if not real_trains:
                return []

            train_numbers = [t.train_number for t in real_trains]

            # Batch retrieve stops for all matching trains in a single query (resolves N+1)
            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number.in_(train_numbers))
                .order_by(RealTrainStop.train_number, RealTrainStop.sequence)
            )
            all_stops = stops_res.scalars().all()
            stops_by_train: Dict[str, List[RealTrainStop]] = {}
            for s in all_stops:
                stops_by_train.setdefault(s.train_number, []).append(s)

            # Batch retrieve positions for all matching trains in a single query
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id.in_(train_numbers))
            )
            all_pos = pos_res.scalars().all()
            pos_by_train: Dict[str, TrainPosition] = {p.train_id: p for p in all_pos}

            output = []
            for t in real_trains:
                stops = stops_by_train.get(t.train_number, [])
                dep_time = stops[0].departure_time if stops else "00:00"
                arr_time = stops[-1].arrival_time if stops else "00:00"

                pos = pos_by_train.get(t.train_number)
                status = pos.status if pos else "On Time"
                delay = int(pos.delay_minutes) if pos else 0
                speed = pos.speed_kmph if pos else 62.0

                last_stop_dist = stops[-1].distance if stops and stops[-1].distance is not None else None
                total_dist = t.distance if t.distance is not None else last_stop_dist

                output.append({
                    "train_id": t.train_number,
                    "train_name": t.train_name,
                    "train_number": t.train_number,
                    "train_type": t.train_type or "Superfast",
                    "source": t.source_station_name or t.source_station,
                    "source_code": t.source_station,
                    "destination": t.destination_station_name or t.destination_station,
                    "destination_code": t.destination_station,
                    "zone": "IR",
                    "total_distance_km": total_dist,
                    "scheduled_departure": dep_time or "00:00",
                    "scheduled_arrival": arr_time or "00:00",
                    "avg_speed_kmph": speed,
                    "max_speed_kmph": 110.0,
                    "status": status,
                    "current_delay_minutes": delay,
                    "days_of_run": t.running_days or "Daily",
                    "data_source": f"Real Train Master ({t.data_source})",
                    "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                    "is_simulated": pos is not None,
                })
            return output

    async def get_train(self, train_id: str) -> Optional[dict]:
        async with async_session_maker() as session:
            res = await session.execute(
                select(RealTrain).where(RealTrain.train_number == train_id)
            )
            t = res.scalar_one_or_none()
            if not t:
                return None

            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number == t.train_number)
                .order_by(RealTrainStop.sequence)
            )
            stops = stops_res.scalars().all()
            dep_time = stops[0].departure_time if stops else "00:00"
            arr_time = stops[-1].arrival_time if stops else "00:00"
            last_stop_dist = stops[-1].distance if stops and stops[-1].distance is not None else None
            total_dist = t.distance if t.distance is not None else last_stop_dist

            # Check if dynamically simulated
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = pos_res.scalar_one_or_none()

            status = pos.status if pos else "On Time"
            delay = int(pos.delay_minutes) if pos else 0
            speed = pos.speed_kmph if pos else 62.0

            return {
                "train_id": t.train_number,
                "train_name": t.train_name,
                "train_number": t.train_number,
                "train_type": t.train_type or "Superfast",
                "source": t.source_station_name or t.source_station,
                "source_code": t.source_station,
                "destination": t.destination_station_name or t.destination_station,
                "destination_code": t.destination_station,
                "zone": "IR",
                "total_distance_km": total_dist,
                "scheduled_departure": dep_time or "00:00",
                "scheduled_arrival": arr_time or "00:00",
                "avg_speed_kmph": speed,
                "max_speed_kmph": 110.0,
                "status": status,
                "current_delay_minutes": delay,
                "days_of_run": t.running_days or "Daily",
                "data_source": f"Real Train Master ({t.data_source})",
                "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                "is_simulated": pos is not None,
            }

    async def get_route(self, train_id: str) -> List[dict]:
        async with async_session_maker() as session:
            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number == train_id)
                .order_by(RealTrainStop.sequence)
            )
            stops = stops_res.scalars().all()
            if not stops:
                return []

            # Check if active TrainPosition exists
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = pos_res.scalar_one_or_none()
            if pos:
                current_idx = pos.current_stop_index
            else:
                current_idx = max(0, min(3, len(stops) - 1))

            output = []
            for i, s in enumerate(stops):
                status = "completed" if i < current_idx else "current" if i == current_idx else "upcoming"
                output.append({
                    "station_code": s.station_code,
                    "station_name": s.station_name,
                    "arrival": s.arrival_time,
                    "departure": s.departure_time,
                    "distance_from_source": s.distance,
                    "day": s.day_offset,
                    "stop_number": s.sequence,
                    "halt_minutes": s.halt_minutes,
                    "status": status,
                })
            return output

    async def get_position(self, train_id: str) -> Optional[dict]:
        async with async_session_maker() as session:
            t_res = await session.execute(
                select(RealTrain).where(RealTrain.train_number == train_id)
            )
            t = t_res.scalar_one_or_none()
            if not t:
                return None

            # 1. Check if dynamically simulated in TrainPosition
            pos_res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = pos_res.scalar_one_or_none()
            if pos:
                total = pos.total_distance_km or t.distance or 1.0
                progress = min(100.0, (pos.distance_covered_km / total) * 100.0) if total > 0 else 0.0
                return {
                    "train_id": t.train_number,
                    "latitude": pos.latitude,
                    "longitude": pos.longitude,
                    "speed_kmph": pos.speed_kmph,
                    "delay_minutes": round(pos.delay_minutes, 1),
                    "status": pos.status,
                    "current_station": pos.current_station_code,
                    "current_station_name": pos.current_station_name,
                    "next_station": pos.next_station_code,
                    "next_station_name": pos.next_station_name,
                    "distance_covered_km": round(pos.distance_covered_km, 1),
                    "distance_remaining_km": round(max(0, total - pos.distance_covered_km), 1),
                    "journey_progress": round(progress, 1),
                    "last_updated": pos.last_updated.isoformat() if pos.last_updated else datetime.now(timezone.utc).isoformat(),
                    "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                    "data_source": f"Real Train Master ({t.data_source})",
                    "is_simulated": True,
                }

            # 2. Fallback to static checkpoint if not currently registered in simulation
            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number == train_id)
                .order_by(RealTrainStop.sequence)
            )
            stops = stops_res.scalars().all()
            if not stops:
                return None

            curr_idx = max(0, min(3, len(stops) - 1))
            current_stop = stops[curr_idx]
            next_idx = min(curr_idx + 1, len(stops) - 1)
            next_stop = stops[next_idx]

            # Coordinate lookup
            st_res = await session.execute(
                select(Station).where(Station.station_code == current_stop.station_code)
            )
            station = st_res.scalar_one_or_none()
            lat = station.latitude if station else 26.9165
            lon = station.longitude if station else 70.9282

            total = t.distance or (stops[-1].distance if stops[-1].distance is not None else 1.0)
            if not total or total <= 0:
                total = 1.0

            dist_covered = current_stop.distance
            if dist_covered is not None:
                progress = min(100.0, (dist_covered / total) * 100.0)
                dist_cov_val = round(dist_covered, 1)
                dist_rem_val = round(max(0.0, total - dist_covered), 1)
                prog_val = round(progress, 1)
            else:
                # In DataMeet intermediate stops where distance is None, calculate approximate progress by stop index
                prog_val = round(min(100.0, (curr_idx / max(1, len(stops) - 1)) * 100.0), 1)
                dist_cov_val = round((prog_val / 100.0) * total, 1)
                dist_rem_val = round(max(0.0, total - dist_cov_val), 1)

            return {
                "train_id": t.train_number,
                "latitude": lat,
                "longitude": lon,
                "speed_kmph": 65.0,
                "delay_minutes": 0,
                "status": "On Time",
                "current_station": current_stop.station_code,
                "current_station_name": current_stop.station_name,
                "next_station": next_stop.station_code,
                "next_station_name": next_stop.station_name,
                "distance_covered_km": dist_cov_val,
                "distance_remaining_km": dist_rem_val,
                "journey_progress": prog_val,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                "data_source": f"Real Train Master ({t.data_source})",
                "is_simulated": False,
            }


demo_source = DemoTrainDataSource()
real_source = RealTrainDataSource()

