"""Pydantic request/response models. Keep in sync with frontend/lib/types.ts."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

Modality = Literal["t1", "t1ce", "t2", "flair"]
CaseStatus = Literal["uploaded", "processing", "completed", "failed"]
ClassKey = Literal["ncr", "ed", "et", "wt", "tc"]


class CaseSummary(BaseModel):
    case_id: str
    name: str
    status: CaseStatus
    modalities_present: list[Modality]
    created_at: datetime
    has_segmentation: bool


class ClassVolumeStat(BaseModel):
    key: ClassKey
    label: str
    voxel_count: int
    volume_cm3: float
    color: str


class CaseDetail(CaseSummary):
    error_message: Optional[str] = None
    # Persisted from the most recent successful prediction so the UI (and the PDF report) can
    # show segmentation results without forcing a re-run every time the case is reopened.
    class_stats: Optional[list[ClassVolumeStat]] = None
    inference_time_ms: Optional[float] = None
    volume_shape: Optional[tuple[int, int, int]] = None


class PredictionResult(BaseModel):
    case_id: str
    demo_mode: bool
    inference_time_ms: float
    volume_shape: tuple[int, int, int]
    class_stats: list[ClassVolumeStat]
    segmentation_url: str


class HealthStatus(BaseModel):
    status: Literal["ok"] = "ok"
    demo_mode: bool
    checkpoint_loaded: bool
    checkpoint_path: Optional[str]
    device: str
    torch_available: bool
    version: str


class DiceEntry(BaseModel):
    label: str
    key: ClassKey
    dice: float
    color: str


class MetricsPayload(BaseModel):
    demo_mode: bool
    epochs: list[int]
    train_loss: list[float]
    val_loss: list[float]
    dice_per_class: list[DiceEntry]
    notes: Optional[str] = None
