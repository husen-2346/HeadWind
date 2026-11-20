"""
errors.py – Custom application exceptions and unified DRF exception handler.

Format all error responses as:
  {"error": {"code": str, "message": str, "details"?: ...}}

Never leaks stack traces, internal URLs, or Mapbox tokens.
"""

from __future__ import annotations

import logging
from typing import Any

from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import set_rollback

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application exception with standardized code and HTTP status."""

    def __init__(
        self,
        message: str,
        code: str = "internal_error",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Any = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class ValidationError(AppError):
    def __init__(self, message: str, details: Any = None):
        super().__init__(
            message=message,
            code="validation_error",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class NoRouteFoundError(AppError):
    def __init__(self, message: str = "No route found between the specified points."):
        super().__init__(
            message=message,
            code="no_route_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UpstreamRoutingError(AppError):
    def __init__(self, message: str = "Routing service request failed."):
        super().__init__(
            message=message,
            code="upstream_routing_error",
            status_code=status.HTTP_502_BAD_GATEWAY,
        )


class UpstreamWeatherError(AppError):
    def __init__(self, message: str = "Weather service request failed."):
        super().__init__(
            message=message,
            code="upstream_weather_error",
            status_code=status.HTTP_502_BAD_GATEWAY,
        )


class RateLimitedError(AppError):
    def __init__(self, message: str = "Too many requests. Please try again later."):
        super().__init__(
            message=message,
            code="rate_limited",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class InternalError(AppError):
    def __init__(self, message: str = "An internal server error occurred."):
        super().__init__(
            message=message,
            code="internal_error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def drf_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Unified exception handler producing {"error": {"code", "message", "details"?}}."""
    set_rollback()

    if isinstance(exc, AppError):
        error_body: dict[str, Any] = {
            "code": exc.code,
            "message": exc.message,
        }
        if exc.details is not None:
            error_body["details"] = exc.details
        return Response({"error": error_body}, status=exc.status_code)

    if isinstance(exc, exceptions.ValidationError):
        error_body = {
            "code": "validation_error",
            "message": "Invalid request payload.",
            "details": exc.detail,
        }
        return Response({"error": error_body}, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, exceptions.Throttled):
        msg = (
            f"Request was throttled. Expected available in {exc.wait} seconds."
            if exc.wait
            else "Request was throttled."
        )
        error_body = {
            "code": "rate_limited",
            "message": msg,
        }
        return Response({"error": error_body}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    if isinstance(exc, (Http404, exceptions.NotFound)):
        error_body = {
            "code": "not_found",
            "message": str(exc) or "Resource not found.",
        }
        return Response({"error": error_body}, status=status.HTTP_404_NOT_FOUND)

    if isinstance(exc, (PermissionDenied, exceptions.PermissionDenied)):
        error_body = {
            "code": "permission_denied",
            "message": "Permission denied.",
        }
        return Response({"error": error_body}, status=status.HTTP_403_FORBIDDEN)

    # General / unexpected exception
    logger.exception("Unhandled server error in request context: %s", context.get("view"))
    error_body = {
        "code": "internal_error",
        "message": "An internal server error occurred.",
    }
    return Response({"error": error_body}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
