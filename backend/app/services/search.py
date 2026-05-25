"""External API search service."""
import html
import re
import time
from typing import Optional

import httpx

from app.schemas.backlog import SearchResult

# Twitch token cache
_twitch_token: Optional[str] = None
_twitch_token_expires: float = 0.0

TWITCH_CLIENT_ID = "reiyhj0ey946twkrfnlqacbwfav3v6"
TWITCH_CLIENT_SECRET = "ttyy4gjxy9pc2m46pi1zraw9hc0c74"


def _strip_html(text: str | None) -> str | None:
    if not text:
        return None
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    return text.strip() or None


async def _get_twitch_token() -> str:
    global _twitch_token, _twitch_token_expires
    if _twitch_token and time.time() < _twitch_token_expires - 60:
        return _twitch_token
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://id.twitch.tv/oauth2/token",
            params={
                "client_id": TWITCH_CLIENT_ID,
                "client_secret": TWITCH_CLIENT_SECRET,
                "grant_type": "client_credentials",
            }
        )
        resp.raise_for_status()
        data = resp.json()
        _twitch_token = data["access_token"]
        _twitch_token_expires = time.time() + data["expires_in"]
        return _twitch_token


async def search_series(q: str) -> list[SearchResult]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"https://api.tvmaze.com/search/shows?q={q}")
        if resp.status_code != 200:
            return []
        results = []
        for entry in resp.json()[:5]:
            show = entry.get("show", {})
            results.append(SearchResult(
                external_id=str(show.get("id", "")),
                title=show.get("name", ""),
                synopsis=_strip_html(show.get("summary")),
                image_url=(show.get("image") or {}).get("medium"),
                total_units=None,
                source="tvmaze",
            ))
        return results


async def search_anime_manga(q: str, media_type: str) -> list[SearchResult]:
    """media_type: ANIME or MANGA"""
    gql = """
    query ($search: String, $type: MediaType) {
      Page(perPage: 5) {
        media(search: $search, type: $type) {
          id
          title { romaji english }
          description
          coverImage { medium }
          episodes
          chapters
        }
      }
    }
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://graphql.anilist.co",
            json={"query": gql, "variables": {"search": q, "type": media_type}},
        )
        if resp.status_code != 200:
            return []
        items = resp.json().get("data", {}).get("Page", {}).get("media", [])
        results = []
        for item in items:
            title = item.get("title", {})
            results.append(SearchResult(
                external_id=str(item.get("id", "")),
                title=title.get("english") or title.get("romaji") or "",
                synopsis=_strip_html(item.get("description")),
                image_url=(item.get("coverImage") or {}).get("medium"),
                total_units=item.get("episodes") or item.get("chapters"),
                source="anilist",
            ))
        return results


async def search_book(q: str) -> list[SearchResult]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"https://openlibrary.org/search.json?q={q}&limit=5")
        if resp.status_code != 200:
            return []
        docs = resp.json().get("docs", [])
        results = []
        for doc in docs[:5]:
            cover_i = doc.get("cover_i")
            image_url = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else None
            first_sentence = doc.get("first_sentence")
            if isinstance(first_sentence, list):
                first_sentence = first_sentence[0] if first_sentence else None
            results.append(SearchResult(
                external_id=doc.get("key", ""),
                title=doc.get("title", ""),
                synopsis=first_sentence,
                image_url=image_url,
                total_units=doc.get("number_of_pages_median"),
                source="openlibrary",
            ))
        return results


async def search_game(q: str) -> list[SearchResult]:
    try:
        token = await _get_twitch_token()
    except Exception:
        return []
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.igdb.com/v4/games",
            headers={
                "Client-ID": TWITCH_CLIENT_ID,
                "Authorization": f"Bearer {token}",
            },
            content=f'search "{q}"; fields name,summary,cover.url,total_rating; limit 5;',
        )
        if resp.status_code != 200:
            return []
        results = []
        for game in resp.json():
            cover = game.get("cover", {})
            image_url = None
            if cover and cover.get("url"):
                image_url = cover["url"].replace("t_thumb", "t_cover_big")
                if image_url.startswith("//"):
                    image_url = "https:" + image_url
            results.append(SearchResult(
                external_id=str(game.get("id", "")),
                title=game.get("name", ""),
                synopsis=game.get("summary"),
                image_url=image_url,
                total_units=None,
                source="igdb",
            ))
        return results


async def search(q: str, category_type: str) -> list[SearchResult]:
    match category_type:
        case "series":
            return await search_series(q)
        case "anime":
            return await search_anime_manga(q, "ANIME")
        case "manga":
            return await search_anime_manga(q, "MANGA")
        case "book":
            return await search_book(q)
        case "game":
            return await search_game(q)
        case _:
            return []
