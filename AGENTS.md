# Engineering invariants

- Treat this product as a personal campus assistant centered on the next class, the time to leave, one-tap class navigation, and a permanent “Take me home” action for Founders B.
- Use real map providers as the primary navigation experience. Prefer Etown’s Concept3D map for confidently on-campus walking navigation and Apple Maps or Google Maps from off campus. The local straight-line schematic must not be the normal directions experience.
- Keep GitHub Pages as the application host. Do not migrate to Netlify or introduce a native wrapper, App Store release, login, password, account, typed setup code, paid map API, subscription, or paid custom domain.
- Use the personalized `#setup=...` link flow. Import the private configuration into local storage, scrub the fragment immediately, and never commit the generated link or import the real timetable into the production entry point.
- Never commit a student name, student ID, email address, dorm room, private timetable, setup link, generated setup code, `.ics` file, generated audit, private route-verification page, or anything under `private/`.
- Never request location automatically. Request one-shot geolocation only after an explicit navigation-button tap, keep captured coordinates only in memory, and never persist, log, or send them to telemetry.
- Use one shared `NavigationTarget` flow for class and home navigation. Do not build a separate routing engine for Founders B.
- Treat Founders B as unverified until a real phone route is physically walked. Use honest labels such as “Founders Residence Hall · Founders B area” and never invent an entrance, indoor route, floor, stairs, hallway, accessible path, or left/right arrival instruction.
- Anonymous usage tracking is allowed only through a free Cloudflare Worker and free storage. It must never collect GPS coordinates, accuracy, destination IDs, buildings, schedule contents, class names, course codes, rooms, student identity, full URLs, fragments, referrers, user-agent strings, free-form errors, or IP addresses in storage.
- Telemetry must be optional, transparent, failure-tolerant, and a no-op when no endpoint is configured. The student never authenticates; only the owner dashboard is protected.
- Preserve $0 operation. Stop rather than accept a payment method, paid plan, subscription, or paid upgrade.
- Treat official schedule and academic-calendar exceptions as centralized configuration, not scattered UI conditions. Use Eastern campus time through Temporal and inject `now` into deterministic logic.
- Preserve the PWA application shell, offline schedule access, configuration validation, setup-fragment utilities, storage utilities, route URL builders, accessibility, and test infrastructure.
- Run `npm run check` before pushing. Run the phone-browser suite, Worker checks, and `npm run private:verify` when the ignored private seed is available. Run privacy checks before and after production builds, and confirm private files are ignored and untracked.
