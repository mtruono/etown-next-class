# Repository invariants

- Never commit private schedule data, setup codes, generated calendars, or private route-verification output.
- Never invent or imply a verified campus entrance, indoor route, floor, stairway, or classroom position.
- Preserve zero-dollar operation: static hosting, no backend, no paid API, and no Apple developer account.
- Do not introduce a native wrapper.
- Do not introduce a paid map SDK or undocumented map API.
- Never request location automatically. A route-related user action must precede every geolocation request.
- Treat schedule and academic-calendar rules as validated data, not scattered UI conditions.
- Render imported strings as text. Never use imported content as HTML.
- Run `npm run check` before pushing.
- When private inputs are available, also run `npm run private:verify` and both pre- and post-build privacy checks.
