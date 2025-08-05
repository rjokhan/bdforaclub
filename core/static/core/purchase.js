const RESIDENTS_API = "/api/residents/";
const PARTICIPANTS_API = "/api/participants/";
const EVENTS_API = "/api/events/";

let selectedEventId = null;
let selectedEvent = null;
let allResidents = [];
let selectedResidents = [];
let existingParticipantIds = [];

// 👉 Открытие попапа
function openPurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    if (!popup) return alert("Попап purchasePopup не найден");

    popup.classList.remove("hidden");

    fetch(EVENTS_API)
        .then(res => res.json())
        .then(events => {
            const container = document.getElementById("event-list-container");
            container.innerHTML = "";

            events.forEach(event => {
                const div = document.createElement("div");
                div.textContent = `${event.title} (${event.date})`;
                div.style.cursor = "pointer";
                div.style.padding = "8px";
                div.style.border = "1px solid #ccc";
                div.style.borderRadius = "6px";
                div.onclick = () => {
                    selectedEventId = event.id;
                    selectedEvent = event;
                    document.getElementById("purchase-step-event").style.display = "none";
                    document.getElementById("purchase-step-residents").style.display = "block";
                    loadResidentsAndParticipants();
                };
                container.appendChild(div);
            });
        })
        .catch(() => alert("Ошибка при загрузке событий"));
}

// 👉 Закрытие попапа
function closePurchasePopup() {
    const popup = document.getElementById("purchasePopup");
    if (!popup) return;

    popup.classList.add("hidden");

    selectedEventId = null;
    selectedEvent = null;
    selectedResidents = [];
    existingParticipantIds = [];

    document.getElementById("purchase-step-event").style.display = "block";
    document.getElementById("purchase-step-residents").style.display = "none";
    document.getElementById("selected-residents-list").innerHTML = "";
    document.getElementById("resident-search-input").value = "";
    document.getElementById("resident-search-results").innerHTML = "";
    document.getElementById("save-purchase-button").classList.add("hidden");
}

// 👉 Загрузка резидентов и участников
function loadResidentsAndParticipants() {
    Promise.all([
        fetch(RESIDENTS_API).then(res => res.json()),
        fetch(PARTICIPANTS_API).then(res => res.json())
    ])
    .then(([residents, participants]) => {
        allResidents = residents;
        existingParticipantIds = participants
            .filter(p => p.event === selectedEventId)
            .map(p => typeof p.resident === "object" ? p.resident.id : p.resident);
    })
    .catch(() => alert("Ошибка при загрузке резидентов или участников"));
}

// 👉 Поиск резидентов
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
            container.innerHTML = "";
            document.getElementById("resident-search-input").value = "";
        };

        div.appendChild(label);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

// 👉 Отображение выбранных резидентов
function renderSelectedResidents() {
    const container = document.getElementById("selected-residents-list");
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
        select.value = r.status || "";
        select.onchange = () => {
            selectedResidents[i].status = select.value;
            checkAllStatusesSelected();
        };

        div.appendChild(label);
        div.appendChild(select);
        container.appendChild(div);
    });

    checkAllStatusesSelected();
}

// 👉 Проверка: все ли выбрали статус
function checkAllStatusesSelected() {
    const allSelected = selectedResidents.length > 0 && selectedResidents.every(r => r.status);
    document.getElementById("save-purchase-button").classList.toggle("hidden", !allSelected);
}

// 👉 Сохранение покупок
function savePurchases() {
    const today = new Date().toISOString().split("T")[0];

    console.log("Отправка данных:", selectedResidents);

    const requests = selectedResidents.map(r =>
        fetch(PARTICIPANTS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resident: r.id,
                event: selectedEventId,
                status: r.status,
                joined_at: today,
                payment:
                    r.status === "paid" ? selectedEvent.price :
                    r.status === "partial" ? selectedEvent.price / 2 : 0,
                attended: false,
                notified: false,
                came: false
            })
        })
    );

    Promise.all(requests)
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
