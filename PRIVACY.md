# Privacy model

The deployed site is public and generic. It contains no assigned class schedule. A private setup code is pasted only after the Home Screen app is installed. The browser verifies its checksum, strictly validates its JSON, presents a human-readable preview, and requires confirmation. It stores only the parsed configuration under a versioned local-storage key. The raw imported code is not stored.

The setup code is **not encrypted**. Its SHA-256 checksum detects corruption or changes; anyone who obtains the code can decode its contents. Keep it private. Exporting from Settings creates a fresh code from the parsed local configuration and displays it only on that device.

Live GPS is never requested on page load. A directions-related tap starts one `getCurrentPosition` request. Captured live coordinates and reported accuracy remain in volatile page memory only. They are not written to local storage, logged, sent to an application server, included in analytics, or watched continuously. The app has no backend and no analytics.

After location is resolved, the app presents route links and requires another tap. The selected external provider then receives the origin and destination coordinates needed for that route. The provider applies its own privacy policy. A destination-only link omits live origin where supported. Destination and campus-center coordinates are part of the imported configuration because they are required for routing; they are public-place approximations, not captured device-location history.

An optional `#setup=` link is parsed but never imported automatically. The fragment is removed immediately with `history.replaceState`, then the normal preview and confirmation flow applies. The service worker caches only same-origin shell assets, not map pages, route responses, GPS data, or setup-code values.

“Erase schedule from this device” asks for confirmation and removes every local-storage key owned by Etown Next Class, including the schedule and preferred provider. It does not affect unrelated browser storage.

No name, student ID, email address, dorm room number, account, authentication credential, advertising identifier, or tracking identifier is required.
