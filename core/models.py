from django.db import models


class Resident(models.Model):
    full_name = models.CharField("ФИО", max_length=255)
    phone = models.CharField("Телефон", max_length=50, unique=True)
    active_count = models.PositiveIntegerField("Активных", default=0)
    completed_count = models.PositiveIntegerField("Пройдено", default=0)

    def total(self):
        return self.active_count + self.completed_count

    def __str__(self):
        return self.full_name


class Event(models.Model):
    title = models.CharField("Название", max_length=255)
    date = models.DateField("Дата проведения")
    price = models.DecimalField("Стоимость", max_digits=10, decimal_places=2)
    seats = models.PositiveIntegerField("Лимит мест")
    is_finished = models.BooleanField("Завершён", default=False)

    def __str__(self):
        return f"{self.title} ({self.date})"


class Participation(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Оплачено'),
        ('reserved', 'Забронировано'),
        ('partial', 'Оплачено частично'),
    ]

    resident = models.ForeignKey(Resident, on_delete=models.CASCADE, related_name='participations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    joined_at = models.DateField("Дата записи")
    attended = models.BooleanField("Пришёл", default=False)
    payment = models.DecimalField("Сумма оплаты", max_digits=10, decimal_places=2)
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default='reserved')

    notified = models.BooleanField("Уведомлен", default=False)
    came = models.BooleanField("Пришёл", default=False)

    def __str__(self):
        return f"{self.resident.full_name} на {self.event.title}"
