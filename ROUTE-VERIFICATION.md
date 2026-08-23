# Route verification record

Checked: **August 23, 2026**

## Reference pages

- Official campus-map page: <https://www.etown.edu/map/>
- Live Concept3D map, map ID 1180: <https://map.concept3d.com/?id=1180>
- Building and room key: <https://www.etown.edu/offices/registration-records/bldg_rm_key.aspx>
- Founders Residence Hall: <https://www.etown.edu/offices/residencelife/founders.aspx>
- Concept3D wayfinding URL documentation: <https://help.concept3d.com/hc/en-us/articles/42406953521939-How-to-Build-a-Wayfinding-URL-for-Your-Concept3D-Map>
- Concept3D interactive-map query strings: <https://help.concept3d.com/hc/en-us/articles/115004127673-Interactive-Map-Query-Strings>
- Concept3D mobile blue-dot documentation: <https://help.concept3d.com/hc/en-us/articles/41036084853523-Mobile-Location-Services-Prompting-and-Auto-Enabling-the-Blue-Dot>
- Google Maps URL documentation: <https://developers.google.com/maps/documentation/urls/get-started>
- Apple Map Links documentation: <https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html>

## Supplied coordinate inventory

These are the private configuration's building-level routing points. No coordinate below was independently verified as a doorway.

| Destination     | Latitude | Longitude | Confidence | Status                                               |
| --------------- | -------: | --------: | ---------- | ---------------------------------------------------- |
| Founders B      | 40.14861 | -76.58961 | Low        | Approximate B/C building center, not a B entrance    |
| Nicarry Hall    | 40.15085 | -76.59345 | Medium     | Approximate building center                          |
| Steinman Center | 40.15045 | -76.59336 | Medium     | Approximate building center                          |
| Esbenshade Hall | 40.15129 | -76.59195 | Low        | Provisional Masters Center and Esbenshade-area proxy |

## What was checked

- Etown's official campus-map page uses Concept3D map ID `1180`.
- Concept3D documents the standard walking URL structure used by the generator: walking mode, `ada:false`, `from`, `to`, level, start name, and end name separated in the hash.
- Concept3D documents `#!s/key=...` for search and `#!fls/` for mobile location/blue-dot mode.
- A standard Etown wayfinding URL was accepted and normalized by the hosted map. The available cloud browser then failed to initialize WebGL, so a visible Etown route panel and path were **not** confirmed.
- Google documents `api=1`, coordinates, `travelmode=walking`, optional origin, and `dir_action=navigate`. Immediate turn-by-turn launch is not guaranteed; a route preview may appear.
- Apple's archived official Map Links reference documents `saddr`, `daddr`, and `dirflg=w`. The HTTPS handoff was not tested on the target iPhone.
- The ignored generator creates `private/generated/route-verification.html` with the required campus, search, live-map, Apple, and Google links for manual checking.

## What remains unverified

| Item                                        | Result                                                            |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Standard URL accepted by Concept3D          | Yes, syntax accepted/normalized                                   |
| Etown directions panel visually appeared    | Not confirmed because WebGL failed in the available cloud browser |
| Generated path is fastest or usable         | Not verified                                                      |
| Any entrance or classroom pin               | Not verified                                                      |
| Any indoor route, floor, stairs, or hallway | Not available and not claimed                                     |
| Live blue dot on the target iPhone          | Not tested                                                        |
| Combined `fls` plus prefilled route syntax  | Not enabled or claimed                                            |
| Apple Maps handoff on the target iPhone     | Not tested                                                        |
| Google Maps handoff on the target iPhone    | Not tested                                                        |
| Temporary construction/path closures        | Not verified                                                      |
| Official marker IDs for these buildings     | Not established                                                   |

Esbenshade may appear in the official map as part of the Masters Center rather than under the supplied search phrase. Test both the supplied building search and visible campus signage before changing the private key; do not silently substitute an unverified result.
