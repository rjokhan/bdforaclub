from rest_framework import serializers
from .models import Resident, Event, Participation


class ResidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resident
        fields = "__all__"


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"


class ParticipationSerializer(serializers.ModelSerializer):
    resident_full_name = serializers.CharField(source='resident.full_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = Participation
        fields = [
            'id',
            'resident', 'resident_full_name',
            'event', 'event_title',
            'status', 'payment',
            'attended', 'notified', 'came',
        ]

    def validate(self, data):
        """
        Дополнительная валидация — например, запрещаем payment < 0
        """
        payment = data.get("payment", 0)
        if payment < 0:
            raise serializers.ValidationError({"payment": "Сумма оплаты не может быть отрицательной."})
        return data
