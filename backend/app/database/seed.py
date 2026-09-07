import json
import os
import random
from datetime import datetime, timezone
from sqlalchemy import select, func
from app.database.db import async_session_maker
from app.models.database_models import (
    Train, Station, RouteStop, TrainPosition, CongestionSection
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "seed")


def _load_json(filename: str):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


async def seed_db():
    """Load seed data into the database if not already present."""
    async with async_session_maker() as session:
        result = await session.execute(select(func.count()).select_from(Train))
        count = result.scalar()
        if count and count > 0:
            print(f"Database already seeded with {count} trains.")
            # Check if real trains are seeded
            from app.models.database_models import RealTrain
            rt_res = await session.execute(select(func.count()).select_from(RealTrain))
            if not rt_res.scalar():
                from scripts.import_real_train_data import run_import
                await run_import()
            return

        print("Seeding database...")

        # --- Seed Stations ---
        stations_data = _load_json("stations.json")
        if stations_data:
            for s in stations_data:
                station = Station(
                    station_code=s["station_code"],
                    station_name=s["station_name"],
                    city=s.get("city", ""),
                    state=s.get("state", ""),
                    zone=s.get("zone", ""),
                    latitude=s["latitude"],
                    longitude=s["longitude"],
                    platform_count=s.get("platform_count", 4),
                    is_junction=s.get("is_junction", False),
                )
                session.add(station)
            await session.flush()
            print(f"  Seeded {len(stations_data)} stations.")
        else:
            print("  WARNING: stations.json not found, using built-in minimal data.")
            await _seed_builtin_stations(session)

        # --- Seed Trains ---
        trains_data = _load_json("trains.json")
        if trains_data:
            for t in trains_data:
                train = Train(
                    train_id=t["train_id"],
                    train_name=t["train_name"],
                    train_number=t["train_number"],
                    train_type=t["train_type"],
                    source=t["source"],
                    source_code=t["source_code"],
                    destination=t["destination"],
                    destination_code=t["destination_code"],
                    zone=t["zone"],
                    total_distance_km=t["total_distance_km"],
                    scheduled_departure=t["scheduled_departure"],
                    scheduled_arrival=t["scheduled_arrival"],
                    avg_speed_kmph=t.get("avg_speed_kmph", 70),
                    max_speed_kmph=t.get("max_speed_kmph", 130),
                    days_of_run=",".join(t.get("days_of_run", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])),
                )
                session.add(train)
            await session.flush()
            print(f"  Seeded {len(trains_data)} trains.")
        else:
            print("  WARNING: trains.json not found, using built-in minimal data.")
            await _seed_builtin_trains(session)

        # --- Seed Routes ---
        routes_data = _load_json("routes.json")
        if routes_data:
            stop_count = 0
            for route in routes_data:
                train_id = route["train_id"]
                for stop in route["stops"]:
                    rs = RouteStop(
                        train_id=train_id,
                        station_code=stop["station_code"],
                        station_name=stop["station_name"],
                        arrival=stop.get("arrival"),
                        departure=stop.get("departure"),
                        distance_from_source=stop.get("distance_from_source", 0),
                        day=stop.get("day", 1),
                        stop_number=stop["stop_number"],
                        halt_minutes=stop.get("halt_minutes", 2),
                    )
                    session.add(rs)
                    stop_count += 1
            await session.flush()
            print(f"  Seeded {stop_count} route stops for {len(routes_data)} trains.")

        # --- Seed Congestion Sections ---
        congestion_data = _load_json("congestion_sections.json")
        if congestion_data:
            for c in congestion_data:
                cs = CongestionSection(
                    section_id=c["section_id"],
                    from_station=c["from_station"],
                    to_station=c["to_station"],
                    from_station_name=c.get("from_station_name", ""),
                    to_station_name=c.get("to_station_name", ""),
                    congestion_score=c.get("congestion_score", 0.2),
                    avg_speed_kmph=c.get("avg_speed_kmph", 80.0),
                    active_trains=c.get("active_trains", 0),
                    status=c.get("status", "Normal"),
                    delay_impact_minutes=c.get("delay_impact_minutes", 0.0),
                )
                session.add(cs)
            await session.flush()
            print(f"  Seeded {len(congestion_data)} congestion sections.")

        # --- Create initial train positions ---
        await _create_initial_positions(session)

        await session.commit()
        print("Database seeding complete!")

        # --- Import real train master data (zero-cost NTES/DataMeet) ---
        try:
            from app.models.database_models import RealTrain
            async with async_session_maker() as check_session:
                rt_res = await check_session.execute(select(func.count()).select_from(RealTrain))
                if not rt_res.scalar():
                    from scripts.import_real_train_data import run_import
                    await run_import()
                    print("[Seed] Real train master data imported.")
        except Exception as e:
            print(f"[Seed] Real train import skipped: {e}")


