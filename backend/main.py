from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from config import Config
import os
from routes import webhook, restaurants, orders, menu, auth, analytics
# landing removed - frontend handles landing page
from utils.logger import setup_logger

setup_logger()

app = FastAPI(
    title="Voice Order System API",
    description="Restaurant order management system",
    version="1.0.0",
    # Removed root_path="/api" to avoid double /api in paths
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify frontend IP/domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Landing page routes removed - now handled by frontend only
# from routes.landing import router as landing_router, api_router as landing_api_router
# app.include_router(landing_router)  # Removed - frontend handles this

# API routes
app.include_router(webhook.router)
app.include_router(restaurants.router)
app.include_router(orders.router)
app.include_router(menu.router)
app.include_router(auth.router)
app.include_router(analytics.router)

# Serve uploaded images
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
# Landing page routes removed - frontend handles /admin-dashboard

@app.get("/api")
async def root():
    return {
        "message": "Voice Order System API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "voice-order-system"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=Config.PORT)
