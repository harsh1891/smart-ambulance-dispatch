const app = {
  user: null,
  sessionName: new URLSearchParams(window.location.search).get("session") || "default",
  token: null,
  eventSource: null,
  map: null,
  layers: [],
  activeEmergency: null,
  activeHospital: null,
  activeAmbulance: null,
  deferredInstallPrompt: null,
  mapObserver: null
};

app.storageKey = `sad_token_${app.sessionName}`;
app.token = localStorage.getItem(app.storageKey);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function setMessage(selector, text, type = "") {
  const node = $(selector);
  node.textContent = text;
  node.className = `message ${type}`;
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (app.token) headers.Authorization = `Bearer ${app.token}`;

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function initMap() {
  if (app.map || !window.L) return;
  app.map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView([28.6139, 77.209], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(app.map);
  if (window.ResizeObserver && !app.mapObserver) {
    app.mapObserver = new ResizeObserver(() => refreshMapLayout());
    app.mapObserver.observe($("#map"));
  }
  refreshMapLayout();
}

function refreshMapLayout() {
  if (!app.map) return;
  requestAnimationFrame(() => {
    app.map.invalidateSize(true);
    setTimeout(() => app.map?.invalidateSize(true), 150);
    setTimeout(() => app.map?.invalidateSize(true), 500);
  });
}

function clearMap() {
  app.layers.forEach((layer) => layer.remove());
  app.layers = [];
}

function marker(latLng, label, color) {
  const icon = L.divIcon({
    className: "map-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18]
  });
  const layer = L.marker([latLng.lat, latLng.lng], { icon }).bindPopup(label).addTo(app.map);
  app.layers.push(layer);
  return layer;
}

async function drawRoute(points, color) {
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const route = data.routes?.[0]?.geometry?.coordinates;
    if (!route) throw new Error("No route");
    const latLngs = route.map(([lng, lat]) => [lat, lng]);
    const line = L.polyline(latLngs, { color, weight: 5, opacity: 0.82 }).addTo(app.map);
    app.layers.push(line);
    return line;
  } catch {
    const line = L.polyline(
      points.map((point) => [point.lat, point.lng]),
      { color, weight: 5, opacity: 0.65, dashArray: "8 8" }
    ).addTo(app.map);
    app.layers.push(line);
    return line;
  }
}

async function renderMapRoute({ emergency, ambulance, hospital }) {
  initMap();
  if (!app.map) {
    $("#routeSummary").textContent = "Map library is still loading. Refresh if it does not appear.";
    return;
  }
  clearMap();

  const patient = emergency.location;
  marker(patient, "Patient location", "#b42318");
  marker(ambulance.location, `${ambulance.vehicleNumber} - ${ambulance.driverName}`, "#2563eb");
  marker(hospital.location, hospital.name, "#0f766e");

  await drawRoute([ambulance.location, patient], "#2563eb");
  await drawRoute([patient, hospital.location], "#0f766e");

  const bounds = L.latLngBounds([
    [patient.lat, patient.lng],
    [ambulance.location.lat, ambulance.location.lng],
    [hospital.location.lat, hospital.location.lng]
  ]);
  app.map.fitBounds(bounds.pad(0.25));
  refreshMapLayout();

  $("#routeSummary").textContent =
    `${emergency.routePlan.etaToPatientMinutes} min to patient, ` +
    `${emergency.routePlan.etaToHospitalMinutes} min to hospital`;
}

function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#dashboardView").classList.add("hidden");
  $("#logoutBtn").classList.add("hidden");
  $("#sessionLabel").textContent = "Not signed in";
}

