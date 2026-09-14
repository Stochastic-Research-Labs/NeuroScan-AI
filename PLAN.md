# PLAN.md — NeuroScan AI Build Plan

Status legend: `[x]` done in this delivery · `[ ]` pending (mostly on Hamza — Kaggle training and
dropping the checkpoint in) · `[~]` scaffolded but needs the real model to be fully verified.

## Phase 0 — Decisions (done)

- [x] Confirmed with Hamza: Python FastAPI backend for inference, PyTorch, segmentation-only
  scope (WT/TC/ET), NiiVue for visualization. See CLAUDE.md § Architecture decisions.
- [x] Verified dataset: `archive.zip` present (~13 GB), matches BraTS 2021 Task 1 Kaggle download.

## Phase 1 — Frontend scaffold (done)

- [x] Next.js 14 App Router + TypeScript + Tailwind, dark clinical dashboard theme via
  `ui-ux-pro-max` (tokens in `tailwind.config.ts` / `globals.css`).
- [x] `/` — Dashboard: hero, pipeline explainer, live backend/model status, case list, CTA to upload.
- [x] `/upload` — Drag-and-drop for a patient case (4 modality `.nii.gz` files or a per-case
  `.zip`), client-side validation, upload progress, hand-off to a new case page.
- [x] `/cases/[caseId]` — NiiVue multi-planar viewer: modality switcher (T1/T1ce/T2/FLAIR),
  segmentation overlay toggle + opacity, class legend, per-class volume stats, run/re-run
  prediction, download mask button, demo-mode banner when applicable.
- [x] `/metrics` — Training performance dashboard (loss curves, per-class Dice bar chart) reading
  `backend`'s `/api/metrics`; shows placeholder/demo data until Hamza drops in the real
  `metrics.json` from Kaggle.
- [x] `/about` — Project, author, dataset, architecture explainer.
- [x] Shared shell: responsive navbar + mobile nav, footer, toasts, loading states
  (`loading.tsx` per route), empty states, error boundaries.
- [x] Accessibility pass: contrast ≥ 4.5:1, visible focus rings, 44×44px touch targets, no
  color-only meaning (legend labels alongside every color), `prefers-reduced-motion` respected.

## Phase 2 — Backend scaffold (done)

- [x] FastAPI app (`backend/app/main.py`) with CORS for `localhost:3000`.
- [x] `POST /api/cases` — accepts an upload (zip or individual files), validates the 4 expected
  modalities are present, stores under `backend/data/cases/{case_id}/raw/`.
- [x] `GET /api/cases` / `GET /api/cases/{case_id}` — list/inspect stored cases.
- [x] `GET /api/cases/{case_id}/volume/{modality}` — streams a NIfTI file for NiiVue to fetch.
- [x] `POST /api/cases/{case_id}/predict` — preprocess (nibabel load → per-modality z-score
  normalize on brain mask → crop/pad to model input size) → run the 3D U-Net (or demo synthetic
  mask if no checkpoint) → postprocess (threshold sigmoid outputs → BraTS label convention →
  per-class voxel/volume stats) → save `segmentation.nii.gz` → return stats + `demo_mode` flag.
- [x] `GET /api/cases/{case_id}/segmentation` — streams the predicted mask NIfTI for overlay/download.
- [x] `GET /api/health` — backend status, whether a real checkpoint is loaded, device (CPU/GPU).
- [x] `GET /api/metrics` — serves `backend/models_store/metrics.json` if present, else a clearly
  marked demo payload.
- [x] `backend/app/models/unet3d.py` — reference 3D U-Net architecture (4→3 channels).
- [x] `backend/app/services/demo_inference.py` — synthetic mask generator for pre-training testing.

## Phase 3 — Kaggle training template (done, not yet run)

- [x] `training/train_brats.py` — self-contained (no relative imports) script to paste into a
  Kaggle notebook: dataset loader for the standard BraTS folder layout, the *same* U-Net class as
  the backend, combined Dice + BCE loss, AMP mixed precision, per-epoch validation Dice per
  class, checkpoint + `metrics.json` export at the end.
- [ ] **Hamza:** run it on Kaggle against the unzipped dataset (GPU notebook, e.g. T4×2 or P100).
- [ ] **Hamza:** download `model.pt` + `metrics.json` from the Kaggle output panel.
- [ ] **Hamza:** drop both into `backend/models_store/` on the laptop and restart the backend.

## Phase 4 — Integration & verification (done for demo mode; real-model check pending)

- [x] `npm run build` passes clean on the frontend scaffold.
- [x] Backend Python modules import cleanly and the FastAPI app starts.
- [x] End-to-end smoke test in **demo mode**: upload a case → predict → view overlay → see stats
  → confirm the demo-mode banner is visible.
- [~] End-to-end test with a **real trained checkpoint** — cannot be done until Phase 3's Kaggle
  run is finished; the loading path is written and covered by the same code path as demo mode,
  but Hamza should re-run the smoke test once `model.pt` exists.

## Phase 5 — Nice-to-haves (not built yet — ask before doing these)

- [ ] Batch upload / process multiple cases at once.
- [ ] 3D volume rendering (NiiVue supports it) in addition to 2D multi-planar slices.
- [ ] Compare two model checkpoints side by side on `/metrics`.
- [ ] Export a PDF case report.

These are explicitly out of scope for this delivery — only build them if Hamza asks.
