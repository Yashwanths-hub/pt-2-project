"""
4-Stage Fatigue & Failure Risk Detection Engine.

Implements the algorithm described in the PRD:
  Stage 1 – Baseline Capture: first N reps establish baseline metrics
  Stage 2 – Continuous Analysis: each rep compared to baseline
  Stage 3 – Fatigue Detection  → Yellow Alert
  Stage 4 – Failure Risk       → Red Alert + Buzzer
"""

import math
import statistics
from typing import List, Optional, Tuple
from models import AlertLevel, RepData


class DetectionEngine:
    """
    Implements the 4-stage detection algorithm from the PRD.

    Parameters
    ----------
    baseline_reps : int
        Number of initial reps used to build the baseline profile (default 5).
    fatigue_drop_pct : float
        % force drop from baseline that triggers Yellow alert (default 10%).
    failure_drop_pct : float
        % force drop from baseline that triggers Red alert (default 20%).
    failure_variance_threshold : float
        Normalised variance threshold that also triggers Red alert (default 0.15).
    """

    def __init__(
        self,
        baseline_reps: int = 5,
        fatigue_drop_pct: float = 10.0,
        failure_drop_pct: float = 20.0,
        failure_variance_threshold: float = 0.15,
    ):
        self.baseline_reps = baseline_reps
        self.fatigue_drop_pct = fatigue_drop_pct
        self.failure_drop_pct = failure_drop_pct
        self.failure_variance_threshold = failure_variance_threshold

        # Accumulated rep history
        self.reps: List[RepData] = []

        # Baseline metrics (set after baseline_reps complete)
        self.baseline_peak_force: Optional[float] = None
        self.baseline_duration_ms: Optional[float] = None
        self.is_baseline_captured: bool = False

        # Current alert state
        self.current_alert: AlertLevel = AlertLevel.normal

    # ------------------------------------------------------------------
    # Per-rep buffer (force samples within a single rep)
    # ------------------------------------------------------------------

    def _compute_rep_stats(
        self, force_samples: List[float], duration_ms: float, rep_number: int
    ) -> RepData:
        if not force_samples:
            force_samples = [0.0]
        peak = max(force_samples)
        min_f = min(force_samples)
        mean_f = statistics.mean(force_samples)
        stdev = statistics.stdev(force_samples) if len(force_samples) > 1 else 0.0
        variance_norm = stdev / mean_f if mean_f > 0 else 0.0

        alert = self._determine_alert(peak, variance_norm, duration_ms)

        return RepData(
            rep_number=rep_number,
            peak_force=round(peak, 2),
            min_force=round(min_f, 2),
            mean_force=round(mean_f, 2),
            duration_ms=round(duration_ms, 1),
            variance=round(variance_norm, 4),
            alert_level=alert,
            timestamp=__import__("time").time(),
        )

    # ------------------------------------------------------------------
    # Baseline
    # ------------------------------------------------------------------

    def _capture_baseline(self):
        """Compute baseline metrics from the first N reps."""
        baseline_data = self.reps[: self.baseline_reps]
        self.baseline_peak_force = statistics.mean(
            [r.peak_force for r in baseline_data]
        )
        self.baseline_duration_ms = statistics.mean(
            [r.duration_ms for r in baseline_data]
        )
        self.is_baseline_captured = True

    # ------------------------------------------------------------------
    # Alert determination
    # ------------------------------------------------------------------

    def _determine_alert(
        self, peak_force: float, variance_norm: float, duration_ms: float
    ) -> AlertLevel:
        if not self.is_baseline_captured:
            return AlertLevel.normal

        baseline = self.baseline_peak_force
        if baseline is None or baseline == 0:
            return AlertLevel.normal

        drop_pct = ((baseline - peak_force) / baseline) * 100.0

        # Red: sudden force dip + high instability
        if drop_pct >= self.failure_drop_pct or variance_norm >= self.failure_variance_threshold:
            return AlertLevel.red

        # Yellow: moderate force drop or longer rep
        baseline_dur = self.baseline_duration_ms or 1
        duration_increase_pct = ((duration_ms - baseline_dur) / baseline_dur) * 100.0
        if drop_pct >= self.fatigue_drop_pct or duration_increase_pct >= 20.0:
            return AlertLevel.yellow

        return AlertLevel.normal

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_rep(
        self, force_samples: List[float], duration_ms: float
    ) -> Tuple[RepData, bool]:
        """
        Process a completed rep. Returns (RepData, baseline_just_captured).

        Call this once per completed repetition.
        """
        rep_number = len(self.reps) + 1
        rep = self._compute_rep_stats(force_samples, duration_ms, rep_number)
        self.reps.append(rep)

        baseline_just_captured = False
        if not self.is_baseline_captured and len(self.reps) >= self.baseline_reps:
            self._capture_baseline()
            baseline_just_captured = True
            # Re-label all baseline reps as normal
            for r in self.reps[: self.baseline_reps]:
                r.alert_level = AlertLevel.normal

        self.current_alert = rep.alert_level
        return rep, baseline_just_captured

    def get_live_alert(
        self, current_force: float, variance_norm: float = 0.0
    ) -> AlertLevel:
        """Return alert level for an in-progress rep sample (live streaming)."""
        if not self.is_baseline_captured:
            return AlertLevel.normal
        baseline_dur = self.baseline_duration_ms or 2000
        return self._determine_alert(current_force, variance_norm, baseline_dur)

    def reset(self):
        self.reps = []
        self.baseline_peak_force = None
        self.baseline_duration_ms = None
        self.is_baseline_captured = False
        self.current_alert = AlertLevel.normal
