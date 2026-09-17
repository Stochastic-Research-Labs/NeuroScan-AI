"""Case storage: turns an upload (zip or loose files) into a normalized case directory and
tracks metadata as a simple JSON sidecar per case (no database needed for a single-user local app)."""

import json
import re
import shutil
import uuid
import zipfile
import gzip
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
import nibabel as nib
import numpy as np

from app.core.config import (
    CASES_DIR,
    MAX_UPLOAD_BYTES,
    MAX_ZIP_COMPRESSION_RATIO,
    MAX_ZIP_FILES,
    MAX_ZIP_UNCOMPRESSED_BYTES,
    MODALITIES,
)
from app.services.dicom_import import convert_dicom_study

_MODALITY_PATTERNS = {
    "t1ce": re.compile(r"(^|[_\-.])t1ce([_\-.]|$)", re.IGNORECASE),
    "t1": re.compile(r"(^|[_\-.])t1([_\-.]|$)", re.IGNORECASE),
    "t2": re.compile(r"(^|[_\-.])t2([_\-.]|$)", re.IGNORECASE),
    "flair": re.compile(r"(^|[_\-.])flair([_\-.]|$)", re.IGNORECASE),
    "seg": re.compile(r"(^|[_\-.])seg([_\-.]|$)", re.IGNORECASE),
}

_CASE_ID_PATTERN = re.compile(r"^[a-f0-9]{12}$")


def guess_modality(filename: str) -> Optional[str]:
    lower = filename.lower()
    if not (lower.endswith(".nii.gz") or lower.endswith(".nii")):
        return None
    if "t1ce" in lower or _MODALITY_PATTERNS["t1ce"].search(lower):
        return "t1ce"
    for key in ("t1", "t2", "flair", "seg"):
        if _MODALITY_PATTERNS[key].search(lower):
            return key
    return None


def _case_dir(case_id: str) -> Path:
    # Case ids are generated server-side. Rejecting anything else also prevents a
    # route parameter from escaping the local data directory (notably on DELETE).
    if not _CASE_ID_PATTERN.fullmatch(case_id):
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return CASES_DIR / case_id


def _meta_path(case_id: str) -> Path:
    return _case_dir(case_id) / "meta.json"


def _write_meta(case_id: str, meta: dict) -> None:
    _meta_path(case_id).write_text(json.dumps(meta, indent=2, default=str))


def _read_meta(case_id: str) -> dict:
    path = _meta_path(case_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return json.loads(path.read_text())


def _copy_as_gzipped_nifti(source: Path, destination: Path) -> None:
    """Store every raw modality in the same, truthful `.nii.gz` format.

    NIfTI files uploaded as `.nii` used to be renamed to `.nii.gz` without
    compression. NiiVue uses the filename suffix to select its decoder, so that
    mismatch made otherwise valid scans fail to render.
    """
    if source.name.lower().endswith(".nii"):
        with source.open("rb") as src, gzip.open(destination, "wb") as dst:
            shutil.copyfileobj(src, dst)
        return
    shutil.copy2(source, destination)


def _canonicalize_nifti(path: Path) -> None:
    """Rewrite an uploaded NIfTI with a standard, browser-compatible header.

    Scanner exports can carry vendor extensions and large voxel offsets. NiBabel reads
    these safely, but browser parsers such as NiiVue may reject them. Preserve voxel
    data and spatial affine while emitting a compact float32 `.nii.gz` volume.
    """
    try:
        image = nib.load(str(path))
        clean = nib.Nifti1Image(np.asarray(image.dataobj, dtype=np.float32), affine=image.affine)
        clean.set_data_dtype(np.float32)
        nib.save(clean, str(path))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid NIfTI volume '{path.name}': {exc}") from exc


async def _save_upload(upload: UploadFile, destination: Path, bytes_received: int) -> int:
    """Stream uploads to disk with one aggregate per-case limit."""
    with destination.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            bytes_received += len(chunk)
            if bytes_received > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"Case uploads are limited to {MAX_UPLOAD_BYTES // (1024 * 1024)} MB. "
                    "Set NEUROSCAN_MAX_UPLOAD_BYTES to raise this local limit.",
                )
            output.write(chunk)
    return bytes_received


def _validate_zip(zf: zipfile.ZipFile, extract_dir: Path) -> None:
    members = zf.infolist()
    if len(members) > MAX_ZIP_FILES:
        raise HTTPException(status_code=400, detail="The ZIP contains too many files for one MRI case.")
    total_uncompressed = sum(member.file_size for member in members)
    if total_uncompressed > MAX_ZIP_UNCOMPRESSED_BYTES:
        raise HTTPException(status_code=413, detail="The ZIP expands beyond the configured local safety limit.")

    extraction_root = extract_dir.resolve()
    for member in members:
        target = (extract_dir / member.filename).resolve()
        if not target.is_relative_to(extraction_root):
            raise HTTPException(status_code=400, detail="The ZIP contains an unsafe file path.")
        if member.file_size > 1024 * 1024 and member.compress_size and (
            member.file_size / member.compress_size > MAX_ZIP_COMPRESSION_RATIO
        ):
            raise HTTPException(status_code=400, detail="The ZIP has an unsafe compression ratio.")


