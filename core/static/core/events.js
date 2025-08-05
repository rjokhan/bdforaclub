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

// --- Добавить покупку ---

function openPurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    popup.classList.remove("hidden");

    document.getElementById("purchase-step-event").classList.remove("hidden");
    document.getElementById("purchase-step-residents").classList.add("hidden");

    const container = document.getElementById("event-list-container");
    container.innerHTML = "";

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(events => {
            events.forEach(event => {
                const div = document.createElement("div");
                div.textContent = `${event.title} (${event.date})`;
                div.classList.add("event-button");
                div.onclick = () => {
                    selectedEventId = event.id;
                    document.getElementById("purchase-step-event").classList.add("hidden");
                    document.getElementById("purchase-step-residents").classList.remove("hidden");
                    loadResidentsAndParticipants();
                };
                container.appendChild(div);
            });
        });
}

function closePurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    popup.classList.add("hidden");

    selectedEventId = null;
    allResidents = [];
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("save-purchase-button").classList.add("hidden");
}

function loadResidentsAndParticipants() {
    fetch(RESIDENTS_API)
        .then(res => res.json())
        .then(residents => {
            allResidents = residents;
            return fetch(`${PARTICIPANTS_API}?event=${selectedEventId}`);
        })
        .then(res => res.json())
        .then(participants => {
            existingParticipantIds = participants.map(p => p.resident);
        });
}

function searchResidents() {
    const query = document.getElementById("resident-search-input").value.toLowerCase();
    const results = allResidents.filter(r =>
        (r.full_name + r.phone).toLowerCase().includes(query) &&
        !selectedResidents.find(sel => sel.id === r.id) &&
        !existingParticipantIds.includes(r.id)
    );

    const container = document.getElementById("resident-search-results");
    container.innerHTML = "";

    results.forEach(r => {
        const div = document.createElement("div");
        div.classList.add("resident-result");
        div.innerHTML = `${r.full_name} <small>(${r.phone})</small>`;
        const addBtn = document.createElement("button");
        addBtn.textContent = "Добавить";
        addBtn.onclick = () => addResidentToSelection(r);
        div.appendChild(addBtn);
        container.appendChild(div);
    });
}

function addResidentToSelection(resident) {
    selectedResidents.push(resident);
    renderSelectedResidents();
    document.getElementById("save-purchase-button").classList.remove("hidden");
    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
}

function renderSelectedResidents() {
    const container = document.getElementById("selected-residents-list");
    container.innerHTML = "";

    selectedResidents.forEach((r, index) => {
        const div = document.createElement("div");
        div.classList.add("resident-item");
        div.innerHTML = `
            <span>${r.full_name} (${r.phone})</span>
            <select data-index="${index}">
                <option value="paid">Оплачено</option>
                <option value="reserved">Забронировано</option>
                <option value="partial">Частично</option>
            </select>
        `;
        container.appendChild(div);
    });
}

function savePurchase() {
    const payload = selectedResidents.map((r, i) => {
        const status = document.querySelector(`select[data-index="${i}"]`).value;
        return {
            event: selectedEventId,
            resident: r.id,
            status: status
        };
    });

    Promise.all(payload.map(p =>
        fetch(PARTICIPANTS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p)
        })
    ))
    .then(() => {
        alert("Участники добавлены!");
        closePurchasePopup();
        fetchEvents();
    })
    .catch(() => alert("Ошибка при сохранении"));
}

// Слушатели
document.getElementById("resident-search-input").addEventListener("input", searchResidents);
document.getElementById("save-purchase-button").addEventListener("click", savePurchase);
document.addEventListener("DOMContentLoaded", fetchEvents);
