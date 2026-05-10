const { distanceKm } = require("./dispatch");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function normalizeHospital(element, patientLocation, index) {
  const lat = element.lat || element.center?.lat;
  const lng = element.lon || element.center?.lon;
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || `Nearby Hospital ${index + 1}`;

  return {
    id: `osm-hosp-${element.type}-${element.id}`,
    name,
    phone: tags.phone || tags["contact:phone"] || tags.emergency_phone || "Emergency: 108 / 112",
    location: { lat, lng },
    specialties: ["accident", "bleeding", "fracture", "burn", "heart_attack", "breathing", "stroke"],
    source: "OpenStreetMap",
    distanceKm: Number(distanceKm(patientLocation, { lat, lng }).toFixed(2))
  };
}

async function findNearbyHospitals(patientLocation) {
  const radiusMeters = 12000;
  const query = `[out:json][timeout:10];(
    node[amenity=hospital](around:${radiusMeters},${patientLocation.lat},${patientLocation.lng});
    way[amenity=hospital](around:${radiusMeters},${patientLocation.lat},${patientLocation.lng});
    relation[amenity=hospital](around:${radiusMeters},${patientLocation.lat},${patientLocation.lng});
    node[healthcare=hospital](around:${radiusMeters},${patientLocation.lat},${patientLocation.lng});
    way[healthcare=hospital](around:${radiusMeters},${patientLocation.lat},${patientLocation.lng});
    relation[healthcare=hospital](around:${radiusMeters},${patientLocation.lat},${patientLocation.lng});
  );out center tags 20;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "SmartAmbulanceDispatch/1.0" },
      signal: controller.signal
    });
    if (!response.ok) return [];

    const data = await response.json();
    const seen = new Set();
    return (data.elements || [])
      .filter((element) => (element.lat || element.center?.lat) && (element.lon || element.center?.lon))
      .map((element, index) => normalizeHospital(element, patientLocation, index))
      .filter((hospital) => {
        const key = `${hospital.name}-${hospital.location.lat.toFixed(4)}-${hospital.location.lng.toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { findNearbyHospitals };
