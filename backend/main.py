from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config
from routes import webhook, restaurants, orders, menu, menu
from utils.logger import setup_logger

setup_logger()

app = FastAPI(
    title="Voice Order System API",
    description="Restaurant order management system",
    version="1.0.0",
    root_path="/api",  # This is the key part
    docs_url="/docs",  # Now available at /api/docs
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify frontend IP/domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All routes mounted under /api
app.include_router(webhook.router)
app.include_router(restaurants.router)
app.include_router(orders.router)
app.include_router(menu.router)

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
