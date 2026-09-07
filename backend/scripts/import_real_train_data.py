"""
Real Indian Railway Train Master Data Importer for RailPulse ETA.

Imports:
1. Real train master records and stop timetables (DataMeet / NTES).
2. All stations with authentic geographic coordinates (latitude & longitude).
3. Zero-cost repeatable import with local offline caching.
"""

import sys
import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Set, Tuple
import urllib.request
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Ensure project root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.db import async_session_maker, init_db
from app.models.database_models import RealTrain, RealTrainStop, Station

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "real_trains"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Curated modern trains that must NEVER be overwritten by historical bulk imports
PROTECTED_TRAIN_NUMBERS = {"20491", "20492", "22436"}

# DataMeet train type abbreviation expansion map
TYPE_MAP = {
    "SF": "Superfast",
    "Exp": "Express",
    "Pass": "Passenger",
    "Mail": "Mail",
    "Raj": "Rajdhani",
    "Shtb": "Shatabdi",
    "JShtb": "Jan Shatabdi",
    "Drnt": "Duronto",
    "DEMU": "DEMU",
    "MEMU": "MEMU",
    "SKr": "Sampark Kranti",
    "GR": "Garib Rath",
    "Toy": "Toy Train",
    "Hyd": "MMTS Suburban",
    "Klkt": "Suburban Ladies Special",
    "Del": "Suburban Parikrama",
}

# 20491 Jaisalmer - Sabarmati SF Express Master Timetable
TRAIN_20491_DATA = {
    "train_number": "20491",
    "train_name": "Jaisalmer - Sabarmati SF Express",
    "train_type": "Superfast Express",
    "source_station": "JSM",
    "source_station_name": "Jaisalmer",
    "destination_station": "SBIB",
    "destination_station_name": "Sabarmati BG",
    "distance": 759.0,
    "running_days": "Daily",
    "data_source": "NTES / DataMeet",
    "stops": [
        {"seq": 1, "code": "JSM", "name": "Jaisalmer", "arr": None, "dep": "15:30", "halt": 0, "day": 1, "dist": 0.0},
        {"seq": 2, "code": "POK", "name": "Pokaran", "arr": "16:50", "dep": "17:10", "halt": 20, "day": 1, "dist": 103.0},
        {"seq": 3, "code": "RDRA", "name": "Ramdevra", "arr": "17:32", "dep": "17:35", "halt": 3, "day": 1, "dist": 114.0},
        {"seq": 4, "code": "PLCJ", "name": "Phalodi Jn", "arr": "18:15", "dep": "18:20", "halt": 5, "day": 1, "dist": 160.0},
        {"seq": 5, "code": "MWT", "name": "Marwar Lohwat", "arr": "18:40", "dep": "18:42", "halt": 2, "day": 1, "dist": 189.0},
        {"seq": 6, "code": "OSN", "name": "Osiyan", "arr": "19:30", "dep": "19:32", "halt": 2, "day": 1, "dist": 233.0},
        {"seq": 7, "code": "TIW", "name": "Tivari", "arr": "19:48", "dep": "19:50", "halt": 2, "day": 1, "dist": 254.0},
        {"seq": 8, "code": "MMY", "name": "Marwar Mathanya", "arr": "20:03", "dep": "20:05", "halt": 2, "day": 1, "dist": 264.0},
        {"seq": 9, "code": "RKB", "name": "Raika Bagh", "arr": "20:40", "dep": "20:42", "halt": 2, "day": 1, "dist": 296.0},
        {"seq": 10, "code": "JU", "name": "Jodhpur Jn", "arr": "21:00", "dep": "21:10", "halt": 10, "day": 1, "dist": 298.0},
        {"seq": 11, "code": "BGKT", "name": "Bhagat Ki Kothi", "arr": "21:20", "dep": "21:22", "halt": 2, "day": 1, "dist": 302.0},
        {"seq": 12, "code": "LUNI", "name": "Luni Jn", "arr": "21:49", "dep": "21:52", "halt": 3, "day": 1, "dist": 330.0},
        {"seq": 13, "code": "SMR", "name": "Samdari Jn", "arr": "22:40", "dep": "22:45", "halt": 5, "day": 1, "dist": 378.0},
        {"seq": 14, "code": "MKSR", "name": "Mokalsar", "arr": "23:16", "dep": "23:18", "halt": 2, "day": 1, "dist": 404.0},
        {"seq": 15, "code": "JOR", "name": "Jalor", "arr": "23:42", "dep": "23:45", "halt": 3, "day": 1, "dist": 437.0},
        {"seq": 16, "code": "MON", "name": "Modran", "arr": "00:13", "dep": "00:16", "halt": 3, "day": 2, "dist": 471.0},
        {"seq": 17, "code": "MBNL", "name": "Marwar Bhinmal", "arr": "00:37", "dep": "00:40", "halt": 3, "day": 2, "dist": 499.0},
        {"seq": 18, "code": "RNV", "name": "Raniwara", "arr": "01:07", "dep": "01:10", "halt": 3, "day": 2, "dist": 531.0},
        {"seq": 19, "code": "DHA", "name": "Dhanera", "arr": "01:42", "dep": "01:44", "halt": 2, "day": 2, "dist": 566.0},
        {"seq": 20, "code": "BLDI", "name": "Bhildi Jn", "arr": "02:30", "dep": "02:35", "halt": 5, "day": 2, "dist": 601.0},
        {"seq": 21, "code": "PTN", "name": "Patan", "arr": "03:15", "dep": "03:17", "halt": 2, "day": 2, "dist": 652.0},
        {"seq": 22, "code": "MSH", "name": "Mahesana Jn", "arr": "03:50", "dep": "03:52", "halt": 2, "day": 2, "dist": 692.0},
        {"seq": 23, "code": "SBIB", "name": "Sabarmati BG", "arr": "05:15", "dep": None, "halt": 0, "day": 2, "dist": 759.0}
    ]
}

# 20492 Sabarmati - Jaisalmer SF Express (Return service)
TRAIN_20492_DATA = {
    "train_number": "20492",
    "train_name": "Sabarmati - Jaisalmer SF Express",
    "train_type": "Superfast Express",
    "source_station": "SBIB",
    "source_station_name": "Sabarmati BG",
    "destination_station": "JSM",
    "destination_station_name": "Jaisalmer",
    "distance": 759.0,
    "running_days": "Daily",
    "data_source": "NTES / DataMeet",
    "stops": [
        {"seq": 1, "code": "SBIB", "name": "Sabarmati BG", "arr": None, "dep": "22:15", "halt": 0, "day": 1, "dist": 0.0},
        {"seq": 2, "code": "MSH", "name": "Mahesana Jn", "arr": "23:05", "dep": "23:07", "halt": 2, "day": 1, "dist": 67.0},
        {"seq": 3, "code": "PTN", "name": "Patan", "arr": "23:42", "dep": "23:44", "halt": 2, "day": 1, "dist": 107.0},
        {"seq": 4, "code": "BLDI", "name": "Bhildi Jn", "arr": "00:45", "dep": "00:50", "halt": 5, "day": 2, "dist": 158.0},
        {"seq": 5, "code": "DHA", "name": "Dhanera", "arr": "01:18", "dep": "01:20", "halt": 2, "day": 2, "dist": 193.0},
        {"seq": 6, "code": "RNV", "name": "Raniwara", "arr": "01:46", "dep": "01:49", "halt": 3, "day": 2, "dist": 228.0},
        {"seq": 7, "code": "MBNL", "name": "Marwar Bhinmal", "arr": "02:14", "dep": "02:17", "halt": 3, "day": 2, "dist": 260.0},
        {"seq": 8, "code": "MON", "name": "Modran", "arr": "02:38", "dep": "02:41", "halt": 3, "day": 2, "dist": 288.0},
        {"seq": 9, "code": "JOR", "name": "Jalor", "arr": "03:07", "dep": "03:10", "halt": 3, "day": 2, "dist": 322.0},
        {"seq": 10, "code": "MKSR", "name": "Mokalsar", "arr": "03:34", "dep": "03:37", "halt": 3, "day": 2, "dist": 355.0},
        {"seq": 11, "code": "SMR", "name": "Samdari Jn", "arr": "04:10", "dep": "04:15", "halt": 5, "day": 2, "dist": 381.0},
        {"seq": 12, "code": "LUNI", "name": "Luni Jn", "arr": "04:55", "dep": "04:58", "halt": 3, "day": 2, "dist": 429.0},
        {"seq": 13, "code": "BGKT", "name": "Bhagat Ki Kothi", "arr": "05:25", "dep": "05:27", "halt": 2, "day": 2, "dist": 457.0},
        {"seq": 14, "code": "JU", "name": "Jodhpur Jn", "arr": "05:40", "dep": "05:55", "halt": 15, "day": 2, "dist": 461.0},
        {"seq": 15, "code": "RKB", "name": "Raika Bagh", "arr": "06:03", "dep": "06:05", "halt": 2, "day": 2, "dist": 463.0},
        {"seq": 16, "code": "MMY", "name": "Marwar Mathanya", "arr": "06:33", "dep": "06:35", "halt": 2, "day": 2, "dist": 495.0},
        {"seq": 17, "code": "TIW", "name": "Tivari", "arr": "06:48", "dep": "06:50", "halt": 2, "day": 2, "dist": 505.0},
        {"seq": 18, "code": "OSN", "name": "Osiyan", "arr": "07:07", "dep": "07:09", "halt": 2, "day": 2, "dist": 526.0},
        {"seq": 19, "code": "MWT", "name": "Marwar Lohwat", "arr": "07:38", "dep": "07:40", "halt": 2, "day": 2, "dist": 570.0},
        {"seq": 20, "code": "PLCJ", "name": "Phalodi Jn", "arr": "08:05", "dep": "08:10", "halt": 5, "day": 2, "dist": 599.0},
        {"seq": 21, "code": "RDRA", "name": "Ramdevra", "arr": "08:50", "dep": "08:53", "halt": 3, "day": 2, "dist": 645.0},
        {"seq": 22, "code": "POK", "name": "Pokaran", "arr": "09:20", "dep": "09:40", "halt": 20, "day": 2, "dist": 656.0},
        {"seq": 23, "code": "JSM", "name": "Jaisalmer", "arr": "12:00", "dep": None, "halt": 0, "day": 2, "dist": 759.0}
    ]
}

