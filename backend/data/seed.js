const hospitals = [
  {
    id: "hosp-1",
    name: "CityCare Trauma Center",
    phone: "+91 90000 11111",
    location: { lat: 28.6139, lng: 77.209 },
    specialties: ["accident", "bleeding", "fracture", "burn"]
  },
  {
    id: "hosp-2",
    name: "Metro Heart Institute",
    phone: "+91 90000 22222",
    location: { lat: 28.6292, lng: 77.2182 },
    specialties: ["heart_attack", "breathing", "stroke"]
  },
  {
    id: "hosp-3",
    name: "Lifeline General Hospital",
    phone: "+91 90000 33333",
    location: { lat: 28.604, lng: 77.2295 },
    specialties: ["accident", "heart_attack", "stroke", "burn", "breathing", "fracture"]
  },
  {
    id: "hosp-4",
    name: "Northside Emergency Hospital",
    phone: "+91 90000 44444",
    location: { lat: 28.6469, lng: 77.1926 },
    specialties: ["accident", "bleeding", "fracture"]
  }
];

const ambulances = [];

module.exports = { hospitals, ambulances };
