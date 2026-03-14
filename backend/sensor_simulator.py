"""
Realistic load-cell force curve simulator.

Mimics a person performing barbell bench press or squat repetitions.
Each rep follows a sinusoidal force curve. As reps progress, fatigue
causes force to drop, rep duration to increase, and variance to grow.
"""

import math
import random
import time
from typing import Generator, Dict, Any


class SensorSimulator:
    """
    Simulates a load-cell sensor attached to gym equipment.

    Force profile per rep:
      - Peak force drops progressively with fatigue
      - Rep duration increases with fatigue
      - Signal noise / variance increases with fatigue
      - After stop(), yields zero force
    """

    BASE_PEAK_FORCE = 250.0       # Newtons (roughly 25 kg barbell)
    BASE_REP_DURATION = 2.0       # seconds per rep
    NOISE_AMPLITUDE_NORMAL = 5.0  # N noise in normal state
    SAMPLE_RATE_HZ = 20           # 20 samples per second

    def __init__(self):
        self.running = False
        self.rep_count = 0
        self.current_force = 0.0

    def _rep_force_profile(
        self,
        rep_number: int,
        peak_force: float,
        duration: float,
        noise_amplitude: float,
    ) -> Generator[float, None, None]:
        """Yield force readings for a single rep."""
        samples = int(duration * self.SAMPLE_RATE_HZ)
        for i in range(samples):
            t = i / samples  # 0 → 1 over the rep
            # Sinusoidal: 0 → peak → 0
            base = peak_force * math.sin(math.pi * t)
            # Add gaussian noise
            noise = random.gauss(0, noise_amplitude)
            # High-frequency oscillation at fatigue (simulates shaking)
            if rep_number > 5:
                fatigue_wobble = (
                    noise_amplitude * 0.8 * math.sin(2 * math.pi * 8 * t)
                )
            else:
                fatigue_wobble = 0.0
            force = max(0.0, base + noise + fatigue_wobble)
            yield round(force, 2)

    def _fatigue_factor(self, rep: int) -> float:
        """Returns a 0→1 fatigue factor that grows with rep number."""
        if rep <= 5:
            return 0.0
        return min(1.0, (rep - 5) / 8.0)

    def generate_session(self, max_reps: int = 12) -> Generator[Dict[str, Any], None, None]:
        """
        Generator that yields sensor data dicts for an entire workout session.
        Simulates up to max_reps reps with realistic fatigue progression.
        """
        self.running = True
        self.rep_count = 0
        session_start = time.time()

        # Brief rest before first rep
        rest_samples = int(1.0 * self.SAMPLE_RATE_HZ)
        for _ in range(rest_samples):
            yield {
                "force": round(random.gauss(2.0, 0.5), 2),
                "timestamp": time.time(),
                "phase": "rest",
                "rep": 0,
            }
            time.sleep(1.0 / self.SAMPLE_RATE_HZ)

        for rep in range(1, max_reps + 1):
            if not self.running:
                break
            self.rep_count = rep

            fatigue = self._fatigue_factor(rep)

            # Force drops progressively
            peak_force = self.BASE_PEAK_FORCE * (1.0 - 0.35 * fatigue)
            # Duration increases
            duration = self.BASE_REP_DURATION * (1.0 + 0.5 * fatigue)
            # Noise increases
            noise = self.NOISE_AMPLITUDE_NORMAL * (1.0 + 3.0 * fatigue)

            rep_start = time.time()
            for force_val in self._rep_force_profile(rep, peak_force, duration, noise):
                if not self.running:
                    break
                self.current_force = force_val
                yield {
                    "force": force_val,
                    "timestamp": time.time(),
                    "phase": "rep",
                    "rep": rep,
                    "fatigue_factor": round(fatigue, 3),
                }
                time.sleep(1.0 / self.SAMPLE_RATE_HZ)

            rep_duration_ms = (time.time() - rep_start) * 1000

            # Short rest between reps (shrinks as fatigue increases)
            rest_duration = max(0.3, 1.0 - 0.5 * fatigue)
            rest_samples = int(rest_duration * self.SAMPLE_RATE_HZ)
            for _ in range(rest_samples):
                if not self.running:
                    break
                yield {
                    "force": round(random.gauss(2.0, 0.5), 2),
                    "timestamp": time.time(),
                    "phase": "rest",
                    "rep": rep,
                }
                time.sleep(1.0 / self.SAMPLE_RATE_HZ)

        self.running = False

    def stop(self):
        self.running = False
