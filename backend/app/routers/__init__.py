from app.routers.activities import router as activities_router
from app.routers.generate import router as generate_router
from app.routers.plans import router as plans_router
from app.routers.settings import router as settings_router
from app.routers.tasks import router as tasks_router

__all__ = ["activities_router", "tasks_router", "plans_router", "settings_router", "generate_router"]
