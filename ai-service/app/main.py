from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.db.pool import close_pool


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    close_pool()


app = FastAPI(title="QuetzLearn AI Service", version="1.0.0", lifespan=lifespan)
app.include_router(router)


@app.get("/health")
async def root_health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}
