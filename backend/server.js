const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { hospitals, ambulances } = require("./data/seed");
const { loadPersistedState, savePersistedState } = require("./data/store");
const { readBody, sendJson, serveStatic } = require("./utils/http");
const { distanceKm, scoreDispatch } = require("./services/dispatch");
const { getFirstAid } = require("./services/firstAid");

const portArgIndex = process.argv.indexOf("--port");
const cliPort = portArgIndex >= 0 ? process.argv[portArgIndex + 1] : null;
const PORT = Number(cliPort || process.env.PORT || 4173);
const frontendDir = path.join(__dirname, "..", "frontend");
const persistedState = loadPersistedState();

const state = {
  users: persistedState.users,
  ambulances: persistedState.ambulances.length
    ? persistedState.ambulances
    : ambulances.map((ambulance) => ({ ...ambulance })),
  hospitals,
  emergencies: persistedState.emergencies,
  driverStreams: new Map(),
  patientStreams: new Map()
};

function id(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function findUserByToken(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const token = req.headers.authorization?.replace("Bearer ", "") || url.searchParams.get("token");
  if (!token) return null;
  return state.users.find((user) => user.token === token) || null;
}

function requireUser(req, res) {
  const user = findUserByToken(req);
  if (!user) {
    sendJson(res, 401, { error: "Login required" });
    return null;
  }
  return user;
}

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function notifyDriver(userId, event, payload) {
  const stream = state.driverStreams.get(userId);
  if (stream) writeEvent(stream, event, payload);
}

function notifyPatient(userId, event, payload) {
  const stream = state.patientStreams.get(userId);
  if (stream) writeEvent(stream, event, payload);
}

function emergencyView(emergency) {
  return {
    ...emergency,
    firstAid: getFirstAid(emergency.incidentType)
  };
}

function saveState() {
  savePersistedState(state);
}

function hospitalsForPatient(patientLocation) {
  const nearestSeedDistance = Math.min(
    ...state.hospitals.map((hospital) => distanceKm(hospital.location, patientLocation))
  );

  if (nearestSeedDistance < 50) return state.hospitals;

  return [
    {
      id: "near-hosp-1",
      name: "Nearest Emergency Hospital",
      phone: "+91 108",
      location: { lat: patientLocation.lat + 0.018, lng: patientLocation.lng + 0.012 },
      specialties: ["accident", "bleeding", "fracture", "burn", "heart_attack", "breathing", "stroke"]
    },
    {
      id: "near-hosp-2",
      name: "City Multispeciality Hospital",
      phone: "+91 112",
      location: { lat: patientLocation.lat - 0.014, lng: patientLocation.lng + 0.02 },
      specialties: ["heart_attack", "breathing", "stroke", "accident"]
    },
    {
      id: "near-hosp-3",
      name: "Trauma Care Unit",
      phone: "+91 102",
      location: { lat: patientLocation.lat + 0.01, lng: patientLocation.lng - 0.022 },
      specialties: ["accident", "bleeding", "fracture", "burn"]
    }
  ];
}

async function routeApi(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  try {
    if (method === "POST" && url.pathname === "/api/auth/signup") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      const password = String(body.password || "").trim();
      const role = body.role === "driver" ? "driver" : "patient";

      if (!name || !phone || !password) {
        return sendJson(res, 400, { error: "Name, phone and password are required." });
      }

      if (state.users.some((user) => user.phone === phone)) {
        return sendJson(res, 409, { error: "This phone number is already registered." });
      }

      const user = {
        id: id("user"),
        name,
        phone,
        password,
        role,
        token: id("token")
      };
      state.users.push(user);

      if (role === "driver") {
        state.ambulances.push({
          id: id("amb"),
          vehicleNumber: String(body.vehicleNumber || `AMB-${phone.slice(-4)}`).trim(),
          driverName: name,
          driverPhone: phone,
          location: {
            lat: Number(body.location?.lat) || 28.6139,
            lng: Number(body.location?.lng) || 77.209
          },
          available: true,
          userId: user.id
        });
      }

      saveState();
      return sendJson(res, 201, { user: publicUser(user) });
    }

    if (method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readBody(req);
      const user = state.users.find(
        (item) => item.phone === body.phone && item.password === body.password
      );
      if (!user) return sendJson(res, 401, { error: "Invalid phone or password." });
      user.token = id("token");
      saveState();
      return sendJson(res, 200, { user: publicUser(user) });
    }

    if (method === "GET" && url.pathname === "/api/me") {
      const user = requireUser(req, res);
      if (!user) return;
      const ambulance = state.ambulances.find((item) => item.userId === user.id) || null;
      return sendJson(res, 200, { user: publicUser(user), ambulance });
    }

    if (method === "GET" && url.pathname === "/api/hospitals") {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return sendJson(res, 200, { hospitals: hospitalsForPatient({ lat, lng }) });
      }
      return sendJson(res, 200, { hospitals: state.hospitals });
    }

    if (method === "GET" && url.pathname === "/api/ambulances") {
      return sendJson(res, 200, { ambulances: state.ambulances });
    }

    if (method === "PATCH" && url.pathname === "/api/driver/status") {
      const user = requireUser(req, res);
      if (!user) return;
      if (user.role !== "driver") return sendJson(res, 403, { error: "Driver account required." });

      const body = await readBody(req);
      const ambulance = state.ambulances.find((item) => item.userId === user.id);
      if (!ambulance) return sendJson(res, 404, { error: "No ambulance assigned to this driver." });

      ambulance.available = Boolean(body.available);
      if (body.location && Number.isFinite(body.location.lat) && Number.isFinite(body.location.lng)) {
        ambulance.location = body.location;
      }
      saveState();
      return sendJson(res, 200, { ambulance });
    }

    if (method === "POST" && url.pathname === "/api/emergencies") {
      const user = requireUser(req, res);
      if (!user) return;
      if (user.role !== "patient") return sendJson(res, 403, { error: "Patient account required." });

      const body = await readBody(req);
      const patientLocation = {
        lat: Number(body.location?.lat),
        lng: Number(body.location?.lng)
      };
      if (!Number.isFinite(patientLocation.lat) || !Number.isFinite(patientLocation.lng)) {
        return sendJson(res, 400, { error: "Valid patient location is required." });
      }

      const incidentType = String(body.incidentType || "accident");
      const hospitalPool = hospitalsForPatient(patientLocation);
      if (!state.ambulances.length) {
        return sendJson(res, 409, {
          error:
            "No ambulance driver has signed up yet. Ask a driver to create a driver account, use GPS, and update status."
        });
      }
      if (!state.ambulances.some((ambulance) => ambulance.available)) {
        return sendJson(res, 409, {
          error:
            "No ambulance is available right now. A driver must keep the driver app open and set status to available."
        });
      }

      const dispatch = scoreDispatch({
        patientLocation,
        incidentType,
        ambulances: state.ambulances,
        hospitals: hospitalPool
      });

      if (dispatch.error) return sendJson(res, 409, { error: dispatch.error });

      const { assignment } = dispatch;
      const emergency = {
        id: id("emg"),
        patientId: user.id,
        patientName: user.name,
        patientPhone: user.phone,
        incidentType,
        description: String(body.description || "").trim(),
        location: patientLocation,
        status: "waiting_driver",
        createdAt: new Date().toISOString(),
        assignedAmbulanceId: assignment.ambulance.id,
        assignedHospitalId: assignment.hospital.id,
        assignedHospital: assignment.hospital,
        routePlan: {
          etaToPatientMinutes: assignment.etaToPatientMinutes,
          etaToHospitalMinutes: assignment.etaToHospitalMinutes,
          totalMinutes: assignment.totalMinutes,
          ambulanceToPatientKm: Number(assignment.ambulanceToPatientKm.toFixed(2)),
          patientToHospitalKm: Number(assignment.patientToHospitalKm.toFixed(2))
        }
      };

      state.emergencies.unshift(emergency);
      assignment.ambulance.available = false;
      saveState();

      if (assignment.ambulance.userId) {
        notifyDriver(assignment.ambulance.userId, "emergency", {
          emergency: emergencyView(emergency),
          ambulance: assignment.ambulance,
          hospital: assignment.hospital
        });
      }

      return sendJson(res, 201, {
        emergency: emergencyView(emergency),
        ambulance: assignment.ambulance,
        hospital: assignment.hospital
      });
    }

    if (method === "GET" && url.pathname === "/api/emergencies") {
      const user = requireUser(req, res);
      if (!user) return;

      let emergencies = state.emergencies;
      if (user.role === "patient") emergencies = emergencies.filter((item) => item.patientId === user.id);
      if (user.role === "driver") {
        const ambulance = state.ambulances.find((item) => item.userId === user.id);
        emergencies = ambulance
          ? emergencies.filter((item) => item.assignedAmbulanceId === ambulance.id)
          : [];
      }

      return sendJson(res, 200, {
        emergencies: emergencies.map(emergencyView)
      });
    }

    if (method === "POST" && url.pathname.match(/^\/api\/emergencies\/[^/]+\/respond$/)) {
      const user = requireUser(req, res);
      if (!user) return;
      if (user.role !== "driver") return sendJson(res, 403, { error: "Driver account required." });

      const emergencyId = url.pathname.split("/")[3];
      const body = await readBody(req);
      const action = body.action === "reject" ? "reject" : "accept";
      const emergency = state.emergencies.find((item) => item.id === emergencyId);
      const ambulance = state.ambulances.find((item) => item.userId === user.id);

      if (!emergency || !ambulance || emergency.assignedAmbulanceId !== ambulance.id) {
        return sendJson(res, 404, { error: "Assigned emergency not found." });
      }

      if (action === "accept") {
        emergency.status = "accepted";
        emergency.acceptedAt = new Date().toISOString();
        saveState();
        notifyPatient(emergency.patientId, "status", {
          emergency: emergencyView(emergency),
          ambulance,
          hospital: emergency.assignedHospital
        });
        return sendJson(res, 200, {
          emergency: emergencyView(emergency),
          ambulance,
          hospital: emergency.assignedHospital
        });
      }

      emergency.status = "rejected";
      ambulance.available = true;
      saveState();
      notifyPatient(emergency.patientId, "status", {
        emergency: emergencyView(emergency),
        ambulance,
        hospital: emergency.assignedHospital,
        message: "Driver rejected. Please create a new request for redispatch in this prototype."
      });
      return sendJson(res, 200, {
        emergency: emergencyView(emergency),
        ambulance,
        hospital: emergency.assignedHospital
      });
    }

    if (method === "POST" && url.pathname.match(/^\/api\/emergencies\/[^/]+\/complete$/)) {
      const user = requireUser(req, res);
      if (!user) return;
      if (user.role !== "driver") return sendJson(res, 403, { error: "Driver account required." });

      const emergencyId = url.pathname.split("/")[3];
      const emergency = state.emergencies.find((item) => item.id === emergencyId);
      const ambulance = state.ambulances.find((item) => item.userId === user.id);

      if (!emergency || !ambulance || emergency.assignedAmbulanceId !== ambulance.id) {
        return sendJson(res, 404, { error: "Assigned emergency not found." });
      }

      emergency.status = "completed";
      ambulance.available = true;
      saveState();
      notifyPatient(emergency.patientId, "status", {
        emergency: emergencyView(emergency),
        ambulance,
        hospital: emergency.assignedHospital
      });
      return sendJson(res, 200, {
        emergency: emergencyView(emergency),
        ambulance,
        hospital: emergency.assignedHospital
      });
    }

    if (method === "GET" && url.pathname === "/api/events") {
      const user = requireUser(req, res);
      if (!user) return;

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      writeEvent(res, "connected", { ok: true, role: user.role });

      if (user.role === "driver") state.driverStreams.set(user.id, res);
      if (user.role === "patient") state.patientStreams.set(user.id, res);

      req.on("close", () => {
        state.driverStreams.delete(user.id);
        state.patientStreams.delete(user.id);
      });
      return;
    }

    sendJson(res, 404, { error: "API route not found" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    routeApi(req, res);
    return;
  }

  if (!serveStatic(req, res, frontendDir)) {
    serveStatic({ ...req, url: "/" }, res, frontendDir);
  }
});

server.listen(PORT, () => {
  console.log(`Smart Ambulance Dispatch running at http://localhost:${PORT}`);
});
