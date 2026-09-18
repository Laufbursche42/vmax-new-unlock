# Laufbursche VMAX new Tool

A static web page that talks to the newer VMAX e-scooters over Web Bluetooth. These are the models
served by the *VMAX E-Scooter* app (VX2, VX4, new VX4, VX8, R40 Pro, R55 Pro). They do not speak the
classic ZYD protocol but the GPST protocol **KingmeterVmax** over the `DA1A15xx` GATT family. For the
classic line (Bluetooth name `hw_`/`zyd_`, *VMAX connect* app) use the sister tool
[vmax-unlock](https://laufbursche42.github.io/vmax-unlock/). Nothing to install: it runs in
**Bluefy** on iOS and in **Chrome** on Android or desktop.

> **This is a feasibility study.** It exists to show what the newer VMAX scooters' Bluetooth protocol
> makes possible, not to be a finished product. The manufacturer app never writes the speed limiter
> itself, so it is not proven that the controller accepts a written value. Error-free operation is
> not promised and there is no warranty of any kind. Whatever you do with it, you do at your own
> risk. Read the [Disclaimer](#disclaimer) before you connect a scooter.

**Open the web app: [laufbursche42.github.io/vmax-new-unlock](https://laufbursche42.github.io/vmax-new-unlock/)**

**Guide: [Deutsch](GUIDE.de.md) | [English](GUIDE.en.md)** covers every step, from the first connect
to reading and writing the limiter.

Or run it yourself, no build step and no dependencies: clone the repo and serve the folder over a
local HTTP server. Opening `index.html` directly as a `file://` URL will not work, the page fetches
its own documents and browsers block that over `file://`.

```
git clone https://github.com/Laufbursche42/vmax-new-unlock.git
cd vmax-new-unlock
python -m http.server 8848
```

Then open the printed address in a browser that supports Web Bluetooth.

## What it does

- **Connect** over Web Bluetooth (service `DA1A1500`).
- **List characteristics:** show every service and characteristic with its properties and subscribe
  to every notify characteristic.
- **Read** the MotorTuning report (`DA1A160C`) raw.
- **Write the limiter** over `SetMotorTuning`: Unlock sets `MaxSpeed` high, Lock sets it back. Both
  write the same frame to `DA1A160D`, only the value differs.
- **A full protocol log** you can copy, plus a diagnostics scan that lists every device and its GATT
  services.

## Honest note

The manufacturer app never sends the MotorTuning write command. The frame was reconstructed from the
native library `libble-sdk-native-lib.so` (`GPSTProtocolHandler::WriteMotorTuning`). Whether the
controller accepts a written value, and whether `MaxSpeed` changes the eKFV limiter, is **not proven**
and must be tested on your own device. The protocol's connection handshake is not fully reconstructed
yet, so a write may not land without the correct setup. That is why the tool is first a read and test
instrument: read first, watch what the scooter reports, then write carefully and watch the log.

## Frame format (reconstructed)

`WriteMotorTuning` builds the buffer like this:

- Byte 0 = profile index.
- Then one value byte per tuning type, sorted by type ordinal, unset types `0xFF`.
- Type ordinals: MaxPower 0, AssistFactor 1, DynamicFactor 2, SpeedCut 3, **MaxSpeed 4**.
- Target characteristic `DA1A160D`. No checksum, no encryption in the write path.

Setting only `MaxSpeed` is therefore, for example: `[idx] FF FF FF FF [value]`.

## Disclaimer

**Please read this in full before you unlock a scooter.**

- **This is a feasibility study**, not a finished product. It shows what the scooter's Bluetooth
  protocol makes possible. Nothing here promises that it works with your scooter, your phone or your
  browser, or that it still works after the next controller firmware or browser release.
- **Unlocking ends the road approval.** A scooter that no longer holds the eKFV limit is not a road-legal
  eKFV any more. The operating permit (Betriebserlaubnis) is void, and the insurance cover goes with it.
- **Ride it on private property only.** Riding a derestricted scooter in public traffic is an offence in
  Germany: no operating permit, no insurance. The liability is entirely yours.
- **No liability** and **no warranty** of function, correctness or fitness for a particular purpose.
- Everything you do with this page is **at your own risk**.

By using this page you accept these terms.

## License

PolyForm Noncommercial 1.0.0 with two additional terms, in full in [LICENSE.md](LICENSE.md).

## Privacy

Nothing leaves your device but the page load itself. The details are in [PRIVACY.md](PRIVACY.md).

## Trademarks

An independent project, not affiliated with VMAX. "VMAX" and other product names are trademarks of
their respective owners and are used here only to say which scooters this page works with. See
[TRADEMARKS.md](TRADEMARKS.md).
