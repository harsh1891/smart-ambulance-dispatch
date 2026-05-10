const assert = require("assert");
const { scoreDispatch } = require("./dispatch");

const result = scoreDispatch({
  patientLocation: { lat: 28.614, lng: 77.21 },
  incidentType: "heart_attack",
  ambulances: [
    { id: "far", available: true, location: { lat: 28.7, lng: 77.3 } },
    { id: "near", available: true, location: { lat: 28.615, lng: 77.211 } }
  ],
  hospitals: [
    { id: "general", location: { lat: 28.61, lng: 77.2 }, specialties: ["accident"] },
    { id: "heart", location: { lat: 28.62, lng: 77.215 }, specialties: ["heart_attack"] }
  ]
});

assert.equal(result.assignment.ambulance.id, "near");
assert.equal(result.assignment.hospital.id, "heart");
console.log("Dispatch tests passed");
