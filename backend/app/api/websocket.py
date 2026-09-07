"""WebSocket endpoint for real-time updates."""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.simulation.engine import simulation_engine

router = APIRouter()


@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for live simulation updates."""
    await websocket.accept()
    simulation_engine.register_ws_client(websocket)
    print(f"[WebSocket] Client connected. Total: {len(simulation_engine._ws_clients)}")

    try:
        # Send initial state
        await websocket.send_text(json.dumps({
            "type": "connection",
            "data": {
                "status": "connected",
                "simulation_running": simulation_engine.is_running,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        }))

        # Keep connection alive, listen for client messages
        while True:
            try:
                data = await websocket.receive_text()
                # Handle ping/pong
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }))
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                pass
            except Exception:
                break
    finally:
        simulation_engine.unregister_ws_client(websocket)
        print(f"[WebSocket] Client disconnected. Total: {len(simulation_engine._ws_clients)}")
