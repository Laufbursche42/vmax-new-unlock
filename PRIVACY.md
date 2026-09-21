# Privacy notice

This web app is built to keep your data on your device. There is exactly **one** exception, which you
trigger yourself: the optional firmware section. This notice says precisely what the app does with your
data and what it does not.

## In short

The Bluetooth part collects nothing: no statistics, no telemetry, no tracking, no ads, no cookies and
no third-party scripts. None of it goes to the developer.

The **only** exception is the optional **firmware section** (the "Get firmware" section). If you use it,
the access token you paste and your scooter's device identifiers go straight to the vendor server
`api.gpstuner.com`, to nobody else. There is **no login and no password** there. If you do not use it,
nothing leaves your device.

## What stays on your device

Everything below stays on your device and is never uploaded:

- The scooter's live data read over Bluetooth LE (the raw replies the scooter sends back).
- The settings you make on the page (open and legal MaxSpeed value, profile index). They live only in
  the open page during your session.
- Your language and theme choice. It sits in your browser's local storage and does not leave the device.
- The on-screen log. It lives only in the open page during your session.

## The optional firmware section: what, where, why

**Why.** The newer VMAX models' firmware is delivered by the vendor only with authentication. The section
asks the vendor's firmware server directly for it - the same server the official app uses. It is entirely
optional and **experimental**.

**Honest status.** By our analysis this cloud route is currently effectively closed: the vendor removed
the endpoint the current official app calls, and the still-live endpoint only answers for a device `uuid`
its registry knows. So it almost always returns `Invalid uuid`. The fields remain for the case where
someone has a valid `uuid` (and a valid token).

**No login.** This page does **not** log you in and asks for **neither email nor password**. You enter two
things yourself, if you have them: an **access token** and your **device uuid**.

**What is sent and where.** Only to the vendor server `https://api.gpstuner.com`, over HTTPS, straight
from your browser:

- The **access token** you enter (as an `Authorization: Bearer` header, exactly like the app).
- The **device identifiers** (`uuid`, model, controller, serial, current firmware version) as form fields
  to `POST /api/device/update`.

This is the same server and the same route the official app uses for firmware. This page adds nothing and
redirects nothing.

**What does not happen.**

- The **developer** of this page **never** sees your input. There is no server of this project in between.
  The connection goes directly from your browser to the vendor.
- **Nothing is stored.** The token and `uuid` live only in the open page's memory until you close or
  reload it. The token is masked in the on-screen output so a copied log is safe to share.
- There is **no statistics, no tracking and no sharing with third parties** by this page.

**At the vendor.** What the vendor server does with the requests, such as access logs, is up to the
vendor (GPS-Tuner or VMAX), just as with the official app. This page has no influence on that.

**Voluntary.** The section is entirely optional. If you only want to read live values or test the speed
limiter on your own device, you do not need it, and then nothing leaves your device.

## The network connections at a glance

The app opens a connection only in these cases, in no other:

1. **Loading the page.** Your browser fetches the static files from the host (for example GitHub Pages):
   `index.html`, `app.js`, `i18n.js`, `styles.css` and the icon. The host sees your IP address and which
   file you fetched, the usual access logs of any website. It never sees scooter data, commands or
   credentials.
2. **Bluetooth LE to the scooter.** A local radio link over Web Bluetooth, not an internet connection.
   Commands and replies run only between your browser and the scooter.
3. **Optional firmware section to `api.gpstuner.com`.** Only when you start it yourself in the "Get
   firmware" section, as described above.

## No developer backend

There is no server of this project that takes your data, no developer account, no cloud of this
project. The only external connection with your data is the one **you** trigger with the firmware
section, directly to the **vendor**.

## Contact

For privacy questions contact the author (Laufbursche) on GitHub:
https://laufbursche42.github.io/Laufbursche42/
