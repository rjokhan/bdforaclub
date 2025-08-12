from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Resident, Event, Participation
from .serializers import ResidentSerializer, EventSerializer, ParticipationSerializer

import logging
import json
import requests  # <-- добавили

logger = logging.getLogger(__name__)

# ---------- HTML ----------
def index_page(request):
    return render(request, "core/index.html")

def residents_page(request):
    return render(request, "core/residents.html")

def events_page(request):
    return render(request, "core/events.html")

def scaner_page(request):
    return render(request, "core/scaner.html")


# ---------- API ----------
class ResidentViewSet(viewsets.ModelViewSet):
    queryset = Resident.objects.all()
    serializer_class = ResidentSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([], status=200)

        qs = Resident.objects.filter(
            Q(full_name__icontains=query) | Q(phone__icontains=query)
        )
        return Response(ResidentSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        resident = self.get_object()
        participations = (
            Participation.objects
            .filter(resident=resident)
            .select_related('event')
        )
        data = [
            {"name": p.event.title, "status": "completed" if p.event.is_finished else "active"}
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
        event_id = self.request.query_params.get("event")
        qs = super().get_queryset()
        return qs.filter(event_id=event_id) if event_id else qs

    def create(self, request, *args, **kwargs):
        data = request.data
        logger.info("Получены данные: %s", data)

        try:
            # батч
            if isinstance(data, list):
                created = []
                for item in data:
                    if Participation.objects.filter(
                        event_id=item["event"], resident_id=item["resident"]
                    ).exists():
                        continue  # <-- fixed
                    serializer = self.get_serializer(data=item)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    created.append(serializer.data)
                return Response(created, status=status.HTTP_201_CREATED)

            # одиночный
            if Participation.objects.filter(
                event_id=data["event"], resident_id=data["resident"]
            ).exists():
                return Response(
                    {"detail": "Этот резидент уже участвует в событии."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception("Ошибка при создании Participation")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------- QR proxy ----------
UPSTREAM_URL = "https://events.ayolclub.uz/api/v1/qrcode/validate/"

@csrf_exempt
def qr_validate_proxy(request):
    # Разрешим preflight на всякий случай
    if request.method == "OPTIONS":
        resp = HttpResponse(status=204)
        resp["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        resp["Access-Control-Allow-Headers"] = "Content-Type, Accept"
        return resp

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    try:
        r = requests.post(
            UPSTREAM_URL,
            json=payload,
            headers={"Accept": "application/json"},
            timeout=10,
        )
        logger.info("Upstream %s -> %s", UPSTREAM_URL, r.status_code)
    except requests.RequestException as e:
        logger.exception("Upstream request failed")
        return JsonResponse({"detail": f"Upstream error: {e.__class__.__name__}"}, status=502)

    ct = r.headers.get("content-type", "")
    if "application/json" in ct:
        try:
            data = r.json()
        except Exception:
            data = {"detail": "Upstream returned invalid JSON"}
        return JsonResponse(data, status=r.status_code)
    return HttpResponse(r.content, status=r.status_code, content_type=ct or "text/plain")
