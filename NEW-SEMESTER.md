# Prepare a new semester

1. Copy `private/schedule.seed.json` to a secure backup before editing it. If starting fresh, copy `private.example/schedule.seed.example.json` into the ignored `private/` directory.
2. Replace the configuration label and every term boundary. `regularClassesEnd` controls recurrence; do not use a later printed or finals date as a recurrence end.
3. Replace meeting patterns with the new course code, title, ISO weekdays, campus-local start and end time, destination ID, room, and modality. Give every pattern a stable unique ID.
4. Enter official no-class dates, replacement-weekday schedules, modality overrides, and informational dates from the official academic calendar. One date may have only one rule.
5. Add or revise destinations in the private payload. A new building can be delivered through the setup code without redeploying the public app. Use only a cited building-level coordinate, confidence label, search key, and candid navigation note. Never invent a door or indoor route.
6. Update the ignored `private/schedule.expectations.private.json` from an independent manual count and add boundary, exception, virtual, finals, and daylight-saving cases.
7. Update the ignored `private/privacy-denylist.txt` with the new course codes, titles, pattern IDs, and distinctive private strings.
8. Run `npm run private:generate`. It validates, expands, verifies, and creates a new setup code, explicit-event ICS, audit, and route page.
9. Read `private/generated/schedule-audit.json`, manually compare every count and first/last occurrence to the source schedule, and run `npm run private:verify` again.
10. Send `private/generated/student-setup.txt` privately. In Settings on the iPhone, choose **Import or replace schedule**, review the complete preview, and tap **Replace existing schedule**.
11. If the companion calendar is wanted, privately transfer `private/generated/student-classes.ics`. It is not required by the PWA.
12. Run `npm run privacy:check`, build, run it again, and confirm `git status --ignored` shows all private inputs and outputs as ignored.

Do not repurpose an old setup code or hand-edit the ICS. Both must come from the same validated expansion.
