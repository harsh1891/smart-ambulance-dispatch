# Deploy To HTTPS

This app needs a long-running Node server because it uses live driver alerts with Server-Sent Events. Use Render, Railway, Fly.io, or another Node web-service host.

## Recommended Free/Easy Option: Render

1. Push this repository to GitHub.
2. Go to Render and create a new **Web Service** from the GitHub repo.
3. Render will detect `render.yaml`.
4. Use:

```text
Build Command: leave empty
Start Command: node backend/server.js
```

5. Deploy.
6. Render gives an HTTPS URL like:

```text
https://smart-ambulance-dispatch.onrender.com
```

7. Open that URL on phone Chrome.
8. Tap browser menu -> **Add to Home screen** / **Install app**.

## Important Production Note

The current project uses a local JSON database file. That is good for prototype demos, but many free hosts reset local files on redeploy/restart. For production, replace it with MongoDB Atlas, Supabase, PostgreSQL, or Firebase.

## Why Not Static Hosting Only?

GitHub Pages or plain static hosting cannot run the backend dispatch API, login, driver status, and live alerts. This project needs a Node backend.
