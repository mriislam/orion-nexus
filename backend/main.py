from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging

from core.config import settings
# AES middleware removed
from routers import api_v1, auth, devices, ssl, diagnostics, uptime, network_diagnostics, gcp, gcp_services, analytics, streams, firebase_analytics
from core.database import init_db
from tasks.analytics_scheduler import start_analytics_scheduler, stop_analytics_scheduler
from tasks.gcp_scheduler import start_gcp_scheduler, stop_gcp_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await start_analytics_scheduler()
    await start_gcp_scheduler()
    yield
    # Shutdown
    await stop_analytics_scheduler()
    await stop_gcp_scheduler()


app = FastAPI(
    title="Nexus Monitoring Portal",
    description="A unified network and application monitoring portal",
    version="1.0.1",
    lifespan=lifespan
)

# Add validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error for {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AES encryption middleware removed

# Include routers
app.include_router(api_v1.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(devices.router, prefix="/api/v1/devices", tags=["devices"])
app.include_router(ssl.router, prefix="/api/v1/ssl", tags=["ssl"])
app.include_router(diagnostics.router, prefix="/api/v1/diagnostics", tags=["diagnostics"])
app.include_router(uptime.router, prefix="/api/v1", tags=["uptime"])
app.include_router(network_diagnostics.router, prefix="/api/v1", tags=["network-diagnostics"])
app.include_router(gcp.router, prefix="/api/v1", tags=["gcp-integration"])
app.include_router(gcp_services.router, prefix="/api/v1/gcp", tags=["gcp-services"])
app.include_router(analytics.router, prefix="/api/v1", tags=["google-analytics"])
app.include_router(firebase_analytics.router, prefix="/api/v1", tags=["firebase-analytics"])
app.include_router(streams.router, prefix="/api/v1", tags=["streams"])


@app.get("/")
async def root():
    return {"message": "Nexus Monitoring Portal API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )