"""Network/congestion API endpoints."""

from fastapi import APIRouter
from sqlalchemy import select
from app.database.db import async_session_maker
from app.models.database_models import CongestionSection
from app.database.mongodb import get_mongo_db, COLL_CONGESTION_SECTIONS

router = APIRouter()


@router.get("/congestion")
async def get_congestion():
    """Get all network section congestion data."""
    db = get_mongo_db()
    if db is not None:
        docs = await db[COLL_CONGESTION_SECTIONS].find({}, {"_id": 0}).sort("section_id", 1).to_list(length=100)
        return [
            {
                "section_id": doc["section_id"],
                "from_station": doc["from_station"],
                "to_station": doc["to_station"],
                "from_station_name": doc.get("from_station_name", ""),
                "to_station_name": doc.get("to_station_name", ""),
                "congestion_score": doc["congestion_score"],
                "avg_speed_kmph": doc["avg_speed_kmph"],
                "active_trains": doc["active_trains"],
                "status": doc["status"],
                "delay_impact_minutes": doc["delay_impact_minutes"],
            }
            for doc in docs
        ]

    async with async_session_maker() as session:
        result = await session.execute(select(CongestionSection))
        sections = result.scalars().all()

        return [
            {
                "section_id": s.section_id,
                "from_station": s.from_station,
                "to_station": s.to_station,
                "from_station_name": s.from_station_name,
                "to_station_name": s.to_station_name,
                "congestion_score": s.congestion_score,
                "avg_speed_kmph": s.avg_speed_kmph,
                "active_trains": s.active_trains,
                "status": s.status,
                "delay_impact_minutes": s.delay_impact_minutes,
            }
            for s in sections
        ]


@router.get("/congestion/{section_id}")
async def get_section_congestion(section_id: str):
    """Get congestion data for a specific section."""
    db = get_mongo_db()
    if db is not None:
        doc = await db[COLL_CONGESTION_SECTIONS].find_one({"_id": section_id})
        if not doc:
            doc = await db[COLL_CONGESTION_SECTIONS].find_one({"section_id": section_id})

        if not doc:
            return {"error": "Section not found"}

        return {
            "section_id": doc["section_id"],
            "from_station": doc["from_station"],
            "to_station": doc["to_station"],
            "from_station_name": doc.get("from_station_name", ""),
            "to_station_name": doc.get("to_station_name", ""),
            "congestion_score": doc["congestion_score"],
            "avg_speed_kmph": doc["avg_speed_kmph"],
            "active_trains": doc["active_trains"],
            "status": doc["status"],
            "delay_impact_minutes": doc["delay_impact_minutes"],
        }

    async with async_session_maker() as session:
        result = await session.execute(
            select(CongestionSection).where(CongestionSection.section_id == section_id)
        )
        s = result.scalar_one_or_none()

        if not s:
            return {"error": "Section not found"}

        return {
            "section_id": s.section_id,
            "from_station": s.from_station,
            "to_station": s.to_station,
            "from_station_name": s.from_station_name,
            "to_station_name": s.to_station_name,
            "congestion_score": s.congestion_score,
            "avg_speed_kmph": s.avg_speed_kmph,
            "active_trains": s.active_trains,
            "status": s.status,
            "delay_impact_minutes": s.delay_impact_minutes,
        }
