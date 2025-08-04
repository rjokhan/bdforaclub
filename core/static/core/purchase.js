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

    events
        .filter(e => !e.is_finished)
        .forEach(event => {
            const btn = document.createElement("button");
            btn.textContent = `${event.title} (${event.date})`;
            btn.className = "event-button";
            btn.onclick = () => selectEventForPurchase(event.id);
            container.appendChild(btn);
        });
}

function selectEventForPurchase(eventId) {
    selectedEventId = eventId;

    document.getElementById("purchase-step-event").style.display = "none";
    document.getElementById("purchase-step-residents").style.display = "block";
    document.getElementById("save-purchase-button").style.display = "none";

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
    const results = allResidents.filter(r =>
        r.full_name.toLowerCase().includes(input) ||
        r.phone.includes(input)
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
        div.textContent = `${resident.full_name} (${resident.phone})`;

        const btn = document.createElement("button");
        btn.textContent = "Добавить";
        btn.onclick = () => addResidentToList(resident);

        div.appendChild(btn);
        container.appendChild(div);
    });

    if (!container.innerHTML.trim()) {
        container.innerHTML = "<p>Ничего не найдено или уже добавлен.</p>";
    }
}

function addResidentToList(resident) {
    if (selectedResidents.find(r => r.id === resident.id)) {
        alert("Резидент уже выбран");
        return;
    }

    selectedResidents.push({ ...resident, status: null });
    renderSelectedResidents();
}

function renderSelectedResidents() {
    const container = document.getElementById("selected-residents-list");
    container.innerHTML = "";

    selectedResidents.forEach((resident, index) => {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("data-id", resident.id);  // 💥 КРИТИЧЕСКО!
        wrapper.style.marginTop = "10px";

        const label = document.createElement("span");
        label.textContent = `${resident.full_name} (${resident.phone})`;

        const select = document.createElement("select");
        select.innerHTML = `
            <option value="">Выберите статус</option>
            <option value="paid">Оплачено</option>
            <option value="reserved">Забронировано</option>
            <option value="partial">Оплачено частично</option>
        `;
        select.onchange = () => {
            selectedResidents[index].status = select.value;
            checkAllStatusesSelected();
        };

        wrapper.appendChild(label);
        wrapper.appendChild(select);
        container.appendChild(wrapper);
    });

    checkAllStatusesSelected();
}

function checkAllStatusesSelected() {
    const allSelected = selectedResidents.every(r => r.status);
    document.getElementById("save-purchase-button").style.display = allSelected ? "block" : "none";
}

function savePurchases() {
    const today = new Date().toISOString().split("T")[0];

    const elements = Array.from(document.querySelectorAll("#selected-residents-list div[data-id]"));
    if (!elements.length) {
        alert("Ошибка: выбранные резиденты не найдены");
        return;
    }

    const toSend = elements.map(div => {
        const id = parseInt(div.getAttribute("data-id"));
        const status = div.querySelector("select").value;
        const payment =
            status === "paid" ? 100000 :
            status === "partial" ? 50000 : 0;

        return {
            resident: id,
            event: selectedEventId,
            status,
            joined_at: today,
            payment,
            attended: false,
            notified: false,
            came: false
        };
    });

    Promise.all(toSend.map(r =>
        fetch(PARTICIPATIONS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r)
        })
    ))
    .then(responses => {
        const failed = responses.find(res => !res.ok);
        if (failed) {
            failed.json().then(data => {
                console.error("Ошибка сервера:", data);
                alert("Ошибка при сохранении: " + JSON.stringify(data));
            });
            return;
        }

        alert("Покупки успешно добавлены!");
        closePurchasePopup();
        if (typeof fetchEvents === "function") fetchEvents();
    })
    .catch(err => {
        console.error("Ошибка при сохранении:", err);
        alert("Ошибка при сохранении покупок");
    });
}
