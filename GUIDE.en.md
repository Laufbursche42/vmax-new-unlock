# Guide

This guide walks step by step through the VMAX new Tool, from the first connect through reading to
setting the speed limiter. It assumes nothing.

## What you need

- A newer VMAX scooter from the VMAX E-Scooter app (VX2, VX4, new VX4, VX8, R40 Pro, R55 Pro). These
  models speak the GPST protocol KingmeterVmax over the Bluetooth service `DA1A1500`.
- A browser with Web Bluetooth: **Chrome** on Android or desktop, **Bluefy** on the iPhone. Safari
  has no Web Bluetooth.
- The scooter on and in range.

If your scooter belongs to the classic line (Bluetooth name `hw_` or `zyd_`, VMAX connect app), use
the [sister tool vmax-unlock](https://laufbursche42.github.io/vmax-unlock/). This tool is only for the newer models.

## 1. Open the page

Open the page in a supported browser. At the top you see the header with the connection status, the
light/dark switch and the language toggle DE/EN.

## 2. Connect

The **Connection** card has a model selector. It is only a hint, the page always connects over the
`DA1A1500` service. Tap **Connect** and pick your scooter from the device list. On first connect,
allow all services and characteristics. After connecting the status reads **connected**.

## 3. Look at the characteristics

The **Discovered characteristics** card lists all services and characteristics with their properties
(read, write, notify). The tool subscribes to every notify characteristic automatically. If it does
not find the write characteristic `DA1A160D`, the scooter is probably not a newer model.

## 4. Read tuning

Tap **Read tuning** in the **Speed limiter** card. If the scooter reports a MotorTuning over the
`DA1A160C` characteristic, it appears raw in the log. This step changes nothing. It shows whether
your model carries a writable MaxSpeed at all and which value and cap it reports.

## 5. Set the limiter

The **Speed limiter** card has two fields and two buttons:

- **Open (MaxSpeed):** the value that **Unlock** writes.
- **Legal (MaxSpeed):** the value that **Lock** writes.
- **Profile index:** usually 0. Reading shows the correct index.

Unlock (remove limiter) writes the open value, Lock (set limiter) writes the legal one. Both write
the same MotorTuning command to `DA1A160D`, only the number differs. A dialog asks before unlocking.

Important and honest: the vendor app never sends this command. Whether the controller accepts it and
whether MaxSpeed really changes the limiter is not proven. Read first, stay within the reported
limits and watch the log for how the scooter reacts.

## 6. Log

The **Log** card shows every sent and received frame as hex. **Copy log** shares the capture, which
helps to understand the protocol on the real device. **Scan all devices** lists nearby Bluetooth
devices with their services.

## 7. Get firmware (account login)

This section is independent of Bluetooth and entirely optional. The vendor releases the newer VMAX
models' firmware only to logged-in accounts, so a login is required. It is the only known route to get
the firmware of these models, for example to study it.

**Important for privacy.** Unlike the rest of the page, this login talks directly to the vendor server
`vmax.gpstuner.com`. Your email, password and the device identifiers go there encrypted, to nobody
else, not to the developer. Nothing is stored. What exactly is transmitted is in the
[privacy notice](PRIVACY.md). The question mark on the Firmware card also takes you there.

How to do it:

1. Enter the **email and password** of your VMAX or GPS-Tuner account and tap **Log in**. On success it
   shows "Login OK, token received" and the firmware buttons are enabled. If you created your account
   via Google or Facebook, first set a password in the app or on the website, because here only email
   plus password works.
2. **Load profile** shows the bikes registered in your account. This tells you whether your scooter must
   be registered.
3. Enter the **device identifiers**: serial (from `DA1A1511`), model and controller (from `DA1A1802`).
   These values are in the log if you connected and read over Bluetooth first. Best leave the current FW
   at `0.0.0` so the server offers the latest version as an update.
4. **Check firmware** asks the server what firmware exists. **Get firmware** fetches it.

The page shows the server's raw responses in the output field. If the download does not work yet, it is
usually the exact field names. Copy the response and send it back, then we adjust the request.

## If something does not work

- **The scooter does not appear in the list.** Is it on and in range? Use **Scan all devices**.
- **No notify arrives.** Check the log for RX lines. Some models only send after a short warm-up or
  expect a specific connection setup.
- **The write does nothing.** This can be down to a missing handshake or the controller not knowing
  the command. Send the log so the flow can be traced.

## Legal

Raising the top speed removes the limiter. The road approval lapses and use on public roads is then
not allowed. Use the tool only on your own vehicle on private ground and at your own risk.
