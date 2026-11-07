# Shastho Record (frontend)

A mobile-first progressive web app (PWA) for a prototype medical record system. It is aimed at countries like Bangladesh that have no centralized medical record system: patients keep their own timeline of prescriptions and lab reports, and doctors they choose can review and verify those records.

This repository is the **frontend only**. It talks to a separate Django REST Framework backend.

- **Live demo:** TODO: add your deployed URL
- **Backend repository:** TODO: add your backend repo URL

## Screenshots

TODO: add 3 or 4 screenshots (patient timeline, upload, access screen, doctor review form), for example in a `docs/` folder:

```
![Patient timeline](docs/timeline.png)
```

## Features

**Patient**
- Chronological timeline of uploaded documents, with a doc-type label, date, verified/unverified badge, the verifying doctor's name and clinic, and the diagnosis and medications once filled in
- Upload a document from the camera or the gallery, with a preview and client-side checks (JPEG/PNG/WebP, max 5 MB)
- Grant and revoke doctor access, with a history of past grants

**Doctor**
- List of patients who have granted them access
- A patient's timeline, and a review form (diagnosis, medications, visit date, notes) that verifies the record

**App**
- Login only (registration is intentionally out of scope for now and will later use NID / birth certificate numbers)
- Role-based routing and navigation (patient, doctor)
- Installable PWA that opens offline, with an offline banner
- Loading, empty and error states on every screen

## Tech stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4
- React Router
- Plain `fetch` (no axios), no state-management library
- `vite-plugin-pwa` (Workbox) for the manifest and service worker

## Getting started

Requirements: Node.js 20+ and a running backend (deployed or local).

```bash
npm install
cp .env.example .env     # on Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173 (use `localhost`, not `127.0.0.1`, so the origin matches the backend's CORS settings).

### Environment variables

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend, without a trailing slash, e.g. `http://localhost:8000` |

Vite reads this at build time, so restart the dev server after changing `.env` and rebuild after changing it for a deployment.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (service worker is not registered in dev) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build on port 4173 (use this to test the PWA and offline mode) |
| `npm run lint` | Run ESLint |

The backend must allow each origin you use in `CORS_ALLOWED_ORIGINS`: `http://localhost:5173` for dev, `http://localhost:4173` for preview, and your deployed URL.

## Demo accounts

Password for all: `DemoPass123!`

| Username | Role | Notes |
| --- | --- | --- |
| `rahim` | patient | has several records |
| `nusrat` | patient | has a couple of records |
| `dr_anika` | doctor | can see only rahim |
| `dr_karim` | doctor | can see both patients |

Suggested walkthrough: log in as `rahim` and view the timeline, upload a document, then log in as `dr_anika` and verify it, then return to `rahim` to see the verified badge. Finally, revoke `dr_anika` on the Access screen and confirm she can no longer see the timeline.

## Project structure

```
src/
  lib/
    api.ts            token store + fetch wrapper (auto-refresh on 401)
    useImageCache.ts  authenticated image loading via blob URLs
    format.ts         date formatting
    roles.ts          role -> home route
  auth/
    AuthContext.tsx   login, logout, session restore
    ProtectedRoute.tsx  role-based route guard
  components/
    AppShell.tsx      header, role-based nav, logout
    TimelineView.tsx  loads and renders a timeline (patient and doctor)
    TimelineCard.tsx  one record card
    OfflineBanner.tsx
  pages/
    Login.tsx
    PatientTimeline.tsx, PatientUpload.tsx, PatientAccess.tsx
    DoctorPatients.tsx, DoctorPatientTimeline.tsx, DoctorRecordReview.tsx
    Placeholders.tsx  screen for accounts with no supported role
  types.ts            shared API types
```

## Design decisions

- **The backend is the source of truth for permissions.** The UI hides what a role can't do, but every rule is enforced by the API. A patient who types a doctor URL is redirected, and the server would return 403 anyway.
- **Token handling.** Tokens are kept in memory and in `localStorage`, so a session survives page reloads. `localStorage` is readable by any script on the page, so an XSS bug could steal tokens. A production system would keep the refresh token in an httpOnly cookie, which needs backend changes and CSRF handling. This is documented in `src/lib/api.ts`.
- **Silent token refresh.** On a 401, the fetch wrapper refreshes the access token once and retries the request, and logs the user out if the refresh fails. Concurrent requests share a single refresh call.
- **Authenticated images via blob URLs.** `<img src>` cannot send an `Authorization` header, so images are fetched with the token, converted to a blob, and shown through `URL.createObjectURL`. URLs are cached per screen and revoked on unmount to avoid memory leaks.
- **No caching of private data.** The service worker precaches only the app's own static files. API responses and record images are deliberately never cached, because they are private medical data that should not stay on a shared device after logout.
- **Offline behavior.** The app shell opens offline. Data screens show their normal error state with a retry button, plus a banner explaining that the device is offline.
- **Simple state.** Each screen models its loading state as one union (`loading | error | ready`) instead of separate booleans, and uses a plain `useEffect` with a cancellation flag to ignore stale responses.

## Known limitations

- No registration; accounts are created in the backend (Django admin or seed command).
- Photos larger than 5 MB are rejected on the client. Compressing images before upload would be a natural improvement.
- No pagination on lists (the API returns plain arrays for them).
- Access tokens in `localStorage` (see the tradeoff above).
- No automated tests yet.

## Deployment

This is a static single-page app. Any static host works as long as it rewrites unknown paths to `index.html`, so deep links like `/patient/access` do not return a 404.

- Netlify: add `public/_redirects` containing `/*  /index.html  200`
- Vercel: add a `vercel.json` rewriting `/(.*)` to `/index.html`

Set `VITE_API_URL` in the host's environment settings, build with `npm run build`, publish the `dist/` folder, and add the deployed origin to the backend's `CORS_ALLOWED_ORIGINS`. Installing the PWA on a phone requires HTTPS, which these hosts provide.