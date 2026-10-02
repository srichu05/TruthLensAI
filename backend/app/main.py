import os
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import engine, Base
import app.models.user
import app.models.analysis
import app.models.real_article

from app.api.auth import router as auth_router
from app.api.analyzer import router as analyzer_router
from app.api.history import router as history_router
from app.api.real_articles import router as real_articles_router

# Create database tables automatically (deferred if pooler is connecting)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    import logging
    logging.getLogger("uvicorn.error").warning(f"Database schema check deferred: {e}")

is_prod = settings.ENVIRONMENT.strip().lower() in ("production", "prod")
docs_kwargs = {}
if is_prod and not settings.ENABLE_DOCS:
    docs_kwargs = {
        "docs_url": None,
        "redoc_url": None,
        "openapi_url": None,
    }
else:
    docs_kwargs = {
        "openapi_url": f"{settings.API_V1_STR}/openapi.json"
    }

app = FastAPI(
    title=settings.PROJECT_NAME,
    **docs_kwargs
)

# Register slowapi limiter on application state
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Please slow down your requests and try again later.",
            "error": "rate_limit_exceeded"
        },
        headers={"Retry-After": str(exc.detail)}
    )

# Secure CORS configuration: No wildcard "*" in production; support configured origins and Vercel domains
cors_origins = settings.get_cors_origins()
allow_origin_regex = r"^https:\/\/.*\.vercel\.app$" if is_prod else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ([] if is_prod else ["*"]),
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers (supports both /api/* and direct /* paths for maximum frontend compatibility)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(analyzer_router, prefix=settings.API_V1_STR)
app.include_router(history_router, prefix=settings.API_V1_STR)
app.include_router(real_articles_router, prefix=settings.API_V1_STR)

app.include_router(auth_router)
app.include_router(analyzer_router)
app.include_router(history_router)
app.include_router(real_articles_router)

@app.get("/")
def root():
    return {
        "app": "TruthLens AI API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    db_status = "connected"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }

