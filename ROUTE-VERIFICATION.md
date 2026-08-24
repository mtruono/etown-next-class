# Campus schematic verification record

Last engineering review: **August 23, 2026**

## Production mapping decision

The production app no longer launches or embeds Concept3D, Apple Maps, Google Maps, or any other third-party map. It renders its own SVG campus orientation schematic from local approximate coordinates. The only line drawn from the captured position to a destination is a straight-line guide. It is never described as a walking route.

Legacy external URL builders and their unit tests remain isolated development utilities, but the production controller and views do not import or expose them.

## Coordinate inventory

No coordinate below has been independently verified as a doorway.

| Destination     | Latitude | Longitude | Confidence | Status                                               |
| --------------- | -------: | --------: | ---------- | ---------------------------------------------------- |
| Founders B      | 40.14861 | -76.58961 | Low        | Approximate B/C building center, not a B entrance    |
| Nicarry Hall    | 40.15085 | -76.59345 | Medium     | Approximate building center                          |
| Steinman Center | 40.15045 | -76.59336 | Medium     | Approximate building center                          |
| Esbenshade Hall | 40.15129 | -76.59195 | Low        | Provisional Masters Center and Esbenshade-area proxy |

## Engineering checks

- The schematic is built from local SVG elements and contains no remote image, iframe, script, style, or map tile.
- Projection, Haversine distance, bearing, and compass-label calculations have deterministic unit tests.
- The captured GPS coordinate is plotted only after a user action and is never persisted.
- An off-campus point is omitted from the close-up schematic rather than compressing the campus into an unusable view.
- Low-accuracy GPS requires an explicit decision before use.
- The destination room stays visible above the map.
- Copy explicitly says the line may cross buildings or other obstacles.

## Real-device status

| Item                                     | Status                       |
| ---------------------------------------- | ---------------------------- |
| Local SVG renders in automated DOM tests | Verified                     |
| Real iPhone location permission          | Not yet tested               |
| Real iPhone GPS marker placement         | Not yet tested               |
| Nicarry approximate point on campus      | Needs visual campus check    |
| Steinman approximate point on campus     | Needs visual campus check    |
| Esbenshade approximate point on campus   | High-priority campus check   |
| Founders B fallback point                | Needs visual campus check    |
| Any entrance or classroom position       | Not verified and not claimed |
| Any walking path or obstacle avoidance   | Not provided and not claimed |
| Temporary construction or path closures  | Not available                |

## Historical reference pages

These references helped establish public campus naming and the earlier mapping approach. They are documentation only and are not runtime dependencies:

- <https://www.etown.edu/map/>
- <https://www.etown.edu/offices/registration-records/bldg_rm_key.aspx>
- <https://www.etown.edu/offices/residencelife/founders.aspx>
- <https://map.concept3d.com/?id=1180>

Update a coordinate only from a cited, credible source or a documented on-site check. Record what changed, the date, and exactly what was and was not verified. A wrong precise claim is worse than an honest approximation.
