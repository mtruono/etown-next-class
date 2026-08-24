# Optional Siri launcher

The PWA's Home Screen icon is the normal launcher. If a Siri phrase is useful, create this simple Shortcut on the iPhone after deployment:

1. Open **Shortcuts** and create a new Shortcut.
2. Add a **URL** action containing `https://mtruono.github.io/etown-next-class/`.
3. Add **Open URLs** beneath it.
4. Name the Shortcut **Next Class**.
5. Optionally add it to the Home Screen, or say “Siri, Next Class.”

This shortcut only opens the PWA. The PWA immediately shows the assistant and requests location only after a class or home navigation action. No installable or signed `.shortcut` file is generated or claimed.
