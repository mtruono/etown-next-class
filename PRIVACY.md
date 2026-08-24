# Privacy

## The timetable is public

This deployment uses the owner-selected simple public-link model. The Fall 2026 timetable, course details, rooms, term exceptions, and approximate building coordinates are included in the public app. Anyone with the link can view them. There is no login, access code, or claim that this data is private.

The app does not include or request a student name, student ID, email address, phone number, dorm room, account, or other identity information.

## Live location is not public

The app never asks for location on page load. It calls `navigator.geolocation.getCurrentPosition` only after a user taps Campus guide.

The returned coordinates and accuracy value are held in memory only while the guide is open. They are not:

- saved to local storage or IndexedDB;
- written to logs;
- sent to this application’s static host;
- sent to Elizabethtown College, Concept3D, Apple Maps, or Google Maps;
- sent to analytics, advertising, or error-reporting services; or
- watched continuously in the background.

Closing or leaving the guide discards the captured position. The browser and operating system still control location permission and may have their own platform-level privacy behavior.

## Local map

The Campus guide is an SVG schematic created from local application data. It loads no map tiles, remote scripts, remote styles, or third-party map iframe. It provides approximate straight-line orientation rather than a verified path.

## Offline and storage

The service worker caches the public application shell and local static assets. That cache necessarily includes the public timetable. It does not cache GPS data or a setup fragment. The app does not need schedule data in browser storage.

## Private generator artifacts

Optional `.ics`, setup-code, audit, and route-verification outputs under `private/` remain ignored. They are development artifacts and are not included in the public build. Run `npm run privacy:check` before every push and after every build.
