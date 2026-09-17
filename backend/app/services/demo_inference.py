"""Synthetic segmentation for when no trained checkpoint is available yet.

Generates a plausible-looking nested tumor structure (enhancing core, surrounded by necrotic
tissue, surrounded by edema) near a pseudo-random location inside the brain, purely so the rest
of the app — upload, viewer, overlay, stats, download — can be exercised end to end before
training finishes. This is never used once a real checkpoint is loaded.
"""

import hashlib

import numpy as np

from app.core.config import CLASS_INFO


def _seed_from_case_id(case_id: str) -> int:
    return int(hashlib.sha256(case_id.encode()).hexdigest(), 16) % (2**32)


def generate_synthetic_labelmap(shape: tuple[int, int, int], brain_mask: np.ndarray, case_id: str) -> np.ndarray:
    """`brain_mask` (same shape) marks non-zero voxels of the underlying scan, so the synthetic
    tumor is placed inside brain tissue rather than floating in the background."""
    rng = np.random.default_rng(_seed_from_case_id(case_id))
    label_map = np.zeros(shape, dtype=np.uint8)

    brain_voxels = np.argwhere(brain_mask)
    if brain_voxels.size == 0:
        return label_map

    # Pick a center biased toward the middle of the brain volume, jittered a little per case.
    centroid = brain_voxels.mean(axis=0)
    jitter = rng.uniform(-0.12, 0.12, size=3) * np.array(shape)
    center = np.clip(centroid + jitter, [0, 0, 0], np.array(shape) - 1)

    zz, yy, xx = np.meshgrid(
        np.arange(shape[0]), np.arange(shape[1]), np.arange(shape[2]), indexing="ij"
    )
    # Slightly irregular ellipsoid radii, randomized per case but kept anatomically modest.
    base_radius = float(np.min(shape)) * rng.uniform(0.10, 0.16)
    radii = {
        "ed": base_radius * rng.uniform(2.0, 2.6),
        "ncr": base_radius * rng.uniform(1.2, 1.6),
        "et": base_radius * rng.uniform(0.6, 0.9),
    }
    warp = 1.0 + 0.15 * np.sin(zz * 0.4) * np.cos(yy * 0.3)  # mild irregularity, not a perfect sphere

    dist2 = (
        ((zz - center[0]) ** 2) + ((yy - center[1]) ** 2) + ((xx - center[2]) ** 2)
    ) * warp

    ed_mask = (dist2 <= radii["ed"] ** 2) & brain_mask
    ncr_mask = (dist2 <= radii["ncr"] ** 2) & brain_mask
    et_mask = (dist2 <= radii["et"] ** 2) & brain_mask

    label_map[ed_mask] = CLASS_INFO["ed"]["label_value"]
    label_map[ncr_mask] = CLASS_INFO["ncr"]["label_value"]
    label_map[et_mask] = CLASS_INFO["et"]["label_value"]  # innermost region wins, drawn last
    return label_map
