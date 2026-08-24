# Engineering invariants

- The owner explicitly selected the simple public-link model. The timetable may be public, but never add a student name, student ID, email address, dorm room, or other identity information.
- Never commit anything under `private/`, an `.ics` file, generated setup code, generated audit, or private route-verification page.
- The production interface must open directly to the schedule. Do not restore a login or setup-code gate unless the owner explicitly reverses the public-link decision.
- Keep the campus guide inside the app. Do not make Concept3D, Apple Maps, Google Maps, a remote tile service, or another external map the primary experience.
- Never claim the straight-line schematic is a walking route. Never invent a campus entrance, indoor route, floor, stairs, hallway, accessible path, or verified classroom point.
- Preserve $0 operation: static GitHub Pages hosting, no backend, no paid API, no subscription, and no native wrapper.
- Never request location automatically. Use one-shot geolocation only after a user action, never persist it, and never log or transmit it.
- Treat official schedule and academic-calendar exceptions as centralized data, not scattered UI conditions.
- Use Eastern campus time through Temporal and inject `now` into deterministic logic.
- Run `npm run check` before pushing. Run `npm run private:verify` when the ignored seed exists.
- Run privacy checks before and after production builds, and confirm private files are ignored and untracked.