# 22436 Vande Bharat Express (New Delhi - Varanasi)
TRAIN_22436_DATA = {
    "train_number": "22436",
    "train_name": "Vande Bharat Express",
    "train_type": "Vande Bharat",
    "source_station": "NDLS",
    "source_station_name": "New Delhi",
    "destination_station": "BSB",
    "destination_station_name": "Varanasi Jn",
    "distance": 771.0,
    "running_days": "Tue,Wed,Fri,Sat,Sun",
    "data_source": "NTES / DataMeet",
    "stops": [
        {"seq": 1, "code": "NDLS", "name": "New Delhi", "arr": None, "dep": "06:00", "halt": 0, "day": 1, "dist": 0.0},
        {"seq": 2, "code": "CNB", "name": "Kanpur Central", "arr": "10:08", "dep": "10:10", "halt": 2, "day": 1, "dist": 441.0},
        {"seq": 3, "code": "PRYJ", "name": "Prayagraj Jn", "arr": "12:08", "dep": "12:10", "halt": 2, "day": 1, "dist": 635.0},
        {"seq": 4, "code": "BSB", "name": "Varanasi Jn", "arr": "14:00", "dep": None, "halt": 0, "day": 1, "dist": 771.0}
    ]
}

# Real coordinates for stations along 20491 and trunk corridors
REAL_STATIONS_COORDS = {
    "JSM": {"name": "Jaisalmer", "lat": 26.91655, "lon": 70.92824, "state": "Rajasthan", "zone": "NWR"},
    "POK": {"name": "Pokaran", "lat": 26.93057, "lon": 71.92313, "state": "Rajasthan", "zone": "NWR"},
    "RDRA": {"name": "Ramdevra", "lat": 27.00628, "lon": 71.92984, "state": "Rajasthan", "zone": "NWR"},
    "PLCJ": {"name": "Phalodi Jn", "lat": 27.12491, "lon": 72.36686, "state": "Rajasthan", "zone": "NWR"},
    "MWT": {"name": "Marwar Lohwat", "lat": 26.98126, "lon": 72.58927, "state": "Rajasthan", "zone": "NWR"},
    "OSN": {"name": "Osiyan", "lat": 26.72922, "lon": 72.89978, "state": "Rajasthan", "zone": "NWR"},
    "TIW": {"name": "Tivari", "lat": 26.55473, "lon": 72.88958, "state": "Rajasthan", "zone": "NWR"},
    "MMY": {"name": "Marwar Mathanya", "lat": 26.53217, "lon": 72.97878, "state": "Rajasthan", "zone": "NWR"},
    "RKB": {"name": "Raika Bagh", "lat": 26.29163, "lon": 73.03974, "state": "Rajasthan", "zone": "NWR"},
    "JU": {"name": "Jodhpur Jn", "lat": 26.28377, "lon": 73.02319, "state": "Rajasthan", "zone": "NWR"},
    "BGKT": {"name": "Bhagat Ki Kothi", "lat": 26.24850, "lon": 73.01334, "state": "Rajasthan", "zone": "NWR"},
    "LUNI": {"name": "Luni Jn", "lat": 26.00126, "lon": 73.00318, "state": "Rajasthan", "zone": "NWR"},
    "SMR": {"name": "Samdari Jn", "lat": 25.83720, "lon": 72.57301, "state": "Rajasthan", "zone": "NWR"},
    "MKSR": {"name": "Mokalsar", "lat": 25.62535, "lon": 72.51804, "state": "Rajasthan", "zone": "NWR"},
    "JOR": {"name": "Jalor", "lat": 25.35418, "lon": 72.63429, "state": "Rajasthan", "zone": "NWR"},
    "MON": {"name": "Modran", "lat": 25.18743, "lon": 72.44763, "state": "Rajasthan", "zone": "NWR"},
    "MBNL": {"name": "Marwar Bhinmal", "lat": 25.00063, "lon": 72.27540, "state": "Rajasthan", "zone": "NWR"},
    "RNV": {"name": "Raniwara", "lat": 24.75046, "lon": 72.20429, "state": "Rajasthan", "zone": "NWR"},
    "DHA": {"name": "Dhanera", "lat": 24.51200, "lon": 72.02300, "state": "Gujarat", "zone": "WR"},
    "BLDI": {"name": "Bhildi Jn", "lat": 24.19425, "lon": 72.00819, "state": "Gujarat", "zone": "WR"},
    "PTN": {"name": "Patan", "lat": 23.85329, "lon": 72.13167, "state": "Gujarat", "zone": "WR"},
    "MSH": {"name": "Mahesana Jn", "lat": 23.60262, "lon": 72.38871, "state": "Gujarat", "zone": "WR"},
    "SBIB": {"name": "Sabarmati BG", "lat": 23.07299, "lon": 72.58716, "state": "Gujarat", "zone": "WR"},
    "BSB": {"name": "Varanasi Jn", "lat": 25.32830, "lon": 82.98630, "state": "Uttar Pradesh", "zone": "NR"},
    "PRYJ": {"name": "Prayagraj Jn", "lat": 25.44840, "lon": 81.83400, "state": "Uttar Pradesh", "zone": "NCR"},
}


