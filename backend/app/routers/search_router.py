from fastapi import APIRouter

from app.schemas.backlog import SearchResult
from app.services.search import search as do_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResult])
async def search_external(q: str, type: str = "series"):
    try:
        return await do_search(q, type)
    except Exception:
        return []
