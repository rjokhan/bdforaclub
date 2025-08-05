const EVENTS_API = "/api/events/";
const PARTICIPANTS_API = "/api/participants/";
const RESIDENTS_API = "/api/residents/";

let selectedEventId = null;
let allResidents = [];
let selectedResidents = [];
let existingParticipantIds = [];

function fetchEvents() {
    Promise.all([
        fetch(EVENTS_API).then(res => res.json()),
        fetch(PARTICIPANTS_API).then(res => res.json())
    ])
    .then(([events, participations]) => {
        renderEvents(events, participations);
    })
    .catch(err => alert("Ошибка при загрузке событий"));
}

function renderEvents(events, participations) {
    const tbody = document.querySelector("#eventsTable tbody");
    tbody.innerHTML = "";

    events.sort((a, b) => {
        if (a.is_finished !== b.is_finished) return a.is_finished - b.is_finished;
        return new Date(a.date) - new Date(b.date);
    });

    events.forEach((event, index) => {
        const bought = participations.filter(p => p.event === event.id).length;
        const free = event.seats - bought;

        const tr = document.createElement("tr");
        if (event.is_finished) {
            tr.style.backgroundColor = "rgba(255, 0, 0, 0.15)";
        }

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="event-name">${event.title}</td>
            <td>${event.date}</td>
            <td>${event.price}</td>
            <td>${event.seats}</td>
            <td>${bought}</td>
            <td>${free}</td>
            <td><button class="delete-btn">✖</button></td>
            <td><button class="status-btn">${event.is_finished ? "Активировать" : "Завершить"}</button></td>
        `;

        tr.querySelector(".delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            deleteEvent(event.id);
        });

        tr.querySelector(".status-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            toggleStatus(event.id, event.is_finished);
        });

        tr.addEventListener("click", () => {
            openEventPopupWithParticipants(event.id);
        });

        tbody.appendChild(tr);
    });
}

function deleteEvent(id) {
    if (!confirm("Удалить событие?")) return;
    fetch(`${EVENTS_API}${id}/`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error("Ошибка при удалении");
            fetchEvents();
        })
        .catch(err => alert(err.message));
}

function toggleStatus(id, isFinished) {
    const confirmMsg = isFinished ? "Желаете вернуть ивент в статус активно?" : "Завершить ивент?";
    if (!confirm(confirmMsg)) return;

    fetch(`${EVENTS_API}${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_finished: !isFinished })
    })
    .then(res => {
        if (!res.ok) throw new Error("Ошибка при обновлении статуса");
        fetchEvents();
    })
    .catch(err => alert(err.message));
}

