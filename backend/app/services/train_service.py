"""Train data service for RailPulse ETA."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, func
from app.database.db import async_session_maker
from app.models.database_models import (
    Train, TrainPosition, RouteStop, ETAPrediction, Alert
)
from app.adapters.train_data_source import DemoTrainDataSource, RealTrainDataSource

demo_source = DemoTrainDataSource()
real_source = RealTrainDataSource()


class TrainService:
    """Service for managing train data and queries across demo and real sources."""

    async def get_all_trains(self, limit: int = 50, offset: int = 0) -> List[dict]:
        """Get demo trains (with live simulation state) + paginated real trains up to limit without double offset."""
        safe_limit = max(1, min(100, limit if limit is not None else 50))
        safe_offset = max(0, offset if offset is not None else 0)

        demo_trains = await demo_source.search_trains("")
        demo_count = len(demo_trains)
        demo_numbers = {t["train_number"] for t in demo_trains}

        result = []
        if safe_offset < demo_count:
            demo_slice = demo_trains[safe_offset : safe_offset + safe_limit]
            result.extend(demo_slice)
            needed_from_real = safe_limit - len(result)
            real_offset = 0
        else:
            needed_from_real = safe_limit
            real_offset = safe_offset - demo_count

        if needed_from_real > 0:
            real_trains = await real_source.search_trains(
                "", limit=needed_from_real, offset=real_offset, exclude_numbers=demo_numbers
            )
            result.extend(real_trains)

        return result

    async def search_trains(self, query: str, limit: int = 50, offset: int = 0) -> List[dict]:
        """Search trains across both Demo simulation trains and Real railway master catalog without double offset."""
        safe_limit = max(1, min(100, limit if limit is not None else 50))
        safe_offset = max(0, offset if offset is not None else 0)

        demo_matching = await demo_source.search_trains(query)
        demo_count = len(demo_matching)
        demo_numbers = {t["train_number"] for t in demo_matching}

        result = []
        if safe_offset < demo_count:
            demo_slice = demo_matching[safe_offset : safe_offset + safe_limit]
            result.extend(demo_slice)
            needed_from_real = safe_limit - len(result)
            real_offset = 0
        else:
            needed_from_real = safe_limit
            real_offset = safe_offset - demo_count

        if needed_from_real > 0:
            real_trains = await real_source.search_trains(
                query, limit=needed_from_real, offset=real_offset, exclude_numbers=demo_numbers
            )
            result.extend(real_trains)

        return result

    async def count_all_trains(self) -> int:
        """Count total trains across demo trains and non-overlapping real trains."""
        demo_trains = await demo_source.search_trains("")
        demo_count = len(demo_trains)
        demo_numbers = {t["train_number"] for t in demo_trains}
        real_count = await real_source.count_trains("", exclude_numbers=demo_numbers)
        return demo_count + real_count

    async def count_search_trains(self, query: str) -> int:
        """Count total matching trains across demo trains and non-overlapping real trains."""
        demo_matching = await demo_source.search_trains(query)
        demo_count = len(demo_matching)
        demo_numbers = {t["train_number"] for t in demo_matching}
        real_count = await real_source.count_trains(query, exclude_numbers=demo_numbers)
        return demo_count + real_count

    async def get_train(self, train_id: str) -> Optional[dict]:
        """Get a single train by ID or train_number from demo source or real source."""
        # Check demo first
        t = await demo_source.get_train(train_id)
        if t:
            return t
        # Check real train catalog
        return await real_source.get_train(train_id)

    async def get_train_position(self, train_id: str) -> Optional[dict]:
        """Get position telemetry for a train."""
        p = await demo_source.get_position(train_id)
        if p:
            return p
        return await real_source.get_position(train_id)

    async def get_train_route(self, train_id: str) -> List[dict]:
        """Get route with stop statuses."""
        # If in demo trains
        demo_t = await demo_source.get_train(train_id)
        if demo_t:
            return await demo_source.get_route(train_id)
        # Else real train route
        return await real_source.get_route(train_id)

    async def get_train_history(self, train_id: str) -> List[dict]:
        """Get ETA prediction history for a train."""
        async with async_session_maker() as session:
            result = await session.execute(
                select(ETAPrediction)
                .where(ETAPrediction.train_id == train_id)
                .order_by(ETAPrediction.created_at.desc())
                .limit(50)
            )
            predictions = result.scalars().all()

            return [
                {
                    "station_code": p.station_code,
                    "station_name": p.station_name,
                    "scheduled_arrival": p.scheduled_arrival,
                    "predicted_arrival": p.predicted_arrival,
                    "predicted_delay_minutes": p.predicted_delay_minutes,
                    "confidence": p.confidence,
                    "confidence_level": p.confidence_level,
                    "created_at": p.created_at.isoformat() if p.created_at else "",
                }
                for p in predictions
            ]

    async def get_kpis(self) -> dict:
        """Get dashboard KPI metrics."""
        async with async_session_maker() as session:
            positions_result = await session.execute(select(TrainPosition))
            positions = positions_result.scalars().all()

            total = len(positions)
            on_time = sum(1 for p in positions if p.status == "On Time")
            delayed = sum(1 for p in positions if p.status in ("Delayed", "Slight Delay"))
            critical = sum(1 for p in positions if p.status == "Critical Delay")
            avg_delay = sum(p.delay_minutes for p in positions) / max(1, total)

            # Count active alerts
            alerts_result = await session.execute(
                select(func.count()).select_from(Alert).where(Alert.acknowledged == False)
            )
            active_alerts = alerts_result.scalar() or 0

            # Prediction accuracy (simulated)
            accuracy = max(70, 95 - avg_delay * 0.5)

            return {
                "active_trains": total,
                "on_time": on_time,
                "delayed": delayed,
                "critical": critical,
                "avg_delay_minutes": round(avg_delay, 1),
                "prediction_accuracy": round(accuracy, 1),
                "active_alerts": active_alerts,
            }


# Singleton
train_service = TrainService()
