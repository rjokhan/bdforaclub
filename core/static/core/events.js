const EVENTS_API = "/api/events/";
const PARTICIPANTS_API = "/api/participants/";
const RESIDENTS_API = "/api/residents/";

let selectedEventId = null;

function fetchEvents() {
    Promise.all([
        fetch(EVENTS_API).then(res => res.json()),
        fetch(PARTICIPANTS_API).then(res => res.json())
    ])
    .then(([events, participations]) => {
        renderEvents(events, participations);
    })
    .catch(() => alert("Ошибка при загрузке событий"));
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
        if (event.is_finished) tr.style.backgroundColor = "rgba(255, 0, 0, 0.15)";

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

        tr.querySelector(".delete-btn").addEventListener("click", e => {
            e.stopPropagation();
            deleteEvent(event.id);
        });

        tr.querySelector(".status-btn").addEventListener("click", e => {
            e.stopPropagation();
            toggleStatus(event.id, event.is_finished);
        });

        tr.addEventListener("click", () => openEventPopupWithParticipants(event.id));
        tbody.appendChild(tr);
    });
}

function deleteEvent(id) {
    if (!confirm("Удалить событие?")) return;
    fetch(`${EVENTS_API}${id}/`, { method: "DELETE" })
        .then(res => res.ok ? fetchEvents() : Promise.reject())
        .catch(() => alert("Ошибка при удалении"));
}

function toggleStatus(id, isFinished) {
    if (!confirm(isFinished ? "Желаете вернуть ивент в статус активно?" : "Завершить ивент?")) return;
    fetch(`${EVENTS_API}${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_finished: !isFinished })
    })
    .then(res => res.ok ? fetchEvents() : Promise.reject())
    .catch(() => alert("Ошибка при обновлении статуса"));
}

function openEventPopupWithParticipants(eventId) {
    fetch(`/api/participants/?event=${eventId}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("participantsList");
            container.innerHTML = data.length === 0 ? "<p>Нет участников</p>" : "";

            if (data.length > 0) {
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
            }

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

function toggleState(button, id, field, value) {
    const parent = button.parentElement;
    const buttons = parent.querySelectorAll("button");

    fetch(`${PARTICIPANTS_API}${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
    })
    .then(res => {
        if (!res.ok) throw new Error();
        buttons.forEach(b => b.classList.remove("active"));
        button.classList.add("active");
    })
    .catch(() => alert("Ошибка при обновлении"));
}

function deleteParticipation(id) {
    if (!confirm("Удалить этого участника?")) return;
    fetch(`${PARTICIPANTS_API}${id}/`, { method: "DELETE" })
        .then(res => res.ok ? (fetchEvents(), closeParticipantsPopup()) : Promise.reject())
        .catch(() => alert("Ошибка при удалении"));
}

function closeParticipantsPopup() {
    document.getElementById("eventParticipantsPopup").classList.add("hidden");
}

// === Добавление покупки ===

function openPurchasePopup() {
    document.getElementById("purchase-popup-overlay").style.display = "flex";

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(events => {
            const container = document.getElementById("event-list-container");
            container.innerHTML = "";
            events.filter(e => !e.is_finished).forEach(event => {
                const div = document.createElement("div");
                div.textContent = `${event.title} (${event.date})`;
                div.style.cursor = "pointer";
                div.onclick = () => {
                    selectedEventId = event.id;
                    document.getElementById("purchase-step-event").style.display = "none";
                    document.getElementById("purchase-step-residents").style.display = "block";
                };
                container.appendChild(div);
            });
        });
}

function closePurchasePopup() {
    document.getElementById("purchase-popup-overlay").style.display = "none";
    document.getElementById("purchase-step-event").style.display = "block";
    document.getElementById("purchase-step-residents").style.display = "none";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
}

function searchResidents() {
    const query = document.getElementById("resident-search-input").value.trim().toLowerCase();

    fetch(RESIDENTS_API)
        .then(res => res.json())
        .then(data => {
            const resultsContainer = document.getElementById("resident-search-results");
            resultsContainer.innerHTML = "";

            const selectedIds = Array.from(document.querySelectorAll("#selected-residents-list [data-id]"))
                .map(el => parseInt(el.getAttribute("data-id")));

            const filtered = data.filter(r =>
                !selectedIds.includes(r.id) &&
                ((r.full_name || "").toLowerCase().includes(query) || String(r.phone || "").includes(query))
            );

            if (filtered.length === 0) {
                resultsContainer.innerHTML = "<p>Ничего не найдено или уже добавлен.</p>";
                return;
            }

            filtered.forEach(resident => {
                const div = document.createElement("div");
                div.innerHTML = `
                    ${resident.full_name || "—"} (${resident.phone || "—"})
                    <button onclick="selectResident(${resident.id}, '${(resident.full_name || "—").replace(/'/g, "\\'")}', '${(resident.phone || "—").replace(/'/g, "\\'")}')">Добавить</button>
                `;
                resultsContainer.appendChild(div);
            });
        });
}

function selectResident(id, full_name, phone) {
    const container = document.getElementById("selected-residents-list");

    const div = document.createElement("div");
    div.setAttribute("data-id", id);
    div.innerHTML = `
        ${full_name} (${phone})
        <select>
            <option value="paid">Оплачено</option>
            <option value="partial">Частично</option>
            <option value="reserved">Забронировано</option>
        </select>
    `;
    container.appendChild(div);
    document.getElementById("save-purchase-button").style.display = "block";
}

function savePurchases() {
    const residents = Array.from(document.querySelectorAll("#selected-residents-list [data-id]")).map(div => {
        return {
            resident: parseInt(div.getAttribute("data-id")),
            status: div.querySelector("select").value
        };
    });

    if (!selectedEventId) {
        alert("Сначала выберите ивент");
        return;
    }

    const promises = residents.map(r =>
        fetch(PARTICIPANTS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: selectedEventId, resident: r.resident, status: r.status })
        })
    );

    Promise.all(promises)
        .then(responses => {
            if (responses.some(res => !res.ok)) throw new Error();
            closePurchasePopup();
            fetchEvents();
        })
        .catch(() => alert("Ошибка при сохранении"));
}

document.addEventListener("DOMContentLoaded", fetchEvents);