async def create_case(name: str, files: list[UploadFile]) -> dict:
    case_id = uuid.uuid4().hex[:12]
    case_dir = _case_dir(case_id)
    raw_dir = case_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    found: dict[str, Path] = {}

    zip_files = [f for f in files if (f.filename or "").lower().endswith(".zip")]
    loose_files = [f for f in files if f not in zip_files]
    if len(zip_files) > 1:
        raise HTTPException(status_code=400, detail="Upload one ZIP study or four individual NIfTI files, not multiple ZIPs.")
    bytes_received = 0
    extract_dir = case_dir / "_extracted"

    try:
        for upload in zip_files:
            tmp_zip = case_dir / "_upload.zip"
            bytes_received = await _save_upload(upload, tmp_zip, bytes_received)
            with zipfile.ZipFile(tmp_zip) as zf:
                _validate_zip(zf, extract_dir)
                zf.extractall(extract_dir)
            tmp_zip.unlink(missing_ok=True)

            for path in extract_dir.rglob("*"):
                if not path.is_file():
                    continue
                modality = guess_modality(path.name)
                if modality and modality != "seg" and modality not in found:
                    found[modality] = path
            if not found:
                try:
                    found = convert_dicom_study(extract_dir, case_dir / "_dicom_nifti")
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail=str(exc)) from exc

        for upload in loose_files:
            modality = guess_modality(upload.filename or "")
            if not modality or modality == "seg":
                continue
            original_name = (upload.filename or "").lower()
            extension = ".nii" if original_name.endswith(".nii") else ".nii.gz"
            dest = case_dir / f"_loose_{modality}{extension}"
            bytes_received = await _save_upload(upload, dest, bytes_received)
            found[modality] = dest

        if not found:
            raise HTTPException(
                status_code=400,
                detail="No recognizable T1/T1-CE/T2/FLAIR NIfTI files were found in the upload.",
            )

        missing = [modality.upper() for modality in MODALITIES if modality not in found]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"A complete BraTS case requires all four modalities. Missing: {', '.join(missing)}.",
            )

        for modality, src_path in found.items():
            dest = raw_dir / f"{modality}.nii.gz"
            _copy_as_gzipped_nifti(src_path, dest)
            _canonicalize_nifti(dest)

        extract_dir = case_dir / "_extracted"
        if extract_dir.exists():
            shutil.rmtree(extract_dir, ignore_errors=True)
        dicom_tmp = case_dir / "_dicom_nifti"
        if dicom_tmp.exists():
            shutil.rmtree(dicom_tmp, ignore_errors=True)
        for loose_tmp in case_dir.glob("_loose_*.nii*"):
            loose_tmp.unlink(missing_ok=True)

        modalities_present = [m for m in MODALITIES if (raw_dir / f"{m}.nii.gz").exists()]

        meta = {
            "case_id": case_id,
            "name": name,
            "status": "uploaded",
            "modalities_present": modalities_present,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "has_segmentation": False,
            "error_message": None,
        }
        _write_meta(case_id, meta)
        return meta

    except HTTPException:
        shutil.rmtree(case_dir, ignore_errors=True)
        raise
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(case_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {exc}") from exc


def list_cases() -> list[dict]:
    cases = []
    if not CASES_DIR.exists():
        return cases
    for case_dir in sorted(CASES_DIR.iterdir(), reverse=True):
        meta_file = case_dir / "meta.json"
        if meta_file.exists():
            cases.append(json.loads(meta_file.read_text()))
    cases.sort(key=lambda c: c["created_at"], reverse=True)
    return cases


def get_case(case_id: str) -> dict:
    return _read_meta(case_id)


def update_case(case_id: str, **fields) -> dict:
    meta = _read_meta(case_id)
    meta.update(fields)
    _write_meta(case_id, meta)
    return meta


def delete_case(case_id: str) -> None:
    case_dir = _case_dir(case_id)
    if not case_dir.exists():
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    shutil.rmtree(case_dir)


def volume_path(case_id: str, modality: str) -> Path:
    if modality not in MODALITIES:
        raise HTTPException(status_code=400, detail=f"Unknown modality '{modality}'")
    path = _case_dir(case_id) / "raw" / f"{modality}.nii.gz"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Modality '{modality}' not available for this case")
    return path


def segmentation_path(case_id: str) -> Path:
    path = _case_dir(case_id) / "segmentation.nii.gz"
    if not path.exists():
        raise HTTPException(status_code=404, detail="No segmentation has been computed for this case yet")
    return path


def case_root(case_id: str) -> Path:
    return _case_dir(case_id)
