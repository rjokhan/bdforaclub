from rest_framework import serializers
from .models import Resident, Event, Participation
from django.utils import timezone


class ResidentSerializer(serializers.ModelSerializer):
    total = serializers.SerializerMethodField()
    total_events = serializers.SerializerMethodField()
    attended_events = serializers.SerializerMethodField()
    active_events = serializers.SerializerMethodField()

    class Meta:
        model = Resident
        fields = [
            'id',
            'full_name',
            'phone',
            'active_count',
            'completed_count',
            'total',
            'total_events',
            'attended_events',
            'active_events',
        ]

    def get_total(self, obj):
        return obj.total()

    def get_total_events(self, obj):
        return obj.participations.count()

    def get_attended_events(self, obj):
        return obj.participations.filter(event__is_finished=True).count()

    def get_active_events(self, obj):
        return obj.participations.filter(event__is_finished=False).count()


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'date',
            'price',
            'seats',
            'is_finished'
        ]


class ParticipationSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='resident.full_name', read_only=True)
    phone = serializers.CharField(source='resident.phone', read_only=True)

    class Meta:
        model = Participation
        fields = [
            'id',
            'resident',
            'full_name',
            'phone',
            'event',
            'joined_at',
            'attended',
            'payment',
            'status',
            'notified',
            'came',
        ]

    def create(self, validated_data):
        if not validated_data.get('joined_at'):
            validated_data['joined_at'] = timezone.now().date()
        return super().create(validated_data)