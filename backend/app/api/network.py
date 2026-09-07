"""Network/congestion API endpoints."""

from fastapi import APIRouter
from sqlalchemy import select
from app.database.db import async_session_maker
from app.models.database_models import CongestionSection

router = APIRouter()


@router.get("/congestion")
async def get_congestion():
    """Get all network section congestion data."""
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
