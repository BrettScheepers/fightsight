from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

app = FastAPI(
    title="FightSight CV Service",
    description="Computer Vision service for combat sport video analysis using MediaPipe",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "name": "FightSight CV Service",
        "version": "0.1.0",
        "description": "Computer Vision analysis using MediaPipe",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration"""
    return {
        "status": "healthy",
        "service": "cv-service",
        "timestamp": datetime.utcnow().isoformat(),
        "mediapipe": "ready"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
