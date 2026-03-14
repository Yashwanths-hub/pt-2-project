from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import time


class AlertLevel(str, Enum):
    safe = "safe"
    normal = "normal"
    yellow = "yellow"
    red = "red"


class SensorReading(BaseModel):
    force: float
    timestamp: float
    rep: int
    alert_level: AlertLevel
    rep_duration_ms: Optional[float] = None
    baseline_force: Optional[float] = None
    peak_force: Optional[float] = None
    variance: Optional[float] = None
    session_id: Optional[str] = None


class AlertEvent(BaseModel):
    id: Optional[str] = None
    session_id: str
    rep: int
    alert_level: AlertLevel
    timestamp: float
    force: float
    message: str


class RepData(BaseModel):
    rep_number: int
    peak_force: float
    min_force: float
    mean_force: float
    duration_ms: float
    variance: float
    alert_level: AlertLevel
    timestamp: float


class WorkoutSession(BaseModel):
    id: str
    start_time: float
    end_time: Optional[float] = None
    duration_seconds: Optional[float] = None
    total_reps: int = 0
    peak_force: float = 0.0
    baseline_force: Optional[float] = None
    alert_count: int = 0
    max_alert_level: AlertLevel = AlertLevel.normal
    reps: List[RepData] = []
    alerts: List[AlertEvent] = []


class SessionStartRequest(BaseModel):
    baseline_reps: int = Field(default=5, ge=2, le=10)
    fatigue_drop_pct: float = Field(default=10.0, ge=5.0, le=30.0)
    failure_drop_pct: float = Field(default=20.0, ge=10.0, le=50.0)
    failure_variance_threshold: float = Field(default=0.15, ge=0.05, le=0.50)


class SessionStopRequest(BaseModel):
    session_id: str


class SettingsModel(BaseModel):
    baseline_reps: int = 5
    fatigue_drop_pct: float = 10.0
    failure_drop_pct: float = 20.0
    failure_variance_threshold: float = 0.15
