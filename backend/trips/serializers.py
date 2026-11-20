"""
serializers.py – Request serializers and coordinate field for Headwind API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from rest_framework import serializers

from trips.services.geo import haversine_miles


class CoordinateField(serializers.Field):
    """Serializer field for GeoJSON [lon, lat] coordinates."""

    def to_internal_value(self, data: Any) -> list[float]:
        if isinstance(data, (list, tuple)) and len(data) == 2:
            try:
                lon = float(data[0])
                lat = float(data[1])
            except (ValueError, TypeError) as exc:
                raise serializers.ValidationError(
                    "Coordinates must be numeric [lon, lat]."
                ) from exc
        elif isinstance(data, dict) and "lat" in data and ("lon" in data or "lng" in data):
            try:
                lat = float(data["lat"])
                lon = float(data.get("lon", data.get("lng")))
            except (ValueError, TypeError) as exc:
                raise serializers.ValidationError("Coordinates must be numeric.") from exc
        else:
            raise serializers.ValidationError(
                "Coordinates must be a [lon, lat] list or {'lat': ..., 'lon': ...} object."
            )

        if not (-180.0 <= lon <= 180.0):
            raise serializers.ValidationError(
                f"Longitude must be between -180 and 180 (got {lon})."
            )
        if not (-90.0 <= lat <= 90.0):
            raise serializers.ValidationError(f"Latitude must be between -90 and 90 (got {lat}).")

        return [lon, lat]

    def to_representation(self, value: Any) -> list[float]:
        return [float(value[0]), float(value[1])]


class AnalyzeTripRequestSerializer(serializers.Serializer):
    """Validates POST /api/analyze request payload."""

    origin = CoordinateField(required=True)
    destination = CoordinateField(required=True)
    departure_local = serializers.CharField(required=True)
    load_lb = serializers.IntegerField(required=False, default=40000, min_value=1, max_value=200000)
    interval_miles = serializers.ChoiceField(choices=[10, 25, 50], required=False, default=25)

    def validate_departure_local(self, value: str) -> str:
        val = value.strip()
        if not val:
            raise serializers.ValidationError("departure_local must not be blank.")
        try:
            datetime.fromisoformat(val)
        except Exception as exc:
            raise serializers.ValidationError(
                f"Invalid ISO 8601 departure timestamp: '{value}'"
            ) from exc
        return val

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        origin = attrs.get("origin")
        destination = attrs.get("destination")
        if origin and destination:
            orig_lon, orig_lat = origin
            dest_lon, dest_lat = destination
            dist = haversine_miles(orig_lat, orig_lon, dest_lat, dest_lon)
            if dist < 2.0:
                raise serializers.ValidationError(
                    "Origin and destination must be at least 2.0 miles apart."
                )
        return attrs
