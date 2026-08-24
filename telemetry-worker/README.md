# Anonymous telemetry Worker

This optional Cloudflare Worker records a strict allowlist of anonymous app opens and navigation launch attempts. It never accepts location, schedule, class, room, identity, URL, referrer, browser fingerprint, user-agent, or arbitrary fields. Installation UUIDs are salted and hashed before D1 storage.

The main GitHub Pages app works when no telemetry endpoint is configured.

## Free-plan deployment

1. Sign in with `npx wrangler login`.
2. Create D1 with `npx wrangler d1 create etown-campus-assistant-telemetry`.
3. Put the returned database ID in `wrangler.jsonc`.
4. Apply the migration with `npx wrangler d1 migrations apply etown-campus-assistant-telemetry --remote`.
5. Set secrets with `npx wrangler secret put INSTALLATION_SALT`, `npx wrangler secret put DASHBOARD_USERNAME`, and `npx wrangler secret put DASHBOARD_PASSWORD`.
6. Deploy with `npx wrangler deploy`.
7. Set the GitHub repository variable `VITE_TELEMETRY_ENDPOINT` to the resulting `https://<worker>.workers.dev/event` URL.

Stop if Cloudflare asks for a payment method or paid-plan upgrade. No paid upgrade is required by the design. To disable telemetry entirely, remove `VITE_TELEMETRY_ENDPOINT`; the client becomes a safe no-op. The student can also turn it off in Settings.
