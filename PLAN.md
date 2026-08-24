# Implementation status

## Code-complete target

- Personal-assistant first viewport with permanent class and home actions.
- Shared `NavigationTarget` and one-tap routing service for class and home.
- Conservative on-campus classification and real map handoff.
- Private fragment setup and local schedule storage.
- Optional privacy-safe telemetry Worker and protected owner dashboard.
- Collapsed daily/weekly schedule, offline schedule shell, settings, deletion, accessibility, privacy checks, and automated tests.

## Release gates

1. All root, Playwright, private, and Worker checks pass.
2. Feature branch and pull request are reviewed.
3. Cloudflare Worker is deployed only if already authenticated and no paid step appears.
4. GitHub Pages is deployed only after approval.
5. The real-phone checklist is completed.
6. Founders B remains **unverified** until its route is physically walked and the arrival signs are confirmed.
