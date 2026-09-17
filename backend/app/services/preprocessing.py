"""NIfTI loading and shape/intensity normalization shared by inference and (conceptually) training."""

from dataclasses import dataclass
from pathlib import Path

import nibabel as nib
import numpy as np


@dataclass
class NiftiVolume:
    data: np.ndarray  # float32, shape (D, H, W)
    affine: np.ndarray
    header: "nib.Nifti1Header"
    voxel_volume_mm3: float


def load_nifti(path: Path) -> NiftiVolume:
    img = nib.load(str(path))
    data = np.asarray(img.dataobj, dtype=np.float32)
    zooms = img.header.get_zooms()[:3]
    voxel_volume_mm3 = float(zooms[0] * zooms[1] * zooms[2])
    return NiftiVolume(data=data, affine=img.affine, header=img.header, voxel_volume_mm3=voxel_volume_mm3)


def zscore_normalize(volume: np.ndarray) -> np.ndarray:
    """Normalize intensities to zero mean / unit variance over the non-zero (brain) region only,
    leaving background at 0. This is the standard BraTS preprocessing approach."""
    mask = volume > 0
    if not np.any(mask):
        return volume
    mean = volume[mask].mean()
    std = volume[mask].std()
    if std < 1e-6:
        std = 1.0
    normalized = np.zeros_like(volume, dtype=np.float32)
    normalized[mask] = (volume[mask] - mean) / std
    return normalized


@dataclass
class AxisTransform:
    orig: int
    target: int
    offset: int
    mode: str  # "crop" | "pad" | "none"


def _axis_transform(orig: int, target: int) -> AxisTransform:
    if orig == target:
        return AxisTransform(orig, target, 0, "none")
    if orig > target:
        offset = (orig - target) // 2
        return AxisTransform(orig, target, offset, "crop")
    offset = (target - orig) // 2
    return AxisTransform(orig, target, offset, "pad")


def fit_to_shape(volume: np.ndarray, target_shape: tuple[int, int, int]) -> tuple[np.ndarray, list[AxisTransform]]:
    """Center-crop and/or zero-pad `volume` to `target_shape`. Returns the fitted volume plus the
    per-axis transforms needed to invert this exact operation via `unfit_from_shape`."""
    transforms = [_axis_transform(o, t) for o, t in zip(volume.shape, target_shape)]

    # First crop any axes that are larger than the target.
    slices = tuple(
        slice(t.offset, t.offset + t.target) if t.mode == "crop" else slice(None) for t in transforms
    )
    cropped = volume[slices]

    # Then pad any axes that are smaller than the target.
    pad_width = tuple(
        (t.offset, t.target - t.orig - t.offset) if t.mode == "pad" else (0, 0) for t in transforms
    )
    fitted = np.pad(cropped, pad_width, mode="constant", constant_values=0)
    return fitted, transforms


def unfit_from_shape(fitted: np.ndarray, transforms: list[AxisTransform]) -> np.ndarray:
    """Invert `fit_to_shape`: restore a volume of the original shape from the model's fixed-size
    output, given the transforms recorded when fitting the input."""
    orig_shape = tuple(t.orig for t in transforms)
    restored = np.zeros(orig_shape, dtype=fitted.dtype)

    # First undo the padding (crop back down to the pre-pad size).
    unpad_slices = tuple(
        slice(t.offset, t.offset + t.orig) if t.mode == "pad" else slice(None) for t in transforms
    )
    unpadded = fitted[unpad_slices]

    # Then undo the crop (place back into a zero volume at the original crop offset).
    place_slices = tuple(
        slice(t.offset, t.offset + t.target) if t.mode == "crop" else slice(None) for t in transforms
    )
    restored[place_slices] = unpadded
    return restored
