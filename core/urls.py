from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ResidentViewSet,
    EventViewSet,
    ParticipationViewSet,
    index_page,
    residents_page,
    events_page
)

# Роутер для DRF ViewSets
router = DefaultRouter()
router.register('residents', ResidentViewSet)
router.register('events', EventViewSet)
router.register('participants', ParticipationViewSet)  # 👈 правильно: participants

urlpatterns = [
    # API маршруты
    path('api/', include(router.urls)),

    # Статичные страницы
    path("", include("django.contrib.staticfiles.urls")),
    path('residents-page/', residents_page, name='residents_page'),
    
    path('events-page/', events_page, name='events_page'),
    path('', index_page, name='index_page'),
]
