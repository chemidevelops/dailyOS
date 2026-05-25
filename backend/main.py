from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import (
    activities_router, generate_router, plans_router, settings_router, tasks_router,
    categories_router, backlog_router, schedule_router, search_router, stats_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="DailyOS API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(activities_router, prefix=API_PREFIX)
app.include_router(tasks_router,      prefix=API_PREFIX)
app.include_router(plans_router,      prefix=API_PREFIX)
app.include_router(settings_router,   prefix=API_PREFIX)
app.include_router(generate_router,   prefix=API_PREFIX)
app.include_router(categories_router, prefix=API_PREFIX)
app.include_router(backlog_router,    prefix=API_PREFIX)
app.include_router(schedule_router,   prefix=API_PREFIX)
app.include_router(search_router,     prefix=API_PREFIX)
app.include_router(stats_router,      prefix=API_PREFIX)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}