function openEventPopupWithParticipants(eventId) {
    fetch(`/api/participants/?event=${eventId}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("participantsList");
            container.innerHTML = "";

            if (data.length === 0) {
                container.innerHTML = "<p>Нет участников</p>";
                return;
            }

            const header = document.createElement("div");
            header.classList.add("participant-header");
            header.innerHTML = `
                <div>ФИО</div>
                <div>Статус</div>
                <div>Уведомлён</div>
                <div>Пришёл</div>
                <div>Удалить</div>
            `;
            container.appendChild(header);

            data.forEach(p => {
                const div = document.createElement("div");
                div.classList.add("participant-row");

                const statusLabel = getStatusLabel(p.status);
                const statusColor = getStatusColor(p.status);

                div.innerHTML = `
                    <div><strong>${p.full_name || "—"}</strong><br><small>${p.phone || "—"}</small></div>
                    <div class="status-chip ${statusColor}" onclick="showStatusOptions(this, ${p.id}, '${p.status}')">${statusLabel}</div>
                    <div class="toggle-group">
                        <button class="${p.notified ? "active" : ""}" onclick="toggleState(this, ${p.id}, 'notified', true)">✅</button>
                        <button class="${!p.notified ? "active" : ""}" onclick="toggleState(this, ${p.id}, 'notified', false)">❌</button>
                    </div>
                    <div class="toggle-group">
                        <button class="${p.came ? "active" : ""}" onclick="toggleState(this, ${p.id}, 'came', true)">✅</button>
                        <button class="${!p.came ? "active" : ""}" onclick="toggleState(this, ${p.id}, 'came', false)">❌</button>
                    </div>
                    <div><button class="delete-btn" onclick="deleteParticipation(${p.id})">🗑️</button></div>
                `;

                container.appendChild(div);
            });

            document.getElementById("eventParticipantsPopup").classList.remove("hidden");
        });
}




function addEvent() {
    const title = document.getElementById("eventNameInput").value.trim();
    const date = document.getElementById("eventDateInput").value;
    const seats = parseInt(document.getElementById("eventSeatsInput").value);
    const price = parseFloat(document.getElementById("eventPriceInput").value);

    if (!title || !date || isNaN(seats) || isNaN(price)) {
        alert("Пожалуйста, заполните все поля корректно");
        return;
    }

    fetch(EVENTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title,
            date,
            seats,
            price
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Ошибка при создании события");
        return res.json();
    })
    .then(() => {
        closeEventPopup();
        fetchEvents();
    })
    .catch(err => alert(err.message));
}

function closeEventPopup() {
    document.getElementById("event-popup-overlay").style.display = "none";
    document.getElementById("eventNameInput").value = "";
    document.getElementById("eventDateInput").value = "";
    document.getElementById("eventSeatsInput").value = "";
    document.getElementById("eventPriceInput").value = "";
}


function getStatusLabel(code) {
    if (code === "paid") return "Оплачено";
    if (code === "partial") return "Частично";
    return "Забронировано";
}

function getStatusColor(code) {
    if (code === "paid") return "green";
    if (code === "partial") return "yellow";
    return "red";
}

function toggleState(button, participationId, field, value) {
    const parent = button.parentElement;
    const buttons = parent.querySelectorAll("button");

    fetch(`${PARTICIPANTS_API}${participationId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
    })
    .then(res => {
        if (!res.ok) throw new Error("Ошибка при обновлении");
        buttons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
    })
    .catch(err => alert(err.message));
}

function deleteParticipation(id) {
    if (!confirm("Удалить этого участника?")) return;

    fetch(`${PARTICIPANTS_API}${id}/`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error("Ошибка при удалении");
            fetchEvents();
            closeParticipantsPopup();
        })
        .catch(err => alert(err.message));
}

function closeParticipantsPopup() {
    document.getElementById("eventParticipantsPopup").classList.add("hidden");
}

function openEventPopup() {
    document.getElementById("event-popup-overlay").style.display = "flex";
}

function closeEventPopup() {
    document.getElementById("event-popup-overlay").style.display = "none";
}

// ✅ Открытие попапа покупки
function openPurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    if (!popup) {
        alert("Попап 'purchasePopup' не найден");
        return;
    }

    popup.classList.remove("hidden");

    document.getElementById("purchase-step-event").style.display = "block";
    document.getElementById("purchase-step-residents").style.display = "none";
    document.getElementById("event-list-container").innerHTML = "";

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(events => {
            const container = document.getElementById("event-list-container");
            events.forEach(event => {
                const div = document.createElement("div");
                div.textContent = `${event.title} (${event.date})`;
                div.style.cursor = "pointer";
                div.style.padding = "8px";
                div.style.border = "1px solid #ccc";
                div.style.borderRadius = "6px";
                div.onclick = () => {
                    selectedEventId = event.id;
                    document.getElementById("purchase-step-event").style.display = "none";
                    document.getElementById("purchase-step-residents").style.display = "block";
                    loadResidentsAndParticipants();
                };
                container.appendChild(div);
            });
        })
        .catch(() => alert("Ошибка при загрузке ивентов"));
}

// ✅ Закрытие попапа покупки
function closePurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    if (!popup) return;

    popup.classList.add("hidden");

    selectedEventId = null;
    allResidents = [];
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("purchase-step-event").style.display = "block";
    document.getElementById("purchase-step-residents").style.display = "none";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("save-purchase-button").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", fetchEvents);