def normalize_time(val) -> Optional[str]:
    """Normalize time string to HH:MM or None."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ("none", "null", "source", "destination", "--", "-"):
        return None
    parts = val_str.split(":")
    if len(parts) >= 2:
        try:
            h = int(parts[0])
            m = int(parts[1])
            return f"{h:02d}:{m:02d}"
        except ValueError:
            return None
    return None


async def import_stations(session):
    """Seed known real stations with authentic coordinates into database."""
    print("[Importer] Seeding reference stations...")
    for code, info in REAL_STATIONS_COORDS.items():
        existing = await session.get(Station, code)
        if not existing:
            st = Station(
                station_code=code,
                station_name=info["name"],
                city=info["name"],
                state=info.get("state", "India"),
                zone=info.get("zone", "IR"),
                latitude=info["lat"],
                longitude=info["lon"],
                platform_count=4,
                is_junction="Jn" in info["name"],
            )
            session.add(st)
    await session.commit()
    print(f"[Importer] Seeded {len(REAL_STATIONS_COORDS)} reference stations.")


async def import_train_record(session, train_dict: dict) -> bool:
    """
    Import or update a single train dictionary into the active session without committing.
    Validates data, normalizes times/numbers, and updates stops idempotently.
    """
    if not isinstance(train_dict, dict):
        raise ValueError("Train data must be a JSON dictionary.")

    raw_train_no = train_dict.get("train_number")
    if not raw_train_no:
        raise ValueError("Missing 'train_number' in train data.")
    train_no = str(raw_train_no).strip()

    train_name = str(train_dict.get("train_name", f"Train {train_no}")).strip()
    train_type = str(train_dict.get("train_type", "Superfast Express")).strip()
    source_station = str(train_dict.get("source_station") or train_dict.get("source_code") or train_dict.get("source") or "").strip()
    source_name = str(train_dict.get("source_station_name") or train_dict.get("source") or source_station).strip()
    dest_station = str(train_dict.get("destination_station") or train_dict.get("destination_code") or train_dict.get("destination") or "").strip()
    dest_name = str(train_dict.get("destination_station_name") or train_dict.get("destination") or dest_station).strip()
    running_days = str(train_dict.get("running_days", "Daily")).strip()
    data_source = str(train_dict.get("data_source", "NTES / DataMeet")).strip()

    raw_stops = train_dict.get("stops", [])
    if not isinstance(raw_stops, list):
        raise ValueError(f"Train {train_no} stops must be a list.")

    # Fallback to first/last stops for source/destination if still empty
    if not source_station and raw_stops:
        source_station = str(raw_stops[0].get("station_code", "")).strip()
        source_name = str(raw_stops[0].get("station_name", source_station)).strip()
    if not dest_station and raw_stops:
        dest_station = str(raw_stops[-1].get("station_code", "")).strip()
        dest_name = str(raw_stops[-1].get("station_name", dest_station)).strip()

    try:
        distance = float(train_dict.get("distance") or train_dict.get("total_distance_km") or 0.0)
    except (ValueError, TypeError):
        distance = 0.0

    # 1. Upsert RealTrain
    existing_train = await session.get(RealTrain, train_no)
    if existing_train:
        existing_train.train_name = train_name
        existing_train.train_type = train_type
        existing_train.source_station = source_station
        existing_train.source_station_name = source_name
        existing_train.destination_station = dest_station
        existing_train.destination_station_name = dest_name
        existing_train.distance = distance
        existing_train.running_days = running_days
        existing_train.data_source = data_source
        existing_train.last_updated = datetime.now(timezone.utc)
    else:
        rt = RealTrain(
            train_number=train_no,
            train_name=train_name,
            train_type=train_type,
            source_station=source_station,
            source_station_name=source_name,
            destination_station=dest_station,
            destination_station_name=dest_name,
            distance=distance,
            running_days=running_days,
            data_source=data_source,
            last_updated=datetime.now(timezone.utc),
        )
        session.add(rt)

    # 2. Check stations in stops - if station missing from Station table and has reliable coordinates, add it
    for s in raw_stops:
        st_code = str(s.get("code", "")).strip()
        st_name = str(s.get("name", st_code)).strip()
        if st_code:
            existing_st = await session.get(Station, st_code)
            if not existing_st:
                # If reliable coordinates provided in the source stop dict or known dict
                if "lat" in s and "lon" in s:
                    try:
                        st = Station(
                            station_code=st_code,
                            station_name=st_name,
                            city=st_name,
                            state=s.get("state", "India"),
                            zone=s.get("zone", "IR"),
                            latitude=float(s["lat"]),
                            longitude=float(s["lon"]),
                            platform_count=int(s.get("platform_count", 4)),
                            is_junction="Jn" in st_name,
                        )
                        session.add(st)
                    except (ValueError, TypeError):
                        pass
                elif st_code in REAL_STATIONS_COORDS:
                    info = REAL_STATIONS_COORDS[st_code]
                    st = Station(
                        station_code=st_code,
                        station_name=info["name"],
                        city=info["name"],
                        state=info.get("state", "India"),
                        zone=info.get("zone", "IR"),
                        latitude=info["lat"],
                        longitude=info["lon"],
                        platform_count=4,
                        is_junction="Jn" in info["name"],
                    )
                    session.add(st)
                else:
                    # Station coordinates not available in verified reference catalog
                    print(f"[Importer] Notice: Station {st_code} ({st_name}) missing coordinates in station master.")

    # 3. Clean and reinsert stops
    from sqlalchemy import delete
    await session.execute(delete(RealTrainStop).where(RealTrainStop.train_number == train_no))

    for idx, s in enumerate(raw_stops):
        seq = int(s.get("seq") or s.get("stop_number") or idx + 1)
        st_code = str(s.get("code") or s.get("station_code") or "").strip()
        st_name = str(s.get("name") or s.get("station_name") or st_code).strip()
        arr_time = normalize_time(s.get("arr") if "arr" in s else s.get("arrival"))
        dep_time = normalize_time(s.get("dep") if "dep" in s else s.get("departure"))

        try:
            halt = int(s.get("halt") if "halt" in s else s.get("halt_minutes", 2))
        except (ValueError, TypeError):
            halt = 2

        try:
            day_offset = int(s.get("day", 1))
        except (ValueError, TypeError):
            day_offset = 1

        dist_raw = s.get("dist") if "dist" in s else s.get("distance_km")
        if dist_raw is not None:
            try:
                dist = float(dist_raw)
            except (ValueError, TypeError):
                dist = None
        else:
            dist = None

        stop_record = RealTrainStop(
            train_number=train_no,
            sequence=seq,
            station_code=st_code,
            station_name=st_name,
            arrival_time=arr_time,
            departure_time=dep_time,
            halt_minutes=halt,
            day_offset=day_offset,
            distance=dist,
        )
        session.add(stop_record)

    return True


async def import_real_train(session, train_dict: dict):
    """Upsert real train and commit immediately (single train helper for backward compatibility)."""
    train_no = str(train_dict.get("train_number", "")).strip()
    print(f"[Importer] Importing Real Train {train_no} - {train_dict.get('train_name')}...")
    await import_train_record(session, train_dict)
    await session.commit()
    print(f"[Importer] Train {train_no} successfully saved.")


def refresh_from_ntes(train_number: str) -> dict:
    """
    Optional zero-cost refresh utility using open-source ntes-client / railpull.
    Fetches official NTES schedule and caches locally.
    """
    cache_file = CACHE_DIR / f"{train_number}.json"
    try:
        from ntes import NTESClient
        client = NTESClient(timeout=10)
        sched = client.schedule(train_number)
        if sched and sched.get("stations"):
            stations = sched["stations"]
            stops = []
            for i, st in enumerate(stations):
                sta = st.get("STA", "")
                std = st.get("STD", "")
                dist_str = st.get("Distance", "0")
                try:
                    dist = float(dist_str)
                except ValueError:
                    dist = 0.0

                stops.append({
                    "seq": i + 1,
                    "code": st.get("StationCode"),
                    "name": st.get("StationName"),
                    "arr": sta if sta != "Source" else None,
                    "dep": std if std != "Destination" else None,
                    "halt": int(st.get("Halt", 2)) if str(st.get("Halt", "")).isdigit() else 2,
                    "day": int(st.get("Day", 1)) if str(st.get("Day", "")).isdigit() else 1,
                    "dist": dist,
                })

            parsed = {
                "train_number": str(train_number),
                "train_name": sched.get("TrainName", f"Express {train_number}"),
                "train_type": sched.get("TrainTypeDesc", "Express"),
                "source_station": sched.get("Source", stops[0]["code"] if stops else ""),
                "source_station_name": sched.get("SourceName", stops[0]["name"] if stops else ""),
                "destination_station": sched.get("Destination", stops[-1]["code"] if stops else ""),
                "destination_station_name": sched.get("DestinationName", stops[-1]["name"] if stops else ""),
                "distance": stops[-1]["dist"] if stops else 0.0,
                "running_days": sched.get("DaysOfRun", "Daily"),
                "data_source": "NTES Live Schedule",
                "stops": stops,
            }
            # Cache locally
            cache_file.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
            return parsed
    except Exception as e:
        print(f"[Importer] NTES live refresh notice ({e}). Falling back to local offline cache.")

    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    return None


async def import_trains_from_directory(
    session,
    directory: Path,
    batch_size: int = 50,
) -> Dict[str, Any]:
    """
    Discover all *.json files in the specified directory and import them in batches.
    Gracefully handles and isolates malformed files without corrupting valid records.
    """
    if isinstance(directory, str):
        directory = Path(directory)

    if not directory.exists() or not directory.is_dir():
        logger.error(f"Directory does not exist or is not a directory: {directory}")
        return {"imported": 0, "skipped": 0, "errors": [f"Directory not found: {directory}"]}

    json_files = sorted(list(directory.glob("*.json")))
    print(f"[Importer] Discovered {len(json_files)} train JSON files in {directory}...")

    imported_count = 0
    failed_count = 0
    errors = []
    uncommitted = 0

    for fpath in json_files:
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            await import_train_record(session, data)
            imported_count += 1
            uncommitted += 1

            if uncommitted >= batch_size:
                await session.commit()
                uncommitted = 0
                print(f"[Importer] Batch committed: {imported_count} trains processed.")

        except json.JSONDecodeError as jde:
            failed_count += 1
            err_msg = f"Malformed JSON in {fpath.name}: {jde}"
            print(f"[Importer] Error: {err_msg}")
            errors.append(err_msg)
        except Exception as e:
            failed_count += 1
            err_msg = f"Failed to import {fpath.name}: {e}"
            print(f"[Importer] Error: {err_msg}")
            errors.append(err_msg)

    if uncommitted > 0:
        await session.commit()
        print(f"[Importer] Final batch committed. Total trains imported: {imported_count}.")

    return {
        "total_files": len(json_files),
        "imported": imported_count,
        "failed": failed_count,
        "skipped": failed_count,
        "errors": errors,
    }


async def import_datameet_dataset(session, datameet_dir: Optional[Path] = None, batch_size: int = 1000) -> Dict[str, Any]:
    """
    Import Indian Railways master dataset from DataMeet (CC0):
    - stations.json (with coordinates, skipping null geometries & tracking pseudo stations)
    - trains.json (expanding type abbreviations, running_days='Unspecified', data_source attribution)
    - schedules.json (origin dist=0.0, intermediate=None, terminus=train distance)
    - Strictly preserves protected trains (20491, 20492, 22436).
    - Commits in batches of batch_size stops to maintain constant memory and performance.
    """
    if datameet_dir is None:
        # Search candidate locations
        candidates = [
            Path(__file__).resolve().parent.parent.parent / "data" / "datameet",
            Path(__file__).resolve().parent.parent / "data" / "datameet",
            Path("data/datameet"),
        ]
        for c in candidates:
            if (c / "trains.json").exists() and (c / "stations.json").exists() and (c / "schedules.json").exists():
                datameet_dir = c.resolve()
                break

    if not datameet_dir or not (datameet_dir / "trains.json").exists():
        raise FileNotFoundError(f"DataMeet dataset files not found in candidate paths: {datameet_dir}")

    print(f"[DataMeet Importer] Starting DataMeet bulk import from {datameet_dir}...")

    # -------------------------------------------------------------
    # 1. Ingest Stations
    # -------------------------------------------------------------
    stations_path = datameet_dir / "stations.json"
    with open(stations_path, "r", encoding="utf-8") as f:
        stations_geojson = json.load(f)

    st_features = stations_geojson.get("features", [])
    print(f"[DataMeet Importer] Loaded {len(st_features)} station features from {stations_path.name}.")

    station_coords_map = {}
    stations_added = 0
    stations_skipped_null_coords = 0
    pseudo_stations_count = 0

    for feat in st_features:
        props = feat.get("properties", {})
        code = str(props.get("code", "")).strip().upper()
        name = str(props.get("name", "")).strip() or code
        if not code:
            continue

        if code.startswith("XX-") or code.startswith("YY-"):
            pseudo_stations_count += 1

        geom = feat.get("geometry")
        if not geom or not geom.get("coordinates") or len(geom["coordinates"]) < 2:
            stations_skipped_null_coords += 1
            continue

        lon, lat = geom["coordinates"][0], geom["coordinates"][1]
        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            stations_skipped_null_coords += 1
            continue

        station_coords_map[code] = (lat, lon, name, props.get("state", ""), props.get("zone", ""))

    print(f"[DataMeet Importer] Valid station coordinates found: {len(station_coords_map)}. "
          f"Null geometry skipped: {stations_skipped_null_coords}. Pseudo stations: {pseudo_stations_count}.")

    # Upsert valid stations
    for code, (lat, lon, name, state, zone) in station_coords_map.items():
        existing_st = await session.get(Station, code)
        if not existing_st:
            st = Station(
                station_code=code,
                station_name=name,
                city=name,
                state=state or "India",
                zone=zone or "IR",
                latitude=lat,
                longitude=lon,
                platform_count=4,
                is_junction="JN" in name.upper() or "JUNCTION" in name.upper(),
            )
            session.add(st)
            stations_added += 1

    await session.commit()
    print(f"[DataMeet Importer] Station master updated: {stations_added} new stations inserted.")

    # -------------------------------------------------------------
    # 2. Ingest Schedules into memory lookup
    # -------------------------------------------------------------
    schedules_path = datameet_dir / "schedules.json"
    print(f"[DataMeet Importer] Loading schedules from {schedules_path.name}...")
    with open(schedules_path, "r", encoding="utf-8") as f:
        schedules_list = json.load(f)

    print(f"[DataMeet Importer] Loaded {len(schedules_list)} schedule records. Grouping by train_number...")
    sched_by_train: Dict[str, List[dict]] = {}
    for s in schedules_list:
        t_no = str(s.get("train_number", "")).strip()
        if t_no:
            sched_by_train.setdefault(t_no, []).append(s)

    print(f"[DataMeet Importer] Grouped schedules across {len(sched_by_train)} distinct train numbers.")

    # -------------------------------------------------------------
    # 3. Ingest Trains and Stops
    # -------------------------------------------------------------
    trains_path = datameet_dir / "trains.json"
    print(f"[DataMeet Importer] Loading trains from {trains_path.name}...")
    with open(trains_path, "r", encoding="utf-8") as f:
        trains_geojson = json.load(f)

    train_features = trains_geojson.get("features", [])
    print(f"[DataMeet Importer] Processing {len(train_features)} train features...")

    trains_imported = 0
    trains_skipped_protected = 0
    stops_imported = 0
    uncommitted_stops = 0

    from sqlalchemy import delete

    for feat in train_features:
        p = feat.get("properties", {})
        raw_number = str(p.get("number", "")).strip()
        if not raw_number:
            continue

        if raw_number in PROTECTED_TRAIN_NUMBERS:
            trains_skipped_protected += 1
            continue

        raw_type = str(p.get("type", "")).strip()
        train_type = TYPE_MAP.get(raw_type, raw_type if raw_type else "Express")
        train_name = str(p.get("name", "")).strip() or f"Train {raw_number}"
        src_code = str(p.get("from_station_code", "")).strip().upper()
        src_name = str(p.get("from_station_name", "")).strip() or src_code
        dst_code = str(p.get("to_station_code", "")).strip().upper()
        dst_name = str(p.get("to_station_name", "")).strip() or dst_code

        try:
            total_dist = float(p.get("distance")) if p.get("distance") is not None else 0.0
        except (ValueError, TypeError):
            total_dist = 0.0

        existing_train = await session.get(RealTrain, raw_number)
        if existing_train:
            existing_train.train_name = train_name
            existing_train.train_type = train_type
            existing_train.source_station = src_code
            existing_train.source_station_name = src_name
            existing_train.destination_station = dst_code
            existing_train.destination_station_name = dst_name
            existing_train.distance = total_dist
            existing_train.running_days = "Unspecified"
            existing_train.data_source = "DataMeet (CC0) - Historical Timetable Snapshot"
            existing_train.last_updated = datetime.now(timezone.utc)
        else:
            rt = RealTrain(
                train_number=raw_number,
                train_name=train_name,
                train_type=train_type,
                source_station=src_code,
                source_station_name=src_name,
                destination_station=dst_code,
                destination_station_name=dst_name,
                distance=total_dist,
                running_days="Unspecified",
                data_source="DataMeet (CC0) - Historical Timetable Snapshot",
                last_updated=datetime.now(timezone.utc),
            )
            session.add(rt)

        trains_imported += 1

        # Delete existing stops for this train if any (idempotency)
        await session.execute(delete(RealTrainStop).where(RealTrainStop.train_number == raw_number))

        # Process train stops
        train_stops = sched_by_train.get(raw_number, [])
        num_stops = len(train_stops)

        for idx, stop in enumerate(train_stops):
            seq = idx + 1
            st_code = str(stop.get("station_code", "")).strip().upper()
            st_name = str(stop.get("station_name", "")).strip() or st_code

            arr = normalize_time(stop.get("arrival"))
            dep = normalize_time(stop.get("departure"))

            # Calculate halt minutes
            halt_min = None
            if arr and dep:
                try:
                    arr_h, arr_m = map(int, arr.split(":"))
                    dep_h, dep_m = map(int, dep.split(":"))
                    diff = (dep_h * 60 + dep_m) - (arr_h * 60 + arr_m)
                    if diff < 0:
                        diff += 1440
                    halt_min = diff
                except Exception:
                    halt_min = None
            elif arr is None or dep is None:
                halt_min = 0

            # Day offset
            day_val = stop.get("day")
            try:
                day_offset = int(day_val) if day_val is not None else 1
            except (ValueError, TypeError):
                day_offset = 1

            # Option A Distance Assignment:
            # First stop = 0.0, intermediate = None, terminus = train total distance
            if seq == 1:
                stop_dist = 0.0
            elif seq == num_stops:
                stop_dist = total_dist
            else:
                stop_dist = None

            rts = RealTrainStop(
                train_number=raw_number,
                sequence=seq,
                station_code=st_code,
                station_name=st_name,
                arrival_time=arr,
                departure_time=dep,
                halt_minutes=halt_min if halt_min is not None else 0,
                day_offset=day_offset,
                distance=stop_dist,
            )
            session.add(rts)
            stops_imported += 1
            uncommitted_stops += 1

            if uncommitted_stops >= batch_size:
                await session.commit()
                uncommitted_stops = 0
                if trains_imported % 500 == 0 or trains_imported == len(train_features):
                    print(f"[DataMeet Importer] Progress: {trains_imported}/{len(train_features)} trains, {stops_imported} stops committed.")

    if uncommitted_stops > 0:
        await session.commit()

    print(f"[DataMeet Importer] Completed! Ingested {trains_imported} trains and {stops_imported} stops. "
          f"Protected trains skipped: {trains_skipped_protected}.")

    return {
        "trains_imported": trains_imported,
        "trains_skipped_protected": trains_skipped_protected,
        "stops_imported": stops_imported,
        "stations_added": stations_added,
        "stations_skipped_null_coords": stations_skipped_null_coords,
        "pseudo_stations_count": pseudo_stations_count,
    }


def sync_database_files():
    """Ensure consistency between root railpulse.db and backend/railpulse.db."""
    root_dir = Path(__file__).resolve().parent.parent.parent
    root_db = root_dir / "railpulse.db"
    backend_db = root_dir / "backend" / "railpulse.db"

    if not root_db.exists() and not backend_db.exists():
        return

    # Determine which is newer or larger
    if backend_db.exists() and root_db.exists():
        if backend_db.stat().st_mtime > root_db.stat().st_mtime:
            shutil.copy2(backend_db, root_db)
            print("[Database Sync] Synchronized backend/railpulse.db -> railpulse.db")
        elif root_db.stat().st_mtime > backend_db.stat().st_mtime:
            shutil.copy2(root_db, backend_db)
            print("[Database Sync] Synchronized railpulse.db -> backend/railpulse.db")
    elif backend_db.exists() and not root_db.exists():
        shutil.copy2(backend_db, root_db)
        print("[Database Sync] Copied backend/railpulse.db -> railpulse.db")
    elif root_db.exists() and not backend_db.exists():
        shutil.copy2(root_db, backend_db)
        print("[Database Sync] Copied railpulse.db -> backend/railpulse.db")


async def run_import(batch_size: int = 50, include_datameet: bool = True):
    """Main entrypoint for repeatable real train master import."""
    await init_db()
    async with async_session_maker() as session:
        await import_stations(session)

        # Ensure reference seed files exist in CACHE_DIR
        if not (CACHE_DIR / "20491.json").exists():
            (CACHE_DIR / "20491.json").write_text(json.dumps(TRAIN_20491_DATA, indent=2), encoding="utf-8")
        if not (CACHE_DIR / "20492.json").exists():
            (CACHE_DIR / "20492.json").write_text(json.dumps(TRAIN_20492_DATA, indent=2), encoding="utf-8")
        if not (CACHE_DIR / "22436.json").exists():
            (CACHE_DIR / "22436.json").write_text(json.dumps(TRAIN_22436_DATA, indent=2), encoding="utf-8")

        # Discover and batch-import all JSON files in backend/data/real_trains/ (curated trains)
        results = await import_trains_from_directory(session, CACHE_DIR, batch_size=batch_size)

        if include_datameet:
            dm_results = await import_datameet_dataset(session, batch_size=1000)
            results["datameet"] = dm_results

    # Sync databases
    sync_database_files()

    print(f"[Importer] Real train master data import completed: {results['imported']} curated succeeded.")
    return results


if __name__ == "__main__":
    import shutil
    asyncio.run(run_import(include_datameet=True))