function showDashboard() {
  $("#authView").classList.add("hidden");
  $("#dashboardView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  $("#sessionLabel").textContent = `${app.user.name} (${app.user.role})`;
  $("#roleBadge").textContent = app.user.role === "driver" ? "Ambulance driver" : "Patient dashboard";

  const patientNav = $('[data-view="patientPanel"]');
  const driverNav = $('[data-view="driverPanel"]');
  if (app.user.role === "patient") {
    patientNav.click();
    patientNav.disabled = false;
    patientNav.classList.remove("hidden");
    driverNav.disabled = true;
    driverNav.classList.add("hidden");
  } else {
    driverNav.click();
    patientNav.disabled = true;
    patientNav.classList.add("hidden");
    driverNav.disabled = false;
    driverNav.classList.remove("hidden");
  }

  initMap();
  refreshMapLayout();
}

function renderFirstAid(firstAid) {
  $("#firstAidBox").innerHTML = `
    <div>
      <h3>${firstAid.title}</h3>
      <p class="danger-text">${firstAid.disclaimer}</p>
      <ul>${firstAid.steps.map((step) => `<li>${step}</li>`).join("")}</ul>
    </div>
  `;
}

function assignmentHtml({ emergency, ambulance, hospital }) {
  const accepted = emergency.status === "accepted";
  const hospitalSource = hospital.source ? ` via ${hospital.source}` : "";
  return `
    <article class="mini-card">
      <h3>${accepted ? "Ambulance accepted" : "Waiting for driver response"}</h3>
      <p><strong>Status:</strong> ${emergency.status.replaceAll("_", " ")}</p>
      <p><strong>Ambulance:</strong> ${ambulance.vehicleNumber}</p>
      <p><strong>Driver:</strong> ${accepted ? `${ambulance.driverName} (${ambulance.driverPhone})` : "Hidden until driver accepts"}</p>
      <p><strong>Hospital:</strong> ${hospital.name} (${hospital.phone})${hospitalSource}</p>
      <p><strong>ETA:</strong> ${emergency.routePlan.etaToPatientMinutes} min to patient, ${emergency.routePlan.etaToHospitalMinutes} min to hospital</p>
    </article>
  `;
}

function renderPatientAssignment(payload) {
  app.activeEmergency = payload.emergency;
  app.activeAmbulance = payload.ambulance;
  app.activeHospital = payload.hospital || app.activeHospital;
  $("#patientAssignment").classList.remove("empty-state");
  $("#patientAssignment").innerHTML = assignmentHtml({
    emergency: app.activeEmergency,
    ambulance: app.activeAmbulance,
    hospital: app.activeHospital
  });
  renderFirstAid(payload.emergency.firstAid);
  renderMapRoute({
    emergency: app.activeEmergency,
    ambulance: app.activeAmbulance,
    hospital: app.activeHospital
  });
}

function renderNoAmbulance(message) {
  $("#patientAssignment").classList.remove("empty-state");
  $("#patientAssignment").innerHTML = `
    <article class="mini-card alert-card">
      <h3>No ambulance online</h3>
      <p>${message}</p>
      <p><strong>How to make it work:</strong> a driver must sign up, keep the driver app open, click Use ambulance GPS, and click Update status.</p>
      <div class="button-row">
        <a class="ghost action-link" href="/?session=driver" target="_blank">Open driver app</a>
        <button class="primary" type="button" id="retryEmergency">Try again</button>
      </div>
    </article>
  `;
  $("#retryEmergency").addEventListener("click", () => $("#emergencyForm").requestSubmit());
}

function renderDriverAlert(payload) {
  app.activeEmergency = payload.emergency;
  app.activeAmbulance = payload.ambulance;
  app.activeHospital = payload.hospital;

  const emergency = payload.emergency;
  $("#driverAlert").classList.remove("empty-state");
  $("#driverAlert").innerHTML = `
    <article class="mini-card alert-card">
      <h3>Emergency alert: ${emergency.firstAid.title}</h3>
      <p><strong>Patient:</strong> ${emergency.patientName} (${emergency.patientPhone})</p>
      <p><strong>Details:</strong> ${emergency.description || "No extra details"}</p>
      <p><strong>ETA:</strong> ${emergency.routePlan.etaToPatientMinutes} min to patient, ${emergency.routePlan.etaToHospitalMinutes} min to hospital</p>
      <p><strong>Hospital:</strong> ${payload.hospital.name}${payload.hospital.source ? ` via ${payload.hospital.source}` : ""}</p>
      <div class="button-row">
        <button class="primary" type="button" id="acceptEmergency">Accept</button>
        <button class="ghost" type="button" id="rejectEmergency">Reject</button>
      </div>
    </article>
  `;

  $("#acceptEmergency").addEventListener("click", () => respondToEmergency("accept"));
  $("#rejectEmergency").addEventListener("click", () => respondToEmergency("reject"));
  renderMapRoute(payload);
}

async function respondToEmergency(action) {
  if (!app.activeEmergency) return;
  try {
    const payload = await api(`/api/emergencies/${app.activeEmergency.id}/respond`, {
      method: "POST",
      body: { action }
    });
    setMessage("#driverMessage", `Emergency ${action}ed.`, "success");
    if (action === "accept") {
      $("#driverAlert").innerHTML += `
        <button class="primary" type="button" id="completeEmergency">Mark completed</button>
      `;
      $("#completeEmergency").addEventListener("click", completeEmergency);
      renderMapRoute(payload);
    } else {
      $("#driverAlert").innerHTML = `<div class="empty-state">Alert rejected. Waiting for next emergency.</div>`;
    }
  } catch (error) {
    setMessage("#driverMessage", error.message, "error");
  }
}

async function completeEmergency() {
  try {
    await api(`/api/emergencies/${app.activeEmergency.id}/complete`, { method: "POST" });
    $("#driverAlert").innerHTML = `<div class="empty-state">Emergency completed. You are available again.</div>`;
    setMessage("#driverMessage", "Case completed.", "success");
    loadSystemData();
  } catch (error) {
    setMessage("#driverMessage", error.message, "error");
  }
}

async function loadSystemData() {
  const lat = Number($("#driverLat")?.value);
  const lng = Number($("#driverLng")?.value);
  const query = Number.isFinite(lat) && Number.isFinite(lng) ? `?lat=${lat}&lng=${lng}` : "";
  const { hospitals } = await api(`/api/hospitals${query}`);

  if ($("#hospitalList")) {
    $("#hospitalList").innerHTML = hospitals
    .map(
      (hospital) => `
        <article class="mini-card">
          <h3>${hospital.name}</h3>
          <p>${hospital.phone}${hospital.distanceKm ? ` - ${hospital.distanceKm} km away` : ""}</p>
          ${hospital.source ? `<p><strong>Source:</strong> ${hospital.source}</p>` : ""}
          <div class="pill-row">${hospital.specialties.map((item) => `<span class="pill">${item}</span>`).join("")}</div>
        </article>
      `
    )
    .join("");
  }
}

function connectEvents() {
  if (app.eventSource) app.eventSource.close();
  app.eventSource = new EventSource(`/api/events?token=${app.token}`);

  app.eventSource.addEventListener("open", () => {
    $("#connectionStatus").textContent = "Online";
  });
  app.eventSource.addEventListener("error", () => {
    $("#connectionStatus").textContent = "Reconnecting";
  });
  app.eventSource.addEventListener("emergency", (event) => {
    renderDriverAlert(JSON.parse(event.data));
    loadSystemData();
  });
  app.eventSource.addEventListener("status", (event) => {
    renderPatientAssignment(JSON.parse(event.data));
    loadSystemData();
  });
}

async function restoreSession() {
  if (!app.token) return showAuth();
  try {
    const payload = await api("/api/me");
    app.user = payload.user;
    showDashboard();
    connectEvents();
    loadSystemData();
    if (payload.ambulance) {
      $("#availableToggle").checked = payload.ambulance.available;
      $("#driverLat").value = payload.ambulance.location.lat;
      $("#driverLng").value = payload.ambulance.location.lng;
    }
  } catch {
    localStorage.removeItem(app.storageKey);
    app.token = null;
    showAuth();
  }
}

function setupAuth() {
  let mode = "signup";

  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      $$(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      $("#nameField").classList.toggle("hidden", mode === "login");
      $("#roleField").classList.toggle("hidden", mode === "login");
      $("#vehicleField").classList.toggle(
        "hidden",
        mode === "login" || $('[name="role"]:checked')?.value !== "driver"
      );
      $("#authSubmit").textContent = mode === "signup" ? "Create account" : "Login";
      setMessage("#authMessage", "");
    });
  });

  $$('[name="role"]').forEach((input) => {
    input.addEventListener("change", () => {
      $("#vehicleField").classList.toggle("hidden", input.value !== "driver" || !input.checked);
    });
  });

  $("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api(`/api/auth/${mode}`, {
        method: "POST",
        body: {
          name: form.get("name"),
          phone: form.get("phone"),
          password: form.get("password"),
          role: form.get("role"),
          vehicleNumber: form.get("vehicleNumber")
        }
      });
      app.user = payload.user;
      app.token = payload.user.token;
      localStorage.setItem(app.storageKey, app.token);
      showDashboard();
      connectEvents();
      loadSystemData();
      setMessage("#authMessage", "");
    } catch (error) {
      setMessage("#authMessage", error.message, "error");
    }
  });
}

