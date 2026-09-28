"""
Data Source Adapter Layer for RailPulse ETA.

Clean abstraction supporting:
- DemoTrainDataSource: 10 pre-seeded trains connected to active simulation engine
- RealTrainDataSource: Master railway catalog of real Indian trains imported from NTES / DataMeet
"""

import logging
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, or_, func
from app.database.db import async_session_maker
from app.models.database_models import (
    Train, TrainPosition, RouteStop, RealTrain, RealTrainStop, Station
)
from app.database.mongodb import (
    get_mongo_db,
    COLL_TRAINS,
    COLL_REAL_TRAINS,
    COLL_STATIONS,
    COLL_TRAIN_POSITIONS,
)

logger = logging.getLogger(__name__)


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
        db = get_mongo_db()
        if db is not None:
            try:
                filter_q = {}
                if query and query.strip():
                    regex = {"$regex": query.strip(), "$options": "i"}
                    filter_q = {
                        "$or": [
                            {"train_name": regex},
                            {"train_number": regex},
                            {"train_id": regex},
                            {"source": regex},
                            {"destination": regex},
                            {"source_code": regex},
                            {"destination_code": regex},
                        ]
                    }
                trains = await db[COLL_TRAINS].find(filter_q, {"stops": 0}).sort("train_id", 1).to_list(length=100)
                pos_docs = await db[COLL_TRAIN_POSITIONS].find({}).to_list(length=100)
                pos_by_id = {p.get("train_id", p.get("_id")): p for p in pos_docs}

                output = []
                for t in trains:
                    t_id = t["train_id"]
                    pos = pos_by_id.get(t_id)
                    pos_status = pos.get("status", "Unknown") if pos else "Unknown"
                    pos_delay = int(pos.get("delay_minutes", 0)) if pos else 0

                    output.append({
                        "train_id": t_id,
                        "train_name": t["train_name"],
                        "train_number": t["train_number"],
                        "train_type": t.get("train_type", "Superfast Express"),
                        "source": t["source"],
                        "source_code": t["source_code"],
                        "destination": t["destination"],
                        "destination_code": t["destination_code"],
                        "zone": t.get("zone", "IR"),
                        "total_distance_km": float(t.get("total_distance_km") or 0.0),
                        "scheduled_departure": t.get("scheduled_departure", "00:00"),
                        "scheduled_arrival": t.get("scheduled_arrival", "00:00"),
                        "avg_speed_kmph": float(t.get("avg_speed_kmph") or 60.0),
                        "max_speed_kmph": float(t.get("max_speed_kmph") or 130.0),
                        "status": pos_status,
                        "current_delay_minutes": pos_delay,
                        "days_of_run": t.get("days_of_run") or "Daily",
                        "data_source": "Demo Simulation Engine",
                        "telemetry_source": "Simulated Live Telemetry",
                    })
                return output
            except Exception as e:
                logger.warning(f"[DemoTrainDataSource] MongoDB search_trains failed ({e}), falling back to SQLite.")

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

            db = get_mongo_db()
            pos_by_id = {}
            if db is not None:
                docs = await db[COLL_TRAIN_POSITIONS].find({}).to_list(length=100)
                pos_by_id = {p.get("train_id", p.get("_id")): p for p in docs}

            output = []
            for t in trains:
                if db is not None:
                    pos = pos_by_id.get(t.train_id)
                    pos_status = pos.get("status", "Unknown") if pos else "Unknown"
                    pos_delay = int(pos.get("delay_minutes", 0)) if pos else 0
                else:
                    pos_res = await session.execute(
                        select(TrainPosition).where(TrainPosition.train_id == t.train_id)
                    )
                    pos = pos_res.scalar_one_or_none()
                    pos_status = pos.status if pos else "Unknown"
                    pos_delay = int(pos.delay_minutes) if pos else 0

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
                    "status": pos_status,
                    "current_delay_minutes": pos_delay,
                    "days_of_run": t.days_of_run or "Daily",
                    "data_source": "Demo Simulation Engine",
                    "telemetry_source": "Simulated Live Telemetry",
                })
            return output

    async def get_train(self, train_id: str) -> Optional[dict]:
        db = get_mongo_db()
        if db is not None:
            try:
                t = await db[COLL_TRAINS].find_one({"_id": train_id}, {"stops": 0})
                if not t:
                    t = await db[COLL_TRAINS].find_one({"train_id": train_id}, {"stops": 0})
                if t:
                    pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                    pos_status = pos.get("status", "Unknown") if pos else "Unknown"
                    pos_delay = int(pos.get("delay_minutes", 0)) if pos else 0
                    return {
                        "train_id": t["train_id"],
                        "train_name": t["train_name"],
                        "train_number": t["train_number"],
                        "train_type": t.get("train_type", "Superfast Express"),
                        "source": t["source"],
                        "source_code": t["source_code"],
                        "destination": t["destination"],
                        "destination_code": t["destination_code"],
                        "zone": t.get("zone", "IR"),
                        "total_distance_km": float(t.get("total_distance_km") or 0.0),
                        "scheduled_departure": t.get("scheduled_departure", "00:00"),
                        "scheduled_arrival": t.get("scheduled_arrival", "00:00"),
                        "avg_speed_kmph": float(t.get("avg_speed_kmph") or 60.0),
                        "max_speed_kmph": float(t.get("max_speed_kmph") or 130.0),
                        "status": pos_status,
                        "current_delay_minutes": pos_delay,
                        "days_of_run": t.get("days_of_run") or "Daily",
                        "data_source": "Demo Simulation Engine",
                        "telemetry_source": "Simulated Live Telemetry",
                    }
                return None
            except Exception as e:
                logger.warning(f"[DemoTrainDataSource] MongoDB get_train failed ({e}), falling back to SQLite.")

        async with async_session_maker() as session:
            res = await session.execute(select(Train).where(Train.train_id == train_id))
            t = res.scalar_one_or_none()
            if not t:
                return None

            pos_status = "Unknown"
            pos_delay = 0
            db = get_mongo_db()
            if db is not None:
                pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                if pos:
                    pos_status = pos.get("status", "Unknown")
                    pos_delay = int(pos.get("delay_minutes", 0))
            else:
                pos_res = await session.execute(
                    select(TrainPosition).where(TrainPosition.train_id == train_id)
                )
                pos = pos_res.scalar_one_or_none()
                if pos:
                    pos_status = pos.status
                    pos_delay = int(pos.delay_minutes)

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
                "status": pos_status,
                "current_delay_minutes": pos_delay,
                "days_of_run": t.days_of_run or "Daily",
                "data_source": "Demo Simulation Engine",
                "telemetry_source": "Simulated Live Telemetry",
            }

    async def get_route(self, train_id: str) -> List[dict]:
        db = get_mongo_db()
        if db is not None:
            try:
                t = await db[COLL_TRAINS].find_one({"_id": train_id})
                if not t:
                    t = await db[COLL_TRAINS].find_one({"train_id": train_id})
                if t:
                    pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                    curr_idx = int(pos.get("current_stop_index", 0)) if pos else 0
                    stops = t.get("stops", [])
                    stops_sorted = sorted(stops, key=lambda s: int(s.get("stop_number", 0)))
                    output = []
                    for i, s in enumerate(stops_sorted):
                        status = "completed" if i < curr_idx else "current" if i == curr_idx else "upcoming"
                        output.append({
                            "station_code": s.get("station_code"),
                            "station_name": s.get("station_name"),
                            "arrival": s.get("arrival"),
                            "departure": s.get("departure"),
                            "distance_from_source": float(s.get("distance_from_source") or 0.0),
                            "day": int(s.get("day", 1)),
                            "stop_number": int(s.get("stop_number", i + 1)),
                            "halt_minutes": int(s.get("halt_minutes", 2)),
                            "status": status,
                        })
                    return output
                return []
            except Exception as e:
                logger.warning(f"[DemoTrainDataSource] MongoDB get_route failed ({e}), falling back to SQLite.")

        async with async_session_maker() as session:
            curr_idx = 0
            db = get_mongo_db()
            if db is not None:
                pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                if pos:
                    curr_idx = int(pos.get("current_stop_index", 0))
            else:
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

        db = get_mongo_db()
        if db is not None:
            pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
            if not pos:
                return None
            total = float(pos.get("total_distance_km") or 1.0)
            dist_cov = float(pos.get("distance_covered_km") or 0.0)
            progress = min(100.0, (dist_cov / total) * 100.0) if total > 0 else 0.0
            lu = pos.get("last_updated")
            if isinstance(lu, datetime):
                lu_str = lu.isoformat()
            elif isinstance(lu, str):
                lu_str = lu
            else:
                lu_str = datetime.now(timezone.utc).isoformat()

            return {
                "train_id": pos.get("train_id", pos["_id"]),
                "latitude": pos.get("latitude", 0.0),
                "longitude": pos.get("longitude", 0.0),
                "speed_kmph": pos.get("speed_kmph", 0.0),
                "delay_minutes": round(float(pos.get("delay_minutes", 0.0)), 1),
                "status": pos.get("status", "On Time"),
                "current_station": pos.get("current_station_code"),
                "current_station_name": pos.get("current_station_name"),
                "next_station": pos.get("next_station_code"),
                "next_station_name": pos.get("next_station_name"),
                "distance_covered_km": round(dist_cov, 1),
                "distance_remaining_km": round(max(0.0, total - dist_cov), 1),
                "journey_progress": round(progress, 1),
                "last_updated": lu_str,
                "telemetry_source": telemetry_source,
                "data_source": data_source,
                "is_simulated": True,
            }

        async with async_session_maker() as session:
            res = await session.execute(
                select(TrainPosition).where(TrainPosition.train_id == train_id)
            )
            pos = res.scalar_one_or_none()
            if not pos:
                return None

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
        """Count total matching real trains using MongoDB count_documents without loading records."""
        db = get_mongo_db()
        if db is not None:
            try:
                filter_q = {}
                if query and query.strip():
                    regex = {"$regex": query.strip(), "$options": "i"}
                    filter_q["$or"] = [
                        {"train_number": regex},
                        {"train_name": regex},
                        {"source_station": regex},
                        {"destination_station": regex},
                        {"source_station_name": regex},
                        {"destination_station_name": regex},
                    ]
                if exclude_numbers:
                    filter_q["train_number"] = {"$nin": list(exclude_numbers)}
                return await db[COLL_REAL_TRAINS].count_documents(filter_q)
            except Exception as e:
                logger.warning(f"[RealTrainDataSource] MongoDB count_trains failed ({e}), falling back to SQLite.")

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
        safe_limit = max(1, min(100, limit if limit is not None else 50))
        safe_offset = max(0, offset if offset is not None else 0)

        db = get_mongo_db()
        if db is not None:
            try:
                filter_q = {}
                if query and query.strip():
                    regex = {"$regex": query.strip(), "$options": "i"}
                    filter_q["$or"] = [
                        {"train_number": regex},
                        {"train_name": regex},
                        {"source_station": regex},
                        {"destination_station": regex},
                        {"source_station_name": regex},
                        {"destination_station_name": regex},
                    ]
                if exclude_numbers:
                    filter_q["train_number"] = {"$nin": list(exclude_numbers)}

                # Use MongoDB projection to retrieve only the first and last stop
                # without downloading large embedded stop arrays over the network
                pipeline = [
                    {"$match": filter_q},
                    {"$sort": {"train_number": 1}},
                    {"$skip": safe_offset},
                    {"$limit": safe_limit},
                    {
                        "$project": {
                            "train_number": 1,
                            "train_name": 1,
                            "train_type": 1,
                            "source_station": 1,
                            "source_station_name": 1,
                            "destination_station": 1,
                            "destination_station_name": 1,
                            "distance": 1,
                            "running_days": 1,
                            "data_source": 1,
                            "first_stop": {"$arrayElemAt": ["$stops", 0]},
                            "last_stop": {"$arrayElemAt": ["$stops", -1]},
                        }
                    }
                ]
                cursor = await db[COLL_REAL_TRAINS].aggregate(pipeline)
                real_trains = await cursor.to_list(length=safe_limit)
                if not real_trains:
                    return []

                train_numbers = [t["train_number"] for t in real_trains]
                mongo_positions = await db[COLL_TRAIN_POSITIONS].find({"_id": {"$in": train_numbers}}).to_list(length=100)
                pos_by_train = {p.get("train_id", p.get("_id")): p for p in mongo_positions}

                output = []
                for t in real_trains:
                    first_s = t.get("first_stop") or {}
                    last_s = t.get("last_stop") or {}
                    dep_time = first_s.get("departure_time") or "00:00"
                    arr_time = last_s.get("arrival_time") or "00:00"
                    total_dist = t.get("distance") if t.get("distance") is not None else last_s.get("distance")

                    pos = pos_by_train.get(t["train_number"])
                    if pos is not None:
                        status = pos.get("status", "On Time")
                        delay = int(pos.get("delay_minutes", 0))
                        speed = float(pos.get("speed_kmph", 62.0))
                    else:
                        status = "On Time"
                        delay = 0
                        speed = 62.0

                    output.append({
                        "train_id": t["train_number"],
                        "train_name": t["train_name"],
                        "train_number": t["train_number"],
                        "train_type": t.get("train_type") or "Superfast",
                        "source": t.get("source_station_name") or t.get("source_station"),
                        "source_code": t.get("source_station"),
                        "destination": t.get("destination_station_name") or t.get("destination_station"),
                        "destination_code": t.get("destination_station"),
                        "zone": "IR",
                        "total_distance_km": total_dist,
                        "scheduled_departure": dep_time or "00:00",
                        "scheduled_arrival": arr_time or "00:00",
                        "avg_speed_kmph": speed,
                        "max_speed_kmph": 110.0,
                        "status": status,
                        "current_delay_minutes": delay,
                        "days_of_run": t.get("running_days") or "Daily",
                        "data_source": f"Real Train Master ({t.get('data_source', 'NTES / DataMeet')})",
                        "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                        "is_simulated": pos is not None,
                    })
                return output
            except Exception as e:
                logger.warning(f"[RealTrainDataSource] MongoDB search_trains failed ({e}), falling back to SQLite.")

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

            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number.in_(train_numbers))
                .order_by(RealTrainStop.train_number, RealTrainStop.sequence)
            )
            all_stops = stops_res.scalars().all()
            stops_by_train: Dict[str, List[RealTrainStop]] = {}
            for s in all_stops:
                stops_by_train.setdefault(s.train_number, []).append(s)

            db = get_mongo_db()
            pos_by_train = {}
            if db is not None:
                mongo_positions = await db[COLL_TRAIN_POSITIONS].find({"_id": {"$in": train_numbers}}).to_list(length=100)
                pos_by_train = {p.get("train_id", p.get("_id")): p for p in mongo_positions}
            else:
                pos_res = await session.execute(
                    select(TrainPosition).where(TrainPosition.train_id.in_(train_numbers))
                )
                all_pos = pos_res.scalars().all()
                pos_by_train = {p.train_id: p for p in all_pos}

            output = []
            for t in real_trains:
                stops = stops_by_train.get(t.train_number, [])
                dep_time = stops[0].departure_time if stops else "00:00"
                arr_time = stops[-1].arrival_time if stops else "00:00"

                pos = pos_by_train.get(t.train_number)
                if isinstance(pos, dict):
                    status = pos.get("status", "On Time")
                    delay = int(pos.get("delay_minutes", 0))
                    speed = float(pos.get("speed_kmph", 62.0))
                elif pos is not None:
                    status = pos.status
                    delay = int(pos.delay_minutes)
                    speed = pos.speed_kmph
                else:
                    status = "On Time"
                    delay = 0
                    speed = 62.0

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
        db = get_mongo_db()
        if db is not None:
            try:
                t = await db[COLL_REAL_TRAINS].find_one({"_id": train_id})
                if not t:
                    t = await db[COLL_REAL_TRAINS].find_one({"train_number": train_id})
                if t:
                    stops = t.get("stops", [])
                    dep_time = stops[0].get("departure_time") if stops else "00:00"
                    arr_time = stops[-1].get("arrival_time") if stops else "00:00"
                    last_stop_dist = stops[-1].get("distance") if stops else None
                    total_dist = t.get("distance") if t.get("distance") is not None else last_stop_dist

                    pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                    if pos is not None:
                        status = pos.get("status", "On Time")
                        delay = int(pos.get("delay_minutes", 0))
                        speed = float(pos.get("speed_kmph", 62.0))
                    else:
                        status = "On Time"
                        delay = 0
                        speed = 62.0

                    return {
                        "train_id": t["train_number"],
                        "train_name": t["train_name"],
                        "train_number": t["train_number"],
                        "train_type": t.get("train_type") or "Superfast",
                        "source": t.get("source_station_name") or t.get("source_station"),
                        "source_code": t.get("source_station"),
                        "destination": t.get("destination_station_name") or t.get("destination_station"),
                        "destination_code": t.get("destination_station"),
                        "zone": "IR",
                        "total_distance_km": total_dist,
                        "scheduled_departure": dep_time or "00:00",
                        "scheduled_arrival": arr_time or "00:00",
                        "avg_speed_kmph": speed,
                        "max_speed_kmph": 110.0,
                        "status": status,
                        "current_delay_minutes": delay,
                        "days_of_run": t.get("running_days") or "Daily",
                        "data_source": f"Real Train Master ({t.get('data_source', 'NTES / DataMeet')})",
                        "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                        "is_simulated": pos is not None,
                    }
                return None
            except Exception as e:
                logger.warning(f"[RealTrainDataSource] MongoDB get_train failed ({e}), falling back to SQLite.")

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

            db = get_mongo_db()
            pos = None
            if db is not None:
                pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
            else:
                pos_res = await session.execute(
                    select(TrainPosition).where(TrainPosition.train_id == train_id)
                )
                pos = pos_res.scalar_one_or_none()

            if isinstance(pos, dict):
                status = pos.get("status", "On Time")
                delay = int(pos.get("delay_minutes", 0))
                speed = float(pos.get("speed_kmph", 62.0))
            elif pos is not None:
                status = pos.status
                delay = int(pos.delay_minutes)
                speed = pos.speed_kmph
            else:
                status = "On Time"
                delay = 0
                speed = 62.0

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
        db = get_mongo_db()
        if db is not None:
            try:
                t = await db[COLL_REAL_TRAINS].find_one({"_id": train_id})
                if not t:
                    t = await db[COLL_REAL_TRAINS].find_one({"train_number": train_id})
                if t:
                    stops = t.get("stops", [])
                    if not stops:
                        return []

                    pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                    if pos:
                        current_idx = int(pos.get("current_stop_index", 0))
                    else:
                        current_idx = max(0, min(3, len(stops) - 1))

                    output = []
                    for i, s in enumerate(stops):
                        status = "completed" if i < current_idx else "current" if i == current_idx else "upcoming"
                        output.append({
                            "station_code": s.get("station_code"),
                            "station_name": s.get("station_name"),
                            "arrival": s.get("arrival_time"),
                            "departure": s.get("departure_time"),
                            "distance_from_source": s.get("distance"),
                            "day": s.get("day_offset", 1),
                            "stop_number": s.get("sequence", i + 1),
                            "halt_minutes": s.get("halt_minutes", 2),
                            "status": status,
                        })
                    return output
                return []
            except Exception as e:
                logger.warning(f"[RealTrainDataSource] MongoDB get_route failed ({e}), falling back to SQLite.")

        async with async_session_maker() as session:
            stops_res = await session.execute(
                select(RealTrainStop)
                .where(RealTrainStop.train_number == train_id)
                .order_by(RealTrainStop.sequence)
            )
            stops = stops_res.scalars().all()
            if not stops:
                return []

            db = get_mongo_db()
            current_idx = None
            if db is not None:
                pos = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                if pos:
                    current_idx = int(pos.get("current_stop_index", 0))
            if current_idx is None:
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
        db = get_mongo_db()
        if db is not None:
            try:
                # 1. Check if dynamically simulated in TrainPosition
                pos_doc = await db[COLL_TRAIN_POSITIONS].find_one({"_id": train_id})
                if pos_doc:
                    t = await db[COLL_REAL_TRAINS].find_one({"_id": train_id}, {"stops": 0})
                    if not t:
                        t = await db[COLL_REAL_TRAINS].find_one({"train_number": train_id}, {"stops": 0})
                    total = float(pos_doc.get("total_distance_km") or (t.get("distance") if t else 1.0) or 1.0)
                    dist_cov = float(pos_doc.get("distance_covered_km") or 0.0)
                    progress = min(100.0, (dist_cov / total) * 100.0) if total > 0 else 0.0
                    lu = pos_doc.get("last_updated")
                    if isinstance(lu, datetime):
                        lu_str = lu.isoformat()
                    elif isinstance(lu, str):
                        lu_str = lu
                    else:
                        lu_str = datetime.now(timezone.utc).isoformat()
                    return {
                        "train_id": train_id,
                        "latitude": float(pos_doc.get("latitude", 0.0)),
                        "longitude": float(pos_doc.get("longitude", 0.0)),
                        "speed_kmph": float(pos_doc.get("speed_kmph", 0.0)),
                        "delay_minutes": round(float(pos_doc.get("delay_minutes", 0.0)), 1),
                        "status": pos_doc.get("status", "On Time"),
                        "current_station": pos_doc.get("current_station_code"),
                        "current_station_name": pos_doc.get("current_station_name"),
                        "next_station": pos_doc.get("next_station_code"),
                        "next_station_name": pos_doc.get("next_station_name"),
                        "distance_covered_km": round(dist_cov, 1),
                        "distance_remaining_km": round(max(0.0, total - dist_cov), 1),
                        "journey_progress": round(progress, 1),
                        "last_updated": lu_str,
                        "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                        "data_source": f"Real Train Master ({t.get('data_source', 'NTES / DataMeet') if t else 'NTES / DataMeet'})",
                        "is_simulated": True,
                    }

                # 2. Fallback to static checkpoint if not currently registered in simulation
                t = await db[COLL_REAL_TRAINS].find_one({"_id": train_id})
                if not t:
                    t = await db[COLL_REAL_TRAINS].find_one({"train_number": train_id})
                if t:
                    stops = t.get("stops", [])
                    if stops:
                        curr_idx = max(0, min(3, len(stops) - 1))
                        current_stop = stops[curr_idx]
                        next_idx = min(curr_idx + 1, len(stops) - 1)
                        next_stop = stops[next_idx]

                        st_code = current_stop.get("station_code")
                        st = await db[COLL_STATIONS].find_one({"_id": st_code})
                        if not st:
                            st = await db[COLL_STATIONS].find_one({"station_code": st_code})
                        lat = st.get("latitude") if st else 26.9165
                        lon = st.get("longitude") if st else 70.9282

                        last_dist = stops[-1].get("distance")
                        total = t.get("distance") or (last_dist if last_dist is not None else 1.0)
                        if not total or total <= 0:
                            total = 1.0

                        dist_covered = current_stop.get("distance")
                        if dist_covered is not None:
                            progress = min(100.0, (dist_covered / total) * 100.0)
                            dist_cov_val = round(dist_covered, 1)
                            dist_rem_val = round(max(0.0, total - dist_covered), 1)
                            prog_val = round(progress, 1)
                        else:
                            prog_val = round(min(100.0, (curr_idx / max(1, len(stops) - 1)) * 100.0), 1)
                            dist_cov_val = round((prog_val / 100.0) * total, 1)
                            dist_rem_val = round(max(0.0, total - dist_cov_val), 1)

                        return {
                            "train_id": t["train_number"],
                            "latitude": lat,
                            "longitude": lon,
                            "speed_kmph": 65.0,
                            "delay_minutes": 0,
                            "status": "On Time",
                            "current_station": current_stop.get("station_code"),
                            "current_station_name": current_stop.get("station_name"),
                            "next_station": next_stop.get("station_code"),
                            "next_station_name": next_stop.get("station_name"),
                            "distance_covered_km": dist_cov_val,
                            "distance_remaining_km": dist_rem_val,
                            "journey_progress": prog_val,
                            "last_updated": datetime.now(timezone.utc).isoformat(),
                            "telemetry_source": "Simulated Telemetry (No Authorized Live Feed)",
                            "data_source": f"Real Train Master ({t.get('data_source', 'NTES / DataMeet')})",
                            "is_simulated": False,
                        }
            except Exception as e:
                logger.warning(f"[RealTrainDataSource] MongoDB get_position failed ({e}), falling back to SQLite.")

        async with async_session_maker() as session:
            t_res = await session.execute(
                select(RealTrain).where(RealTrain.train_number == train_id)
            )
            t = t_res.scalar_one_or_none()
            if not t:
                return None

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

