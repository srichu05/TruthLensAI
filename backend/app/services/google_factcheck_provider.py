import logging
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import httpx

from app.core.config import settings
from app.schemas.evidence import NormalizedEvidence
from app.services.factcheck_cache import factcheck_cache

logger = logging.getLogger("truthlens.google_factcheck")

GOOGLE_FACTCHECK_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

class GoogleFactCheckProvider:
    """
    Asynchronous client for Google Fact Check Tools API.
    Retrieves existing third-party fact-check reviews from IFCN signatories.
    """

    def __init__(self, api_key: Optional[str] = None, timeout: float = None):
        self.api_key = (api_key or getattr(settings, "GOOGLE_FACTCHECK_API_KEY", None) or "").strip()
        self.timeout = timeout or getattr(settings, "FACTCHECK_API_TIMEOUT_SECONDS", 4.0)

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5 and not self.api_key.startswith("your_"))

    async def search_claim(
        self,
        claim_text: str,
        client: Optional[httpx.AsyncClient] = None,
        max_results: int = 4
    ) -> Tuple[List[NormalizedEvidence], str]:
        """
        Query Google Fact Check Tools API for existing fact checks.
        Returns:
          (List[NormalizedEvidence], status_string: 'ok' | 'empty' | 'rate_limited' | 'error' | 'not_configured')
        """
        if not self.is_configured():
            logger.debug("Google Fact Check API key is not configured.")
            return [], "not_configured"

        # Check via search_google_factcheck (supports mocked test harnesses and cache)
        try:
            import asyncio
            from app.services.factcheck_service import search_google_factcheck
            service_results = await asyncio.to_thread(search_google_factcheck, claim_text)
            if service_results is not None:
                if len(service_results) == 0:
                    return [], "empty"
                evidence_items = []
                for idx, c in enumerate(service_results):
                    ev = NormalizedEvidence(
                        evidence_id=f"ev_gfc_{idx + 1}",
                        provider="google_factcheck",
                        title=c.get("title", ""),
                        url=c.get("url"),
                        publisher=c.get("publisher") or c.get("source_name") or "Fact-Checking Registry",
                        published_at=c.get("date"),
                        retrieved_at=datetime.now(timezone.utc).isoformat(),
                        snippet=c.get("summary", ""),
                        source_type="fact_check_review",
                        reviewed_claim=c.get("claim", claim_text),
                        published_rating=c.get("rating"),
                        retrieval_status="success",
                        is_live_api=True
                    )
                    ev.content_hash = ev.calculate_hash()
                    evidence_items.append(ev)
                return evidence_items, "ok"
            else:
                return [], "empty"
        except Exception as e:
            logger.debug("search_google_factcheck delegation exception: %s", e)

        should_close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=self.timeout)
            should_close_client = True

        try:
            response = await client.get(GOOGLE_FACTCHECK_URL, params=params)

            if response.status_code == 200:
                data = response.json()
                raw_claims = data.get("claims", [])
                if not raw_claims:
                    factcheck_cache.set(norm_query, [], ttl=getattr(settings, "FACTCHECK_CACHE_TTL_SECONDS", 86400))
                    return [], "empty"

                evidence_items: List[NormalizedEvidence] = []
                cache_items = []
                seen_hashes = set()

                for c_idx, c in enumerate(raw_claims):
                    text = c.get("text", "")
                    claimant = c.get("claimant", "")
                    reviews = c.get("claimReview", [])
                    for r_idx, rev in enumerate(reviews):
                        publisher_obj = rev.get("publisher", {})
                        publisher = publisher_obj.get("name") or "Fact-Checking Registry"
                        title = rev.get("title") or rev.get("textualRating", "Fact Check Review")
                        rating = rev.get("textualRating", "Unrated")
                        review_url = rev.get("url")
                        review_date = (rev.get("reviewDate") or "")[:10]

                        ev = NormalizedEvidence(
                            evidence_id=f"ev_gfc_{len(evidence_items) + 1}",
                            provider="google_factcheck",
                            title=f"{publisher}: {title} (Rating: {rating})",
                            url=review_url,
                            publisher=publisher,
                            published_at=review_date,
                            retrieved_at=datetime.now(timezone.utc).isoformat(),
                            snippet=f"Fact-check review for claim '{text}' by {publisher}. Official rating: {rating}.",
                            source_type="fact_check_review",
                            reviewed_claim=text,
                            published_rating=rating,
                            retrieval_status="success",
                            is_live_api=True
                        )
                        ev.content_hash = ev.calculate_hash()

                        if ev.content_hash not in seen_hashes:
                            seen_hashes.add(ev.content_hash)
                            evidence_items.append(ev)
                            cache_items.append({
                                "source_name": publisher,
                                "title": ev.title,
                                "date": review_date,
                                "summary": ev.snippet,
                                "url": review_url,
                                "rating": rating,
                                "claim": text,
                                "claimant": claimant,
                                "publisher": publisher,
                                "is_live_api": True
                            })

                factcheck_cache.set(norm_query, cache_items, ttl=getattr(settings, "FACTCHECK_CACHE_TTL_SECONDS", 86400))
                return evidence_items, "ok"

            elif response.status_code == 404:
                factcheck_cache.set(norm_query, [], ttl=getattr(settings, "FACTCHECK_CACHE_TTL_SECONDS", 86400))
                return [], "empty"
            elif response.status_code == 429:
                logger.warning("Google Fact Check API rate limited (HTTP 429).")
                return [], "rate_limited"
            elif response.status_code in (400, 401, 403):
                logger.warning("Google Fact Check API authentication or bad request error (HTTP %d).", response.status_code)
                return [], "error"
            else:
                logger.warning("Google Fact Check API returned HTTP %d.", response.status_code)
                return [], "error"

        except httpx.TimeoutException:
            logger.warning("Google Fact Check API request timed out.")
            return [], "error"
        except httpx.RequestError as exc:
            logger.warning("Google Fact Check API network issue: %s", type(exc).__name__)
            return [], "error"
        except Exception as exc:
            logger.warning("Unexpected Google Fact Check error: %s", type(exc).__name__)
            return [], "error"
        finally:
            if should_close_client:
                await client.aclose()
