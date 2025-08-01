const API_URL = "/api/residents/";

function fetchResidents() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#residentsTable tbody");
            tbody.innerHTML = "";

            data.sort((a, b) => b.total_events - a.total_events); // сортировка

            data.forEach(resident => {
                const tr = document.createElement("tr");

                const percent = resident.total_events > 0
                    ? (resident.attended_events / resident.total_events) * 100
                    : 0;

                if (resident.total_events === 0) tr.classList.add("resident-row", "gray");
                else if (percent >= 70) tr.classList.add("resident-row", "green");
                else if (percent >= 30) tr.classList.add("resident-row", "yellow");
                else tr.classList.add("resident-row", "red");

                tr.innerHTML = `
                    <td>${resident.full_name}</td>
                    <td>${resident.phone}</td>
                    <td>${resident.active_events}</td>
                    <td>${resident.attended_events}</td>
                    <td>${resident.total_events}</td>
                `;
                tbody.appendChild(tr);
            });
        });
}

function openPopup() {
    document.getElementById("popup").style.display = "block";
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

function addResident() {
    const full_name = document.getElementById("fullNameInput").value;
    const phone = document.getElementById("phoneInput").value;

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, phone })
    }).then(() => {
        closePopup();
        fetchResidents();
    });
}

document.addEventListener("DOMContentLoaded", fetchResidents);
