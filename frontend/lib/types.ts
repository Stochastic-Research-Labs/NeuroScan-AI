// Shared types mirroring the FastAPI backend's Pydantic response models.
// Keep in sync with backend/app/api/routes/*.py

export type Modality = "t1" | "t1ce" | "t2" | "flair";

export const MODALITIES: Modality[] = ["t1", "t1ce", "t2", "flair"];

export const MODALITY_LABELS: Record<Modality, string> = {
  t1: "T1",
  t1ce: "T1-CE (contrast)",
  t2: "T2",
  flair: "FLAIR",
};

export type CaseStatus = "uploaded" | "processing" | "completed" | "failed";

export interface CaseSummary {
  case_id: string;
  name: string;
  status: CaseStatus;
  modalities_present: Modality[];
  created_at: string;
  has_segmentation: boolean;
}

export interface ClassVolumeStat {
  key: "ncr" | "ed" | "et" | "wt" | "tc";
  label: string;
  voxel_count: number;
  volume_cm3: number;
  color: string;
}

export interface CaseDetail extends CaseSummary {
  error_message?: string | null;
  // Persisted from the most recent successful prediction so the legend/report can show
  // results without forcing a re-run every time the case is reopened.
  class_stats?: ClassVolumeStat[] | null;
  inference_time_ms?: number | null;
  volume_shape?: [number, number, number] | null;
}

export interface PredictionResult {
  case_id: string;
  demo_mode: boolean;
  inference_time_ms: number;
  volume_shape: [number, number, number];
  class_stats: ClassVolumeStat[];
  segmentation_url: string;
}

export interface HealthStatus {
  status: "ok";
  demo_mode: boolean;
  checkpoint_loaded: boolean;
  checkpoint_path: string | null;
  device: string;
  torch_available: boolean;
  version: string;
}

export interface MetricsPayload {
  demo_mode: boolean;
  epochs: number[];
  train_loss: number[];
  val_loss: number[];
  dice_per_class: {
    label: string;
    key: "ncr" | "ed" | "et" | "wt" | "tc";
    dice: number;
    color: string;
  }[];
  notes?: string;
}

export interface ApiError {
  detail: string;
}
