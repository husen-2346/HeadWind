"""
views.py – API view controllers for Headwind backend.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trips.clients.mapbox import MapboxClient
from trips.errors import ValidationError
from trips.serializers import AnalyzeTripRequestSerializer
from trips.services.constants import RISK_RULES
from trips.usecases.analyze_trip import TripAnalyzer
from trips.usecases.heatmap import CorridorHeatmapAnalyzer


class HealthCheckView(APIView):
    """Health check endpoint returning {"status": "ok"}."""

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class RiskRulesView(APIView):
    """Provides the canonical risk thresholds and load rules configuration."""

    def get(self, request: Request) -> Response:
        return Response(RISK_RULES, status=status.HTTP_200_OK)


class GeocodeView(APIView):
    """Forward geocoding proxy backed by Mapbox Geocoding v6.

    Throttled at 60 requests per minute.
    """

    throttle_scope = "geocode"

    def get(self, request: Request) -> Response:
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            raise ValidationError("Query parameter 'q' must be at least 2 characters.")

        client = MapboxClient()
        suggestions = client.geocode(q)
        return Response(suggestions, status=status.HTTP_200_OK)


class AnalyzeTripView(APIView):
    """Evaluates driving routes, weather risks, and recommendations.

    Throttled at 12 requests per minute.
    """

    throttle_scope = "analyze"

    def post(self, request: Request) -> Response:
        serializer = AnalyzeTripRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        analyzer = TripAnalyzer()
        result = analyzer.analyze(
            origin=validated["origin"],
            destination=validated["destination"],
            departure_local=validated["departure_local"],
            load_lb=validated.get("load_lb", 0),
            interval_miles=validated.get("interval_miles", 25),
        )
        return Response(result, status=status.HTTP_200_OK)


class HeatmapView(APIView):
    """Generates 49-hour weather risk corridor heatmap across candidate routes.

    Throttled at 12 requests per minute.
    """

    throttle_scope = "heatmap"

    def post(self, request: Request) -> Response:
        serializer = AnalyzeTripRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        analyzer = CorridorHeatmapAnalyzer()
        result = analyzer.generate_heatmap(
            origin=validated["origin"],
            destination=validated["destination"],
            departure_local=validated["departure_local"],
            load_lb=validated.get("load_lb", 40000),
        )
        return Response(result, status=status.HTTP_200_OK)
