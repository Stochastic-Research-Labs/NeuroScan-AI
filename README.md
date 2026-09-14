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
limit is 2 GB; local operators can adjust it with `NEUROSCAN_MAX_UPLOAD_BYTES`.

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
frontend/    Next.js 14 app (dashboard, upload, viewer, metrics, about)
backend/     FastAPI inference service (preprocessing, 3D U-Net, demo mode)
training/    Kaggle-ready training script matching the backend's model architecture
```
