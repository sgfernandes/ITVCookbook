#!/usr/bin/env python3
"""Illustrative M&V data-coverage diagnostics; all data are synthetic.

Usage:
    python3 data_coverage_sufficiency_demo.py --output data_coverage_sufficiency_demo.png

Dependencies: numpy, matplotlib. The plots are screening aids, not a substitute
for a project-specific M&V plan, model diagnostics, or engineering judgment.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle


def covered_fraction(values: np.ndarray, low: float, high: float) -> float:
    values = np.asarray(values)
    return float(np.mean((values >= low) & (values <= high)))


def expanded_range(values: np.ndarray, fraction: float = 0.10) -> tuple[float, float]:
    """Illustrative proportional screen for positive-scale variables only."""
    low, high = float(np.min(values)), float(np.max(values))
    if low < 0:
        raise ValueError("proportional range is only used here for nonnegative data")
    return (low * (1 - fraction), high * (1 + fraction))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data_coverage_sufficiency_demo.png"))
    args = parser.parse_args()
    rng = np.random.default_rng(42)

    fig, axes = plt.subplots(2, 2, figsize=(16, 11))
    fig.subplots_adjust(hspace=0.37, wspace=0.27, top=0.91, bottom=0.07)
    fig.suptitle("Data coverage and model sufficiency — synthetic examples", fontsize=16, fontweight="bold")

    # 1. Missing a changepoint can make a model's out-of-range predictions unreliable.
    ax = axes[0, 0]
    oat = rng.uniform(30, 95, 220)
    energy = 800 + 18 * np.maximum(0, oat - 55) + rng.normal(0, 35, oat.size)
    narrow = (oat >= 35) & (oat <= 60)
    train_x, train_y = oat[narrow], energy[narrow]
    slope, intercept = np.polyfit(train_x, train_y, 1)
    xline = np.linspace(30, 95, 200)
    yfit = intercept + slope * xline
    yphysics = 800 + 18 * np.maximum(0, xline - 55)
    low, high = expanded_range(train_x)
    ax.scatter(oat[~narrow], energy[~narrow], s=22, color="0.78", label="Other simulated observations")
    ax.scatter(train_x, train_y, s=30, color="#2878b5", label="Narrow training sample")
    ax.plot(xline, yphysics, color="#238443", lw=2.2, label="Simulated changepoint response")
    ax.plot(xline, yfit, "--", color="#c43c39", lw=2, label="Linear fit extrapolated from training data")
    ax.axvspan(low, high, color="#2878b5", alpha=.10, label="Illustrative ±10% screen")
    ax.axvspan(high, 95, color="#c43c39", alpha=.08, label="Outside screened range: review")
    ax.axvline(high, color="#c43c39", ls=":", lw=1.5)
    ax.set(title="1. A narrow baseline may miss a load change", xlabel="Outdoor temperature (°F)", ylabel="Cooling-system use (synthetic kWh/day)")
    ax.legend(fontsize=7.5, loc="upper left")
    ax.grid(alpha=.25)

    # 2. For normalized savings, check the application profile against each model.
    ax = axes[0, 1]
    tmy = np.clip(58 + 24 * np.sin(np.linspace(0, 2*np.pi, 365)) + rng.normal(0, 5, 365), 20, 100)
    baseline = np.clip(56 + 22 * np.sin(np.linspace(0, 2*np.pi, 250)) + rng.normal(0, 5, 250), 25, 95)
    post = np.clip(68 + 16 * np.sin(np.linspace(0, np.pi, 180)) + rng.normal(0, 4, 180), 42, 96)
    blo, bhi = expanded_range(baseline)
    plo, phi = expanded_range(post)
    joint_lo, joint_hi = max(blo, plo), min(bhi, phi)
    coverage = covered_fraction(tmy, joint_lo, joint_hi)
    bins = np.arange(15, 106, 5)
    ax.hist(tmy, bins=bins, density=True, alpha=.28, color="0.5", edgecolor="white", label="Typical-year application data")
    ax.hist(baseline, bins=bins, density=True, histtype="step", lw=2, color="#2878b5", label="Baseline training")
    ax.hist(post, bins=bins, density=True, histtype="step", lw=2, color="#238443", label="Post training")
    ax.axvline(joint_lo, color="#c43c39", ls="--", lw=1.7, label="Joint screened lower limit")
    ax.axvline(joint_hi, color="#8c6d1f", ls="--", lw=1.7, label="Joint screened upper limit")
    ax.axvspan(15, joint_lo, color="#c43c39", alpha=.08)
    ax.axvspan(joint_hi, 105, color="#c43c39", alpha=.08, label="Outside joint range: review")
    ax.set(title=f"2. Normalized approach: check both models ({coverage:.1%} in range)", xlabel="Outdoor temperature (°F)", ylabel="Relative frequency")
    ax.legend(fontsize=7.5, loc="upper left")
    ax.grid(alpha=.25)

    # 3. Compare training support and target data under four savings approaches.
    ax = axes[1, 0]
    base_prod = rng.uniform(200, 600, 90)
    post_prod = rng.uniform(220, 780, 90)
    typical_prod = rng.uniform(190, 650, 365)
    base_win = expanded_range(base_prod)
    post_win = expanded_range(post_prod)
    norm_win = (max(base_win[0], post_win[0]), min(base_win[1], post_win[1]))
    both = np.concatenate([base_prod, post_prod])
    combined_win = expanded_range(both)
    methods = [
        ("Forecast: post vs baseline model", base_win, post_prod),
        ("Backcast: baseline vs post model", post_win, base_prod),
        ("Normalized: typical vs both models", norm_win, typical_prod),
        ("Pre/post indicator: combined observed fit", (float(both.min()), float(both.max())), both),
    ]
    for y, (label, (lo, hi), target) in enumerate(methods):
        cov = covered_fraction(target, lo, hi)
        ax.plot([lo, hi], [y + .12, y + .12], color="#238443", lw=8, alpha=.62)
        target_low, target_high = float(np.min(target)), float(np.max(target))
        ax.plot([target_low, target_high], [y - .12, y - .12], color="#2878b5", lw=4, marker="|", markersize=11)
        if target_low < lo:
            ax.plot([target_low, lo], [y - .12, y - .12], color="#c43c39", lw=5)
        if target_high > hi:
            ax.plot([hi, target_high], [y - .12, y - .12], color="#c43c39", lw=5)
        ax.text(990, y, f"{cov:.0%} of target points in range", va="center", fontsize=8,
                color="#145a32" if cov > .95 else "#9b2c2c")
    ax.set_yticks(range(4), [m[0] for m in methods], fontsize=8)
    ax.invert_yaxis()
    ax.set_xlim(150, 1200)
    ax.set(title="3. Coverage comparison by savings approach", xlabel="Production (synthetic units/day)")
    ax.text(.01, -.22, "Pre/post coverage is 100% in-sample by construction here; still assess overlap, confounding, and model fit.",
            transform=ax.transAxes, fontsize=8, va="top")
    ax.grid(axis="x", alpha=.25)

    # 4. Show marginal min/max checks for two variables and their limitations.
    ax = axes[1, 1]
    n = 180
    train_p = rng.uniform(220, 620, n)
    train_t = 38 + (train_p - 220) / 400 * 48 + rng.normal(0, 5, n)
    post_p = rng.normal(470, 150, 160)
    post_t = rng.normal(65, 17, 160)
    p_low, p_high = expanded_range(train_p)
    t_low, t_high = expanded_range(train_t)
    in_box = (post_p >= p_low) & (post_p <= p_high) & (post_t >= t_low) & (post_t <= t_high)
    ax.scatter(train_p, train_t, s=13, color="#2878b5", alpha=.28, label="Training observations")
    ax.scatter(post_p[in_box], post_t[in_box], s=20, color="#238443", alpha=.7, label=f"Post inside marginal bounds ({in_box.sum()})")
    ax.scatter(post_p[~in_box], post_t[~in_box], s=30, color="#c43c39", marker="x", label=f"Post outside a marginal bound ({(~in_box).sum()})")
    ax.add_patch(Rectangle((p_low, t_low), p_high-p_low, t_high-t_low, facecolor="#238443", alpha=.08,
                           edgecolor="#145a32", lw=1.7, label="Expanded marginal min/max box"))
    ax.set(title=f"4. Two-variable screen ({in_box.mean():.1%} inside box)", xlabel="Production (synthetic units/day)", ylabel="Outdoor temperature (°F)")
    ax.text(.01, -.22, "A rectangular min/max box is only a screen; it does not prove joint support or model validity.",
            transform=ax.transAxes, fontsize=8, va="top")
    ax.legend(fontsize=7.5, loc="upper left")
    ax.grid(alpha=.25)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.output, dpi=170, bbox_inches="tight")
    print(f"Saved synthetic coverage diagnostic figure: {args.output}")
    print("Illustrative normalized typical-year coverage: " f"{coverage:.1%} within both separate model ranges")
    print("Illustrative forecast target points outside baseline-model range: "
          f"{100*(1-covered_fraction(post_prod, *base_win)):.1f}%")
    print("Illustrative backcast target points outside post-model range: "
          f"{100*(1-covered_fraction(base_prod, *post_win)):.1f}%")
    print("Illustrative pre/post observations inside combined observed range: 100.0% (in-sample by construction)")


if __name__ == "__main__":
    main()
