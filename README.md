# Campus360 — updated hackathon prototype

React + Vite student campus portal with dashboard shortcuts, assignment deadlines, personalized recommendations, Leaflet/OpenStreetMap maps, richer challenge posting/detail modals, a campus directory and clubs section, Campus Pulse events/notices, and peer-learning SkillSwap.

## Requirements
- Node.js 20+ recommended
- npm

## Run the frontend
```bash
npm.cmd install
npm.cmd run dev
```
Open the local URL shown by Vite (usually `http://localhost:5173` or the next available port).

## Run the optional Express backend
In a second terminal:
```powershell
copy .env.example .env
npm.cmd run server
```
The backend starts at `http://localhost:3001`. `/api/health` reports whether Supabase credentials are configured. Do not add secrets to frontend source files.

## Supabase setup (optional, not pre-connected)
1. Create a Supabase project.
2. In the Supabase SQL Editor, review and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` locally. The service-role key must only be used by the server and must never be placed in `VITE_*` variables or committed to Git.
4. Start the backend and open `/api/health`. When configured, `/api/events` reads from `campus_events`.
5. Before production, add authenticated policies for each table, configure Supabase Auth, and enforce representative/admin permissions server-side.

## Current prototype boundaries
- Most interactive demo data is saved in this browser's `localStorage`; it is not yet shared across students or devices. The SQL schema is provided as a setup foundation, not a claim that the app is already connected to Supabase.
- Login is still a **demo flow** (sample OTP `123456`). MiniMoth is intentionally left aside for this update pack.
- Ride listings show a student-verification demo label; real college identity verification is not connected. Map points are approximate and should not be used to expose live student locations.
- Challenge representative roles are a UI preview only. Real role authorization must be enforced on the server and backed by trusted college/admin records.
- Club names are sample categories; presidents, office rooms, hours and contacts are marked for verification. Replace them with information confirmed by VESIT before public use.
- CampusSOS is not connected to emergency services. Do not present the prototype control as a real emergency channel.

## Features in this update
- Removed the large daily-snapshot / “Make today count” dashboard hero.
- Clickable dashboard statistic cards, larger typography, upcoming assignment deadlines and personalized recommendations.
- Campus Ride offer form in a modal, Leaflet map with OpenStreetMap tiles, route/seat requests and demo verification messaging.
- Challenge detail modal, description, target group, credit points, contact person and representative-role preview.
- Campus Directory for library, canteen, principal/director office, reception, transport help, VES Council and club directory; club presidents are clearly marked unverified until confirmed.
- Campus Pulse page with events/notices and state filters/status editing, plus assignment-deadline management.
- SkillSwap peer-learning listings and add-listing modal.

## Build
```powershell
npm.cmd run build
```
