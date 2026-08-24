# Etown Next Class

Etown Next Class is an unofficial Fall 2026 class companion. Open one ordinary web link and it immediately shows the current class, next class, countdown, building, room, and the rest of today’s schedule. There is no login or setup code.

The Campus guide is original to this app. After the user taps it, the browser asks once for location and draws a local orientation schematic from that point toward the approximate destination building. It does not open or embed Etown’s map, Apple Maps, Google Maps, or a remote tile service.

## Important privacy choice

This is the simple public-link version selected by the owner. The timetable and approximate building points are shipped in the public JavaScript application, so anyone with the URL can view them. The app contains no student name, student ID, email address, dorm room, or other identity information.

Live GPS coordinates follow a different rule. They are requested only after a Campus guide tap, kept only in memory while that view is open, and never saved, logged, analyzed, or transmitted to this app’s server or a map provider.

## Architecture

- Vite and TypeScript with plain semantic HTML and CSS
- `@js-temporal/polyfill` for deterministic `America/New_York` schedule logic
- Zod validation for the built-in versioned configuration and optional tooling
- An original SVG campus orientation view generated entirely in the browser
- `vite-plugin-pwa` for the manifest, application-shell cache, offline schedule, and update prompt
- Vitest for unit and integration tests
- Playwright and axe-core for browser and accessibility checks
- GitHub Pages for free static hosting

The schedule engine, map math, location handling, storage utilities, legacy import utilities, UI, and route URL utilities remain separated. The production interface uses the built-in schedule in `src/data/publicSchedule.ts` and the local schematic in `src/map/campusMap.ts`.

## What the map does and does not do

The in-app map plots approximate building-center points and, when location is available, shows straight-line distance and compass direction. This is orientation information, not a walking-route distance or turn-by-turn route. The line may cross buildings or other obstacles.

The app does not claim to know a verified entrance, indoor classroom position, floor, stairs, hallway, accessible path, construction closure, or temporary detour. Esbenshade is a low-confidence proxy and is the first point to check on campus.

## Local development

Node.js 22 and npm are required.

```bash
npm ci
npm run dev
```

Quality gates:

```bash
npm run check
npm run test:e2e
```

The Playwright command requires installed Chromium and WebKit browser binaries:

```bash
npx playwright install chromium webkit
```

The ignored private source and generator are retained for the optional ICS calendar and audit workflow:

```bash
npm run private:generate
npm run private:verify
```

Generated setup codes, calendars, audits, and route test pages remain ignored and must never be committed. The public app does not require those files.

## Build and deployment

```bash
npm run build
```

Vite derives the GitHub project base path from `GITHUB_REPOSITORY` in Actions and uses `/` locally. The Pages workflow checks formatting, lint, types, unit tests, privacy, and the production build before deploying `dist`.

The app is hosted at:

<https://mtruono.github.io/etown-next-class/>

It works directly in Safari or Chrome. Adding it to the iPhone Home Screen is optional.

## Cost

The app has no backend, database, paid API, map SDK, analytics, custom domain, Apple Developer account, or subscription. Its operating cost is $0 under GitHub Free and GitHub Pages usage limits. See `COSTS.md`.

## Unofficial status

Unofficial personal navigation aid. Not affiliated with or endorsed by Elizabethtown College. Building pins are approximate. Confirm campus signs and official notices.
