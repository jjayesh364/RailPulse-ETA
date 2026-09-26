"""Simulation control API endpoints."""

from fastapi import APIRouter, Depends
from app.models.schemas import EventCreateRequest
from app.simulation.engine import simulation_engine
from app.api.auth_deps import require_staff
from app.models.user_model import User

router = APIRouter()


@router.post("/simulation/start")
async def start_simulation(current_user: User = Depends(require_staff)):
    """Start the simulation engine. Requires RAILWAY_STAFF role."""
    result = await simulation_engine.start()
    return result


@router.post("/simulation/pause")
async def pause_simulation(current_user: User = Depends(require_staff)):
    """Pause/stop the simulation engine. Requires RAILWAY_STAFF role."""
    result = await simulation_engine.stop()
    return result


@router.get("/simulation/status")
async def get_simulation_status():
    """Get simulation engine status."""
    state = simulation_engine.get_state()
    total_trains = 10 + len(state.get("simulated_real_trains", []))
    return {
        "running": state["running"],
        "tick_count": state["tick_count"],
        "interval_seconds": state["interval_seconds"],
        "last_update": state["last_update"],
        "events_active": state["active_events"],
        "train_count": total_trains,
        "simulated_real_trains": state.get("simulated_real_trains", []),
    }


@router.get("/simulation/trains")
async def get_simulated_real_trains():
    """Get list of real trains currently registered in dynamic simulation."""
    trains = simulation_engine.get_registered_real_trains()
    return {
        "simulated_real_trains": trains,
        "count": len(trains),
    }


@router.post("/simulation/trains/{train_number}/start")
async def start_real_train_simulation(train_number: str, current_user: User = Depends(require_staff)):
    """
    Dynamically register a real train from the real_trains database into the SimulationEngine.
    Binds its authentic timetable and begins active continuous position/ETA updates.
    """
    from fastapi import HTTPException
    result = await simulation_engine.register_real_train(train_number)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Failed to register train"))
    return result


@router.post("/simulation/trains/{train_number}/stop")
async def stop_real_train_simulation(train_number: str, current_user: User = Depends(require_staff)):
    """
    Unregister a real train from the active simulation engine.
    Restores its master schedule state while removing live simulation telemetry.
    """
    result = await simulation_engine.unregister_real_train(train_number)
    return result


@router.post("/simulation/events")
async def inject_event(event: EventCreateRequest, current_user: User = Depends(require_staff)):
    """Inject an operational event into the simulation. Requires RAILWAY_STAFF role."""
    result = await simulation_engine.inject_event(event.model_dump())
    return result


@router.post("/simulation/resolve/{train_id}")
async def resolve_train_issue(train_id: str, current_user: User = Depends(require_staff)):
    """Resolve operational issue for a critical delay train. Requires RAILWAY_STAFF role."""
    from fastapi import HTTPException
    result = await simulation_engine.resolve_train_issue(train_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", f"Train {train_id} not found"))
    return result


@router.post("/eta/recalculate")
async def recalculate_etas(current_user: User = Depends(require_staff)):
    """Force recalculation of all ETAs. Requires RAILWAY_STAFF role."""
    from app.services.eta_service import eta_service
    await eta_service.recalculate_all_etas()
    return {"status": "recalculated", "message": "All ETAs have been recalculated."}
