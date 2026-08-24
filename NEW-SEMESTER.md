# Prepare a new semester

The current simple-link design intentionally ships the timetable in the public app. A new semester therefore requires editing and redeploying the public configuration.

1. Copy `src/data/publicSchedule.ts` to a temporary working file outside version control.
2. Replace the term dates and configuration ID.
3. Enter the new meeting patterns with stable IDs, weekdays, campus times, destinations, and rooms.
4. Enter every official academic-calendar exception, including no-class and replacement-weekday dates.
5. Add or revise approximate building points with a candid confidence label and navigation note. Never invent a door or indoor route.
6. Keep all identity information out of the configuration. No name, ID, email address, or dorm room is needed.
7. Replace `src/data/publicSchedule.ts` with the reviewed configuration.
8. Add or update deterministic public acceptance tests and confirm the expanded event counts.
9. If an optional calendar is wanted, copy the ignored private seed, keep it synchronized with the public configuration, and run `npm run private:generate`.
10. Run `npm run check` and, when the ignored seed exists, `npm run private:verify`.
11. Review the production build and privacy-check output.
12. Push to `main` and wait for GitHub Pages deployment.

Because the timetable is public, do not put anything in course titles, configuration labels, pattern IDs, or notes that identifies the student. If private per-person schedules are needed in the future, that is a different product model and requires an explicit privacy redesign.
