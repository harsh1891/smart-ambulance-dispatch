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

const ambulances = [
  {
    id: "amb-1",
    vehicleNumber: "DL 01 ER 1081",
    driverName: "Amit Kumar",
    driverPhone: "+91 98765 10001",
    location: { lat: 28.6175, lng: 77.2131 },
    available: true,
    userId: null
  },
  {
    id: "amb-2",
    vehicleNumber: "DL 02 ER 2054",
    driverName: "Ravi Sharma",
    driverPhone: "+91 98765 10002",
    location: { lat: 28.632, lng: 77.205 },
    available: true,
    userId: null
  },
  {
    id: "amb-3",
    vehicleNumber: "DL 03 ER 7712",
    driverName: "Neeraj Singh",
    driverPhone: "+91 98765 10003",
    location: { lat: 28.599, lng: 77.221 },
    available: true,
    userId: null
  }
];

module.exports = { hospitals, ambulances };
