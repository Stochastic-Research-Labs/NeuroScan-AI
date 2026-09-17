"""Builds the case PDF report: a real structured document (reportlab) from data the app has
actually computed — case metadata, per-class segmentation volumes, model/checkpoint status, and
representative 2D slice images rendered directly from the saved NIfTI volumes (Pillow). No page
screenshotting, no fabricated medical findings — every number/sentence traces back to a field
already present elsewhere in the API.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import APP_VERSION, CLASS_INFO

_STYLES = getSampleStyleSheet()
_MUTED = ParagraphStyle("Muted", parent=_STYLES["Normal"], textColor=colors.HexColor("#64748B"))
_BRAND = ParagraphStyle(
    "Brand", parent=_STYLES["Normal"], textColor=colors.HexColor("#0891B2"),
    fontSize=11, spaceAfter=2,
)
_TITLE = ParagraphStyle("ReportTitle", parent=_STYLES["Title"], textColor=colors.HexColor("#0F172A"))
_SUBTITLE = ParagraphStyle(
    "ReportSubtitle", parent=_STYLES["Normal"], textColor=colors.HexColor("#475569"), leading=15
)
_NOTICE = ParagraphStyle(
    "ReportNotice",
    parent=_STYLES["Normal"],
    textColor=colors.HexColor("#075985"),
    backColor=colors.HexColor("#E0F2FE"),
    borderColor=colors.HexColor("#7DD3FC"),
    borderWidth=0.5,
    borderPadding=8,
    leading=14,
)

MODALITY_LABELS = {"t1": "T1", "t1ce": "T1-CE (contrast)", "t2": "T2", "flair": "FLAIR"}

# (display title, array axis). BraTS volumes are stored (X, Y, Z) with Z as the through-slice
# axis; this maps the array's own axes to the three orthogonal views for a representative
# thumbnail. Exact left/right radiological orientation isn't verified against the NIfTI affine
# here — these are illustrative "representative visualizations", not a diagnostic MPR.
_AXES = [("Axial", 2), ("Coronal", 1), ("Sagittal", 0)]


def _normalize_slice(slice_2d: np.ndarray) -> np.ndarray:
    finite = slice_2d[np.isfinite(slice_2d)]
    if finite.size == 0:
        return np.zeros_like(slice_2d, dtype=np.uint8)
    lo, hi = np.percentile(finite, [1.0, 99.5])
    if hi <= lo:
        hi = lo + 1.0
    clipped = np.clip(slice_2d, lo, hi)
    return ((clipped - lo) / (hi - lo) * 255).astype(np.uint8)


def _label_colors() -> dict[int, tuple[int, int, int]]:
    result = {}
    for info in CLASS_INFO.values():
        hex_color = info["color"].lstrip("#")
        result[info["label_value"]] = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    return result


def render_slice_image(volume: np.ndarray, label_map: Optional[np.ndarray], axis: int, size: int = 480) -> bytes:
    """Renders one representative 2D PNG slice (grayscale modality + segmentation overlay).

    Picks the slice with the largest predicted tumor cross-section along `axis` when a
    segmentation exists, else the volume's center slice — a deterministic, data-driven choice.
    """
    has_seg = label_map is not None and label_map.shape == volume.shape
    if has_seg:
        other_axes = tuple(a for a in range(3) if a != axis)
        tumor_counts = np.count_nonzero(label_map != 0, axis=other_axes)
        idx = int(np.argmax(tumor_counts)) if tumor_counts.max() > 0 else volume.shape[axis] // 2
    else:
        idx = volume.shape[axis] // 2

    gray = _normalize_slice(np.take(volume, idx, axis=axis))
    base = Image.fromarray(gray, mode="L").convert("RGBA")

    if has_seg:
        label_slice = np.take(label_map, idx, axis=axis)
        overlay_rgba = np.zeros((*label_slice.shape, 4), dtype=np.uint8)
        for label_value, rgb in _label_colors().items():
            mask = label_slice == label_value
            if not mask.any():
                continue
            overlay_rgba[mask, 0:3] = rgb
            overlay_rgba[mask, 3] = 150
        base = Image.alpha_composite(base, Image.fromarray(overlay_rgba, mode="RGBA"))

    base = base.convert("RGB")
    scale = size / max(base.size)
    if scale != 1:
        new_size = (max(1, int(base.width * scale)), max(1, int(base.height * scale)))
        base = base.resize(new_size, Image.LANCZOS)

    buf = io.BytesIO()
    base.save(buf, format="PNG")
    return buf.getvalue()


def render_all_slice_images(volume: np.ndarray, label_map: Optional[np.ndarray]) -> list[tuple[str, bytes]]:
    return [(title, render_slice_image(volume, label_map, axis)) for title, axis in _AXES]


def _draw_header_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(2 * cm, 1.2 * cm, "NeuroScan AI — AI-assisted MRI segmentation report")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _section_title(text: str) -> Paragraph:
    return Paragraph(text, _STYLES["Heading2"])


def _kv_table(rows: list[tuple[str, str]]) -> Table:
    data = [[Paragraph(f"<b>{k}</b>", _STYLES["Normal"]), Paragraph(str(v), _STYLES["Normal"])] for k, v in rows]
    table = Table(data, colWidths=[5 * cm, 10 * cm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ]
        )
    )
    return table


def _image_flowable(png_bytes: bytes, max_width: float = 7.4 * cm) -> RLImage:
    with Image.open(io.BytesIO(png_bytes)) as im:
        w, h = im.size
    ratio = h / w
    return RLImage(io.BytesIO(png_bytes), width=max_width, height=max_width * ratio)


def build_report_pdf(
    case_meta: dict,
    class_stats: list[dict],
    model_status: dict,
    metrics: Optional[dict],
    slice_images: list[tuple[str, bytes]],
    volume_shape: Optional[tuple[int, int, int]],
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        title=f"NeuroScan AI Report — {case_meta.get('name') or case_meta.get('case_id', '')}",
    )
    story: list = []

    story.append(Paragraph("NeuroScan AI", _BRAND))
    story.append(Paragraph("AI-Assisted Brain MRI Segmentation Report", _TITLE))
    story.append(Paragraph("Preliminary quantitative analysis - for qualified clinical review", _SUBTITLE))
    story.append(Paragraph(case_meta.get("name") or "Unnamed case", _MUTED))
    story.append(Spacer(1, 0.5 * cm))

    story.append(
        Paragraph(
            "<b>Important:</b> This document reports automated segmentation measurements. "
            "It does not establish a diagnosis, replace a radiologist's interpretation, or "
            "provide treatment advice.",
            _NOTICE,
        )
    )
    story.append(Spacer(1, 0.45 * cm))

    story.append(_section_title("Examination and case information"))
    story.append(
        _kv_table(
            [
                ("Case ID", case_meta.get("case_id", "—")),
                ("Case name", case_meta.get("name", "—")),
                ("Status", str(case_meta.get("status", "—")).capitalize()),
                ("Created", str(case_meta.get("created_at", "—"))),
                ("Report generated (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")),
            ]
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    story.append(_section_title("Clinical information"))
    story.append(
        _kv_table(
            [
                ("Clinical indication", "Not supplied with this local research case"),
                ("Patient demographics", "Not supplied"),
                ("Comparison study", "Not supplied"),
            ]
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    story.append(_section_title("Technique"))
    modalities = ", ".join(
        MODALITY_LABELS.get(m, m) for m in case_meta.get("modalities_present", [])
    )
    imaging_rows = [
        ("MRI modalities", modalities or "—"),
        ("Segmentation status", "Completed" if case_meta.get("has_segmentation") else "Not run"),
    ]
    if volume_shape:
        imaging_rows.append(("Volume shape", " × ".join(str(s) for s in volume_shape) + " voxels"))
    story.append(_kv_table(imaging_rows))
    story.append(Spacer(1, 0.4 * cm))

    story.append(_section_title("AI / segmentation summary"))
    story.append(
        _kv_table(
            [
                ("Model architecture", "3D U-Net (4 input channels → 3 output channels)"),
                (
                    "Mode",
                    "Demonstration output (no trained checkpoint loaded)"
                    if model_status.get("demo_mode")
                    else "Trained model checkpoint",
                ),
                ("Inference device", model_status.get("device", "—")),
                ("Segmentation labels", "NCR/NET, ED, ET (BraTS convention), plus derived WT and TC"),
                ("Software version", model_status.get("version") or APP_VERSION),
            ]
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    if class_stats:
        rows = [["Region", "Voxels", "Volume (cm³)"]] + [
            [s["label"], f"{s['voxel_count']:,}", f"{s['volume_cm3']:.2f}"] for s in class_stats
        ]
        table = Table(rows, colWidths=[7 * cm, 4 * cm, 4 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        # Keep the section heading and table together. Without this, ReportLab can leave
        # a stranded table header at the bottom of one page and place its data on the next.
        story.append(KeepTogether([_section_title("Quantitative results"), table]))
        story.append(Spacer(1, 0.4 * cm))

        story.append(_section_title("Automated segmentation findings"))
        by_key = {s["key"]: s for s in class_stats}
        sentences = []
        if "wt" in by_key:
            sentences.append(f"Whole tumor volume: {by_key['wt']['volume_cm3']:.2f} cm³.")
        if "tc" in by_key:
            sentences.append(f"Tumor core (necrotic + enhancing) volume: {by_key['tc']['volume_cm3']:.2f} cm³.")
        if "et" in by_key:
            sentences.append(f"Enhancing tumor volume: {by_key['et']['volume_cm3']:.2f} cm³.")
        if "ed" in by_key:
            sentences.append(f"Peritumoral edema volume: {by_key['ed']['volume_cm3']:.2f} cm³.")
        story.append(
            Paragraph(
                " ".join(sentences)
                + " Measurements are derived from the predicted label map and voxel spacing; "
                "they should be checked against the source images before clinical use.",
                _STYLES["Normal"],
            )
        )
        story.append(Spacer(1, 0.15 * cm))
        story.append(
            Paragraph(
                "<i>This is AI-generated quantitative output derived directly from the segmentation "
                "model's predicted labels — it is not a clinical diagnosis or radiological "
                "interpretation.</i>",
                _MUTED,
            )
        )
        story.append(Spacer(1, 0.4 * cm))
    else:
        story.append(
            Paragraph(
                "No segmentation has been run for this case, so no quantitative results are available.",
                _MUTED,
            )
        )
        story.append(Spacer(1, 0.4 * cm))

    story.append(_section_title("AI-assisted impression"))
    if class_stats:
        story.append(
            Paragraph(
                "Automated multi-class segmentation is present and quantitative region volumes are "
                "reported above. The result is preliminary and requires review by a qualified "
                "radiologist or clinician in conjunction with the full MRI examination and clinical context.",
                _STYLES["Normal"],
            )
        )
    else:
        story.append(
            Paragraph(
                "No automated segmentation result is available for this examination.", _STYLES["Normal"]
            )
        )
    story.append(Spacer(1, 0.4 * cm))

    story.append(_section_title("Recommended review"))
    story.append(
        Paragraph(
            "Review the segmentation overlay in all three orthogonal planes; verify label boundaries, "
            "image registration, and volume plausibility; and correlate with prior studies and the "
            "patient's clinical presentation when available.",
            _STYLES["Normal"],
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    if slice_images:
        story.append(PageBreak())
        story.append(_section_title("Representative visualizations"))
        story.append(
            Paragraph(
                "Each slice below was automatically selected as the cross-section with the largest "
                "predicted tumor area along that axis. True 3D volumetric rendering is only "
                "performed client-side in the interactive WebGL viewer and is not reproduced here.",
                _MUTED,
            )
        )
        story.append(Spacer(1, 0.3 * cm))
        for title, png_bytes in slice_images:
            # KeepTogether so a caption never gets stranded on one page while its image
            # flows to the next — reportlab treats each Paragraph/Image as an independently
            # breakable flowable otherwise.
            story.append(
                KeepTogether(
                    [
                        Paragraph(title, _STYLES["Heading3"]),
                        _image_flowable(png_bytes),
                        Spacer(1, 0.3 * cm),
                    ]
                )
            )

    story.append(_section_title("Technical / model information"))
    story.append(
        _kv_table(
            [
                ("Checkpoint loaded", "Yes" if model_status.get("checkpoint_loaded") else "No"),
                ("PyTorch available", "Yes" if model_status.get("torch_available") else "No"),
                ("Inference device", model_status.get("device", "—")),
            ]
        )
    )
    if metrics and not metrics.get("demo_mode", True) and metrics.get("dice_per_class"):
        story.append(Spacer(1, 0.2 * cm))
        story.append(
            Paragraph(
                "<i>Training-time validation Dice, measured on a held-out validation set during "
                "model training — not a per-case accuracy score for this specific scan:</i>",
                _MUTED,
            )
        )
        dice_rows = [["Region", "Validation Dice"]] + [
            [d["label"], f"{d['dice'] * 100:.1f}%"] for d in metrics["dice_per_class"]
        ]
        dice_table = Table(dice_rows, colWidths=[7 * cm, 4 * cm])
        dice_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ]
            )
        )
        story.append(Spacer(1, 0.15 * cm))
        story.append(dice_table)
    story.append(Spacer(1, 0.4 * cm))

    # Do not split a safety disclaimer across pages: it must remain readable as one statement.
    story.append(
        KeepTogether(
            [
                _section_title("Disclaimer"),
                Paragraph(
                    "NeuroScan AI is a local, assistive research and visualization tool. The segmentation "
                    "and measurements in this report are generated automatically by a machine learning "
                    "model and have not been reviewed by a radiologist or clinician. This report is not a "
                    "medical diagnosis and must not be used as a substitute for professional clinical "
                    "evaluation. All clinical decisions should be made by a qualified healthcare provider.",
                    _STYLES["Normal"],
                ),
            ]
        )
    )

    doc.build(story, onFirstPage=_draw_header_footer, onLaterPages=_draw_header_footer)
    return buf.getvalue()
