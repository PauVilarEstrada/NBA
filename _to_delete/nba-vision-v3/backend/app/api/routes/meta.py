from fastapi import APIRouter

from app.core.config import settings
from app.ml.registry import registry

router = APIRouter(tags=["meta"])


@router.get("/health")
def health():
    return {"ok": True, "env": settings.env, "models": registry.status()}


@router.post("/admin/reload-models")
def reload_models():
    """Promote freshly trained artefacts without a redeploy."""
    return registry.load()
