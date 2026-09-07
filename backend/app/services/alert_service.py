"""Alert management service for RailPulse ETA."""

from datetime import datetime, timezone
from typing import List
from sqlalchemy import select
from app.database.db import async_session_maker
from app.models.database_models import Alert, Train


class AlertService:
    """Service for managing system alerts."""

    async def get_active_alerts(self, limit: int = 50) -> List[dict]:
        """Get recent alerts, newest first."""
        async with async_session_maker() as session:
            result = await session.execute(
                select(Alert)
                .order_by(Alert.created_at.desc())
                .limit(limit)
            )
            alerts = result.scalars().all()

            return [
                {
                    "id": a.id,
                    "train_id": a.train_id,
                    "train_name": a.train_name or a.train_id,
                    "severity": a.severity,
                    "alert_type": a.alert_type,
                    "message": a.message,
                    "location": a.location,
                    "eta_impact_minutes": a.eta_impact_minutes,
                    "created_at": a.created_at.isoformat() if a.created_at else "",
                    "acknowledged": a.acknowledged,
                }
                for a in alerts
            ]

    async def get_train_alerts(self, train_id: str, limit: int = 10) -> List[dict]:
        """Get recent alerts for a specific train."""
        async with async_session_maker() as session:
            result = await session.execute(
                select(Alert)
                .where(Alert.train_id == train_id)
                .order_by(Alert.created_at.desc())
                .limit(limit)
            )
            alerts = result.scalars().all()
            return [
                {
                    "id": a.id,
                    "train_id": a.train_id,
                    "train_name": a.train_name or a.train_id,
                    "severity": a.severity,
                    "alert_type": a.alert_type,
                    "message": a.message,
                    "location": a.location,
                    "eta_impact_minutes": a.eta_impact_minutes,
                    "created_at": a.created_at.isoformat() if a.created_at else "",
                    "acknowledged": a.acknowledged,
                }
                for a in alerts
            ]

    async def create_alert(
        self,
        train_id: str,
        severity: str,
        alert_type: str,
        message: str,
        location: str = "",
        eta_impact: float = 0,
    ) -> dict:
        """Create a new alert."""
        async with async_session_maker() as session:
            # Get train name
            train_result = await session.execute(
                select(Train).where(Train.train_id == train_id)
            )
            train = train_result.scalar_one_or_none()
            train_name = train.train_name if train else train_id

            alert = Alert(
                train_id=train_id,
                train_name=train_name,
                severity=severity,
                alert_type=alert_type,
                message=message,
                location=location,
                eta_impact_minutes=eta_impact,
                created_at=datetime.now(timezone.utc),
            )
            session.add(alert)
            await session.commit()

            return {
                "id": alert.id,
                "train_id": alert.train_id,
                "train_name": train_name,
                "severity": severity,
                "alert_type": alert_type,
                "message": message,
                "location": location,
                "eta_impact_minutes": eta_impact,
                "created_at": alert.created_at.isoformat(),
                "acknowledged": False,
            }


# Singleton
alert_service = AlertService()
