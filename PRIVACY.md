# Privacy

## Public schedule

The ordinary website contains the complete Fall 2026 timetable: courses, meeting times, buildings, rooms, academic-calendar exceptions, and the Founders B-area destination. These details are intentionally public so the app opens immediately without a setup link, login, password, or student account.

The website does not include a student name, student ID, email address, phone number, or dorm room number. Old `#setup=...` fragments are discarded and have no special effect.

## Location

Location is requested only after **Take me to class** or **Take me home** is tapped. One captured point and its accuracy are kept in memory only long enough to classify on-campus versus off-campus and, when appropriate, construct a Concept3D route. The app never places coordinates or accuracy in local storage, IndexedDB, telemetry, logs, error reports, or background location watches.

For Apple Maps and Google Maps, the app omits the origin so the selected map can use “here.” For a confidently on-campus Concept3D route, the captured starting point is handed to Etown’s official campus-map provider. Map providers have their own privacy practices. A no-referrer policy is used where supported.

## Anonymous usage sharing

When configured and enabled, the app records only these anonymous events: app open, class/home navigation tap, map launch attempt, location permission denial/timeout/unavailability, and telemetry disabled. Allowed dimensions are target type, provider, app version, and a server-hashed random installation ID.

It does **not** send or store GPS location, accuracy, destination ID, building, course, course code, room, timetable, student name, email, dorm room, full URL, URL fragment, referrer, free-form errors, browser fingerprint, or user-agent string. The Worker does not write IP addresses or request headers to D1. Data older than 90 days is deleted during accepted writes.

Sharing defaults on and can be disabled in Settings. When disabled, no subsequent events are sent. If no endpoint is configured, telemetry is a safe no-op. There is no advertising analytics, session replay, heatmap, or cookie banner.

## Delete local data

Settings → **Reset this app** → **Reset app preferences** removes provider choices, the anonymous installation UUID, telemetry preference, and other application-prefixed browser storage. The public schedule remains available.
