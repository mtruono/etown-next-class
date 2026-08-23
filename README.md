# Etown Next Class

Etown Next Class is an unofficial, installable iPhone web app that determines the current and next class in Elizabethtown campus time and hands a building-level walking route to the Etown Campus Map, Apple Maps, or Google Maps. It is a Progressive Web App so it can live on the iPhone Home Screen without an Apple developer account, native wrapper, backend, or recurring installation.

The public application is intentionally unconfigured. A private, checksum-protected setup code carries the schedule and destination configuration to one device. The browser validates and previews that configuration before saving the parsed data to local storage. The code is not encryption. Captured live GPS coordinates are requested only after a directions tap, retained only in memory, and sent only through the external route link the user subsequently chooses.

## Architecture

- Vite and plain TypeScript render semantic HTML without a component framework.
- `@js-temporal/polyfill` performs deterministic `America/New_York` calendar calculations.
- Zod strictly validates imported configuration.
- A pure schedule engine expands meeting patterns after applying academic-calendar overrides.
- Separate routing modules construct documented Concept3D, Apple Maps, and Google Maps links.
- A one-shot geolocation layer classifies low accuracy, off-campus positions, and straight-line proximity without storing live coordinates.
- `vite-plugin-pwa` precaches only the local application shell and exposes a user-controlled update prompt.
- Vitest covers public domain logic with fictional data. Playwright covers public browser flows with fictional data. Ignored private verification checks the real configuration.

The domain, import, storage, location, routes, and UI layers are separated under `src/`. No schedule is compiled into the JavaScript bundle.

## Public and private data

Everything under `private/`, all `.ics` files, and setup-code outputs are ignored. The private workflow is:

```sh
npm run private:generate
npm run private:verify
```

The generator validates one ignored seed, expands it once, verifies its ignored acceptance expectations, and then produces an ignored setup code, explicit-event calendar, audit report, and route-verification page. Public tests and `private.example/` contain only invented courses, rooms, and coordinates.

Run `npm run privacy:check` before and after every production build. When the ignored private denylist is present, the check scans public source and `dist` for exact private values in addition to structural leak checks.

## Local development

Use Node.js 22 and npm:

```sh
nvm use
npm ci
npm run dev
```

The public application starts at `http://localhost:5173/` with onboarding and no schedule.

## Quality checks

```sh
npm run check
npm run test:e2e
npm run private:generate
npm run private:verify
git status --ignored
git ls-files
```

`npm run check` covers formatting, lint, type checking, public unit tests, the privacy scan, and a production build. Browser tests and private acceptance verification are separate so public CI never requires ignored inputs.

## Build and GitHub Pages

```sh
npm run build
npm run preview
```

For a GitHub Actions build, Vite derives `/<repository-name>/` from `GITHUB_REPOSITORY`; local builds use `/`. The committed Pages workflow installs Node 22 dependencies, runs public quality and privacy checks, builds, checks the output again, uploads only `dist`, and deploys it.

To publish manually after creating a public GitHub repository:

```sh
git add .
git commit -m "Build generic Etown Next Class PWA"
gh auth login
gh repo create etown-next-class --public --source=. --remote=origin --push
gh api --method POST "repos/$(gh api user --jq .login)/etown-next-class/pages" -f build_type=workflow
gh workflow run deploy-pages.yml
gh run watch --exit-status
APP_URL="https://$(gh api user --jq .login).github.io/etown-next-class/" npm run private:generate
```

In GitHub, **Settings → Pages → Build and deployment → Source** must be **GitHub Actions**. Do not commit or upload anything under `private/`. If the Pages API reports that the site already exists, select that setting in the browser and continue with the workflow commands.

## Map behavior

The preferred provider is the official Etown Concept3D map using documented standard walking-route URLs. The origin is the one-time location captured when Directions was tapped. A separate live-map link uses documented `#!fls/` blue-dot mode; the app does not combine it with the prefilled route because that combination has not been verified. Apple and Google links are immediate fallbacks and require no API key.

Every destination is building-level. The app does not claim an entrance, room pin, indoor hallway, stairs, live rerouting, or construction awareness. See `DATA-UNCERTAINTIES.md` and `ROUTE-VERIFICATION.md`.

## Installation and maintenance

- `INSTALL-IPHONE.md`: exact Home Screen and import steps.
- `REAL-IPHONE-TEST.md`: real-device acceptance checklist.
- `NEW-SEMESTER.md`: safe private-data update procedure.
- `SHORTCUT-OPTIONAL.md`: optional two-action Siri launcher.
- `PRIVACY.md`: data flow and erasure behavior.
- `COSTS.md`: zero-dollar operating design.

Authoritative platform references: [Apple's Add to Home Screen guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), and [Vite's GitHub Pages deployment guidance](https://vite.dev/guide/static-deploy.html#github-pages). Mapping and campus references are recorded with verification limits in `ROUTE-VERIFICATION.md`.

Unofficial personal navigation aid. Not affiliated with or endorsed by Elizabethtown College. Building pins are approximate. Confirm campus signs and official notices.
