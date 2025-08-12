from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ResidentViewSet,
    EventViewSet,
    ParticipationViewSet,
    index_page,
    residents_page,
    events_page,
    scaner_page,
    qr_validate_proxy,  # 👈 добавили
)

# Роутер для DRF ViewSets
router = DefaultRouter()
router.register('residents', ResidentViewSet)
router.register('events', EventViewSet)
router.register('participants', ParticipationViewSet)  # 👈 participants, не participant

urlpatterns = [
    # API маршруты
    path('api/', include(router.urls)),

    # Прокси для валидации QR
    path('qr/validate/', qr_validate_proxy, name='qr_validate_proxy'),  # 👈 добавили

    # Статичные страницы
    path("", include("django.contrib.staticfiles.urls")),
    path('residents-page/', residents_page, name='residents_page'),
    path('scaner-page/', scaner_page, name='scaner_page'),
    path('events-page/', events_page, name='events_page'),
    path('', index_page, name='index_page'),
]
