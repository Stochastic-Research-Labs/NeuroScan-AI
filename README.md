# NeuroScan AI

Brain tumor segmentation on [BraTS 2021 Task 1](https://www.kaggle.com/datasets/dschettler8845/brats-2021-task1) — a local Next.js + FastAPI app with an interactive NIfTI viewer.

**Author:** Hamza Mustafa

Read **`CLAUDE.md`** for the full architecture/decisions and **`PLAN.md`** for build status.

## Quickstart

### One command (recommended)

After completing the one-time setup below, open PowerShell in the project root and run:

```powershell
npm run dev
```

This starts the FastAPI backend and Next.js frontend together. Open
`http://localhost:3000`, and press `Ctrl+C` once to stop both services.

The frontend development command uses Webpack (`next dev --webpack`). This
avoids the false dashboard/upload 404 responses observed with the local
Turbopack development output. After changing the development script, restart
the server so the new bundler takes effect.

### One-time setup

**Backend** (Python 3.10+):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (Node 18+):

```bash
cd frontend
npm install
copy .env.local.example .env.local   # Windows (cp on macOS/Linux)
npm run dev
```

Open **http://localhost:3000**. The app works immediately in **demo mode** (synthetic
segmentation masks) — you don't need a trained model to try the full upload → predict → view
flow.

> **Research use only:** NeuroScan AI is a local visualization and ML-development project. It is
> not a medical device and must not be used for diagnosis, treatment, or clinical decisions.

## Upload safety and DICOM

The app accepts four NIfTI files or one ZIP study. ZIP uploads are checked for unsafe paths,
excessive file counts, expansion size, and suspicious compression ratios. The default total upload
limit in the backend is 2 GB; local operators can adjust it with `NEUROSCAN_MAX_UPLOAD_BYTES`.
The browser upload form has a 120 MB total-file limit to remain below the Next.js proxy's
128 MB request limit (including multipart overhead).

For DICOM, upload one ZIP containing four series whose DICOM **Series Description**, **Protocol
Name**, or folder name identifies `T1`, `T1CE`, `T2`, and `FLAIR`. The backend converts those
series to temporary NIfTI files and does not retain the source DICOM metadata after import.

## Bringing in your trained model

1. Train on Kaggle with `training/train_brats.py` against the unzipped BraTS 2021 dataset.
2. Download the resulting `model.pt` and `metrics.json` from the Kaggle notebook's output.
3. Copy both files into `backend/models_store/`.
4. Restart the backend (`uvicorn ...`). The app automatically switches out of demo mode.

## Project layout

```
frontend/    Next.js 16 App Router app (3D landing, dashboard, upload, viewer, metrics, about)
backend/     FastAPI inference service (preprocessing, 3D U-Net, demo mode)
training/    Kaggle-ready training script matching the backend's model architecture
```

## Immersive frontend (October 2026)

Run both services with `npm run dev` from the project root. The existing Python environment
and frontend dependencies must be installed first. If updating an older checkout, run
`npm install` inside `frontend` once before starting.

Routes:

- `/`: public-facing introduction, scroll-linked 3D brain and research workflow.
- `/dashboard`: backend health and existing local cases (the former home dashboard).
- `/upload`: named case upload with modality validation.
- `/cases/[caseId]`: original MRI / segmentation comparison, controls and exports.
- `/metrics`: recorded training metrics, not per-patient confidence.
- `/about`: project team, limitations and 3D asset attribution.

### Component architecture

```text
frontend/
  app/
    layout.tsx                       Poppins via next/font/local; shared app shell
    globals.css                      Navy tokens, glass panels, responsive story layout
    page.tsx                         Landing entry point
    dashboard/page.tsx               Local research workspace
    upload/page.tsx                  Upload page and preparation guidance
    cases/[caseId]/page.tsx           Existing case route
  components/
    landing/
      LandingExperience.tsx          Scroll narrative and accessible motion toggle
      BrainScene.tsx                 R3F Canvas, drei GLB loader, GSAP ScrollTrigger
    upload/
      UploadDropzone.tsx              Real multipart upload, required name, validation
      ScanningState.tsx               Framer Motion indeterminate request animation
    viewer/
      ComparisonViewer.tsx           Linked original/overlay viewers and mode switch
      NiivueViewer.tsx                Actual NIfTI rendering and WebGL lifecycle
      ViewerControls.tsx             Modality, layout, opacity and overlay controls
      ClassLegend.tsx                Actual predicted sub-region volumes
    cases/CaseDetailClient.tsx        Real prediction request, report and result states
    dashboard/                       Existing health and case-list API consumers
    layout/                          Navbar and project-team footer
  lib/upload-validation.ts           Pure file/name validation helpers
  lib/brain-model.ts                 Atlas category inheritance for multi-material meshes
  public/
    models/brain.glb                  Bundled anatomical illustration
    models/ATTRIBUTION.txt            Model source, author and CC BY-SA license
    draco/                           Local glTF decoder, license and authors
    fonts/Poppins-OFL.txt             Poppins license notice
  scripts/test-ui.cjs                 Upload and asset regression checks
  tailwind.config.ts                 Semantic navy/cyan colors and Poppins font family
```

