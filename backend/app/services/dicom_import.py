"""Minimal local DICOM-series import for research uploads.

The importer converts four conventional MRI series from a ZIP into temporary NIfTI volumes.
It intentionally does not retain source DICOM files or their metadata after case creation.
"""

from collections import defaultdict
from pathlib import Path

import nibabel as nib
import numpy as np
import pydicom

from app.core.config import MODALITIES


def _modality_hint(text: str) -> str | None:
    normalized = text.lower().replace(" ", "").replace("_", "").replace("-", "")
    if "t1ce" in normalized or "t1c" in normalized or "postcontrast" in normalized:
        return "t1ce"
    if "flair" in normalized:
        return "flair"
    if "t2" in normalized:
        return "t2"
    if "t1" in normalized:
        return "t1"
    return None


def _series_affine(datasets: list[object]) -> np.ndarray:
    first = datasets[0]
    affine = np.eye(4, dtype=np.float64)
    position = np.asarray(getattr(first, "ImagePositionPatient", [0, 0, 0]), dtype=float)
    orientation = np.asarray(getattr(first, "ImageOrientationPatient", [1, 0, 0, 0, 1, 0]), dtype=float)
    spacing = np.asarray(getattr(first, "PixelSpacing", [1, 1]), dtype=float)
    row, column = orientation[:3], orientation[3:]
    normal = np.cross(row, column)
    slice_spacing = float(getattr(first, "SpacingBetweenSlices", getattr(first, "SliceThickness", 1.0)))
    if len(datasets) > 1 and hasattr(datasets[1], "ImagePositionPatient"):
        observed = abs(float(np.dot(np.asarray(datasets[1].ImagePositionPatient, dtype=float) - position, normal)))
        if observed > 1e-6:
            slice_spacing = observed
    affine[:3, 0] = row * spacing[0]
    affine[:3, 1] = column * spacing[1]
    affine[:3, 2] = normal * slice_spacing
    affine[:3, 3] = position
    return affine


def convert_dicom_study(source_dir: Path, output_dir: Path) -> dict[str, Path]:
    """Convert identifiable T1/T1-CE/T2/FLAIR DICOM series to `.nii.gz` files.

    Series are matched using DICOM SeriesDescription/ProtocolName, falling back to their
    containing folder name. Ambiguous or incomplete studies fail rather than guessing.
    """
    grouped: dict[str, list[tuple[Path, object]]] = defaultdict(list)
    for path in source_dir.rglob("*"):
        if not path.is_file():
            continue
        try:
            header = pydicom.dcmread(str(path), stop_before_pixels=True, force=False)
        except Exception:  # non-DICOM files inside a ZIP are ignored
            continue
        uid = str(getattr(header, "SeriesInstanceUID", ""))
        if uid:
            grouped[uid].append((path, header))

    selected: dict[str, list[Path]] = {}
    for members in grouped.values():
        sample_path, header = members[0]
        hint = _modality_hint(" ".join((
            str(getattr(header, "SeriesDescription", "")),
            str(getattr(header, "ProtocolName", "")),
            sample_path.parent.name,
        )))
        if not hint:
            continue
        if hint in selected:
            raise ValueError(f"More than one DICOM series appears to be '{hint.upper()}'. Rename the series clearly and upload one study.")
        selected[hint] = [path for path, _ in members]

    missing = [modality.upper() for modality in MODALITIES if modality not in selected]
    if missing:
        raise ValueError(
            "Could not identify a complete DICOM study. Series descriptions or folder names must include "
            f"T1, T1CE, T2 and FLAIR. Missing: {', '.join(missing)}."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    converted: dict[str, Path] = {}
    for modality, paths in selected.items():
        datasets = [pydicom.dcmread(str(path), force=False) for path in paths]
        datasets = [dataset for dataset in datasets if hasattr(dataset, "PixelData")]
        if not datasets:
            raise ValueError(f"The {modality.upper()} DICOM series contains no pixel data.")
        datasets.sort(key=lambda dataset: (
            float(getattr(dataset, "ImagePositionPatient", [0, 0, 0])[2]),
            int(getattr(dataset, "InstanceNumber", 0)),
        ))
        try:
            volume = np.stack([dataset.pixel_array.astype(np.float32) for dataset in datasets], axis=-1)
        except Exception as exc:
            raise ValueError(f"Could not decode the {modality.upper()} DICOM pixel data: {exc}") from exc
        destination = output_dir / f"{modality}.nii.gz"
        nib.save(nib.Nifti1Image(volume, _series_affine(datasets)), str(destination))
        converted[modality] = destination
    return converted
