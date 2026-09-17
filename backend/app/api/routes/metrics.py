import json

import numpy as np
from fastapi import APIRouter

from app.core.config import CLASS_INFO, METRICS_PATH
from app.schemas import MetricsPayload

router = APIRouter(tags=["metrics"])


def _demo_metrics() -> dict:
    """Deterministic, plausible-looking demo training curve so /metrics always renders something
    sensible before a real training run has produced metrics.json."""
    rng = np.random.default_rng(42)
    epochs = list(range(1, 41))
    train_loss = [round(float(0.9 * np.exp(-0.09 * e) + 0.05 + rng.normal(0, 0.01)), 4) for e in epochs]
    val_loss = [round(float(0.95 * np.exp(-0.08 * e) + 0.08 + rng.normal(0, 0.015)), 4) for e in epochs]

    demo_dice = {"ncr": 0.74, "ed": 0.82, "et": 0.68}
    dice_per_class = [
        {"label": info["name"], "key": key, "dice": demo_dice[key], "color": info["color"]}
        for key, info in CLASS_INFO.items()
    ]

    return {
        "demo_mode": True,
        "epochs": epochs,
        "train_loss": train_loss,
        "val_loss": val_loss,
        "dice_per_class": dice_per_class,
        "notes": (
            "Demo data — train on Kaggle with training/train_brats.py, then copy metrics.json "
            "into backend/models_store/ to see your real results here."
        ),
    }


@router.get("/api/metrics", response_model=MetricsPayload)
def metrics() -> MetricsPayload:
    if METRICS_PATH.exists():
        payload = json.loads(METRICS_PATH.read_text())
        payload.setdefault("demo_mode", False)
        return MetricsPayload(**payload)
    return MetricsPayload(**_demo_metrics())
