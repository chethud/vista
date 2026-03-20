"""Verify Supabase Auth JWTs (HS256) on protected API routes."""

from typing import Annotated, Any, Dict

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

from app.core.config import SUPABASE_JWT_SECRET

_bearer = HTTPBearer(auto_error=False)


def decode_supabase_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a Supabase user access_token (JWT)."""
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server missing SUPABASE_JWT_SECRET — add it from Supabase → Project Settings → API → JWT Secret",
        )
    try:
        # Supabase sets aud to "authenticated" for logged-in users
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def get_current_user_payload(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_supabase_access_token(credentials.credentials)


def get_current_user_id(auth_user: Annotated[Dict[str, Any], Depends(get_current_user_payload)]) -> str:
    uid = auth_user.get("sub")
    if not uid or not isinstance(uid, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return uid