function setupDashboard() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      $$(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      $$(".view-panel").forEach((panel) => panel.classList.add("hidden"));
      $(`#${button.dataset.view}`).classList.remove("hidden");
      setTimeout(() => app.map?.invalidateSize(), 80);
      refreshMapLayout();
    });
  });

  $("#logoutBtn").addEventListener("click", () => {
    app.eventSource?.close();
    app.user = null;
    app.token = null;
    localStorage.removeItem(app.storageKey);
    showAuth();
  });

  $("#useLocationBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      setMessage("#patientMessage", "Geolocation is not supported in this browser.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        $('[name="lat"]').value = position.coords.latitude.toFixed(6);
        $('[name="lng"]').value = position.coords.longitude.toFixed(6);
        if (app.map) {
          app.map.setView([position.coords.latitude, position.coords.longitude], 15);
          clearMap();
          marker(
            { lat: position.coords.latitude, lng: position.coords.longitude },
            "Your current emergency location",
            "#b42318"
          );
          refreshMapLayout();
        }
        setMessage("#patientMessage", "Location filled from browser GPS.", "success");
      },
      () => setMessage("#patientMessage", "Could not access location. You can enter it manually.", "error")
    );
  });

  $("#useDriverLocationBtn").addEventListener("click", () => {
    if (!navigator.geolocation) {
      setMessage("#driverMessage", "Geolocation is not supported in this browser.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        $("#driverLat").value = position.coords.latitude.toFixed(6);
        $("#driverLng").value = position.coords.longitude.toFixed(6);
        if (app.map) {
          app.map.setView([position.coords.latitude, position.coords.longitude], 15);
          clearMap();
          marker(
            { lat: position.coords.latitude, lng: position.coords.longitude },
            "Your ambulance location",
            "#2563eb"
          );
          refreshMapLayout();
        }
        setMessage("#driverMessage", "Ambulance GPS location filled. Click Update status.", "success");
        loadSystemData();
      },
      () => setMessage("#driverMessage", "Could not access location. You can enter it manually.", "error")
    );
  });

  $('[name="incidentType"]').addEventListener("change", () => {
    const selected = $('[name="incidentType"]').value;
    const localGuidance = {
      accident: ["Road accident", "Move to safety only if safe.", "Do not remove helmet unless breathing is blocked."],
      bleeding: ["Heavy bleeding", "Apply direct pressure.", "Keep pressure continuous."],
      heart_attack: ["Possible heart attack", "Sit and rest.", "Use prescribed medicine only if available."],
      breathing: ["Breathing difficulty", "Sit upright.", "Use prescribed inhaler if available."],
      stroke: ["Possible stroke", "Note symptom start time.", "Do not give food or drink."],
      burn: ["Burn injury", "Cool under running water.", "Do not apply ice or oil."],
      fracture: ["Possible fracture", "Keep injured area still.", "Do not straighten deformity."]
    };
    const [title, ...steps] = localGuidance[selected];
    renderFirstAid({
      title,
      disclaimer: "Educational guidance only. Call emergency services immediately.",
      steps
    });
  });

  $("#emergencyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/emergencies", {
        method: "POST",
        body: {
          incidentType: form.get("incidentType"),
          description: form.get("description"),
          location: {
            lat: Number(form.get("lat")),
            lng: Number(form.get("lng"))
          }
        }
      });
      app.activeHospital = payload.hospital;
      renderPatientAssignment(payload);
      setMessage("#patientMessage", "Emergency sent to nearest available driver.", "success");
      loadSystemData();
    } catch (error) {
      setMessage("#patientMessage", error.message, "error");
      if (error.message.includes("No ambulance")) {
        renderNoAmbulance(error.message);
      }
    }
  });

  $("#saveDriverStatus").addEventListener("click", async () => {
    try {
      const payload = await api("/api/driver/status", {
        method: "PATCH",
        body: {
          available: $("#availableToggle").checked,
          location: {
            lat: Number($("#driverLat").value),
            lng: Number($("#driverLng").value)
          }
        }
      });
      setMessage(
        "#driverMessage",
        `Status updated: ${payload.ambulance.available ? "available" : "unavailable"}.`,
        "success"
      );
      loadSystemData();
    } catch (error) {
      setMessage("#driverMessage", error.message, "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupAuth();
  setupDashboard();
  if (app.sessionName === "driver") {
    $('[name="role"][value="driver"]').checked = true;
    $("#vehicleField").classList.remove("hidden");
  }
  if (app.sessionName === "patient") {
    $('[name="role"][value="patient"]').checked = true;
  }
  restoreSession();
});

window.addEventListener("load", () => {
  refreshMapLayout();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  app.deferredInstallPrompt = event;
  $("#installBtn")?.classList.remove("hidden");
});

$("#installBtn")?.addEventListener("click", async () => {
  if (!app.deferredInstallPrompt) return;
  app.deferredInstallPrompt.prompt();
  await app.deferredInstallPrompt.userChoice;
  app.deferredInstallPrompt = null;
  $("#installBtn")?.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
