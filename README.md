# Etown Campus Assistant

A mobile-first personal campus assistant for three immediate questions: where is the next class, when does it start, and can the phone take the student there or home?

The app stays on GitHub Pages and requires no account, login, password, setup link, native wrapper, paid map API, or subscription. The ordinary public URL opens the complete Fall 2026 timetable immediately.

## Student experience

- The first screen shows the current or next class, timing, building, room, **Take me to class**, and the permanent **Take me home · Founders B** action.
- Today and This week are collapsed until requested.
- A navigation tap requests one-shot location. When the phone is confidently on campus, Etown’s official Concept3D walking route opens inside the assistant with surrounding buildings, the mapped path, turn list, and the map’s live-location control.
- Apple Maps, Google Maps, and a full-screen Etown map remain available as backups. Off campus or with low location accuracy, the selected external map remains the practical default and receives the destination without an explicit origin.
- The former straight-line schematic and its code have been removed. The in-app route follows Etown’s mapped wayfinding network.
- The public schedule remains available offline after the app has loaded; live navigation requires connectivity.
- Optional exact-location check-ins start off. If the phone user explicitly enables them, one point is shared only when directions start, remains visibly indicated, and is deleted within 24 hours. There is no background tracking.

## Public schedule and private identity

The committed `src/data/publicSchedule.ts` file contains the Fall 2026 courses, meeting times, buildings, rooms, calendar exceptions, and Founders B-area destination. It deliberately contains no student name, student ID, email, phone number, or dorm room number.

The optional ignored `private/` tooling remains for local audits and calendar exports, but it is not part of app setup. `src/data/demoSchedule.ts` remains deliberately fictional for automated browser tests and the explicit `?demo=1` route.

## Development and verification

```sh
npm ci
npm run check
npx playwright install chromium webkit
npm run test:e2e
cd telemetry-worker
npm ci
npm run check
```

Use `http://127.0.0.1:5173/?demo=1` for a fictional local demonstration. The ordinary URL always uses the public Fall 2026 schedule and ignores any old setup fragment.

## Owner status and privacy

The optional `telemetry-worker/` Cloudflare Worker keeps two deliberately separate paths:

- Anonymous usage accepts only a strict event allowlist, rejects GPS fields, and hashes the random installation UUID with a server-side salt.
- Location check-ins require the current consent marker, store only a point, accuracy, server timestamp, hashed phone ID, and short phone code, and remove records at 24 hours.

The Worker stores no IP address or request headers in D1 and protects the owner dashboard with server-side secrets. If endpoints are absent, both clients are safe no-ops. The phone user can independently disable anonymous counts and pause or delete location check-ins in Settings.

See [PRIVACY.md](PRIVACY.md), [COSTS.md](COSTS.md), and [REAL-IPHONE-TEST.md](REAL-IPHONE-TEST.md) before release.
