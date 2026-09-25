# Laufbursche VMAX new Tool

A static web page that reads the newer VMAX e-scooters over Web Bluetooth. These are the models served
by the *VMAX E-Scooter* app (VX2, VX4, new VX4, VX8, R40 Pro, R55 Pro). They do not speak the classic
ZYD protocol but the GPST protocol **KingmeterVmax** over the `DA1A15xx` GATT family. For the classic
line (Bluetooth name `hw_`/`zyd_`, *VMAX connect* app) use the sister tool
[vmax-unlock](https://laufbursche42.github.io/vmax-unlock/). Nothing to install: it runs in
**Bluefy** on iOS and in **Chrome** on Android or desktop.

> **The write is sent; its effect is unconfirmed on hardware.** This is a read-and-test instrument. The
> limiter write (MotorTuning MaxSpeed/SpeedCut -> characteristic `DA1A160D`) and the comfort settings
> (SetSetting -> `DA1A1A03`) are reconstructed from the vendor app and are sent on request. The vendor app
> never writes the limiter itself, though, and no controller has confirmed it accepts a written value - so
> the effect on a real device is unconfirmed (hardware test pending). **Reading works:** live values,
> configuration, tuning and every readable characteristic are shown. Error-free operation is not promised
> and there is no warranty. Read the [Disclaimer](#disclaimer) before you connect a scooter.

**Open the web app: [laufbursche42.github.io/vmax-new-unlock](https://laufbursche42.github.io/vmax-new-unlock/)**

**Guide: [Deutsch](GUIDE.de.md) | [English](GUIDE.en.md)** covers every step, from the first connect to
reading out all values.

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

- **Connect** over Web Bluetooth (service `DA1A1500`). No PIN, password or account - the GPST data path
  has no auth; you only pick the device in the chooser. The tool writes the required 6-byte TimeSync
  handshake to `DA1A1607` and subscribes to every notify characteristic.
- **Show every value it can read:** live telemetry tiles, a read-out settings panel, and an advanced
  panel with the full MotorTuning decode, battery/BMS detail, motor, status, stats, firmware id, serials
  and error codes.
- **Write the comfort settings** the vendor app writes (light, assist level, start mode, walk assist,
  beeper, units and more) via SetSetting to `DA1A1A03`, each behind a confirm.
- **Write MotorTuning** (MaxSpeed / SpeedCut) to `DA1A160D` behind a confirm.
- **List characteristics:** every service and characteristic with its properties.
- **Read the MotorTuning report** (`DA1A160C`) and decode all ordinals.
- **A full protocol log:** timestamped TX/RX hex, decoded lines, autoscroll, anonymize toggle,
  diagnostic toggle, copy / clear / save, plus a device scan.

## What it does not do

- **No firmware / OTA.** There is no cloud firmware fetch; the tool talks only to the device over BLE.

## Honest note

The tool sends the documented write commands. The vendor app, however, never sends the MotorTuning write
command itself. The frame was reconstructed from the native library `libble-sdk-native-lib.so`
(`GPSTProtocolHandler::WriteMotorTuning`). Whether the controller accepts a written value, and whether
`MaxSpeed` changes the eKFV limiter, is **not proven** - and on the measured devices the write
characteristics `DA1A160D` and `DA1A1A03` are absent entirely, in which case the write buttons stay
disabled because there is nothing to write to. The effect on a real device is unconfirmed (hardware test
pending).

## Frame format (reconstructed)

`WriteMotorTuning` builds the buffer like this:

- Byte 0 = profile index.
- Then one value byte per tuning type, sorted by type ordinal, unset types `0xFF`.
- Type ordinals: MaxPower 0, AssistFactor 1, DynamicFactor 2, **SpeedCut 3**, **MaxSpeed 4**.
- Target characteristic `DA1A160D`. No checksum, no encryption in the write path.

Setting only `MaxSpeed` is therefore, for example: `[idx] FF FF FF FF [value]`; SpeedCut plus MaxSpeed is
`[idx] FF FF FF [SpeedCut] [MaxSpeed]`. `SetSetting` writes `[prefix 0x60][keycode][value code]` to
`DA1A1A03`. The tool also decodes the matching MotorTuning **read** report (`DA1A160C`).

## Disclaimer

**Please read this in full before you connect a scooter.**

- **This is a feasibility study**, not a finished product. It shows what the scooter's Bluetooth
  protocol makes possible. Nothing here promises that it works with your scooter, your phone or your
  browser, or that it still works after the next controller firmware or browser release.
- **The limiter write is sent, but its effect is unconfirmed on hardware.** The vendor app never sends it
  and no controller is proven to accept it.
- **Raising the limit would end the road approval.** A scooter that no longer holds the eKFV limit is not a
  road-legal eKFV any more. The operating permit (Betriebserlaubnis) is void, and the insurance cover goes
  with it.
- **Ride it on private property only.**
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
