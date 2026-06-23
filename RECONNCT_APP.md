# reconnct — mobile app

React Native (JavaScript only, no TypeScript) app built from the Figma screens.
Data is **dynamic** — it comes from the same backend/admin panel as the website,
through a new public read-only API.

## Screens
- **Login (email OTP)** — email → 6-digit OTP. Social / phone sign-in were intentionally removed.
  Reuses backend `/api/user-auth/request-otp` + `/verify-otp`.
- **Home** — golden header + greeting, search, two hero cards (Reconnect / Experiences),
  Early Bird banner, **Explore** (first 4 cards in a grid, the rest in a horizontal carousel,
  then an *Explore more* button), **Featured Experiences** with category tabs, bottom nav.
- **Experiences list** — category quick-tabs, search, 2-col grid, **Filter** sheet
  (Reconnect-with / Category / Price per person) with a live "Show N experiences" count.
- **Detail** — image gallery, host, About, What's included, Reviews, sticky *Book Now* bar.
- Bottom nav: Home · Search · Experiences · Inbox · Profile (Profile has Log out).

## Backend (new, no-auth public surface)
- `GET /api/public/experiences?categoryId=&audienceId=&priceMin=&priceMax=&q=&featured=1`
- `GET /api/public/experiences/:idOrSlug`
- `GET /api/public/taxonomy` (audiences + categories for the filter UI)

Only `status=published` + `isActive` experiences are exposed. Files:
`backend/src/controllers/public.controller.js`, `backend/src/routes/public.routes.js`.

## Configure the API
Edit one line in [src/config.js](src/config.js):

```js
export const API_BASE = 'http://192.168.1.8:5001/api';
```

- Physical phone (same Wi-Fi): your PC's LAN IP (detected: `192.168.1.8`).
- Android emulator: `http://10.0.2.2:5001/api`.
- Deployed backend: `https://your-domain/api`.

The release APK allows cleartext http (for the LAN backend) — see
`android/app/build.gradle` release `manifestPlaceholders`. Switch to https in production.

## Run in development
```bash
# terminal 1 — backend
cd backend && npm run dev
# terminal 2 — metro
cd App/reconnct && npm start
# terminal 3 — device/emulator
cd App/reconnct && npm run android
```

## Build a release APK
```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
cd App/reconnct/android
./gradlew.bat assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`
(signed with the debug keystore — fine for testing, replace before publishing).
