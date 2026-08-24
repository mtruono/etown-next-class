# New semester

1. Keep the new real configuration only in `private/schedule.seed.json`.
2. Update `private/schedule.expectations.private.json` and `private/privacy-denylist.txt` with the new schedule’s verification values. These paths are ignored.
3. Keep a home destination, classroom building destinations, term boundaries, date exceptions, and the conservative campus classification setting in the configuration.
4. Run `npm run private:verify` and `npm run private:generate` with the production `APP_URL`.
5. Run `npm run check` and `npm run test:e2e`; confirm the built assets do not contain denylisted schedule values.
6. Privately send `private/generated/student-setup-url.txt`. The student taps it once; nothing is typed.
7. On the phone, confirm the fragment disappears and the ordinary site URL works afterward.
8. Re-run the real route checklist whenever destinations or the campus map change.

Never copy the real timetable into `src/`, tests, documentation, screenshots, issues, or pull requests. Use only fictional fixtures in committed test and demo code.
