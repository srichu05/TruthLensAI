import re
import time
import threading
from typing import List, Dict, Any, Optional

class FactCheckCache:
    """
    Thread-safe in-memory cache for Fact Check API queries with 24-hour TTL.
    Normalizes claim queries to maximize cache hit rates across similar formatting.
    """

    def __init__(self, default_ttl_seconds: int = 86400, max_entries: int = 2000):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self.default_ttl = default_ttl_seconds
        self.max_entries = max_entries
        self.hits = 0
        self.misses = 0

    @staticmethod
    def normalize_query(query: str) -> str:
        """
        Normalize query string:
        - Strip common claim prefixes (e.g. 'claim:', 'fact:', numbering like '1.')
        - Strip quotes and punctuation
        - Lowercase and normalize whitespace
        """
        if not query:
            return ""
        q = query.strip()
        # Remove leading numbering like "1. ", "1) ", "Claim: ", "Assertion: "
        q = re.sub(r'^(?:\d+[\.\)]\s*|claim\s*:\s*|assertion\s*:\s*)', '', q, flags=re.IGNORECASE)
        # Remove enclosing quotes and punctuation
        q = q.strip('"\'“”`').strip()
        # Lowercase
        q = q.lower()
        # Remove non-alphanumeric except spaces
        q = re.sub(r'[^\w\s]', ' ', q)
        # Collapse multiple spaces
        q = re.sub(r'\s+', ' ', q).strip()
        return q

    def get(self, query: str) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve cached results if present and not expired.
        Returns None on miss or expiration.
        """
        norm_key = self.normalize_query(query)
        if not norm_key:
            return None

        with self._lock:
            entry = self._cache.get(norm_key)
            if entry is None:
                self.misses += 1
                return None

            now = time.time()
            if now - entry["timestamp"] > entry["ttl"]:
                # Expired - evict
                del self._cache[norm_key]
                self.misses += 1
                return None

            self.hits += 1
            # Return a copy of the results list so callers cannot mutate internal state
            return [dict(item) for item in entry["results"]]

    def set(self, query: str, results: List[Dict[str, Any]], ttl: Optional[int] = None):
        """
        Cache results for normalized query with given TTL (default 24h).
        """
        norm_key = self.normalize_query(query)
        if not norm_key:
            return

        active_ttl = ttl if ttl is not None else self.default_ttl

        with self._lock:
            # Enforce max size via simple eviction of oldest entry if full
            if len(self._cache) >= self.max_entries and norm_key not in self._cache:
                oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
                del self._cache[oldest_key]

            self._cache[norm_key] = {
                "timestamp": time.time(),
                "ttl": active_ttl,
                "results": [dict(r) for r in results]
            }

    def clear(self):
        """Clear entire cache."""
        with self._lock:
            self._cache.clear()
            self.hits = 0
            self.misses = 0

    def size(self) -> int:
        """Return number of currently active unexpired entries."""
        now = time.time()
        with self._lock:
            return sum(1 for e in self._cache.values() if now - e["timestamp"] <= e["ttl"])

    def stats(self) -> Dict[str, Any]:
        """Return cache performance statistics."""
        with self._lock:
            return {
                "total_entries": len(self._cache),
                "hits": self.hits,
                "misses": self.misses,
                "default_ttl_seconds": self.default_ttl
            }

# Shared singleton instance
factcheck_cache = FactCheckCache()
