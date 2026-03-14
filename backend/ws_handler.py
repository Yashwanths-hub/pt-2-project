"""
WebSocket streaming handler for real-time sensor data.

Streams JSON payloads at ~20 Hz to all connected clients.
Manages the sensor simulator and detection engine lifecycle.
"""

import asyncio
import json
import time
import uuid
import threading
from typing import Dict, Set, Optional, List

from fastapi import WebSocket, WebSocketDisconnect

from models import AlertLevel, AlertEvent, WorkoutSession, RepData
from sensor_simulator import SensorSimulator
from detection_engine import DetectionEngine


class SessionManager:
    """
    Global singleton managing the current workout session, sensor simulation,
    and all connected WebSocket clients.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.current_session: Optional[WorkoutSession] = None
        self.sessions: Dict[str, WorkoutSession] = {}
        self.is_running = False

        # Detection
        self.engine = DetectionEngine()
        self.simulator = SensorSimulator()

        # Per-rep buffer
        self._rep_samples: List[float] = []
        self._rep_start_time: float = 0.0
        self._last_rep: int = 0

        # Settings (can be updated via API)
        self.settings = {
            "baseline_reps": 5,
            "fatigue_drop_pct": 10.0,
            "failure_drop_pct": 20.0,
            "failure_variance_threshold": 0.15,
        }

        # Streaming task
        self._stream_task: Optional[asyncio.Task] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active_connections.discard(ws)

    async def _broadcast(self, data: dict):
        dead = set()
        for ws in list(self.active_connections):
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.add(ws)
        self.active_connections -= dead

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    def start_session(self, settings: dict = None) -> WorkoutSession:
        if settings:
            self.settings.update(settings)

        session_id = str(uuid.uuid4())[:8]
        self.current_session = WorkoutSession(
            id=session_id,
            start_time=time.time(),
        )
        self.sessions[session_id] = self.current_session

        # Reset engine with current settings
        self.engine = DetectionEngine(
            baseline_reps=self.settings["baseline_reps"],
            fatigue_drop_pct=self.settings["fatigue_drop_pct"],
            failure_drop_pct=self.settings["failure_drop_pct"],
            failure_variance_threshold=self.settings["failure_variance_threshold"],
        )
        self.simulator = SensorSimulator()
        self._rep_samples = []
        self._rep_start_time = time.time()
        self._last_rep = 0
        self.is_running = True

        return self.current_session

    def stop_session(self) -> Optional[WorkoutSession]:
        self.is_running = False
        self.simulator.stop()
        if self.current_session:
            self.current_session.end_time = time.time()
            self.current_session.duration_seconds = (
                self.current_session.end_time - self.current_session.start_time
            )
            # Persist final state
            self.sessions[self.current_session.id] = self.current_session
        return self.current_session

    # ------------------------------------------------------------------
    # Streaming
    # ------------------------------------------------------------------

    async def run_stream(self):
        """Run in a background task — drives the sensor generator and broadcasts."""
        if not self.current_session or not self.is_running:
            return

        session = self.current_session
        loop = asyncio.get_event_loop()

        def _blocking_generate():
            """Run the blocking generator in a thread pool."""
            for raw in self.simulator.generate_session(max_reps=12):
                if not self.is_running:
                    break
                yield raw

        # Run generator in thread, push results to async queue
        queue: asyncio.Queue = asyncio.Queue(maxsize=200)

        def _producer():
            for raw in _blocking_generate():
                asyncio.run_coroutine_threadsafe(queue.put(raw), loop)
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

        thread = threading.Thread(target=_producer, daemon=True)
        thread.start()

        while True:
            item = await queue.get()
            if item is None or not self.is_running:
                break

            # Track rep transitions
            rep = item.get("rep", 0)
            phase = item.get("phase", "rest")
            force = item.get("force", 0.0)

            if phase == "rep":
                if rep != self._last_rep:
                    # Finished previous rep
                    if self._last_rep > 0 and self._rep_samples:
                        dur_ms = (time.time() - self._rep_start_time) * 1000
                        rep_data, baseline_captured = self.engine.process_rep(
                            self._rep_samples, dur_ms
                        )
                        session.reps.append(rep_data)
                        session.total_reps = len(session.reps)
                        if rep_data.peak_force > session.peak_force:
                            session.peak_force = rep_data.peak_force
                        if rep_data.alert_level in (AlertLevel.yellow, AlertLevel.red):
                            session.alert_count += 1
                            alert_evt = AlertEvent(
                                id=str(uuid.uuid4())[:8],
                                session_id=session.id,
                                rep=self._last_rep,
                                alert_level=rep_data.alert_level,
                                timestamp=time.time(),
                                force=rep_data.peak_force,
                                message=self._alert_message(rep_data.alert_level, self._last_rep),
                            )
                            session.alerts.append(alert_evt)

                    self._rep_samples = []
                    self._rep_start_time = time.time()
                    self._last_rep = rep

                self._rep_samples.append(force)

            # Live alert (for streaming, use current sample vs baseline)
            import statistics as _stats
            if len(self._rep_samples) > 1:
                std = _stats.stdev(self._rep_samples)
                mean = _stats.mean(self._rep_samples) or 1
                var_norm = std / mean
            else:
                var_norm = 0.0

            live_alert = self.engine.get_live_alert(force, var_norm)
            if not self.engine.is_baseline_captured:
                live_alert = AlertLevel.normal

            payload = {
                "force": force,
                "timestamp": item.get("timestamp", time.time()),
                "rep": rep,
                "phase": phase,
                "alert_level": live_alert.value,
                "baseline_force": self.engine.baseline_peak_force,
                "total_reps": session.total_reps,
                "alert_count": session.alert_count,
                "session_id": session.id,
                "is_baseline_captured": self.engine.is_baseline_captured,
            }
            await self._broadcast(payload)

        # Session ended naturally (all reps done)
        if self.is_running:
            self.stop_session()
            await self._broadcast({
                "event": "session_ended",
                "session_id": session.id,
                "total_reps": session.total_reps,
            })

    @staticmethod
    def _alert_message(level: AlertLevel, rep: int) -> str:
        if level == AlertLevel.yellow:
            return f"Fatigue onset detected at rep {rep}. Consider reducing load."
        if level == AlertLevel.red:
            return f"FAILURE RISK at rep {rep}! Stop immediately and rest."
        return ""


# Global session manager instance
session_manager = SessionManager()
