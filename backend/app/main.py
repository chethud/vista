from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, posts
from app.core.config import CORS_ORIGINS
from app.multilingo.routes import router as multilingo_router

app = FastAPI()

# Browsers: use explicit origins in production (set CORS_ORIGINS on Render). Wildcard "*" disables credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(posts.router, prefix="/posts", tags=["Posts"])
app.include_router(multilingo_router, tags=["MultiLingo"])

_multilingo_static = Path(__file__).resolve().parent.parent / "static" / "multilingo"
_multilingo_static.mkdir(parents=True, exist_ok=True)
app.mount(
    "/ml",
    StaticFiles(directory=str(_multilingo_static), html=True),
    name="multilingo_ui",
)