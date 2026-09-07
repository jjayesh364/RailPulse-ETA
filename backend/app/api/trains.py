"""Train API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.train_service import train_service
from app.services.eta_service import eta_service
from app.services.alert_service import alert_service

router = APIRouter()


@router.get("")
async def get_trains(
    search: Optional[str] = Query(None, description="Search by name, number, source, or destination"),
    limit: int = Query(50, ge=1, le=100, description="Page limit (default 50, max 100)"),
    offset: int = Query(0, ge=0, description="Offset for pagination (default 0)"),
):
    """Get all trains or search trains with pagination and full catalog matching total."""
    if search:
        trains = await train_service.search_trains(search, limit=limit, offset=offset)
        total = await train_service.count_search_trains(search)
    else:
        trains = await train_service.get_all_trains(limit=limit, offset=offset)
        total = await train_service.count_all_trains()
    return {"trains": trains, "total": total, "limit": limit, "offset": offset}


@router.get("/{train_id}")
async def get_train_detail(train_id: str):
    """Get comprehensive train details including position, route, ETAs, and alerts."""
    train = await train_service.get_train(train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found")

    position = await train_service.get_train_position(train_id)
    route = await train_service.get_train_route(train_id)
    etas = await eta_service.calculate_all_upcoming_etas(train_id)
    factors = await eta_service.get_prediction_factors(train_id)
    alerts = await alert_service.get_train_alerts(train_id)

    return {
        "train": train,
        "position": position,
        "route": route,
        "etas": etas,
        "factors": factors,
        "recent_alerts": alerts,
    }


@router.get("/{train_id}/position")
async def get_train_position(train_id: str):
    """Get current position of a train."""
    pos = await train_service.get_train_position(train_id)
    if not pos:
        raise HTTPException(status_code=404, detail=f"Position not found for train {train_id}")
    return pos


@router.get("/{train_id}/eta")
async def get_train_eta(train_id: str):
    """Get ETA predictions for upcoming stations."""
    etas = await eta_service.calculate_all_upcoming_etas(train_id)
    return etas


@router.get("/{train_id}/route")
async def get_train_route(train_id: str):
    """Get full route with stop statuses."""
    route = await train_service.get_train_route(train_id)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route not found for train {train_id}")
    return route


@router.get("/{train_id}/history")
async def get_train_history(train_id: str):
    """Get ETA prediction history."""
    return await train_service.get_train_history(train_id)
