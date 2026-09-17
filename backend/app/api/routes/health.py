from fastapi import APIRouter

from app.core.config import APP_VERSION
from app.schemas import HealthStatus
from app.services.inference import get_model_status

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthStatus)
def health() -> HealthStatus:
    status = get_model_status()
    return HealthStatus(version=APP_VERSION, **status)
