"""
Serializers for the trips API.
Domain serializers will be added in Phase 2.
"""

from rest_framework import serializers


class HealthCheckSerializer(serializers.Serializer):
    status = serializers.CharField()
