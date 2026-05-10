function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function estimateMinutes(km) {
  const cityAverageKmh = 32;
  return Math.max(2, Math.round((km / cityAverageKmh) * 60));
}

function scoreDispatch({ patientLocation, incidentType, ambulances, hospitals }) {
  const availableAmbulances = ambulances.filter((ambulance) => ambulance.available);
  const suitableHospitals = hospitals.filter((hospital) =>
    hospital.specialties.includes(incidentType)
  );

  if (!availableAmbulances.length) {
    return { error: "No ambulance is currently available." };
  }

  const hospitalPool = suitableHospitals.length ? suitableHospitals : hospitals;
  let best = null;

  for (const ambulance of availableAmbulances) {
    for (const hospital of hospitalPool) {
      const ambulanceToPatientKm = distanceKm(ambulance.location, patientLocation);
      const patientToHospitalKm = distanceKm(patientLocation, hospital.location);
      const totalKm = ambulanceToPatientKm + patientToHospitalKm;
      const totalMinutes = estimateMinutes(ambulanceToPatientKm) + estimateMinutes(patientToHospitalKm);
      const specialtyPenalty = hospital.specialties.includes(incidentType) ? 0 : 12;
      const score = totalMinutes + specialtyPenalty;

      const candidate = {
        ambulance,
        hospital,
        ambulanceToPatientKm,
        patientToHospitalKm,
        totalKm,
        etaToPatientMinutes: estimateMinutes(ambulanceToPatientKm),
        etaToHospitalMinutes: estimateMinutes(patientToHospitalKm),
        totalMinutes,
        score
      };

      if (!best || candidate.score < best.score) best = candidate;
    }
  }

  return { assignment: best };
}

module.exports = { distanceKm, estimateMinutes, scoreDispatch };
