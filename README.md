# Etown Campus Assistant

A mobile-first personal campus assistant for three immediate questions: where is the next class, when does it start, and can the phone take the student there or home?

The app stays on GitHub Pages and requires no account, login, password, typed setup code, native wrapper, paid map API, or subscription. A personalized `#setup=...` link imports the private schedule into that browser once, removes the fragment from the visible address, and then uses the ordinary site URL.

## Student experience

- The first screen shows the current or next class, timing, building, room, **Take me to class**, and the permanent **Take me home · Founders B** action.
- Today and This week are collapsed until requested.
- A navigation tap requests one-shot location. Confidently on campus uses Etown’s Concept3D walking map by default; off campus or low accuracy uses Apple Maps on iPhone and Google Maps elsewhere unless Settings overrides it.
- External maps receive the destination but no explicit origin. Concept3D receives the captured origin only for an on-campus preloaded route.
- The former straight-line schematic is not part of the normal flow.
- The schedule remains locally available offline; live navigation requires connectivity.

## Private setup

Real schedule inputs and generated links live under ignored `private/`. Generate and verify them with:

```sh
APP_URL=https://mtruono.github.io/etown-next-class/ npm run private:generate
npm run private:verify
```

Send `private/generated/student-setup-url.txt` privately. Never commit or paste that URL into an issue or pull request. The production entry point contains no real timetable; `src/data/demoSchedule.ts` is deliberately fictional.

Older public commits predate this change and may still contain the previous timetable. This project does not rewrite Git history automatically.

## Development and verification

```sh
npm ci
npm run check
npx playwright install chromium webkit
npm run test:e2e
npm run private:verify
cd telemetry-worker
npm ci
npm run check
```

Use `http://127.0.0.1:5173/?demo=1` for a fictional local demonstration.

## Anonymous telemetry

The optional `telemetry-worker/` Cloudflare Worker accepts only a strict event allowlist, hashes the random installation UUID with a server-side salt, stores no IP address or request headers in D1, and protects the owner dashboard with server-side secrets. If `VITE_TELEMETRY_ENDPOINT` is absent, telemetry is a no-op. The student can turn sharing off in Settings.

See [PRIVACY.md](PRIVACY.md), [COSTS.md](COSTS.md), and [REAL-IPHONE-TEST.md](REAL-IPHONE-TEST.md) before release.
