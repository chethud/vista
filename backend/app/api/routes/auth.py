from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends

from app.core.security import get_current_user_payload

router = APIRouter()


@router.get("/me")
def me(payload: Annotated[Dict[str, Any], Depends(get_current_user_payload)]):
    """Return JWT claims for the current Supabase user (handy for debugging the token)."""
    return {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "aud": payload.get("aud"),
    }
