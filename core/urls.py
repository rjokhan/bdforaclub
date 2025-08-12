from django.urls import path, include
from .views import qr_validate_proxy
from rest_framework.routers import DefaultRouter
from .views import (
    ResidentViewSet,
    EventViewSet,
    ParticipationViewSet,
    index_page,
    residents_page,
    events_page,
    scaner_page
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
    path('scaner-page/', scaner_page, name='scaner_page'),
    path('events-page/', events_page, name='events_page'),
    path('', index_page, name='index_page'),
    path("qr/validate/", qr_validate_proxy, name="qr_validate_proxy"),
]
