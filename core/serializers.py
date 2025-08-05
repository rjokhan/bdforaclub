from rest_framework import serializers
from .models import Resident, Event, Participation


class ResidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'


class ParticipationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participation
        fields = ['id', 'event', 'resident', 'status']  # Используем 'status', как на фронте

    def validate(self, data):
        required_fields = ['event', 'resident', 'status']
        for field in required_fields:
            if field not in data:
                raise serializers.ValidationError({field: 'This field is required.'})
        return data
