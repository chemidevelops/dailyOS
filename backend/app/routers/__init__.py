from app.routers.activities import router as activities_router
from app.routers.generate import router as generate_router
from app.routers.plans import router as plans_router
from app.routers.settings import router as settings_router
from app.routers.tasks import router as tasks_router
from app.routers.categories import router as categories_router
from app.routers.backlog import router as backlog_router
from app.routers.schedule import router as schedule_router
from app.routers.search_router import router as search_router
from app.routers.stats_router import router as stats_router

__all__ = [
    "activities_router", "tasks_router", "plans_router", "settings_router", "generate_router",
    "categories_router", "backlog_router", "schedule_router", "search_router", "stats_router",
]
