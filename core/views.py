from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Resident, Event, Participation
from .serializers import ResidentSerializer, EventSerializer, ParticipationSerializer

# HTML-страницы
def index_page(request):
    return render(request, "core/index.html")

def residents_page(request):
    return render(request, "core/residents.html")

def events_page(request):
    return render(request, "core/events.html")


# Резидент API
class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "")
        if not query:
            return Response([], status=200)

        queryset = Resident.objects.filter(
            Q(full_name__icontains=query) | Q(phone__icontains=query)
        )
        return Response(ResidentSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        resident = self.get_object()
        participations = Participation.objects.filter(resident=resident).select_related("event")
        data = [
            {
                "name": p.event.title,
                "status": "completed" if p.event.is_finished else "active"
            }
            for p in participations
        ]
        return Response(data)


# Ивенты API
class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer


# Покупки (участия) API
class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.all()
    serializer_class = ParticipationSerializer

    def get_queryset(self):
        event_id = self.request.query_params.get("event")
        if event_id:
            return Participation.objects.filter(event_id=event_id)
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        data = request.data

        def save_participation(item):
            obj, _ = Participation.objects.update_or_create(
                event_id=item["event"],
                resident_id=item["resident"],
                defaults={
                    "status": item.get("status", "reserved"),
                    "payment": item.get("payment", 0),
                    "attended": item.get("attended", False),
                    "notified": item.get("notified", False),
                    "came": item.get("came", False),
                }
            )
            return self.get_serializer(obj).data

        if isinstance(data, list):
            result = [save_participation(item) for item in data]
            return Response(result, status=status.HTTP_201_CREATED)

        result = save_participation(data)
        return Response(result, status=status.HTTP_201_CREATED)