async def _create_initial_positions(session):
    """Create initial train positions at various points along their routes."""
    trains_result = await session.execute(select(Train))
    trains = trains_result.scalars().all()

    for train in trains:
        # Get route stops for this train
        stops_result = await session.execute(
            select(RouteStop)
            .where(RouteStop.train_id == train.train_id)
            .order_by(RouteStop.stop_number)
        )
        stops = stops_result.scalars().all()

        if len(stops) < 2:
            continue

        # Place train at a random position along its route (for demo variety)
        total_stops = len(stops)
        # Pick a position between 20% and 70% of the journey
        progress_frac = random.uniform(0.2, 0.7)
        current_idx = max(1, min(int(progress_frac * total_stops), total_stops - 2))

        current_stop = stops[current_idx]
        next_stop = stops[min(current_idx + 1, total_stops - 1)]

        # Get station coordinates
        curr_station = await session.execute(
            select(Station).where(Station.station_code == current_stop.station_code)
        )
        curr_st = curr_station.scalar_one_or_none()

        next_station = await session.execute(
            select(Station).where(Station.station_code == next_stop.station_code)
        )
        next_st = next_station.scalar_one_or_none()

        if not curr_st or not next_st:
            continue

        # Interpolate position between current and next station
        interp = random.uniform(0.2, 0.8)
        lat = curr_st.latitude + (next_st.latitude - curr_st.latitude) * interp
        lng = curr_st.longitude + (next_st.longitude - curr_st.longitude) * interp

        # Initial delay and speed
        base_delay = random.choice([0, 0, 0, 3, 5, 8, 10, 12, 15, 20])
        speed = random.uniform(
            train.avg_speed_kmph * 0.7, train.avg_speed_kmph * 1.1
        )

        # Determine status based on delay
        if base_delay <= 2:
            status = "On Time"
        elif base_delay <= 10:
            status = "Slight Delay"
        elif base_delay <= 30:
            status = "Delayed"
        else:
            status = "Critical Delay"

        distance_covered = current_stop.distance_from_source + (
            (next_stop.distance_from_source - current_stop.distance_from_source) * interp
        )

        pos = TrainPosition(
            train_id=train.train_id,
            latitude=round(lat, 4),
            longitude=round(lng, 4),
            speed_kmph=round(speed, 1),
            delay_minutes=float(base_delay),
            status=status,
            current_station_code=current_stop.station_code,
            current_station_name=current_stop.station_name,
            next_station_code=next_stop.station_code,
            next_station_name=next_stop.station_name,
            distance_covered_km=round(distance_covered, 1),
            total_distance_km=train.total_distance_km,
            current_stop_index=current_idx,
            at_station=False,
            dwell_remaining_seconds=0,
            last_updated=datetime.now(timezone.utc),
        )
        session.add(pos)

    await session.flush()
    print(f"  Created initial positions for {len(trains)} trains.")


async def _seed_builtin_stations(session):
    """Fallback minimal station data."""
    builtin_stations = [
        ("NDLS", "New Delhi", "New Delhi", "Delhi", "NR", 28.6139, 77.2090, 16, True),
        ("MMCT", "Mumbai Central", "Mumbai", "Maharashtra", "WR", 18.9712, 72.8194, 8, True),
        ("HWH", "Howrah", "Kolkata", "West Bengal", "ER", 22.5839, 88.3428, 23, True),
        ("MAS", "Chennai Central", "Chennai", "Tamil Nadu", "SR", 13.0827, 80.2707, 12, True),
        ("BRC", "Vadodara Jn", "Vadodara", "Gujarat", "WR", 22.3102, 73.1812, 7, True),
        ("AGC", "Agra Cantt", "Agra", "Uttar Pradesh", "NCR", 27.1575, 77.9980, 6, True),
    ]
    for code, name, city, state, zone, lat, lng, plat, junc in builtin_stations:
        session.add(Station(
            station_code=code, station_name=name, city=city, state=state,
            zone=zone, latitude=lat, longitude=lng,
            platform_count=plat, is_junction=junc
        ))


async def _seed_builtin_trains(session):
    """Fallback minimal train data."""
    session.add(Train(
        train_id="12951", train_name="Mumbai Rajdhani", train_number="12951",
        train_type="rajdhani", source="Mumbai Central", source_code="MMCT",
        destination="New Delhi", destination_code="NDLS", zone="WR",
        total_distance_km=1384, scheduled_departure="17:00",
        scheduled_arrival="08:35", avg_speed_kmph=89, max_speed_kmph=130
    ))
