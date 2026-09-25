# Privacy notice

This web app keeps your data on your device. There is no server of this project that takes anything. This
notice says precisely what the app does with your data and what it does not.

## In short

The app collects nothing: no statistics, no telemetry, no tracking, no ads, no cookies and no third-party
scripts. The Bluetooth part talks to the device locally only. Nothing leaves your device but the page load
itself.

## What stays on your device

Everything below stays on your device and is never uploaded:

- The scooter's live data read over Bluetooth LE (the raw replies the scooter sends back), along with the
  configuration and settings the page reads out.
- Your language and theme choice. It sits in your browser's local storage and does not leave the device.
- The on-screen log. It lives only in the open page during your session. The log anonymizer (on by
  default) redacts addresses, serial numbers and device IDs so a shared log is safe.

## The network connections at a glance

The app opens a connection only in these cases, in no other:

1. **Loading the page.** Your browser fetches the static files from the host (for example GitHub Pages):
   `index.html`, `app.js`, `i18n.js`, `styles.css` and the icon. The host sees your IP address and which
   file you fetched, the usual access logs of any website. It never sees scooter data, commands or
   credentials.
2. **Bluetooth LE to the scooter.** A local radio link over Web Bluetooth, not an internet connection.
   Requests and replies run only between your browser and the scooter.

## No developer backend

There is no server of this project that takes your data, no developer account, no cloud of this project.
Nothing goes to third parties.

## Contact

For privacy questions contact the author (Laufbursche) on GitHub:
https://laufbursche42.github.io/Laufbursche42/
