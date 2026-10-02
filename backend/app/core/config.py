import os
import tempfile
import warnings
from pathlib import Path
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent

# In serverless environments like Vercel, the app directory is read-only.
# Use the writable temp directory for SQLite fallback when DATABASE_URL is not set.
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DEFAULT_DB_PATH = Path(tempfile.gettempdir()) / "truthlens.db"
else:
    DEFAULT_DB_PATH = BASE_DIR / "truthlens.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "TruthLens AI Backend"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"  # "development" | "production" | "testing"
    
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database configuration - defaults to PostgreSQL URL if configured in .env, with SQLite fallback
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"

    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Rate Limiting configuration (requests per window)
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_SIGNUP: str = "5/minute"
    RATE_LIMIT_ANALYZE: str = "20/minute"
    RATE_LIMIT_UPLOAD: str = "10/minute"

    # CORS and Frontend URL configuration
    CORS_ORIGINS: str = ""  # Comma-separated list of origins
    FRONTEND_URL: Optional[str] = None

    # OpenAPI documentation toggle (disabled by default in production)
    ENABLE_DOCS: bool = False

    # Optional LLM / FactCheck API keys
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_FACTCHECK_API_KEY: Optional[str] = None

    # Fact-checking Cache & Timeout parameters
    FACTCHECK_CACHE_TTL_SECONDS: int = 86400  # 24 hours
    FACTCHECK_API_TIMEOUT_SECONDS: float = 4.0  # 4 seconds max to keep API responsive

    def get_cors_origins(self) -> list[str]:
        origins = set()
        is_prod = self.ENVIRONMENT.strip().lower() in ("production", "prod")
        if not is_prod:
            origins.update([
                "http://localhost:5173",
                "http://localhost:8443",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:8443",
                "http://127.0.0.1:3000",
            ])
        if self.CORS_ORIGINS:
            for o in self.CORS_ORIGINS.split(","):
                o_clean = o.strip()
                if o_clean:
                    origins.add(o_clean)
        if self.FRONTEND_URL:
            origins.add(self.FRONTEND_URL.strip().rstrip("/"))
        return sorted(list(origins))

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(str(BASE_DIR / ".env"), str(ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_environment_and_secrets(self) -> "Settings":
        # Normalize postgres URLs (e.g. Supabase / Render / Heroku postgres:// -> postgresql+psycopg2://)
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgres://"):
                self.DATABASE_URL = self.DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
            elif self.DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in self.DATABASE_URL:
                self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

        is_prod = self.ENVIRONMENT.strip().lower() in ("production", "prod")
        insecure_keys = (
            "truthlens_super_secret_jwt_key_development_change_in_production",
            "your_strong_random_secret_key_here",
            "change_me_in_production",
            "secret",
            "password",
        )

        # Sync SUPABASE_JWT_SECRET and SECRET_KEY
        if self.SUPABASE_JWT_SECRET and not self.SECRET_KEY:
            self.SECRET_KEY = self.SUPABASE_JWT_SECRET
        elif self.SECRET_KEY and not self.SUPABASE_JWT_SECRET:
            self.SUPABASE_JWT_SECRET = self.SECRET_KEY

        if is_prod:
            effective_key = self.SUPABASE_JWT_SECRET or self.SECRET_KEY
            if not effective_key or effective_key.strip() == "" or effective_key.strip() in insecure_keys:
                raise RuntimeError(
                    "CRITICAL CONFIGURATION ERROR: SUPABASE_JWT_SECRET / SECRET_KEY is missing or insecure in production mode. "
                    "Please set your Supabase JWT Secret in your .env file or environment variables."
                )
            if "sqlite" in self.DATABASE_URL.lower():
                warnings.warn(
                    "[PRODUCTION WARNING] SQLite detected in production mode. "
                    "Configure DATABASE_URL with a Supabase PostgreSQL connection string for production persistence.",
                    RuntimeWarning,
                    stacklevel=2
                )
        else:
            if not self.SECRET_KEY or self.SECRET_KEY.strip() == "":
                self.SECRET_KEY = "truthlens_dev_jwt_secret_key_change_in_production"
                if not self.SUPABASE_JWT_SECRET:
                    self.SUPABASE_JWT_SECRET = self.SECRET_KEY
        return self


settings = Settings()
