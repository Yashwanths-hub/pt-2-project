"""
Settings router — read and update detection thresholds.
"""

from fastapi import APIRouter
from models import SettingsModel
from ws_handler import session_manager

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsModel)
async def get_settings():
    s = session_manager.settings
    return SettingsModel(
        baseline_reps=s["baseline_reps"],
        fatigue_drop_pct=s["fatigue_drop_pct"],
        failure_drop_pct=s["failure_drop_pct"],
        failure_variance_threshold=s["failure_variance_threshold"],
    )


@router.put("", response_model=SettingsModel)
async def update_settings(body: SettingsModel):
    session_manager.settings["baseline_reps"] = body.baseline_reps
    session_manager.settings["fatigue_drop_pct"] = body.fatigue_drop_pct
    session_manager.settings["failure_drop_pct"] = body.failure_drop_pct
    session_manager.settings["failure_variance_threshold"] = body.failure_variance_threshold
    return body