### 3D model placement and replacement

The model is already included at **`frontend/public/models/brain.glb`**, served as
`/models/brain.glb`. No additional model download is required to run the app. The original
asset is from [Brain Project](https://github.com/itayinbarr/brainproject), credited to
Z-Anatomy contributors and BodyParts3D / DBCLS under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Keep its attribution file
when distributing it. This illustration is not generated from a user's MRI.

To replace it, use a licensed, static, indexed glTF 2.0 brain mesh at the same path.
The component centers and scales the model automatically. For the included atlas it selects
cortex, cerebellum and brainstem and merges them into one geometry. Plain replacement models
without atlas category metadata include all meshes. Prefer a similarly bounded polycount and
file size; models with rigs, animation, external textures, or different compression require
loader changes. For a `.gltf` source, update the loader URL and retain its referenced `.bin`
and texture files beside it. Keep `/public/draco/` for Draco-compressed GLBs.

ScrollTrigger scrubs rotation, scale and solid/wireframe/point opacity across the narrative.
R3F uses demand rendering and capped device-pixel ratio. The scene is loaded only on the
landing route. Reduced motion disables scroll animation; a pause control is also available.
WebGL or asset failures show a non-blocking fallback. Fonts and decoder assets are self-hosted.
React 19 / R3F 9 / drei 10 are aligned with Next 16's App Router runtime.

The 12 October 2026 update adds a reversible **brain → neuron → brain** scroll journey.
`components/landing/NeuronModel.tsx` builds a lightweight procedural neuron with dendrites,
a cell body, an axon and scroll-linked signal lights; no extra model download is required.
`lib/brain-journey.ts` defines the bounded zoom/crossfade phases, covered by regression tests.
The neuron is an educational visual metaphor, not a patient reconstruction, biological-scale
zoom or measured neural activity. The final view returns to the brain's wireframe/point style.
Pause and live reduced-motion preferences stop the motion. Rendering remains demand-driven:
signal lights advance with scroll, not an always-running animation loop.

### Upload and result behavior

This remains a **3D volumetric model**, not a 2D JPG/PNG model. Select all four NIfTI modalities,
or one complete ZIP. A non-blank case name is mandatory. ZIP contents are verified by the
backend; selecting a ZIP does not claim its modalities have already been validated.

The scanning animation is shown only while the real upload or prediction request is pending.
It is an activity indicator, not a percentage, elapsed-stage estimate or simulated result.
After upload, run segmentation from the case viewer. Original and overlay panels share modality,
layout and NiiVue's 2D/3D synchronization. Single-view mode is available on smaller displays.
The legend reports actual predicted volumes. Confidence is explicitly **not estimated** because
the backend supplies no calibrated uncertainty scores. Segmentation colors retain their existing
meaning across the viewer and PDF, using cyan for NCR, yellow for edema and magenta for ET.

The UI redesign does not retrain the model, fix its central-crop limitation, establish clinical
validity or replace the synthetic-fallback/provenance improvements identified in the ML audit.

### Frontend checks

```powershell
cd frontend
npm run test:ui
npx tsc --noEmit
npm run build
```

Also verify in a WebGL2-capable browser: desktop and 375px layouts, keyboard navigation,
reduced motion, pause/resume, all scroll transitions, upload rejection/error states,
and both linked MRI panels. Build/HTTP checks do not substitute for these browser checks.

Verification completed on 11 October 2026: all 21 UI regression checks, TypeScript checking,
and the production build passed. The production dependency audit reported zero vulnerabilities.
Production routes, the brain asset, Draco decoder and proxied backend health returned HTTP 200.
Browser checks covered desktop/mobile layouts, brain rendering and scroll transitions,
pause/resume, required-name gating, navigation, and existing-case MRI comparison with linked
zoom, modality changes, region toggles and single-view mode. No new case upload or inference
was run, and no clinical validation is implied. Reduced-motion behavior and a complete
keyboard accessibility audit remain manual verification items.
