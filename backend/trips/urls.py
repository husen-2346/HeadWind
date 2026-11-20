from django.urls import path

from trips.views import (
    AnalyzeTripView,
    GeocodeView,
    HealthCheckView,
    HeatmapView,
    RiskRulesView,
)

urlpatterns = [
    path("health", HealthCheckView.as_view(), name="health"),
    path("risk-rules", RiskRulesView.as_view(), name="risk_rules"),
    path("geocode", GeocodeView.as_view(), name="geocode"),
    path("analyze", AnalyzeTripView.as_view(), name="analyze"),
    path("heatmap", HeatmapView.as_view(), name="heatmap"),
]
