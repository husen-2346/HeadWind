"""
http.py – Shared HTTP client helper with retries, timeouts, and token redaction.

Timeouts: connect 3s / read 10s.
Retries: 2 retries (3 total attempts) with backoff on 429, 5xx, or network timeouts.
Token Redaction: Never logs or surfaces API tokens.
"""

from __future__ import annotations

import logging
import re
import time
from collections.abc import Callable
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Regex pattern to match access_token or token query parameters
_TOKEN_QUERY_PATTERN = re.compile(r"((?:access_token|token|key)=)([^&]+)", re.IGNORECASE)


def redact_token(text: str, token: str | None = None) -> str:
    """Redact tokens from URLs, query strings, headers, or messages."""
    if not text:
        return ""
    # Redact query params
    redacted = _TOKEN_QUERY_PATTERN.sub(r"\1[REDACTED]", text)
    if token and token.strip() and token in redacted:
        redacted = redacted.replace(token, "[REDACTED]")
    return redacted


class HttpClient:
    """HTTP client wrapper with standardized timeouts, retries, and token redaction."""

    DEFAULT_CONNECT_TIMEOUT: float = 3.0
    DEFAULT_READ_TIMEOUT: float = 10.0
    DEFAULT_RETRIES: int = 2

    def __init__(
        self,
        client: httpx.Client | None = None,
        retries: int = DEFAULT_RETRIES,
        connect_timeout: float = DEFAULT_CONNECT_TIMEOUT,
        read_timeout: float = DEFAULT_READ_TIMEOUT,
        sleep_fn: Callable[[float], None] = time.sleep,
    ):
        self.retries = retries
        self.timeout = httpx.Timeout(
            timeout=read_timeout,
            connect=connect_timeout,
            read=read_timeout,
            write=read_timeout,
        )
        self._custom_client = client
        self._sleep_fn = sleep_fn

    def _get_client(self) -> httpx.Client:
        if self._custom_client is not None:
            return self._custom_client
        return httpx.Client(timeout=self.timeout)

    def request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        json: Any = None,
        token_to_redact: str | None = None,
    ) -> httpx.Response:
        """Execute HTTP request with retries on transient errors."""
        attempts = 1 + max(0, self.retries)
        last_error: Exception | None = None

        for attempt in range(1, attempts + 1):
            try:
                # If a custom client was provided (e.g. for testing with MockTransport), reuse it
                if self._custom_client is not None:
                    response = self._custom_client.request(
                        method,
                        url,
                        params=params,
                        headers=headers,
                        json=json,
                    )
                else:
                    with httpx.Client(timeout=self.timeout) as client:
                        response = client.request(
                            method,
                            url,
                            params=params,
                            headers=headers,
                            json=json,
                        )

                # Check if we should retry based on status code
                if response.status_code in (429, 500, 502, 503, 504) and attempt < attempts:
                    backoff = 0.25 * (2 ** (attempt - 1))
                    logger.warning(
                        "Transient HTTP %d from %s; retrying in %.2fs (attempt %d/%d)",
                        response.status_code,
                        redact_token(url, token_to_redact),
                        backoff,
                        attempt,
                        attempts,
                    )
                    self._sleep_fn(backoff)
                    continue

                return response

            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                last_error = exc
                if attempt < attempts:
                    backoff = 0.25 * (2 ** (attempt - 1))
                    logger.warning(
                        "Network error (%s) contacting %s; retrying in %.2fs (attempt %d/%d)",
                        type(exc).__name__,
                        redact_token(url, token_to_redact),
                        backoff,
                        attempt,
                        attempts,
                    )
                    self._sleep_fn(backoff)
                else:
                    break

        # If we exhausted attempts without a successful response
        safe_msg = f"Network request failed after {attempts} attempts ({type(last_error).__name__})"
        raise httpx.RequestError(safe_msg)
