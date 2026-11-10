"""Deploy the NeuroScan AI FastAPI backend on Modal (serverless).

The trained checkpoint (model.pt, 27 MB) is baked into the image from
backend/models_store/model.pt. That file is git-ignored and never committed
to the public repo, so no Hugging Face access is needed at runtime: the
backend loads the checkpoint straight from disk and only falls back to demo
mode if the file is missing.

Deploy with:  modal deploy modal_app.py
(from the repo root, so the backend/ paths below resolve)
"""

import modal

app = modal.App("neuroscan-ai-backend")

# The live Vercel frontend that may call this backend from the browser.
FRONTEND_ORIGIN = "https://neuroscan-ai-research.vercel.app"

# Shared persistent storage for case data (uploads, segmentations, statuses).
# Without this, each serverless container has its own throwaway copy of the
# cases, so an upload or a prediction result would vanish when the container
# stops and different containers would disagree. The volume is seeded with
# the two demo cases (upload once with: modal volume put neuroscan-data
# backend/data/cases/<case_id> cases/<case_id>).
data_volume = modal.Volume.from_name("neuroscan-data", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    # CPU-only torch first (same as render.yaml), so requirements.txt below
    # sees torch already satisfied instead of pulling the big CUDA build.
    .pip_install("torch", index_url="https://download.pytorch.org/whl/cpu")
    .pip_install_from_requirements("backend/requirements.txt")
    .env({"NEUROSCAN_CORS_ORIGINS": FRONTEND_ORIGIN})
    .add_local_dir("backend/app", remote_path="/root/backend/app")
    # Trained weights + metrics, baked in privately (never in git).
    .add_local_file(
        "backend/models_store/model.pt",
        remote_path="/root/backend/models_store/model.pt",
    )
    .add_local_file(
        "backend/models_store/metrics.json",
        remote_path="/root/backend/models_store/metrics.json",
    )
)


# Minimal-usage tuning (2026-11-10): the backend scales to zero when idle, so
# it only bills while a visit is actually running. CPU/memory stay at 1 core
# / 2 GB on purpose — cutting them would slow the first load and risks
# running out of memory during a real segmentation. The saving comes from
# max_containers=1 (never spin up parallel copies) and scaledown_window=300
# (stay warm 5 minutes after a visit, so clicks while a professor explores
# are instant, then shut down). Keeping a container warm 24/7 would cost
# roughly $45/month, which the free $1/month credit cannot cover.
@app.function(
    image=image, cpu=1.0, memory=2048, timeout=600,
    scaledown_window=300, max_containers=1,
    volumes={"/root/backend/data": data_volume},
)
@modal.asgi_app()
def fastapi_app():
    import sys

    sys.path.insert(0, "/root/backend")
    from app.main import app as fastapi_app

    return fastapi_app
