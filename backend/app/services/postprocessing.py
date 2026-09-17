"""Turn raw model logits into a BraTS-convention label map and human-readable stats."""

import numpy as np

from app.core.config import CLASS_INFO


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def probs_to_labelmap(probs: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    """
    `probs` has shape (3, D, H, W) with channel order [NCR, ED, ET] (see CLASS_INFO's `channel`
    field). Each voxel is assigned to whichever class has the highest probability above
    `threshold`, or background (0) if none clear the threshold. Returns a uint8 label map using
    the BraTS convention: 0=background, 1=NCR/NET, 2=ED, 4=ET.
    """
    label_values = np.zeros(3, dtype=np.uint8)
    for info in CLASS_INFO.values():
        label_values[info["channel"]] = info["label_value"]

    best_channel = np.argmax(probs, axis=0)
    best_prob = np.max(probs, axis=0)

    label_map = np.zeros(probs.shape[1:], dtype=np.uint8)
    passing = best_prob >= threshold
    label_map[passing] = label_values[best_channel[passing]]
    return label_map


def _stat_row(key: str, label: str, color: str, mask: np.ndarray, voxel_volume_mm3: float) -> dict:
    voxel_count = int(np.count_nonzero(mask))
    volume_cm3 = voxel_count * voxel_volume_mm3 / 1000.0
    return {
        "key": key,
        "label": label,
        "voxel_count": voxel_count,
        "volume_cm3": round(volume_cm3, 3),
        "color": color,
    }


def compute_class_stats(label_map: np.ndarray, voxel_volume_mm3: float) -> list[dict]:
    """Per-label stats (NCR/ED/ET) plus two composite volumes derived from the same label map:
    whole tumor (WT = NCR ∪ ED ∪ ET) and tumor core (TC = NCR ∪ ET). WT/TC aren't separate model
    outputs or voxel labels — they're unions of the labels already predicted, so they're computed
    here rather than tracked in CLASS_INFO.
    """
    stats = [
        _stat_row(key, info["name"], info["color"], label_map == info["label_value"], voxel_volume_mm3)
        for key, info in CLASS_INFO.items()
    ]

    ncr_value = CLASS_INFO["ncr"]["label_value"]
    et_value = CLASS_INFO["et"]["label_value"]
    stats.append(
        _stat_row("wt", "Whole Tumor (WT)", "#22D3EE", label_map != 0, voxel_volume_mm3)
    )
    stats.append(
        _stat_row(
            "tc",
            "Tumor Core (TC)",
            "#F97316",
            (label_map == ncr_value) | (label_map == et_value),
            voxel_volume_mm3,
        )
    )
    return stats
