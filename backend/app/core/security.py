"""Security: API Key validation"""

from fastapi import Header, HTTPException
from app.core.config import settings


async def require_api_key(authorization: str = Header(None)) -> bool:
    """Validasi API key dari header Authorization: Bearer <key>"""
    if not settings.API_KEY:
        return True  # No key configured = open access

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization format. Use: Bearer <key>")

    if parts[1] != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return True
