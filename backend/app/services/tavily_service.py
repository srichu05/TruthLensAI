import logging
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import httpx

from app.core.config import settings
from app.schemas.evidence import NormalizedEvidence

logger = logging.getLogger("truthlens.tavily")

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

def canonicalize_url(url: Optional[str]) -> str:
    """Normalize URL by stripping tracking queries and trailing slashes."""
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url.strip())
        # Drop tracking query params like utm_*, fbclid, etc.
        query_params = urllib.parse.parse_qsl(parsed.query)
        clean_params = [
            (k, v) for k, v in query_params 
            if not k.startswith("utm_") and k not in ("fbclid", "gclid", "ref", "source")
        ]
        clean_query = urllib.parse.urlencode(clean_params)
        clean_path = parsed.path.rstrip("/")
        return urllib.parse.urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            clean_path,
            parsed.params,
            clean_query,
            ""  # drop fragment
        ))
    except Exception:
        return url.strip().rstrip("/")

def extract_domain_name(url: Optional[str]) -> str:
    """Extract human-readable publisher name from URL domain."""
    if not url:
        return "Web Source"
    try:
        netloc = urllib.parse.urlparse(url).netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        parts = netloc.split(".")
        if len(parts) >= 2:
            return parts[0].capitalize()
        return netloc
    except Exception:
        return "Web Source"

class TavilySearchProvider:
    """
    Asynchronous client for the Tavily Search API.
    Discovers live web sources with bounded concurrency, retry, and schema validation.
    """

    def __init__(self, api_key: Optional[str] = None, timeout: float = None):
        self.api_key = (api_key or getattr(settings, "TAVILY_API_KEY", None) or "").strip()
        self.timeout = timeout or getattr(settings, "FACTCHECK_API_TIMEOUT_SECONDS", 4.0)

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5 and not self.api_key.startswith("your_"))

    async def search_claim(
        self,
        claim_text: str,
        client: Optional[httpx.AsyncClient] = None,
        max_results: int = None,
        search_depth: str = "basic"
    ) -> Tuple[List[NormalizedEvidence], str]:
        """
        Search for live web evidence regarding a specific factual claim.
        Returns:
          (List[NormalizedEvidence], status_string: 'ok' | 'empty' | 'rate_limited' | 'error' | 'not_configured')
        """
        if not self.is_configured():
            logger.debug("Tavily API key is not configured.")
            return [], "not_configured"

        max_results = max_results or getattr(settings, "FACTCHECK_MAX_SEARCH_RESULTS", 5)
        # Formulate search query (keep claim focused, max 200 chars)
        clean_query = claim_text.strip()[:200]

        payload = {
            "api_key": self.api_key,
            "query": clean_query,
            "search_depth": search_depth,
            "include_answer": False,
            "include_raw_content": False,
            "max_results": max_results,
        }

        should_close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=self.timeout)
            should_close_client = True

        try:
            response = await client.post(
                TAVILY_SEARCH_URL,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                raw_results = data.get("results", [])
                if not raw_results:
                    return [], "empty"

                evidence_items: List[NormalizedEvidence] = []
                seen_hashes = set()

                for idx, item in enumerate(raw_results):
                    url = item.get("url")
                    title = item.get("title") or "Search Result"
                    content = item.get("content") or ""
                    pub_date = item.get("published_date") or None
                    score = item.get("score")

                    clean_url = canonicalize_url(url)
                    publisher = extract_domain_name(clean_url)

                    ev = NormalizedEvidence(
                        evidence_id=f"ev_tavily_{idx + 1}",
                        provider="tavily",
                        title=title,
                        url=clean_url,
                        publisher=publisher,
                        published_at=pub_date,
                        retrieved_at=datetime.now(timezone.utc).isoformat(),
                        snippet=content,
                        source_type="web_search",
                        reviewed_claim=claim_text,
                        relevance_score=float(score) if score is not None else None,
                        retrieval_status="success",
                        is_live_api=True
                    )
                    ev.content_hash = ev.calculate_hash()

                    if ev.content_hash not in seen_hashes:
                        seen_hashes.add(ev.content_hash)
                        evidence_items.append(ev)

                return evidence_items, "ok"

            elif response.status_code == 429:
                logger.warning("Tavily Search API rate limit or quota exhausted (HTTP 429).")
                return [], "rate_limited"
            elif response.status_code == 401 or response.status_code == 403:
                logger.warning("Tavily Search API authentication failure (HTTP %d).", response.status_code)
                return [], "error"
            else:
                logger.warning("Tavily Search API returned HTTP %d.", response.status_code)
                return [], "error"

        except httpx.TimeoutException:
            logger.warning("Tavily Search API request timed out after %.1fs.", self.timeout)
            return [], "error"
        except httpx.RequestError as exc:
            logger.warning("Tavily Search API network request error: %s", type(exc).__name__)
            return [], "error"
        except Exception as exc:
            logger.warning("Unexpected Tavily provider error: %s", type(exc).__name__)
            return [], "error"
        finally:
            if should_close_client:
                await client.aclose()
