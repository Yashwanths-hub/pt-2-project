"""
Gym Injury Risk & Fatigue Detection System — FastAPI Backend
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from routers import sessions, alerts, settings as settings_router
from ws_handler import session_manager

app = FastAPI(
    title="Gym Injury Risk & Fatigue Detection System API",
    description="Real-time load cell monitoring and fatigue detection backend.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(sessions.router)
app.include_router(alerts.router)
app.include_router(settings_router.router)


# ---------------------------------------------------------------------------
# WebSocket — real-time sensor stream
# ---------------------------------------------------------------------------
@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await session_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; data is pushed by the session manager
            data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            # Handle client messages (e.g., ping)
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except (WebSocketDisconnect, asyncio.TimeoutError):
        session_manager.disconnect(websocket)
    except Exception:
        session_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Health / stats endpoint
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "is_running": session_manager.is_running,
        "active_connections": len(session_manager.active_connections),
        "total_sessions": len(session_manager.sessions),
    }


@app.get("/stats")
async def stats():
    sessions_list = list(session_manager.sessions.values())
    return {
        "total_sessions": len(sessions_list),
        "total_reps": sum(s.total_reps for s in sessions_list),
        "total_alerts": sum(s.alert_count for s in sessions_list),
        "peak_force_ever": max((s.peak_force for s in sessions_list), default=0),
    }
