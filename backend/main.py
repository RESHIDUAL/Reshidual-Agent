import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.models.database import DatabaseManager
from backend.routers import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.main")

async def ledger_monitor_task():
    try:
        while True:
            await asyncio.sleep(60)
    except asyncio.CancelledError:
        logger.info("Ledger monitor stopped.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    db_manager = DatabaseManager()
    await db_manager.init_db()
    
    from backend.dependencies import get_privacy_ledger, get_moss_engine
    ledger = await get_privacy_ledger()
    try:
        await ledger.start_monitoring()
    except Exception as e:
        logger.warning(f"Ledger monitoring start warning: {e}")
        
    try:
        moss_eng = await get_moss_engine()
        await moss_eng.initialize()
    except Exception as e:
        logger.warning(f"Moss engine deferred initialization: {e}")
    
    logger.info("Reshidual Agent API started using Python/FastAPI with official Moss SDK")
    
    yield
    
    try:
        await ledger.stop_monitoring()
    except Exception as e:
        logger.warning(f"Ledger stop error: {e}")
    
    logger.info("Reshidual Agent API shutting down")

app = FastAPI(
    title="Reshidual Agent API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:1420",
        "tauri://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
async def root_endpoint():
    return {
        "name": "Reshidual Agent",
        "version": "1.0.0",
        "status": "operational"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

if __name__ == "__main__":
    import uvicorn
    from backend.config import get_settings
    settings = get_settings()
    uvicorn.run(app, host="127.0.0.1", port=settings.API_PORT)