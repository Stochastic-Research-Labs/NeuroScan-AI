"""Orchestrates preprocessing -> model (or demo) inference -> postprocessing -> saving results."""

import time
from pathlib import Path
from typing import Optional

import nibabel as nib
import numpy as np

from app.core.config import CHECKPOINT_PATH, MODALITIES, MODEL_INPUT_SHAPE
from app.services import case_store
from app.services.demo_inference import generate_synthetic_labelmap
from app.services.postprocessing import compute_class_stats, probs_to_labelmap, sigmoid
from app.services.preprocessing import fit_to_shape, load_nifti, unfit_from_shape, zscore_normalize

try:
    import torch

    TORCH_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised when torch isn't installed yet
    TORCH_AVAILABLE = False


class _ModelHolder:
    """Lazily loads the checkpoint at most once per backend process."""

    def __init__(self) -> None:
        self._model = None
        self._device: str = "cpu"
        self._attempted = False

    @property
    def device(self) -> str:
        return self._device

    @property
    def checkpoint_loaded(self) -> bool:
        return self._model is not None

    def get(self):
        if self._attempted:
            return self._model
        self._attempted = True

        if not TORCH_AVAILABLE or not CHECKPOINT_PATH.exists():
            return None

        from app.models.unet3d import UNet3D  # local import: only needed if torch is present

        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        model = UNet3D(in_channels=len(MODALITIES), out_channels=3)
        # Model artifacts are external inputs. Restrict deserialization to tensor
        # weights instead of allowing arbitrary Python objects embedded in a pickle.
        state_dict = torch.load(CHECKPOINT_PATH, map_location=self._device, weights_only=True)
        # Support both a raw state_dict and a training-script checkpoint dict with a
        # "model_state_dict" key (see training/train_brats.py's save step).
        if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
            state_dict = state_dict["model_state_dict"]
        model.load_state_dict(state_dict)
        model.to(self._device)
        model.eval()
        self._model = model
        return self._model


_holder = _ModelHolder()


def get_model_status() -> dict:
    model = _holder.get()
    return {
        "checkpoint_loaded": model is not None,
        "checkpoint_path": str(CHECKPOINT_PATH) if CHECKPOINT_PATH.exists() else None,
        "device": _holder.device,
        "torch_available": TORCH_AVAILABLE,
        "demo_mode": model is None,
    }


def run_inference(case_id: str) -> dict:
    start = time.perf_counter()
    case_dir = case_store.case_root(case_id)
    raw_dir = case_dir / "raw"

    volumes = {}
    reference_affine: Optional[np.ndarray] = None
    voxel_volume_mm3 = 1.0
    for modality in MODALITIES:
        path = raw_dir / f"{modality}.nii.gz"
        if not path.exists():
            continue
        vol = load_nifti(path)
        volumes[modality] = vol
        # Migrate cases uploaded before header canonicalization. This safely replaces
        # vendor-extension-heavy NIfTI headers with the same spatial data and affine.
        clean_volume = nib.Nifti1Image(vol.data.astype(np.float32), affine=vol.affine)
        clean_volume.set_data_dtype(np.float32)
        nib.save(clean_volume, str(path))
        if modality in ("t1ce", "t1"):  # prefer t1ce as the anatomical reference if present
            reference_affine = vol.affine
            voxel_volume_mm3 = vol.voxel_volume_mm3

    missing = [m for m in MODALITIES if m not in volumes]
    if missing:
        raise ValueError(f"Cannot run segmentation: missing modalities {missing}")
    if reference_affine is None:
        first = next(iter(volumes.values()))
        reference_affine, voxel_volume_mm3 = first.affine, first.voxel_volume_mm3

    original_shape = next(iter(volumes.values())).data.shape

    model = _holder.get()
    demo_mode = model is None

    if demo_mode:
        brain_mask = volumes[MODALITIES[0]].data > 0
        label_map = generate_synthetic_labelmap(original_shape, brain_mask, case_id)
    else:
        stacked = []
        transforms = None
        for modality in MODALITIES:
            normalized = zscore_normalize(volumes[modality].data)
            fitted, transforms = fit_to_shape(normalized, MODEL_INPUT_SHAPE)
            stacked.append(fitted)
        input_tensor = torch.from_numpy(np.stack(stacked, axis=0)).unsqueeze(0).float()
        input_tensor = input_tensor.to(_holder.device)

        with torch.inference_mode():
            logits = model(input_tensor)[0].cpu().numpy()  # (3, D, H, W) at MODEL_INPUT_SHAPE

        probs_fitted = sigmoid(logits)
        probs_full = np.stack(
            [unfit_from_shape(probs_fitted[c], transforms) for c in range(probs_fitted.shape[0])],
            axis=0,
        )
        label_map = probs_to_labelmap(probs_full)

    # Do not reuse the source MRI header for a label map. Some source files carry a
    # non-standard voxel offset and extension layout that is valid for the MRI but causes
    # browser NIfTI parsers (including NiiVue) to misread a generated segmentation payload.
    # Retain spatial alignment through the affine and write a clean uint8 label header.
    seg_img = nib.Nifti1Image(label_map.astype(np.uint8), affine=reference_affine)
    seg_img.set_data_dtype(np.uint8)
    nib.save(seg_img, str(case_dir / "segmentation.nii.gz"))

    class_stats = compute_class_stats(label_map, voxel_volume_mm3)
    elapsed_ms = (time.perf_counter() - start) * 1000

    return {
        "case_id": case_id,
        "demo_mode": demo_mode,
        "inference_time_ms": round(elapsed_ms, 1),
        "volume_shape": tuple(int(s) for s in original_shape),
        "class_stats": class_stats,
        "segmentation_url": f"/api/cases/{case_id}/segmentation",
    }


def load_case_volume_and_segmentation(
    case_id: str,
) -> tuple[np.ndarray, Optional[np.ndarray], float, tuple[int, int, int]]:
    """Loads the reference-modality volume (prefers t1ce, same preference as `run_inference`)
    and the saved segmentation label map (if present) directly from disk. Used by the PDF report
    generator, which recomputes stats/slice images from the same saved artifacts `run_inference`
    produced rather than trusting possibly-stale persisted summary fields on the case."""
    case_dir = case_store.case_root(case_id)
    raw_dir = case_dir / "raw"

    reference_vol = None
    for modality in ["t1ce"] + [m for m in MODALITIES if m != "t1ce"]:
        path = raw_dir / f"{modality}.nii.gz"
        if path.exists():
            reference_vol = load_nifti(path)
            break
    if reference_vol is None:
        raise ValueError("No MRI volumes found for this case")

    seg_path = case_dir / "segmentation.nii.gz"
    label_map = load_nifti(seg_path).data.astype(np.uint8) if seg_path.exists() else None

    shape = tuple(int(s) for s in reference_vol.data.shape)
    return reference_vol.data, label_map, reference_vol.voxel_volume_mm3, shape
