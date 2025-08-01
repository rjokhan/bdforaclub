const API_URL = "/api/residents/";
let TOTAL_EVENTS = 0;

function fetchTotalEvents() {
    return fetch("/api/events/")
        .then(res => res.json())
        .then(data => {
            TOTAL_EVENTS = data.length;
        });
}

function fetchResidents() {
    fetchTotalEvents().then(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                renderResidents(data);
            });
    });
}

function renderResidents(data) {
    const tbody = document.querySelector("#residentsTable tbody");
    tbody.innerHTML = "";

    data.sort((a, b) => b.total_events - a.total_events);

    data.forEach((resident, index) => {
        const tr = document.createElement("tr");

        const percent = TOTAL_EVENTS > 0 ? (resident.total_events / TOTAL_EVENTS) * 100 : 0;

        if (resident.total_events === 0) tr.classList.add("resident-row", "gray");
        else if (percent < 20) tr.classList.add("resident-row", "red");
        else if (percent < 80) tr.classList.add("resident-row", "yellow");
        else tr.classList.add("resident-row", "green");

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${resident.full_name}</td>
            <td>${resident.phone}</td>
            <td>${resident.active_events}</td>
            <td>${resident.attended_events}</td>
            <td>${resident.total_events}</td>
            <td><button class="delete-btn" onclick="deleteResident(${resident.id})">−</button></td>
        `;

        tr.addEventListener("click", (e) => {
            if (!e.target.classList.contains("delete-btn")) {
                openPopupWithEvents(resident.id);
            }
        });

        tbody.appendChild(tr);
    });

    renderLegend();
}

function renderLegend() {
    const legend = document.getElementById("color-legend");
    if (!legend) return;

    legend.innerHTML = `
        <div style="margin-top:30px; font-size: 16px;">
            <span style="background:#e5e7eb; color: black; padding:4px 8px; border-radius:4px;">0% — Серый</span> &nbsp;
            <span style="background:#fee2e2; color: black; padding:4px 8px; border-radius:4px;">Меньше 20% — Красный</span> &nbsp;
            <span style="background:#fef9c3; color: black; padding:4px 8px; border-radius:4px;">20–80% — Жёлтый</span> &nbsp;
            <span style="background:#dcfce7; color: black; padding:4px 8px; border-radius:4px;">Больше 80% — Зелёный</span>
        </div>
    `;
}

function deleteResident(id) {
    if (!confirm("Удалить резидента?")) return;

    fetch(`${API_URL}${id}/`, {
        method: "DELETE",
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Ошибка при удалении");
            }
            fetchResidents();
        })
        .catch(err => {
            alert(err.message);
        });
}

function openPopup() {
    document.getElementById("popup-overlay").style.display = "flex";
}

function closeFormPopup() {
    document.getElementById("popup-overlay").style.display = "none";
    document.getElementById("fullNameInput").value = "";
    document.getElementById("phoneInput").value = "";
}

function addResident() {
    const full_name = document.getElementById("fullNameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();

    if (!full_name || !phone) {
        alert("Заполните все поля");
        return;
    }

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, phone })
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Ошибка при создании резидента");
            }
            return res.json();
        })
        .then(() => {
            closeFormPopup();
            fetchResidents();
        })
        .catch(err => {
            alert(err.message);
        });
}

document.addEventListener("DOMContentLoaded", fetchResidents);

function openPopupWithEvents(residentId) {
    fetch(`/api/residents/${residentId}/events/`)
        .then(res => res.json())
        .then(events => {
            const list = document.getElementById("eventsList");
            list.innerHTML = "";

            if (events.length === 0) {
                list.innerHTML = "<p>Нет ивентов.</p>";
            } else {
                events.forEach(ev => {
                    const div = document.createElement("div");
                    div.style.marginBottom = "10px";
                    div.innerHTML = `<strong>${ev.name}</strong> — <span>${ev.status === "active" ? "Активно" : "Завершено"}</span>`;
                    list.appendChild(div);
                });
            }

            document.getElementById("eventsPopup").classList.remove("hidden");
        });
}

function closePopup() {
    document.getElementById("eventsPopup").classList.add("hidden");
}
