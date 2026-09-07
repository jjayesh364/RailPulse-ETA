"""Analytics API endpoints."""

from fastapi import APIRouter
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("")
async def get_analytics():
    """Get comprehensive analytics data."""
    return await analytics_service.get_full_analytics()


@router.get("/delays")
async def get_delay_analytics():
    """Get delay-specific analytics."""
    return await analytics_service.get_delay_analytics()


@router.get("/predictions")
async def get_prediction_analytics():
    """Get prediction performance analytics."""
    return await analytics_service.get_prediction_analytics()


@router.get("/model-performance")
async def get_model_performance():
    """Get ML model performance metrics."""
    return await analytics_service.get_model_performance()
