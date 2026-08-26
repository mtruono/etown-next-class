# Cost guardrail

The design is intended to remain at $0 under current normal personal usage:

- GitHub Pages: $0 under normal free repository usage.
- Google Maps URLs: no API key; universal walking-direction links only.
- Apple Maps links: no API key; standard map links only.
- Etown Concept3D: embeds the college’s existing public map and keeps full-screen links as fallbacks; no map SDK, copied tiles, or paid API.
- Cloudflare Worker, one-minute cleanup trigger, and D1: optional anonymous usage plus short-lived, consent-based location check-ins intended to remain within Workers Free and D1 free allowances for normal personal use.
- Custom domain: none.
- Paid routing, tile, analytics, and app-store services: none.

Third-party pricing and limits can change. Check the official pricing pages before telemetry deployment. Do not accept a payment method, paid plan, or upgrade; stop if Cloudflare requires one.

- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/d1/platform/pricing/>
