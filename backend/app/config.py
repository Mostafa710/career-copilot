"""Configuration settings for Career Copilot backend."""

from typing import Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Career Copilot API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "super-secret-career-copilot-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgrespassword@localhost:5432/career_copilot"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # LLM Providers (Multi-Key Groq with Round-Robin Load Balancing)
    GROQ_API_KEY_1: Optional[str] = None
    GROQ_API_KEY_2: Optional[str] = None
    GROQ_API_KEY_3: Optional[str] = None
    GROQ_API_KEY_4: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None  # Backward compatibility alias for GROQ_API_KEY_1
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    def get_groq_api_keys(self) -> list[str]:
        """Collect all configured Groq API keys in order without duplicates."""
        keys = []
        for k in [self.GROQ_API_KEY_1, self.GROQ_API_KEY, self.GROQ_API_KEY_2, self.GROQ_API_KEY_3, self.GROQ_API_KEY_4]:
            if k and k.strip() and not k.startswith("your_") and k not in keys:
                keys.append(k.strip())
        return keys

    # Embedding Model Settings (Free Local HuggingFace default, CPU-optimized for AWS Free Tier)
    EMBEDDING_PROVIDER: str = "huggingface"  # "huggingface" or "openai"
    HUGGINGFACE_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Job & Web Search APIs (RapidAPI JSearch for LinkedIn/Indeed, Wuzzuf & Bayt Scrapers, Tavily Fallback)
    RAPIDAPI_KEY: Optional[str] = None
    RAPIDAPI_JSEARCH_HOST: str = "jsearch.p.rapidapi.com"
    TAVILY_API_KEY: Optional[str] = None

    # LangSmith Observability
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_PROJECT: str = "career-copilot"

    # Storage (Local Filesystem or S3)
    STORAGE_TYPE: str = "local"  # "local" or "s3"
    LOCAL_STORAGE_DIR: str = "./storage"
    AWS_S3_BUCKET: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://career-copilot.vercel.app",
    ]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalize_debug_mode(cls, value):
        """Accept common deployment labels without crashing boolean settings parsing."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev"}:
                return True
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
