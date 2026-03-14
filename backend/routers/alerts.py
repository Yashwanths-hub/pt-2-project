"""
Alerts router — list and query alert events.
"""

from fastapi import APIRouter, HTTPException
from models import AlertEvent, AlertLevel
from ws_handler import session_manager
from typing import List, Optional

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertEvent])
async def list_alerts(session_id: Optional[str] = None):
    all_alerts: List[AlertEvent] = []
    for session in session_manager.sessions.values():
        if session_id and session.id != session_id:
            continue
        all_alerts.extend(session.alerts)
    all_alerts.sort(key=lambda a: a.timestamp, reverse=True)
    return all_alerts[:100]


@router.get("/live")
async def live_alert():
    return {
        "alert_level": session_manager.engine.current_alert.value,
        "is_running": session_manager.is_running,
        "baseline_captured": session_manager.engine.is_baseline_captured,
        "baseline_force": session_manager.engine.baseline_peak_force,
    }
