# CLAUDE.md — NeuroScan AI

This file orients any Claude (or human) session working in this repository. Read it before making changes.

## What this project is

**NeuroScan AI** is a local, full-stack brain tumor **segmentation** web app built on the
[BraTS 2021 Task 1](https://www.kaggle.com/datasets/dschettler8845/brats-2021-task1) dataset.

- **Author:** Hamza Mustafa
- **Scope:** Multi-class tumor sub-region segmentation (Whole Tumor / Tumor Core / Enhancing Tumor)
  from 4-modality brain MRI (T1, T1ce, T2, FLAIR), presented in an interactive web viewer.
  BraTS Task 1 is a segmentation dataset — there is no separate "classification" task; the
  three tumor sub-regions are what the model predicts and what the UI calls "classification"
  results in casual language.
- **Where the model is trained:** on **Kaggle** (GPU notebooks), not locally. See `training/`.
- **Where the model runs for inference:** locally, in the FastAPI backend in `backend/`, once
  the trained checkpoint is copied down from Kaggle.
- **This is a local-only app.** No auth, no multi-user concerns, no cloud deployment. It runs on
  `localhost` on the author's laptop.

## Repository layout

```
.
├── CLAUDE.md              ← you are here
├── PLAN.md                ← phased build plan + current status checklist
├── README.md              ← human-facing quickstart
├── archive.zip            ← the raw BraTS 2021 Task 1 Kaggle download (13+ GB, DO NOT unzip into git/committed paths)
├── frontend/              ← Next.js 16 (App Router) + TypeScript + Tailwind CSS
├── backend/               ← FastAPI (Python) inference + preprocessing service
└── training/              ← Kaggle-ready training script (NOT run locally — copy into a Kaggle notebook)
```

## Architecture decisions (already made — do not re-litigate without asking Hamza)

These were decided with Hamza directly; treat them as settled unless he says otherwise:

1. **Inference architecture:** Python FastAPI backend loads the PyTorch checkpoint directly and
   serves predictions over `localhost:8000`. No ONNX/browser-side inference.
2. **ML framework:** PyTorch.
3. **Task scope:** Segmentation only (WT / TC / ET), no separate grade/type classifier.
4. **Visualization:** [NiiVue](https://github.com/niivue/niivue) (`@niivue/niivue`), a WebGL NIfTI
   viewer, rendered client-side in a `'use client'` React component
   (`frontend/components/viewer/NiivueViewer.tsx`). Raw modality + predicted mask overlay,
   multi-planar (axial/coronal/sagittal/3D render), window/level controls, zoom/pan/reset, and
   double-click-to-fullscreen per panel — see "MRI viewer implementation" below for how each of
   these is actually wired to the NiiVue API.
5. **Model architecture:** a 3D U-Net (4 input channels → 3 output channels, multi-label sigmoid
   for overlapping WT/TC/ET regions) defined once in `backend/app/models/unet3d.py` and mirrored
   in `training/train_brats.py` so a Kaggle-trained checkpoint loads into the backend with zero
   conversion. **If you change one file's architecture, change the other to match**, or inference
   will fail to load the `state_dict`.
6. **Demo mode:** until a real checkpoint exists at `backend/models_store/model.pt`, the backend
   generates a synthetic plausible-looking tumor mask (`backend/app/services/demo_inference.py`)
   so the full upload → predict → view flow is testable before training finishes. The API
   response always includes `"demo_mode": true/false` and the frontend shows a visible banner
   when running in demo mode. Never let demo output be mistaken for a real prediction in the UI.

## Design system

Dark, data-dense clinical/technical dashboard (not a light patient-facing marketing site).
Tokens live in `frontend/tailwind.config.ts` and `frontend/app/globals.css`. Summary:

- Background `#0A0F1A` / surface `#0F172A` / card `#141B2D`, border `#263149`
- Primary accent (medical teal/cyan): `#0891B2` / glow `#22D3EE`
- Segmentation class colors — single source of truth is `frontend/lib/segmentation-colors.ts`
  (frontend) and `backend/app/core/config.py`'s `CLASS_INFO` (backend); both must agree by value:
  NCR/NET (necrotic core) `#0EA5E9`, ED (edema) `#FACC15`, ET (enhancing tumor) `#EF4444`, plus
  two **derived** composite volumes computed in `backend/app/services/postprocessing.py`
  (unions of the labels above, not separate model outputs): Whole Tumor (WT) `#22D3EE`, Tumor
  Core (TC) `#F97316`. The NiiVue overlay colormap, the interactive legend, and the PDF report's
  slice-overlay/table colors all read from these same values — see "Segmentation legend & color
  consistency" below.
- Font: **Roboto** for all UI text, including numbers/tabular data (`font-feature-settings: "tnum"`
  handles numeral alignment — there's no separate monospace typeface). "Google Sans" itself has no
  public webfont release, so Roboto — Google's own open-source UI typeface — is used as the
  documented substitute, loaded via `next/font/google` in `frontend/app/layout.tsx`.
- Icons: `lucide-react` only — never emoji as icons
- Favicon: `frontend/app/icon.svg`, a Next.js App Router metadata-file convention (picked up
  automatically, no manual `<link rel="icon">` needed). It's the exact same lucide-react `Brain`
  icon path data used in `Navbar.tsx`/`AppLoadingScreen.tsx` (copied from
  `node_modules/lucide-react/dist/esm/icons/brain.mjs` so it's a byte-exact match, not an
  approximation), on a `#0891B2` rounded-square background matching the navbar logo badge style.
- Motion: plain CSS keyframes (`animate-fade-in` in `tailwind.config.ts`) + the
  `useReducedMotion()` hook in `frontend/lib/motion.ts`; no animation library is installed.
  Respects `prefers-reduced-motion` globally via `frontend/app/globals.css`.

## A note on pinned versions

`frontend/package.json` pins **Next.js 16 / React 18.3 / Tailwind CSS v3**. Note React is still on
18.x under Next 16 (Next 16 supports React 19 but doesn't require it) — check compatibility before
adding a library that assumes React 19. Tailwind v3's `tailwind.config.ts` +
`@tailwind base/components/utilities` convention (not v4's CSS `@theme` block) is what's
implemented here.

## MRI viewer implementation

Everything below lives in `frontend/components/viewer/NiivueViewer.tsx` unless noted, and is
verified against the installed NiiVue `0.69.0` API (not guessed):

- **Zoom / pan / reset**: NiiVue has no dedicated zoom API. Zoom is `nv.scene.pan2Dxyzmm` (a
  `vec4`: `[panX, panY, panZ, zoomLevel]`) — the same property NiiVue's own mouse-wheel handler
  mutates. `zoomBy(factor)` multiplies the 4th component (clamped `[0.5, 8]`) and calls
  `nv.drawScene()`; `resetView()` reassigns `pan2Dxyzmm = [0,0,0,1]` and re-centers
  `scene.crosshairPos`. Pan is toggled via `nv.setDragMode(DRAG_MODE.pan)`, restoring the drag
  mode captured at init (`nv.opts.dragMode`) when toggled off. All four actions are always-visible
  toolbar buttons top-left of the viewer.
- **Double-click-to-fullscreen per panel**: a `dblclick` listener is registered on the
  **container** (not the canvas) with `{ capture: true }`. It first checks
  `event.target === canvasRef.current` and bails otherwise — the zoom/pan/reset toolbar and the
  fullscreen control panel are absolutely positioned on top of the canvas *within the same
  container*, so without this guard a capture-phase listener would also see native `dblclick`
  events bubbling from those buttons (e.g. clicking "zoom out" twice quickly registers as a
  browser double-click on whatever's underneath, which was wrongly toggling fullscreen — fixed).
  For a real canvas double-click, it computes canvas-relative coordinates, calls
  `nv.tileIndex(x, y)` (present in the shipped `.d.ts` despite an `@internal` JSDoc tag) to find
  which multiplanar tile was hit, and reads `nv.screenSlices[idx].axCorSag` to know which view
  (axial/coronal/sagittal/render) it is. If a tile was hit, `event.stopPropagation()` is called —
  this is what prevents NiiVue's own canvas-level `dblclick` listener (which resets
  brightness/contrast) from also firing, since a capture-phase listener on an ancestor runs before
  a bubble-phase listener on the target. In multiplanar layout, hitting a tile switches to that
  single view and enters fullscreen; in a single-view layout, double-click just toggles
  fullscreen. A miss (`tileIndex === -1`, e.g. background) doesn't stop propagation, so NiiVue's
  default contrast-reset behavior is unchanged.
- **Fullscreen multi-view controls**: only the viewer's own container element goes fullscreen
  (`containerRef.current.requestFullscreen()`), so the sidebar `ViewerControls`/legend `Card`s
  rendered by `CaseDetailClient.tsx` (outside that element) become unreachable. `NiivueViewer`
  solves this by accepting the same lifted state/callbacks `ViewerControls` uses
  (modality/layout/overlay/opacity) and rendering `<ViewerControls>` + `<ClassLegend>` again
  itself, inside a floating panel, shown only while `isFullscreen` is true (collapsible via a
  toolbar button so it never permanently blocks the image). `CaseDetailClient` is still the single
  owner of that state — this is the same lift-state-up pattern the rest of the app uses, not a
  new one.
- **Staged loading messages**: `NiivueViewer`'s loading overlay shows real stage text
  ("Initializing 3D visualization…" during `attachToCanvas`, "Loading MRI volumes…" / "Loading MRI
  volumes and segmentation…" during `loadVolumes`, depending on whether an overlay is included) —
  not a generic spinner, and not fabricated multi-step progress for what's actually one network
  call.

## Segmentation legend & color consistency

`frontend/components/viewer/ClassLegend.tsx` shows two things from `ClassVolumeStat[]`:
toggleable rows for NCR/ED/ET (individual BraTS voxel labels — the NiiVue overlay colormap can
show/hide each independently) and read-only summary rows for WT/TC underneath (derived unions,
not separate voxel labels, so they can't be independently toggled in the 3D overlay). Colors are
kept in sync **by value** across three places, matching `lib/types.ts`'s existing
frontend/backend-sync convention:
1. `backend/app/core/config.py`'s `CLASS_INFO` (ncr/ed/et) + the wt/tc colors hardcoded in
   `backend/app/services/postprocessing.py`'s `compute_class_stats` — source of truth, sent to
   the frontend in every `ClassVolumeStat`.
2. `frontend/lib/segmentation-colors.ts`'s `TUMOR_COLORS` — used by `NiivueViewer`'s label
   colormap (`getSegmentationColormap`) so the WebGL overlay always matches.
3. The PDF report's slice-overlay compositing and results table (`backend/app/services/report.py`),
   which reads `CLASS_INFO` directly.

## Loading states

- **Global app shell**: `frontend/components/layout/AppLoadingScreen.tsx` — a branded splash
  rendered synchronously in `RootLayout` and unmounted (returns `null`) via a `useEffect` that
  fires as soon as React hydrates. It's visible only for the genuine SSR-paint-to-hydration gap;
  there's no artificial delay and no fake progress bar. It unmounts outright rather than toggling
  the HTML `hidden` attribute — the element also carries Tailwind's `flex` utility class, and an
  author stylesheet's `display` rule always beats the browser's built-in
  `[hidden] { display: none }` UA-stylesheet rule regardless of selector specificity, so `hidden`
  alone never actually hid it (fixed; was visible as the splash getting permanently stuck).
- **MRI/3D viewer**: staged messages inside `NiivueViewer`, see above.
- **AI processing**: `CaseDetailClient`'s "Run segmentation" button shows "Running tumor
  segmentation…" while `predicting`; only the predict/export-PDF actions are disabled during it,
  not navigation.
- **PDF report**: the "Export PDF" button is disabled with a tooltip when the case has no
  segmentation yet (so the UI never even hits the backend's `409`), shows "Generating report…"
  while in flight, and a dedicated `pdfError` state (separate from the page's general `error`
  state, so a report failure can't silently overwrite/be overwritten by a segmentation error) with
  an inline Retry action on failure. The primary path goes through `api.downloadReport()` in
  `frontend/lib/api.ts` (a `requestBlob()` helper mirroring the existing `request()` helper's
  connection-failure handling) and downloads via a blob URL. **If that `fetch()` fails for any
  reason**, `handleDownloadReport` in `CaseDetailClient.tsx` falls back to
  `window.open(api.reportUrl(caseId), "_blank")` — a plain browser navigation to the same
  endpoint — before showing an error. This exists because of a real, unresolved environment issue
  seen in testing: the in-page `fetch()` to `/report.pdf` failed with a generic connection error
  on one setup even though the backend was confirmed healthy, CORS was confirmed not the cause
  (other endpoints fetched fine from the same page), and browser extensions were ruled out
  (reproduced in Incognito) — yet navigating to the exact same URL directly always worked. The
  root cause was never conclusively identified (candidates: security/AV software intercepting
  `fetch()`/XHR specifically, or something else entirely), so the fallback exists to make the
  feature reliable regardless of the cause rather than leave it fixed on an unconfirmed diagnosis.

## PDF report generation

Fully backend-generated (`GET /api/cases/{case_id}/report.pdf` in
`backend/app/api/routes/cases.py`, built by `backend/app/services/report.py`) — **not** a
client-side screenshot. Requires `reportlab` and `Pillow` (`backend/requirements.txt`). Returns
`409` if the case has no segmentation yet (no partial/empty-section report is ever generated).

What it contains, and where each piece of data actually comes from:
- **Case/imaging info** — `meta.json` via `case_store.get_case()` (case id/name/status/created_at/
  modalities present).
- **Quantitative results + segmentation findings** — recomputed fresh from the saved
  `segmentation.nii.gz` label map via `compute_class_stats()` (the same function `/predict` uses),
  **not** trusted from possibly-stale persisted summary fields — this is deliberate, so the report
  always reflects the actual saved mask.
- **Representative visualizations** — three 2D PNG slices (axial/coronal/sagittal) rendered
  server-side from the raw NIfTI arrays with Pillow (`render_slice_image` in `report.py`): each
  picks the cross-section with the largest predicted tumor area along that axis (falling back to
  the center slice if there's no segmentation), normalizes intensity via percentile clipping, and
  alpha-blends the BraTS-label-colored overlay. **There is no synthetic 3D render** — true
  volumetric rendering only happens client-side in NiiVue's WebGL context and isn't reproduced
  server-side; this limitation is stated in the PDF itself, not silently omitted. Each caption +
  image + spacer is wrapped in a reportlab `KeepTogether` group — without it, reportlab treats the
  caption and image as independently breakable flowables and can strand a caption on one page
  while its image flows to the next (fixed; was visible as a "Coronal" caption with no image
  directly under it).
- **AI/model info** — `get_model_status()` (checkpoint/demo_mode/device) plus, if
  `models_store/metrics.json` exists and isn't demo data, the training-time per-class validation
  Dice — explicitly captioned as a training-time metric, **not** this scan's accuracy, so it can't
  be read as a per-case confidence score.
- **Disclaimer** — static text: assistive/research tool, not a diagnosis, not a substitute for a
  qualified clinician's evaluation. The "Segmentation findings" section is a plain-language
  restatement of the quantitative table only — nothing is inferred or diagnosed.

Every page carries "NeuroScan AI" branding + a page number via a reportlab `onPage` callback.

## Performance considerations

- `backend/app/services/inference.py`'s prediction path uses `torch.inference_mode()` (not the
  older `torch.no_grad()`) — a safe, accuracy-neutral improvement over a pure-inference path.
- The model checkpoint is loaded once per backend process (`_ModelHolder`, lazy singleton) — never
  reloaded per request.
- No fp16/half-precision or batching was introduced: on a real segmentation model, trading
  accuracy for inference speed wasn't judged worth it for a single-user local app: an unmodified
  CPU inference call on the sample case takes ~26s, which is acceptable for a manual, one-case-
  at-a-time workflow.
- The PDF report recomputes stats from the saved label map on every request rather than caching —
  cheap (pure NumPy over an already-small label map) and avoids a second, potentially-stale source
  of truth.

## How to run it locally

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

The frontend expects the backend at `http://localhost:8000` (see `frontend/.env.local.example`).

## The Kaggle → local handoff (the part Hamza will actually do)

1. Train on Kaggle using `training/train_brats.py` (paste into a notebook cell, or upload as a
   Kaggle Utility Script). It expects the standard BraTS 2021 folder layout after unzipping
   `archive.zip` (one folder per patient, each with `_t1.nii.gz`, `_t1ce.nii.gz`, `_t2.nii.gz`,
   `_flair.nii.gz`, `_seg.nii.gz`).
2. Training saves `model.pt` (state_dict) and `metrics.json` (loss curves + per-class Dice) at
   the end of the notebook — download both from Kaggle's output panel.
3. Copy `model.pt` → `backend/models_store/model.pt` and `metrics.json` →
   `backend/models_store/metrics.json` on the laptop.
4. Restart the backend. It auto-detects the checkpoint, exits demo mode, and the frontend's
   demo-mode banner disappears automatically (driven by `/api/health`).

## Conventions

- Frontend: TypeScript everywhere, App Router, Server Components by default — `'use client'`
  only on the leaf components that need interactivity (viewer, dropzone, charts). Tailwind
  utility classes; shared design tokens as CSS variables in `globals.css`, never raw hex in
  components.
- Backend: typed Python (type hints throughout), Pydantic models for all request/response
  shapes, one router file per resource under `app/api/routes/`.
- Keep `backend/app/models/unet3d.py` and `training/train_brats.py`'s model definition
  byte-for-byte identical in the class body. This is the single biggest source of "checkpoint
  won't load" bugs in projects like this — don't let it drift.
- Never commit `archive.zip`, extracted NIfTI files, `node_modules/`, `.venv/`, or
  `backend/models_store/*.pt` to git (see `.gitignore`). This is a local-only app; there is no
  need to push large binaries anywhere.

## Current status

See the checklist in `PLAN.md` for exactly what's built vs. pending. As of this writing: a real
trained checkpoint (`backend/models_store/model.pt`, 40 epochs, per-class validation Dice
0.83–0.91) and its `metrics.json` are present, so the app runs in **real inference mode**, not
demo mode, against the sample case checked into `backend/data/cases/`. The redesign pass covering
this file's newer sections (viewer interaction, PDF report, loading states, typography) has been
implemented and verified via `tsc --noEmit`, `next build`, and live backend endpoint checks
(`/api/health`, `/predict`, `/report.pdf`) against that sample case — see each section above for
what was actually checked. Visual/interactive verification (the redesign's look, double-click
fullscreen feel, zoom/pan smoothness) still needs a human pass in a real browser at
`localhost:3000`, since no browser-automation tool was available to check that directly.
