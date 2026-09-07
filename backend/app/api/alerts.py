"""Alerts API endpoints."""

from fastapi import APIRouter, Query
from typing import Optional
from app.services.alert_service import alert_service

router = APIRouter()


@router.get("")
async def get_alerts(limit: int = Query(50, description="Max alerts to return")):
    """Get recent alerts, newest first."""
    return await alert_service.get_active_alerts(limit=limit)


@router.get("/active")
async def get_active_alerts():
    """Get only unacknowledged alerts."""
    alerts = await alert_service.get_active_alerts(limit=20)
    return [a for a in alerts if not a.get("acknowledged", False)]
