# Privacy Policy

This web app is built to keep your data on your device. This policy explains exactly what it does and
does not do with your data.

## The short version

The app collects nothing. There are no accounts, no analytics, no telemetry, no tracking, no ads, no
cookies and no third-party scripts. Nothing is ever sent to the developer or to any manufacturer
backend.

## What data the app handles and where it stays

All of the following stays on your device and is never uploaded anywhere:

- Live scooter data read over Bluetooth LE (the raw notifications the scooter sends back).
- Any settings you make on the page (open and legal MaxSpeed value, profile index). They exist only
  in the open page during your session.
- Your language and theme choice. It lives in your browser's local storage and does not leave your
  device.
- The on-screen log. It exists only in the open page during your session and is never uploaded.

## The only network connection

The app makes network connections in exactly two cases and no others:

### 1. Loading the page

When you open or reload the page, your browser fetches the static files (`index.html`, `app.js`,
`i18n.js`, `styles.css` and the favicon) from the host (for example GitHub Pages). The host sees only
two things: your **IP address** and which file you requested. Those are the normal web-server logs
every website has. It **never** sees any scooter data or commands. That data never reaches any server
at all; it exists only on your device and travels only over the local Bluetooth link (see below).

### 2. Bluetooth LE to your scooter

A local radio link to your scooter over Web Bluetooth. This is not an internet connection: no data
leaves your device over the network for this. The commands and the notifications the scooter sends
back travel only between your browser and the scooter.

## No developer or manufacturer backend

Nothing is ever sent to the developer or to any manufacturer backend. There is no cloud account and
no server operated by this project that receives your data. For comparison: the original app for the
newer VMAX models signs you in and talks to a manufacturer backend. This app does none of that.

## Contact

For privacy questions, contact the author (Laufbursche) on GitHub: https://laufbursche42.github.io/Laufbursche42/
