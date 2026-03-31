"""
TTL cache for ML predictions keyed by canonical product_key.
Stable predictions for the same SKU regardless of query phrasing.
"""

from __future__ import annotations

import os
import time
from threading import Lock
from typing import Any, Dict, Optional

_DEFAULT_TTL = int(os.getenv("PREDICTION_CACHE_TTL_SECONDS", "300"))
_MAX_ENTRIES = int(os.getenv("PREDICTION_CACHE_MAX_ENTRIES", "500"))


class TTLPredictionCache:
    def __init__(self, ttl_seconds: int = _DEFAULT_TTL, max_entries: int = _MAX_ENTRIES):
        self._ttl = ttl_seconds
        self._max = max_entries
        self._data: Dict[str, tuple[float, Dict[str, Any]]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        now = time.monotonic()
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            expires_at, payload = entry
            if now >= expires_at:
                del self._data[key]
                return None
            return dict(payload)

    def set(self, key: str, value: Dict[str, Any]) -> None:
        if not key:
            return
        now = time.monotonic()
        with self._lock:
            if len(self._data) >= self._max and key not in self._data:
                self._evict_oldest()
            self._data[key] = (now + self._ttl, dict(value))

    def _evict_oldest(self) -> None:
        if not self._data:
            return
        oldest_k = min(self._data.keys(), key=lambda k: self._data[k][0])
        del self._data[oldest_k]


_cache: Optional[TTLPredictionCache] = None
_cache_lock = Lock()


def get_prediction_cache() -> TTLPredictionCache:
    global _cache
    with _cache_lock:
        if _cache is None:
            _cache = TTLPredictionCache()
        return _cache
