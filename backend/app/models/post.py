from typing import Any, Optional

from pydantic import BaseModel, model_validator


def _strip_or_none(v: Any) -> Optional[str]:
    if v is None:
        return None
    t = str(v).strip()
    return t or None


class PostCreateRequest(BaseModel):
    """Body for POST /posts — user_id comes from JWT, not the client."""

    content: Optional[str] = None
    image_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_strings(cls, data: Any):
        if not isinstance(data, dict):
            return data
        out = dict(data)
        out["content"] = _strip_or_none(out.get("content"))
        out["image_url"] = _strip_or_none(out.get("image_url"))
        return out

    @model_validator(mode="after")
    def content_or_image_required(self):
        """Match DB constraint: content IS NOT NULL OR image_url IS NOT NULL."""
        if self.content is None and self.image_url is None:
            raise ValueError("Either content or image_url is required")
        return self


# Backwards-compatible alias if other code imports PostCreate
PostCreate = PostCreateRequest
