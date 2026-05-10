# Smart Ambulance Dispatch

A free full-stack prototype for emergency ambulance dispatch. One app supports two roles:

- Patient / normal user: report an incident, share location, receive assigned driver details, and see first-aid guidance.
- Ambulance driver: set availability, receive live emergency alerts, accept or reject requests, and view routes.

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

## Demo Accounts

You can create accounts from the sign-up screen. The app also seeds demo hospitals and ambulances automatically.

## Free Tech Stack

- Backend: Node.js built-in HTTP server
- Frontend: HTML, CSS, JavaScript
- Maps: OpenStreetMap tiles with Leaflet
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
  data/seed.js
  services/dispatch.js
  services/firstAid.js
  services/dispatch.test.js
  utils/http.js
```

## Important Note

This is a college/project prototype, not a medical device. First-aid guidance is educational and should always recommend calling local emergency services immediately.
