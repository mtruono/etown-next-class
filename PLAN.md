# Etown Next Class implementation plan

1. Keep the verified Temporal schedule engine and academic-calendar behavior.
2. Ship the identity-free Fall 2026 timetable in the public static app, as explicitly selected for one-link access.
3. Open directly to the current and next class with no login, code, or onboarding gate.
4. Request one-shot location only after a Campus guide action and keep it in memory only.
5. Render an original local SVG orientation map with approximate building points, straight-line distance, and bearing.
6. Preserve same-building, virtual-class, no-class, finals, offline, accessibility, and update behavior.
7. Retain ignored private ICS/audit tooling without making it part of the public app flow.
8. Run formatting, lint, types, unit tests, privacy checks, production builds, and browser tests when binaries are available.
9. Deploy the finished static bundle through GitHub Pages and verify the public link.

The public app must never include identity information or claim that its schematic is a verified walking path, entrance, or indoor map.
