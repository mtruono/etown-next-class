# Route verification

## Current status

Founders B is **unverified**. Official Etown residence information describes Founders as four towers with a shared main lounge connecting the B/C areas, but that does not identify or verify a walking-route endpoint. Until the real-phone walk succeeds, the app uses the honest label **Founders Residence Hall · Founders B area** and does not claim a doorway or invent left/right instructions.

The app uses the existing documented Concept3D preloaded walking-route format. It does not combine that route fragment with the separate forced-location (`#!fls/`) fragment because that combination has not been proven. After handoff, Concept3D provides its route, steps, Begin Route behavior, and location controls.

References:

- Etown Founders Residence Hall: <https://www.etown.edu/offices/community-living/halls-apts/founders.aspx>
- Concept3D wayfinding: <https://help.concept3d.com/hc/en-us/articles/360019108534-Wayfinding>
- Concept3D route URLs: <https://help.concept3d.com/hc/en-us/articles/42406953521939-How-to-Build-a-Wayfinding-URL-for-Your-Concept3D-Map>
- Concept3D mobile location: <https://help.concept3d.com/hc/en-us/articles/41036084853523-Mobile-Location-Services-Prompting-and-Auto-Enabling-the-Blue-Dot>

## Manual verification

For Nicarry, Esbenshade, Steinman, and one clearly off-campus point:

1. Open the assistant on the student’s phone.
2. Tap **Take me home** and allow one-shot location.
3. Confirm an actual walking route appears, Begin Route or equivalent is available, and the blue dot is understandable.
4. Walk the full route and record where it ends relative to Founders B.
5. Compare the arrival wording with physical signs. Do not infer directions that signs do not support.
6. Use browser Back and confirm the assistant returns.

Only after all three campus walks reach the same useful, signed B/B-C arrival should `coordinateStatus` and the user-facing label be changed to a verified status.
