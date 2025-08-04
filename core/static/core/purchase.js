const RESIDENTS_API = "/api/residents/";
const PARTICIPATIONS_API = "/api/participants/";
const EVENTS_API = "/api/events/";

let selectedEventId = null;
let allResidents = [];
let selectedResidents = [];
let existingParticipantIds = [];

function openPurchasePopup() {
    const overlay = document.getElementById("purchase-popup-overlay");
    if (!overlay) return;

    overlay.classList.remove("hidden");

    document.getElementById("purchase-step-event").style.display = "block";
    document.getElementById("purchase-step-residents").style.display = "none";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("save-purchase-button").classList.add("hidden");

    selectedEventId = null;
    selectedResidents = [];
    existingParticipantIds = [];

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(renderEventButtons)
        .catch(() => alert("Ошибка при загрузке событий"));
}

function closePurchasePopup() {
    const overlay = document.getElementById("purchase-popup-overlay");
    if (!overlay) return;

    overlay.classList.add("hidden");

    selectedEventId = null;
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("event-list-container").innerHTML = "";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("save-purchase-button").classList.add("hidden");
}

function renderEventButtons(events) {
    const container = document.getElementById("event-list-container");
    container.innerHTML = "";

    events
        .filter(event => !event.is_finished)
        .forEach(event => {
            const btn = document.createElement("div");
            btn.className = "event-button";
            btn.textContent = `${event.title} (${event.date})`;
            btn.style.cursor = "pointer";
            btn.onclick = () => selectEvent(event.id);
            container.appendChild(btn);
        });
}

function selectEvent(eventId) {
    selectedEventId = eventId;

    document.getElementById("purchase-step-event").style.display = "none";
    document.getElementById("purchase-step-residents").style.display = "block";

    Promise.all([
        fetch(RESIDENTS_API).then(res => res.json()),
        fetch(PARTICIPATIONS_API).then(res => res.json())
    ])
    .then(([residents, participations]) => {
        allResidents = residents;
        existingParticipantIds = participations
            .filter(p => p.event === selectedEventId)
            .map(p => p.resident);
    })
    .catch(() => alert("Ошибка при загрузке резидентов или участников"));
}

function searchResidents() {
    const input = document.getElementById("resident-search-input").value.toLowerCase();
    const container = document.getElementById("resident-search-results");
    container.innerHTML = "";

    const results = allResidents.filter(r =>
        (r.full_name?.toLowerCase().includes(input) || r.phone?.includes(input)) &&
        !selectedResidents.find(sr => sr.id === r.id) &&
        !existingParticipantIds.includes(r.id)
    );

    if (results.length === 0) {
        container.innerHTML = "<p>Ничего не найдено или уже добавлен.</p>";
        return;
    }

    results.forEach(resident => {
        const div = document.createElement("div");
        div.className = "new-selected-resident";

        const label = document.createElement("span");
        label.textContent = `${resident.full_name} (${resident.phone})`;

        const btn = document.createElement("button");
        btn.textContent = "➕";
        btn.onclick = () => {
            selectedResidents.push({ ...resident, status: null });
            renderSelectedResidents();
        };

        div.appendChild(label);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

function renderSelectedResidents() {
    const container = document.getElementById("selected-residents-list");
    container.innerHTML = "";

    selectedResidents.forEach((r, i) => {
        const div = document.createElement("div");
        div.className = "new-selected-resident";
        div.setAttribute("data-id", r.id);

        const label = document.createElement("span");
        label.textContent = `${r.full_name} (${r.phone})`;

        const select = document.createElement("select");
        select.innerHTML = `
            <option value="">Выберите статус</option>
            <option value="paid">Оплачено</option>
            <option value="reserved">Забронировано</option>
            <option value="partial">Оплачено частично</option>
        `;
        select.onchange = () => {
            selectedResidents[i].status = select.value;
            checkStatuses();
        };

        div.appendChild(label);
        div.appendChild(select);
        container.appendChild(div);
    });

    checkStatuses();
}

function checkStatuses() {
    const allSelected = selectedResidents.length > 0 && selectedResidents.every(r => r.status);
    document.getElementById("save-purchase-button").classList.toggle("hidden", !allSelected);
}

function savePurchases() {
    const today = new Date().toISOString().split("T")[0];

    const promises = selectedResidents.map(r =>
        fetch(PARTICIPATIONS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resident: r.id,
                event: selectedEventId,
                status: r.status,
                joined_at: today,
                payment:
                    r.status === "paid" ? 100000 :
                    r.status === "partial" ? 50000 : 0,
                attended: false,
                notified: false,
                came: false
            })
        })
    );

    Promise.all(promises)
        .then(responses => {
            const failed = responses.find(r => !r.ok);
            if (failed) {
                failed.json().then(data => {
                    alert("Ошибка при сохранении: " + JSON.stringify(data));
                });
                return;
            }

            alert("Покупки добавлены");
            closePurchasePopup();
            if (typeof fetchEvents === "function") fetchEvents();
        })
        .catch(err => {
            console.error(err);
            alert("Ошибка при сохранении");
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("addPurchaseBtn");
    if (btn) {
        btn.addEventListener("click", openPurchasePopup);
    }
});
