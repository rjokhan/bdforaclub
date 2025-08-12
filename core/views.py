from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Resident, Event, Participation
from .serializers import ResidentSerializer, EventSerializer, ParticipationSerializer
import logging

logger = logging.getLogger(__name__)

# HTML-страницы
def index_page(request):
    return render(request, "core/index.html")

def residents_page(request):
    return render(request, "core/residents.html")

def events_page(request):
    return render(request, "core/events.html")

def scaner_page(request):
    return render(request, "core/scaner.html")


# API Views
class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([], status=200)

        queryset = Resident.objects.filter(
            Q(full_name__icontains=query) | Q(phone__icontains=query)
        )
        return Response(ResidentSerializer(queryset, many=True).data)

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        resident = self.get_object()
        participations = Participation.objects.filter(resident=resident).select_related('event')

        data = [
            {
                "name": p.event.title,
                "status": "completed" if p.event.is_finished else "active"
            }
            for p in participations
        ]
        return Response(data)


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer


class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer

    def get_queryset(self):
        """
        Позволяет фильтровать участия по событию: /api/participants/?event=1
        """
        queryset = super().get_queryset()
        event_id = self.request.query_params.get("event")
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data
        logger.info("Получены данные: %s", data)

        try:
            if isinstance(data, list):
                created = []
                for item in data:
                    if Participation.objects.filter(event_id=item["event"], resident_id=item["resident"]).exists():
                        ontinue
                    serializer = self.get_serializer(data=item)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    created.append(serializer.data)

                return Response(created, status=status.HTTP_201_CREATED)

            # одиночный объект
            if Participation.objects.filter(event_id=data["event"], resident_id=data["resident"]).exists():
                return Response({"detail": "Этот резидент уже участвует в событии."}, status=status.HTTP_400_BAD_REQUEST)

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception("Ошибка при создании Participation")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
