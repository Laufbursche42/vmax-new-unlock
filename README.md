# Laufbursche VMAX new Tool

A static web page that reads the newer VMAX e-scooters over Web Bluetooth. These are the models served
by the *VMAX E-Scooter* app (VX2, VX4, new VX4, VX8, R40 Pro, R55 Pro). They do not speak the classic
ZYD protocol but the GPST protocol **KingmeterVmax** over the `DA1A15xx` GATT family. For the classic
line (Bluetooth name `hw_`/`zyd_`, *VMAX connect* app) use the sister tool
[vmax-unlock](https://laufbursche42.github.io/vmax-unlock/). Nothing to install: it runs in
**Bluefy** on iOS and in **Chrome** on Android or desktop.

> **Locking and unlocking does not work here.** This is a read-and-test instrument. The limiter write
> (MotorTuning MaxSpeed -> characteristic `DA1A160D`) is reconstructed from the vendor app, which never
> sends it, and no controller has ever confirmed it accepts a written value - so the write is disabled in
> the tool. **Reading works:** live values, configuration, tuning and every readable characteristic are
> shown. Error-free operation is not promised and there is no warranty. Read the [Disclaimer](#disclaimer)
> before you connect a scooter.

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
- **List characteristics:** every service and characteristic with its properties.
- **Read the MotorTuning report** (`DA1A160C`) and decode all ordinals.
- **A full protocol log:** timestamped TX/RX hex, decoded lines, autoscroll, anonymize toggle,
  diagnostic toggle, copy / clear / save, plus a device scan.

## What it does not do

- **Lock / unlock / derestrict.** The limiter write to `DA1A160D` is disabled (see above). The buttons
  are shown greyed for transparency but never fire.
- **No firmware / OTA.** There is no cloud firmware fetch; the tool talks only to the device over BLE.

## Honest note

The vendor app never sends the MotorTuning write command. The frame was reconstructed from the native
library `libble-sdk-native-lib.so` (`GPSTProtocolHandler::WriteMotorTuning`). Whether the controller
accepts a written value, and whether `MaxSpeed` changes the eKFV limiter, is **not proven** - and on the
measured devices the write characteristic `DA1A160D` is absent entirely. That is why writing is gated off
behind a single flag; if a real device ever proves it, one line re-enables it.

## Frame format (reconstructed, not sent by this tool)

`WriteMotorTuning` builds the buffer like this:

- Byte 0 = profile index.
- Then one value byte per tuning type, sorted by type ordinal, unset types `0xFF`.
- Type ordinals: MaxPower 0, AssistFactor 1, DynamicFactor 2, SpeedCut 3, **MaxSpeed 4**.
- Target characteristic `DA1A160D`. No checksum, no encryption in the write path.

Setting only `MaxSpeed` would therefore be, for example: `[idx] FF FF FF FF [value]`. The tool decodes the
matching **read** report (`DA1A160C`) but never sends this write.

## Disclaimer

**Please read this in full before you connect a scooter.**

- **This is a feasibility study**, not a finished product. It shows what the scooter's Bluetooth
  protocol makes possible. Nothing here promises that it works with your scooter, your phone or your
  browser, or that it still works after the next controller firmware or browser release.
- **Locking / unlocking does not work.** The limiter write is unconfirmed and disabled.
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
