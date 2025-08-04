const RESIDENTS_API = "/api/residents/";
const PARTICIPATIONS_API = "/api/participants/";
const EVENTS_API = "/api/events/";

let selectedEventId = null;
let allResidents = [];
let selectedResidents = [];
let existingParticipantIds = [];

function openNewPurchasePopup() {
    const overlay = document.getElementById("newPurchasePopupOverlay");
    overlay.classList.remove("hidden");

    document.getElementById("newPurchaseStep1").classList.remove("hidden");
    document.getElementById("newPurchaseStep2").classList.add("hidden");
    document.getElementById("newResidentSearch").value = "";
    document.getElementById("newResidentResults").innerHTML = "";
    document.getElementById("newSelectedResidents").innerHTML = "";
    document.getElementById("newSavePurchaseBtn").classList.add("hidden");

    selectedEventId = null;
    selectedResidents = [];
    existingParticipantIds = [];

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(renderNewEventButtons)
        .catch(() => alert("Ошибка при загрузке событий"));
}

function renderNewEventButtons(events) {
    const container = document.getElementById("newEventButtonsContainer");
    container.innerHTML = "";

    events.filter(e => !e.is_finished).forEach(event => {
        const btn = document.createElement("button");
        btn.className = "event-button";
        btn.textContent = `${event.title} (${event.date})`;
        btn.onclick = () => selectNewEvent(event.id);
        container.appendChild(btn);
    });
}

function selectNewEvent(eventId) {
    selectedEventId = eventId;

    document.getElementById("newPurchaseStep1").classList.add("hidden");
    document.getElementById("newPurchaseStep2").classList.remove("hidden");

    fetch(RESIDENTS_API)
        .then(res => res.json())
        .then(data => {
            allResidents = data;
        });

    fetch(PARTICIPATIONS_API)
        .then(res => res.json())
        .then(data => {
            existingParticipantIds = data
                .filter(p => p.event === selectedEventId)
                .map(p => p.resident);
        });
}

function newSearchResidents() {
    const input = document.getElementById("newResidentSearch").value.toLowerCase();
    const container = document.getElementById("newResidentResults");
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
            newRenderSelectedResidents();
        };

        div.appendChild(label);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

function newRenderSelectedResidents() {
    const container = document.getElementById("newSelectedResidents");
    container.innerHTML = "";

    selectedResidents.forEach((r, i) => {
        const div = document.createElement("div");
        div.className = "new-selected-resident";

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
            checkAllNewStatusesSelected();
        };

        div.appendChild(label);
        div.appendChild(select);
        container.appendChild(div);
    });

    checkAllNewStatusesSelected();
}

function checkAllNewStatusesSelected() {
    const allSelected = selectedResidents.length > 0 && selectedResidents.every(r => r.status);
    document.getElementById("newSavePurchaseBtn").classList.toggle("hidden", !allSelected);
}

function newSavePurchases() {
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
            closeNewPurchasePopup();
            if (typeof fetchEvents === "function") fetchEvents();
        })
        .catch(err => {
            console.error(err);
            alert("Ошибка при сохранении");
        });
}

function closeNewPurchasePopup() {
    document.getElementById("newPurchasePopupOverlay").classList.add("hidden");
}
