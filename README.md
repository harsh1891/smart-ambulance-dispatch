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

## How To Demo Patient + Driver

Use two separate demo sessions. They behave like two different phones because each URL keeps its own login.

Driver tab:

```text
http://localhost:4180/?session=driver
```

Patient tab:

```text
http://localhost:4180/?session=patient
```

Recommended flow:

1. Open the driver tab and sign up as **Ambulance Driver**.
2. Click **Use ambulance GPS** and allow browser location permission.
3. Click **Update status**.
4. Open the patient tab and sign up as **Patient / normal user**.
5. Click **Use my location** and allow location permission.
6. Select incident type and click **Send emergency**.
7. Go back to the driver tab, accept the alert.
8. Patient tab will then show the assigned ambulance driver details.

If the map looks broken after code changes, press `Ctrl + Shift + R` once to hard refresh the browser.

## Demo Accounts

Create two accounts from the sign-up screen:

1. Ambulance driver account
2. Patient / normal user account

The app does not create fake ambulance drivers. A driver appears only after signing up as an ambulance driver.

For the best demo, login as the driver first, click **Use ambulance GPS**, then **Update status**. After that, login as a patient, click **Use my location**, and send an emergency request.

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
