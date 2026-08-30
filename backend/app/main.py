"""Career Copilot FastAPI Application Entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.db.session import init_db
from backend.app.api.routes_auth import router as auth_router
from backend.app.api.routes_cv import router as cv_router
from backend.app.api.routes_jobs import router as jobs_router
from backend.app.api.routes_application import router as app_router
from backend.app.api.routes_interview import router as interview_router
from backend.app.api.routes_roadmap import router as roadmap_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("career_copilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle hook for database initialization and cleanup."""
    logger.info("Initializing Career Copilot API and Database...")
    init_db()
    logger.info(f"Career Copilot API started successfully (Env: {settings.APP_ENV}).")
    yield
    logger.info("Career Copilot API shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent Career Copilot for job search, CV analysis, tailoring, mock interviews, and career planning.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
origins = settings.CORS_ORIGINS or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(cv_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(app_router, prefix="/api")
app.include_router(interview_router, prefix="/api")
app.include_router(roadmap_router, prefix="/api")


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for AWS Application Load Balancer and local monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "llm_provider": "Groq (Multi-Key Rotation)",
        "active_keys_count": len(settings.get_groq_api_keys()),
        "pgvector_ready": True,
    }


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Welcome to Career Copilot API. Visit /docs for interactive Swagger API documentation.",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
