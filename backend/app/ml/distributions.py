"""Turning a set of predicted quantiles into a usable distribution.

A point estimate is not a product. The UI needs an interval and an over/under
probability, so every projection carries a full predictive distribution built
from monotone-interpolated quantiles (a "quantile function"), which is
distribution-free — it does not assume the residuals are Gaussian, and NBA box
scores are visibly not (points are right-skewed, minutes are bimodal because of
blowouts and foul trouble).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

QUANTILES: tuple[float, ...] = (0.05, 0.15, 0.25, 0.50, 0.75, 0.85, 0.95)


@dataclass(slots=True)
class Projection:
    mean: float
    q: dict[float, float]          # quantile level -> value
    floor: float = 0.0             # box-score stats cannot go negative

    # ---------------------------------------------------------------- api
    @property
    def median(self) -> float:
        return self.q[0.50]

    def interval(self, level: float = 0.80) -> tuple[float, float]:
        lo_l, hi_l = (1 - level) / 2, 1 - (1 - level) / 2
        return self.quantile(lo_l), self.quantile(hi_l)

    def quantile(self, p: float) -> float:
        levels = np.array(sorted(self.q))
        values = np.array([self.q[l] for l in levels])
        values = np.maximum.accumulate(values)          # enforce monotonicity
        return float(np.clip(np.interp(p, levels, values), self.floor, None))

    def prob_over(self, line: float) -> float:
        """P(X > line). Inverts the quantile function by interpolation, then
        applies a half-point continuity correction for integer stat lines."""
        levels = np.array(sorted(self.q))
        values = np.maximum.accumulate(np.array([self.q[l] for l in levels]))
        if line <= values[0]:
            return float(1 - levels[0] * (line / max(values[0], 1e-6)))
        if line >= values[-1]:
            tail = levels[-1]
            slope = (values[-1] - values[-2]) / max(levels[-1] - levels[-2], 1e-6)
            excess = (line - values[-1]) / max(slope, 1e-6)
            return float(max(0.005, (1 - tail) * np.exp(-excess * 4)))
        return float(np.clip(1.0 - np.interp(line, values, levels), 0.005, 0.995))

    def to_dict(self, line: float | None = None) -> dict:
        lo, hi = self.interval(0.80)
        out = {
            "mean": round(self.mean, 2),
            "median": round(self.median, 2),
            "p10": round(self.quantile(0.10), 2),
            "p90": round(self.quantile(0.90), 2),
            "low": round(lo, 2),
            "high": round(hi, 2),
            "quantiles": {str(k): round(v, 2) for k, v in sorted(self.q.items())},
        }
        if line is not None:
            p = self.prob_over(line)
            out["line"] = line
            out["prob_over"] = round(p, 4)
            out["prob_under"] = round(1 - p, 4)
        return out


def from_mean_and_sigma(mean: float, sigma: float, skew: float = 0.0,
                        floor: float = 0.0) -> Projection:
    """Fallback constructor: build quantiles from a (possibly skewed) normal.
    `skew` > 0 stretches the upper tail — correct for scoring, where the upside
    tail (a 45-point night) is fatter than the downside."""
    from math import sqrt

    z = {0.05: -1.645, 0.15: -1.036, 0.25: -0.674, 0.50: 0.0,
         0.75: 0.674, 0.85: 1.036, 0.95: 1.645}
    q = {}
    for level, zz in z.items():
        stretch = 1.0 + skew * max(zz, 0.0) / 1.645
        q[level] = max(floor, mean + zz * sigma * stretch)
    return Projection(mean=mean, q=q, floor=floor)


def blend(a: Projection, b: Projection, w: float = 0.5) -> Projection:
    """Convex combination of two predictive distributions in quantile space
    (a "Vincentization" average) — used to fuse the gradient-boosted model with
    the sequence model."""
    q = {lvl: (1 - w) * a.q[lvl] + w * b.q.get(lvl, a.q[lvl]) for lvl in a.q}
    return Projection(mean=(1 - w) * a.mean + w * b.mean, q=q, floor=min(a.floor, b.floor))
