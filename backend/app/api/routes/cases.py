import json

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse

from app.core.config import APP_VERSION, METRICS_PATH
from app.schemas import CaseDetail, CaseSummary, PredictionResult
from app.services import case_store
from app.services.inference import get_model_status, load_case_volume_and_segmentation, run_inference
from app.services.postprocessing import compute_class_stats
from app.services.report import build_report_pdf, render_all_slice_images

router = APIRouter(tags=["cases"])


@router.get("/api/cases", response_model=list[CaseSummary])
def list_cases() -> list[dict]:
    return case_store.list_cases()


@router.post("/api/cases", response_model=CaseDetail)
async def upload_case(name: str = Form(...), files: list[UploadFile] = File(...)) -> dict:
    if not name.strip():
        raise HTTPException(status_code=400, detail="Case name is required")
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    return await case_store.create_case(name.strip(), files)


@router.get("/api/cases/{case_id}", response_model=CaseDetail)
def get_case(case_id: str) -> dict:
    return case_store.get_case(case_id)


@router.delete("/api/cases/{case_id}")
def delete_case(case_id: str) -> dict:
    case_store.delete_case(case_id)
    return {"ok": True}


@router.get("/api/cases/{case_id}/volume/{modality}")
def get_volume(case_id: str, modality: str) -> FileResponse:
    # NiiVue detects file type from the URL (not Content-Disposition), so the
    # frontend appends .nii.gz to the URL. Strip it before looking up the file.
    modality = modality.removesuffix(".nii.gz").removesuffix(".nii")
    path = case_store.volume_path(case_id, modality)
    # No Content-Disposition attachment: NiiVue fetches this endpoint to render the volume.
    return FileResponse(path, media_type="application/gzip")


@router.get("/api/cases/{case_id}/segmentation")
@router.get("/api/cases/{case_id}/segmentation.nii.gz")
def get_segmentation(case_id: str) -> FileResponse:
    path = case_store.segmentation_path(case_id)
    # The explicit download control in the frontend handles saving; this endpoint is also
    # consumed directly by the in-browser viewer.
    return FileResponse(path, media_type="application/gzip")


@router.post("/api/cases/{case_id}/predict", response_model=PredictionResult)
def predict(case_id: str) -> dict:
    case_store.update_case(case_id, status="processing")
    try:
        result = run_inference(case_id)
    except Exception as exc:  # noqa: BLE001
        case_store.update_case(case_id, status="failed", error_message=str(exc))
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    case_store.update_case(
        case_id,
        status="completed",
        has_segmentation=True,
        error_message=None,
        class_stats=result["class_stats"],
        inference_time_ms=result["inference_time_ms"],
        volume_shape=result["volume_shape"],
    )
    return result


@router.get("/api/cases/{case_id}/report.pdf")
def get_report(case_id: str) -> Response:
    case_meta = case_store.get_case(case_id)
    if not case_meta.get("has_segmentation"):
        raise HTTPException(
            status_code=409,
            detail="Run segmentation for this case before generating a report.",
        )

    try:
        volume, label_map, voxel_volume_mm3, volume_shape = load_case_volume_and_segmentation(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    class_stats = compute_class_stats(label_map, voxel_volume_mm3) if label_map is not None else []
    slice_images = render_all_slice_images(volume, label_map)
    model_status = {**get_model_status(), "version": APP_VERSION}
    metrics = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else None

    pdf_bytes = build_report_pdf(
        case_meta=case_meta,
        class_stats=class_stats,
        model_status=model_status,
        metrics=metrics,
        slice_images=slice_images,
        volume_shape=volume_shape,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="NeuroScan-Report-{case_id}.pdf"'},
    )
