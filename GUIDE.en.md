# Guide

This guide walks step by step through the VMAX new Tool: connect, read out every value, and write the
documented settings and limiter. It assumes nothing.

**Important first:** the write is sent, but its effect is unconfirmed on hardware. The limiter write
command is reconstructed from the vendor app, which never sends it itself, and no controller has ever
confirmed it accepts a written value. The tool sends the documented writes on request; whether a real
controller acts on them is unconfirmed (hardware test pending). Reading is proven-safe and always works.

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
light/dark switch and the language toggle DE/EN, and below it the notice banner.

## 2. Connect

The **Connection** card has a model selector. It is only a hint, the page always connects over the
`DA1A1500` service. This protocol needs **no PIN and no password** - you only pick your device in the
Bluetooth chooser. Tap **Connect** and pick your scooter from the list. On first connect, allow all
services and characteristics. After connecting the status reads **connected**, and the page reads every
readable characteristic once automatically.

## 3. Look at the values

- The **Live values** card shows speed, battery, voltage, power, temperature, limit, motor, tuning and
  more as tiles. Raw values without a confirmed unit are marked as such.
- The **Settings** card shows the read-out configuration (limit, wheel size, assist, motor and battery
  nameplate, MotorTuning) and, below it, the **Change (write)** controls for the comfort functions the
  vendor app writes (light, assist level, start mode, walk assist, beeper, units and more). Pick a value
  and tap **Set**; the command goes as SetSetting to `DA1A1A03` behind a confirm.
- The **Advanced settings** card shows the full MotorTuning, battery detail, live motor, status, session
  stats, firmware, serial numbers and error codes, plus the list of all discovered characteristics.
- **Read all values** re-reads without reconnecting.

## 4. Read tuning

In the advanced settings, **Read tuning** reads the MotorTuning characteristic `DA1A160C`. If the scooter
reports a MotorTuning, the values appear in the display and the log. This changes nothing. On the measured
devices this characteristic is often absent entirely.

## 5. Speed limiter

The **Speed limiter** card writes MotorTuning to `DA1A160D`. **Unlock** sets MaxSpeed to the open value,
**Lock** sets it back to the legal value; both write the same MotorTuning command, and an optional
**SpeedCut** value is written along with it. MaxSpeed and SpeedCut are raw byte values (cap 250 and 100).
Every write asks for confirmation first. The write is sent, but its effect on a real controller is
unconfirmed - the vendor app never sends it. If the characteristic `DA1A160D` is absent on the device, the
buttons stay disabled because there is nothing to write to.

## 6. Log

The **Log** card shows every sent and received frame as hex with a timestamp, plus the decoded values. By
default the log is **anonymized** (addresses, serial numbers and device IDs are redacted) so you can share
it safely. **Copy log** or **Save as .txt** hands the capture over, which helps to understand the protocol
on the real device. The **Diagnostic log** additionally records every raw frame. **Scan all devices** lists
nearby Bluetooth devices with their services.

## If something does not work

- **The scooter does not appear in the list.** Is it on and in range? Use **Scan all devices**.
- **No notify arrives.** Check the log for RX lines. Some models only send after a short warm-up.
- **A value stays empty.** Then the scooter does not report that value over Bluetooth. Send the log so the
  flow can be traced.

## Legal

Raising the top speed would remove the limiter. The road approval lapses and use on public roads is then
not allowed. Use the tool only on your own vehicle on private ground and at your own risk.
