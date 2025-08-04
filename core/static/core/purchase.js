const RESIDENTS_API = "/api/residents/";
const EVENTS_API = "/api/events/";
const PARTICIPANTS_API = "/api/participants/";

let selectedEventId = null;
let allResidents = [];
let selectedResidents = [];
let existingParticipantIds = [];

function openPurchasePopup() {
    const overlay = document.getElementById("purchase-popup-overlay");
    if (!overlay) return;

    overlay.style.display = "flex";
    document.getElementById("purchase-step-event").style.display = "block";
    document.getElementById("purchase-step-residents").style.display = "none";

    selectedEventId = null;
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("event-list-container").innerHTML = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("save-purchase-button").style.display = "none";

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(renderEventSelection)
        .catch(() => alert("Ошибка при загрузке событий"));
}

function closePurchasePopup() {
    const overlay = document.getElementById("purchase-popup-overlay");
    if (!overlay) return;

    overlay.style.display = "none";
    selectedEventId = null;
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("event-list-container").innerHTML = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("save-purchase-button").style.display = "none";
}

function renderEventSelection(events) {
    const container = document.getElementById("event-list-container");
    container.innerHTML = "";

    events.filter(e => !e.is_finished).forEach(event => {
        const div = document.createElement("div");
        div.textContent = `${event.title} (${event.date})`;
        div.style.cursor = "pointer";
        div.onclick = () => selectEventForPurchase(event.id);
        container.appendChild(div);
    });
}

function selectEventForPurchase(eventId) {
    selectedEventId = eventId;
    document.getElementById("purchase-step-event").style.display = "none";
    document.getElementById("purchase-step-residents").style.display = "block";
    document.getElementById("save-purchase-button").style.display = "none";

    Promise.all([
        fetch(RESIDENTS_API).then(res => res.json()),
        fetch(PARTICIPANTS_API).then(res => res.json())
    ])
    .then(([residents, participations]) => {
        allResidents = residents;
        existingParticipantIds = participations
            .filter(p => p.event === selectedEventId)
            .map(p => p.resident);
    })
    .catch(() => alert("Ошибка при загрузке данных"));
}

function searchResidents() {
    const input = document.getElementById("resident-search-input").value.trim().toLowerCase();
    const results = allResidents.filter(r =>
        r.full_name.toLowerCase().includes(input) ||
        (r.phone || "").includes(input)
    );
    renderSearchResults(results);
}

function renderSearchResults(results) {
    const container = document.getElementById("resident-search-results");
    container.innerHTML = "";

    results.forEach(resident => {
        const alreadyAdded = selectedResidents.find(r => r.id === resident.id);
        const alreadyInEvent = existingParticipantIds.includes(resident.id);
        if (alreadyAdded || alreadyInEvent) return;

        const div = document.createElement("div");
        div.innerHTML = `
            ${resident.full_name || "—"} (${resident.phone || "—"})
            <button onclick="selectResident(${resident.id}, ${JSON.stringify(resident.full_name)}, ${JSON.stringify(resident.phone)})">Добавить</button>
        `;
        container.appendChild(div);
    });

    if (!container.innerHTML.trim()) {
        container.innerHTML = "<p>Ничего не найдено или уже добавлен.</p>";
    }
}

function selectResident(id, full_name, phone) {
    const container = document.getElementById("selected-residents-list");

    if (selectedResidents.find(r => r.id === id)) return;

    selectedResidents.push({ id, full_name, phone, status: null });

    const div = document.createElement("div");
    div.setAttribute("data-id", id);
    div.innerHTML = `
        ${full_name || "—"} (${phone || "—"})
        <select onchange="handleStatusChange(${id}, this)">
            <option value="">Выберите статус</option>
            <option value="paid">Оплачено</option>
            <option value="partial">Частично</option>
            <option value="reserved">Забронировано</option>
        </select>
    `;

    container.appendChild(div);
}

function handleStatusChange(id, selectEl) {
    const index = selectedResidents.findIndex(r => r.id === id);
    if (index !== -1) {
        selectedResidents[index].status = selectEl.value;
    }
    checkAllStatusesSelected();
}

function checkAllStatusesSelected() {
    const allSelected = selectedResidents.every(r => r.status);
    document.getElementById("save-purchase-button").style.display = allSelected ? "block" : "none";
}

function savePurchases() {
    const promises = selectedResidents.map(r =>
        fetch(PARTICIPANTS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resident: r.id,
                event: selectedEventId,
                status: r.status
            })
        })
    );

    Promise.all(promises)
        .then(responses => {
            if (responses.some(res => !res.ok)) throw new Error("Ошибка при сохранении");
            alert("Покупки успешно добавлены!");
            closePurchasePopup();
            if (typeof fetchEvents === "function") fetchEvents();
        })
        .catch(() => alert("Ошибка при сохранении покупок"));
}
