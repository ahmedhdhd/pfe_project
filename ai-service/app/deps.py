from fastapi import Header, HTTPException

from app.config import settings


def verify_internal_token(x_internal_token: str = Header(default="")) -> None:
    expected = settings.ai_service_internal_token.strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="AI service internal token is not configured",
        )
    if x_internal_token != expected:
        raise HTTPException(status_code=401, detail="Invalid internal token")
