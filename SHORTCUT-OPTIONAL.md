# Optional Siri launcher

The PWA's Home Screen icon is the normal launcher. If a Siri phrase is useful, create this simple Shortcut on the iPhone after deployment:

1. Open **Shortcuts** and create a new Shortcut.
2. Add a **URL** action and paste the deployed PWA URL.
3. Add **Open URLs** beneath it.
4. Name the Shortcut **Next Class**.
5. Optionally add it to the Home Screen, or say “Siri, Next Class.”

This shortcut only opens the PWA. The PWA itself calculates the next class and requests location after a route action. No installable or signed `.shortcut` file is generated or claimed.
