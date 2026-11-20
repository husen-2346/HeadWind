from django.urls import path

from trips.views import HealthCheckView

urlpatterns = [
    path("health", HealthCheckView.as_view(), name="health_check"),
]
