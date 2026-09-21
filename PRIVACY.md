# Privacy notice

This web app is built to keep your data on your device. There is exactly **one** exception, which you
trigger yourself: the optional firmware login. This notice says precisely what the app does with your
data and what it does not.

## In short

The Bluetooth part collects nothing: no statistics, no telemetry, no tracking, no ads, no cookies and
no third-party scripts. None of it goes to the developer.

The **only** exception is the optional **firmware login** (the "Get firmware" section). If you use it,
your email, your password and your scooter's device identifiers go straight to the vendor server
`vmax.gpstuner.com`, to nobody else. If you do not use it, nothing leaves your device.

## What stays on your device

Everything below stays on your device and is never uploaded:

- The scooter's live data read over Bluetooth LE (the raw replies the scooter sends back).
- The settings you make on the page (open and legal MaxSpeed value, profile index). They live only in
  the open page during your session.
- Your language and theme choice. It sits in your browser's local storage and does not leave the device.
- The on-screen log. It lives only in the open page during your session.

## The optional firmware login: what, where, why

**Why.** The newer VMAX models' firmware is delivered by the vendor only with account authentication.
To fetch it you must log in with your VMAX or GPS-Tuner account, exactly like the official app. This is
the only known route to get the firmware of these models.

**What is sent and where.** Only to the vendor server `https://vmax.gpstuner.com`, over HTTPS, straight
from your browser:

- On login: your **email** and **password** to `POST /api/login`. The response is an access token.
- On firmware check and download: the **access token** plus the **device identifiers** (model,
  controller, serial, current firmware version) to `POST /api/device/updates` and
  `POST /api/device/update`.

This is the same server and the same route the official app uses. This page adds nothing and redirects
nothing.

**What does not happen.**

- The **developer** of this page **never** sees your credentials. There is no server of this project in
  between. The connection goes directly from your browser to the vendor.
- **No credentials are stored.** Email and password are used only for the request, the token lives only
  in the open page's memory until you close or reload it.
- There is **no statistics, no tracking and no sharing with third parties** by this page.

**At the vendor.** What the vendor server does with the requests, such as access logs, is up to the
vendor (GPS-Tuner or VMAX), just as with the official app. This page has no influence on that.

**Voluntary.** The login is entirely optional. If you only want to read live values or test the speed
limiter on your own device, you do not need it, and then nothing leaves your device.

## The network connections at a glance

The app opens a connection only in these cases, in no other:

1. **Loading the page.** Your browser fetches the static files from the host (for example GitHub Pages):
   `index.html`, `app.js`, `i18n.js`, `styles.css` and the icon. The host sees your IP address and which
   file you fetched, the usual access logs of any website. It never sees scooter data, commands or
   credentials.
2. **Bluetooth LE to the scooter.** A local radio link over Web Bluetooth, not an internet connection.
   Commands and replies run only between your browser and the scooter.
3. **Optional firmware login to `vmax.gpstuner.com`.** Only when you start it yourself in the "Get
   firmware" section, as described above.

## No developer backend

There is no server of this project that takes your data, no developer account, no cloud of this
project. The only external connection with your data is the one **you** trigger with the firmware login,
directly to the **vendor**.

## Contact

For privacy questions contact the author (Laufbursche) on GitHub:
https://laufbursche42.github.io/Laufbursche42/
