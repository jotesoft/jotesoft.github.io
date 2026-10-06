# Ramadan Daily - Bangladesh (Offline)

This project has been converted to an offline-first PWA.

## What changed

- Removed the Tailwind CDN runtime dependency.
- Removed the Google Fonts network dependency.
- Replaced external styling with `css/app.css`.
- Uses local/system font fallbacks, including Bengali-capable system fonts when available.
- Added a complete `manifest.json` and local PWA icons.
- Added an offline-first `sw.js` that caches the full app shell and falls back to the cached app for navigation.
- Removed the external JOTE website link from the UI so the page itself does not need the internet.

## Prayer-time algorithm

The timing engine remains fully local. It calculates solar position from the selected division's latitude/longitude and the device date.

Assumptions used by this Bangladesh-only app:

- Bangladesh Standard Time: UTC+6.
- Fajr: 18° solar depression.
- Isha: 18° solar depression.
- Sunrise/Sunset: 90.833° zenith (standard atmospheric/refraction + solar-disc approximation).
- Dhuhr: calculated solar noon.
- Asr: shadow factor 2 for Hanafi and shadow factor 1 for Salafi/standard.

The algorithm now handles leap years correctly and calculates tomorrow's Fajr from tomorrow's solar position when the next prayer is after Isha.

This is an astronomical approximation, not an authoritative mosque/local-calendar timetable. Local observation, published Bangladesh prayer calendars, and any chosen scholarly method can differ by minutes.

## Running offline

Serve this folder from any local HTTP/HTTPS server. After the first load, the service worker caches the app shell so the frontend can continue working without internet access.

Example:

`python -m http.server 8080`

Then open `http://localhost:8080/` once while connected to the local server. After the service worker finishes installing, disconnect the internet and reload the page.

Service workers require a secure context: HTTPS or localhost. Opening `index.html` directly as a `file://` URL will not install the service worker.
