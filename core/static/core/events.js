const EVENTS_API = "/api/events/";
const PARTICIPANTS_API = "/api/participants/";
const RESIDENTS_API = "/api/residents/";

let selectedEventId = null;
let selectedEvent = null;
let allResidents = [];
let selectedResidents = [];
let existingParticipantIds = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchEvents();
    document.getElementById("resident-search-input").addEventListener("input", searchResidents);
    document.getElementById("save-purchase-button").addEventListener("click", savePurchase);
});

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
        const bought = participations.filter(p => p.event === event.id && p.status === "paid").length;
        const free = event.seats - bought;

        const tr = document.createElement("tr");
        if (event.is_finished) tr.style.backgroundColor = "rgba(255, 0, 0, 0.15)";

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${event.title}</td>
            <td>${event.date}</td>
            <td>${event.price}</td>
            <td>${event.seats}</td>
            <td>${bought}</td>
            <td>${free}</td>
            <td><button class="delete-btn">✖</button></td>
            <td><button class="status-btn">${event.is_finished ? "Активировать" : "Завершить"}</button></td>
        `;

        tr.querySelector(".delete-btn").onclick = e => {
            e.stopPropagation();
            deleteEvent(event.id);
        };

        tr.querySelector(".status-btn").onclick = e => {
            e.stopPropagation();
            toggleStatus(event.id, event.is_finished);
        };

        tr.onclick = () => openEventPopupWithParticipants(event.id);
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
    const msg = isFinished ? "Вернуть ивент в активный?" : "Завершить ивент?";
    if (!confirm(msg)) return;

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
            container.innerHTML = data.length === 0 ? "<p>Нет участников</p>" : "";

            data.forEach(p => {
                const div = document.createElement("div");
                div.classList.add("participant-row");

                const statusClass = getStatusColor(p.status);
                const statusLabel = getStatusLabel(p.status);

                div.innerHTML = `
                    <div><strong>${p.full_name}</strong><br><small>${p.phone}</small></div>
                    <div class="status-chip ${statusClass}" onclick="showStatusOptions(this, ${p.id}, '${p.status}')">${statusLabel}</div>
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

function closeParticipantsPopup() {
    document.getElementById("eventParticipantsPopup").classList.add("hidden");
}

function getStatusColor(code) {
    if (code === "paid") return "green";
    if (code === "partial") return "yellow";
    return "red";
}

function getStatusLabel(code) {
    if (code === "paid") return "Оплачено";
    if (code === "partial") return "Частично";
    return "Забронировано";
}

function toggleState(button, id, field, value) {
    fetch(`${PARTICIPANTS_API}${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
    })
    .then(res => {
        if (!res.ok) throw new Error("Ошибка обновления");
        const group = button.parentElement;
        group.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
    })
    .catch(err => alert(err.message));
}

function openEventPopup() {
    document.getElementById("event-popup-overlay").style.display = "flex";
}

function closeEventPopup() {
    document.getElementById("event-popup-overlay").style.display = "none";
}

function addEvent() {
    const title = document.getElementById("eventNameInput").value;
    const date = document.getElementById("eventDateInput").value;
    const seats = +document.getElementById("eventSeatsInput").value;
    const price = +document.getElementById("eventPriceInput").value;

    if (!title || !date || !seats || !price) {
        alert("Заполните все поля");
        return;
    }

    fetch(EVENTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, seats, price })
    })
    .then(res => {
        if (!res.ok) throw new Error("Ошибка при добавлении события");
        closeEventPopup();
        fetchEvents();
    })
    .catch(err => alert(err.message));
}

// --- Покупки ---
function openPurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    popup.classList.remove("hidden");

    document.getElementById("purchase-step-event").classList.remove("hidden");
    document.getElementById("purchase-step-residents").classList.add("hidden");

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(events => {
            const container = document.getElementById("event-list-container");
            container.innerHTML = "";
            events.forEach(event => {
                const div = document.createElement("div");
                div.textContent = `${event.title} (${event.date})`;
                div.className = "event-button";
                div.onclick = () => {
                    selectedEventId = event.id;
                    selectedEvent = event;
                    document.getElementById("purchase-step-event").classList.add("hidden");
                    document.getElementById("purchase-step-residents").classList.remove("hidden");
                    loadResidentsAndParticipants();
                };
                container.appendChild(div);
            });
        });
}

function closePurchasePopup() {
    document.getElementById("purchasePopup").classList.add("hidden");
    selectedEventId = null;
    selectedEvent = null;
    allResidents = [];
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("save-purchase-button").classList.add("hidden");
}

function loadResidentsAndParticipants() {
    Promise.all([
        fetch(RESIDENTS_API).then(res => res.json()),
        fetch(`${PARTICIPANTS_API}?event=${selectedEventId}`).then(res => res.json())
    ])
    .then(([residents, participants]) => {
        allResidents = residents;
        existingParticipantIds = participants.map(p => (typeof p.resident === "object" ? p.resident.id : p.resident));
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
    selectedResidents.push({ ...resident, status: "paid" });
    renderSelectedResidents();
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

    document.getElementById("save-purchase-button").classList.remove("hidden");
}

function savePurchase() {
    const today = new Date().toISOString().split("T")[0];

    const payload = selectedResidents.map((r, i) => {
        const status = document.querySelector(`select[data-index="${i}"]`).value;

        const payment =
            status === "paid" ? selectedEvent.price :
            status === "partial" ? selectedEvent.price / 2 :
            0;

        return {
            event: selectedEventId,
            resident: r.id,
            status: status,
            joined_at: today,
            payment: payment,
            attended: false,
            notified: false,
            came: false
        };
    });

    Promise.all(payload.map(p =>
        fetch(PARTICIPANTS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p)
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(JSON.stringify(data));
                });
            }
            return res;
        })
    ))
    .then(() => {
        alert("✅ Участники добавлены!");
        closePurchasePopup();
        fetchEvents();
    })
    .catch(err => {
        console.error("Ошибка при сохранении участников:", err);
        alert("❌ Ошибка при сохранении: " + err.message);
    });
}

function showStatusOptions(chipElement, participantId, currentStatus) {
    const select = document.createElement("select");

    select.innerHTML = `
        <option value="paid" ${currentStatus === "paid" ? "selected" : ""}>Оплачено</option>
        <option value="partial" ${currentStatus === "partial" ? "selected" : ""}>Частично</option>
        <option value="reserved" ${currentStatus === "reserved" ? "selected" : ""}>Забронировано</option>
    `;

    select.onchange = () => {
        const newStatus = select.value;
        fetch(`${PARTICIPANTS_API}${participantId}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        })
        .then(res => {
            if (!res.ok) throw new Error("Ошибка при обновлении статуса");
            fetchEvents();
        })
        .catch(err => alert("Ошибка: " + err.message));
    };

    chipElement.replaceWith(select);
    select.focus();
}
