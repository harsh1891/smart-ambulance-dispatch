# Smart Ambulance Dispatch

A free full-stack prototype for emergency ambulance dispatch. One app supports two roles:

- Patient / normal user: report an incident, share location, receive assigned driver details, and see first-aid guidance.
- Ambulance driver: set availability, share GPS location, receive live emergency alerts, accept or reject requests, see hospitals, and view routes.

The app uses OpenStreetMap + Leaflet instead of paid Google Maps APIs. Live alerts are handled with Server-Sent Events while the driver dashboard is open.

## Run Locally

```bash
npm start
```

If `npm` is not available but `node` works:

```bash
node backend/server.js
```

If port `4173` is already used by another project:

```bash
node backend/server.js --port 4180
```

Open:

```text
http://localhost:4173
```

## 🚀 Live Demo

Link : https://smart-ambulance-dispatch.onrender.com

The app is designed to be role-aware. Users can choose their role during the sign-up process:

Register: Create an account and select either "Patient" or "Ambulance Driver".

Role Persistence: The app will remember your selection and automatically show you the correct dashboard (Map & Dispatch for drivers, Emergency Request for patients) every time you return.

## Install Like An App

This project is a PWA, so Chrome can install it like an app.

On desktop:

1. Open `https://smart-ambulance-dispatch.onrender.com/`
2. Click the browser install icon in the address bar, or click **Install app** if Chrome shows the button.

On Android:

1. Open https://smart-ambulance-dispatch.onrender.com/ in Chrome on your phone..
2. Tap browser menu -> **Add to Home screen** or **Install app**.

Important: Since the app is deployed on HTTPS via Render, Geolocation and GPS features will work correctly on all mobile devices and browsers.



## Free Tech Stack

- Backend: Node.js built-in HTTP server
- Frontend: HTML, CSS, JavaScript
- Maps: OpenStreetMap tiles with Leaflet
- Real nearby hospital lookup: OpenStreetMap Overpass API, with fallback data
- Routing: OSRM public route API when available, with local fallback
- Notifications: Server-Sent Events for live in-app driver alerts

## Project Structure

```text
frontend/
  index.html
  styles.css
  app.js

backend/
  server.js
  data/store.js
  data/seed.js
  services/osmHospitals.js
  services/dispatch.js
  services/firstAid.js
  services/dispatch.test.js
  utils/http.js
```

