from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import cases, health, metrics
from app.core.config import APP_VERSION, CORS_ORIGINS

app = FastAPI(
    title="NeuroScan AI backend",
    description="Local inference service for brain tumor segmentation (BraTS 2021 Task 1).",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cases.router)
app.include_router(metrics.router)


@app.get("/")
def root() -> dict:
    return {"name": "NeuroScan AI backend", "docs": "/docs", "health": "/api/health"}
