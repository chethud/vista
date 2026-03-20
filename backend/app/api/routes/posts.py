from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_id
from app.models.post import PostCreateRequest
from app.services.post_service import create_post, get_posts

router = APIRouter()


@router.post("/")
def add_post(
    post: PostCreateRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Create a post; `user_id` is taken from the Supabase JWT (`sub`), not the request body."""
    try:
        payload = {**post.model_dump(exclude_none=True), "user_id": user_id}
        res = create_post(payload)
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/")
def fetch_posts(_user_id: Annotated[str, Depends(get_current_user_id)]):
    """List posts (requires a valid Supabase access_token)."""
    try:
        res = get_posts()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e