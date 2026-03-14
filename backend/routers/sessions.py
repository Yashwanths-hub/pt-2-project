"""
Sessions router — start, stop, list, and detail workout sessions.
"""

import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from models import WorkoutSession, SessionStartRequest, SessionStopRequest
from ws_handler import session_manager
from typing import List

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/start", response_model=WorkoutSession)
async def start_session(body: SessionStartRequest, background_tasks: BackgroundTasks):
    if session_manager.is_running:
        raise HTTPException(400, "A session is already running. Stop it first.")

    settings = {
        "baseline_reps": body.baseline_reps,
        "fatigue_drop_pct": body.fatigue_drop_pct,
        "failure_drop_pct": body.failure_drop_pct,
        "failure_variance_threshold": body.failure_variance_threshold,
    }
    session = session_manager.start_session(settings)

    # Schedule streaming in background
    background_tasks.add_task(_run_stream)

    return session


async def _run_stream():
    await session_manager.run_stream()


@router.post("/stop", response_model=WorkoutSession)
async def stop_session():
    if not session_manager.is_running and not session_manager.current_session:
        raise HTTPException(400, "No active session.")
    session = session_manager.stop_session()
    if not session:
        raise HTTPException(404, "Session not found.")
    return session


@router.get("", response_model=List[WorkoutSession])
async def list_sessions():
    return list(session_manager.sessions.values())


@router.get("/current", response_model=WorkoutSession)
async def current_session():
    if not session_manager.current_session:
        raise HTTPException(404, "No active session.")
    return session_manager.current_session


@router.get("/{session_id}", response_model=WorkoutSession)
async def get_session(session_id: str):
    session = session_manager.sessions.get(session_id)
    if not session:
        raise HTTPException(404, f"Session '{session_id}' not found.")
    return session
