# New semester

1. Update `src/data/publicSchedule.ts` with the new courses, rooms, term boundaries, calendar exceptions, home destination, and classroom destinations.
2. Do not add the student’s name, ID, email, phone number, or dorm room number.
3. Update the public-schedule unit and browser assertions for the new term.
4. Run `npm run check` and `npm run test:e2e`.
5. Deploy and confirm the ordinary site URL opens the new schedule without a setup step.
6. Re-run the real route checklist whenever destinations or the campus map change.

Course details and the Founders B-area destination are intentionally public. Student identity and contact details remain forbidden in source, tests, documentation, screenshots, issues, and pull requests.
