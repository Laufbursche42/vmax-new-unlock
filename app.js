'use strict';

// Laufbursche VMAX new Tool - Web Bluetooth tool for the newer VMAX models
// (VMAX E-Scooter app, GPST protocol KingmeterVmax, GATT family DA1A15xx).
//
// Unlike vmax-unlock (ZYD, fully readable in Java) this protocol lives in the native library
// libble-sdk-native-lib.so. Reconstructed from its disassembly: service DA1A1500, the MotorTuning
// characteristics (report DA1A160C, write DA1A160D), the TimeSync handshake write to DA1A1607 and the
// write frame of GPSTProtocolHandler::WriteMotorTuning. The controller's full connection flow is not
// completely reconstructed, so this tool is first a read and test instrument on your own device.

const BUILD = '6';

// ---- Small helpers ---------------------------------------------------------
function $(id) { return document.getElementById(id); }
function bytesToHex(b) { return [...b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' '); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- i18n ------------------------------------------------------------------
let lang = 'de';
try { const s = localStorage.getItem('vmnu_lang'); if (s === 'de' || s === 'en') lang = s; } catch (e) {}
function t(key) { const d = (window.I18N || {})[lang] || {}; return (key in d) ? d[key] : ((window.I18N.de || {})[key] || ''); }
function applyLang() {
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll('[data-t]').forEach(el => {
    const s = t(el.getAttribute('data-t'));
    if (/[<&]/.test(s)) el.innerHTML = s; else el.textContent = s; // scan-ok: our own translation table
  });
  document.querySelectorAll('#langs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
  const th = $('btn-theme'); if (th) th.title = document.documentElement.getAttribute('data-theme') === 'light' ? t('themeToDark') : t('themeToLight');
  updateConnButton();
  updateDrosselButtons();
  setStatus(statusState);
  try { localStorage.setItem('vmnu_lang', lang); } catch (e) {}
}
function initLangSwitch() {
  document.querySelectorAll('#langs button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; applyLang(); }));
}

// ---- Theme -----------------------------------------------------------------
function applyTheme(light) {
  document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
  const th = $('btn-theme'); if (th) { th.innerHTML = light ? '&#9790;' : '&#9728;'; th.title = light ? t('themeToDark') : t('themeToLight'); } // scan-ok: fixed character (sun/moon), not user input
  try { localStorage.setItem('vmnu_theme', light ? 'light' : 'dark'); } catch (e) {}
}
function initTheme() {
  let light = false;
  try { light = localStorage.getItem('vmnu_theme') === 'light'; } catch (e) {}
  applyTheme(light);
  const b = $('btn-theme'); if (b) b.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') !== 'light'));
}

// ---- Log -------------------------------------------------------------------
const logLines = [];
function ts() { const d = new Date(); const p = (n, w) => String(n).padStart(w || 2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3); }
function log(m, cls) {
  const line = ts() + '  ' + m;
  logLines.push(line);
  const el = $('log');
  if (el) { const span = document.createElement('span'); if (cls) span.className = cls; span.textContent = line + '\n'; el.appendChild(span); el.scrollTop = el.scrollHeight; }
}
function logDiagnosticHeader() {
  log('VMAX new Tool build ' + BUILD + '  |  ' + navigator.userAgent);
  log('Web Bluetooth: ' + (navigator.bluetooth ? 'available' : 'MISSING - use Bluefy (iOS) or Chrome/Edge'));
}
function clearLog() { logLines.length = 0; const el = $('log'); if (el) el.textContent = ''; logDiagnosticHeader(); log('log cleared'); }
function copyLog() {
  const text = logLines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => log('log copied')).catch(() => copyFallback(text));
  else copyFallback(text);
}
function copyFallback(text) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); log('log copied'); } catch (e) { log('copy failed: ' + e); } document.body.removeChild(ta);
}

// ---- Status and tiles ------------------------------------------------------
let statusState = 'disconnected';
function setStatus(s) {
  statusState = s;
  const el = $('status'); if (!el) return;
  el.setAttribute('data-state', s);
  el.textContent = s === 'connected' ? t('stConnected') : s === 'connecting' ? t('stConnecting') : t('stDisconnected');
}
function setTile(id, val) { const el = $(id); if (el) el.textContent = (val == null ? '-' : val); }
function resetTiles() { ['t-speed', 't-maxnow', 't-maxcap', 't-idx', 't-batt', 't-lock'].forEach(id => setTile(id, null)); }

// ---- Models (hint only, the page always connects over DA1A1500) ------------
const MODELS = ['auto', 'vx2', 'vx4', 'vx8', 'r40', 'r55'];
function modelName(key) { return key === 'auto' ? t('modelAuto') : t('mdl_' + key); }
function buildModelDropdown() {
  const sel = $('model-in'); if (!sel) return;
  const cur = sel.value || 'auto';
  sel.textContent = '';
  MODELS.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = modelName(k); sel.appendChild(o); });
  sel.value = cur;
}

// ---- GATT constants (from libble-sdk-native-lib.so) ------------------------
const UUID_SUFFIX = '-d532-4285-be94-b07a3e11a098';
function u(short16) { return 'da1a' + short16.toLowerCase() + UUID_SUFFIX; }
const SERVICE = u('1500');            // GPST service of the newer VMAX line
const TUNE_NOTIFY = u('160c');        // MotorTuning report (ReadValueForCharacteristic)
const TUNE_WRITE = u('160d');         // MotorTuning write (WriteMotorTuning)
const TIMESYNC_WRITE = u('1607');     // handshake: WriteTimeSync sends 6 time bytes here
// To reach a service it must be in optionalServices. iOS WebKit (Bluefy) is stricter than desktop
// Chrome: it rejects requestDevice outright when the list holds raw numeric UUIDs or standard services
// such as 0x1800/0x1801, and the picker never opens. So we pass only the canonical 128-bit UUID
// strings of the DA1A service roots we actually read - the same all-128-bit shape the vmax-unlock tool
// uses, which connects fine in that same Bluefy. Characteristics live under these roots; listing the
// roots is enough to enumerate every characteristic after connect.
const OPTIONAL_SERVICES = ['1500', '1600', '1800', '1a00', '1c00', '1e00', '1f00'].map(u);

// MotorTuningValueType (ordinal) from the SDK
const MT = { MaxPower: 0, AssistFactor: 1, DynamicFactor: 2, SpeedCut: 3, MaxSpeed: 4 };
const MT_NAMES = ['MaxPower', 'AssistFactor', 'DynamicFactor', 'SpeedCut', 'MaxSpeed', 'Cadence', 'TorqueHuman', 'BrakeCombined', 'BrakeStatic', 'FreePushingTime', 'SupportGain'];

// Write frame per GPSTProtocolHandler::WriteMotorTuning:
// byte 0 = profile index, then one value byte per type ordinal, unset types = 0xFF, sorted by type.
function motorTuningFrame(idx, entries) {
  const byType = {}; let maxType = -1;
  entries.forEach(e => { byType[e.type] = e.value & 0xFF; if (e.type > maxType) maxType = e.type; });
  const out = [idx & 0xFF];
  for (let ty = 0; ty <= maxType; ty++) out.push((ty in byType) ? byType[ty] : 0xFF);
  return new Uint8Array(out);
}

// Handshake, same as the app: WriteTimeSync sends 6 bytes [year-2000, month, day, hour, minute, second]
// to DA1A1607 once after connect (from GPSTProtocolHandler::WriteTimeSync, KingmeterVmax path).
function timeSyncFrame() {
  const d = new Date();
  return new Uint8Array([(d.getFullYear() - 2000) & 0xFF, (d.getMonth() + 1) & 0xFF, d.getDate() & 0xFF, d.getHours() & 0xFF, d.getMinutes() & 0xFF, d.getSeconds() & 0xFF]);
}

// ---- Notification decoders (byte layout reconstructed from the ReadCharacteristic* parsers) ------
// Integers are big-endian except the DA1A1514 error list (little-endian). Sentinels mark "invalid".
function u16be(b, o) { return (o + 1 < b.length) ? ((b[o] << 8) | b[o + 1]) : null; }
function u16le(b, o) { return (o + 1 < b.length) ? (b[o] | (b[o + 1] << 8)) : null; }
function u32be(b, o) { return (o + 3 < b.length) ? (b[o] * 16777216 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]) : null; }
function u8at(b, o) { return o < b.length ? b[o] : null; }
function inv16(v) { return (v == null || v === 0xFFFF) ? null : v; }
function inv8(v) { return (v == null || v === 0xFF) ? null : v; }
function sig16(v) { if (v == null || v === 0x8000) return null; return v >= 0x8000 ? v - 0x10000 : v; }
function sig8(v) { if (v == null || v === 0x80) return null; return v >= 0x80 ? v - 0x100 : v; }
function sh(v) { return v == null ? '-' : v; }

// Dispatch table: short UUID -> decoder. Each logs the decoded fields (English, ASCII) and fills tiles.
const DECODERS = {
  '160c': decodeTuning,
  '1505': b => {                                             // GPST_SENSORS, live ride data (BikePerformance)
    const spd = inv16(u16be(b, 6)), mp = inv16(u16be(b, 0)), hp = inv16(u16be(b, 2)), tq = inv16(u16be(b, 4)), cad = inv16(u16be(b, 8)), rng = inv16(u16be(b, 10));
    setTile('t-speed', spd);
    log('  1505 sensors: speed=' + sh(spd) + ' (raw), motorPower=' + sh(mp) + ' W, humanPower=' + sh(hp) + ' W, torque=' + sh(tq) + ', cadence=' + sh(cad) + ' rpm, range=' + sh(rng) + ' km', 'log-ok');
  },
  '1501': b => {                                             // GPST_INFO, config incl. speed limit
    const lim = inv16(u16be(b, 4)), wheel = inv16(u16be(b, 2));
    log('  1501 info: speedLimit=' + (lim != null ? (lim / 10).toFixed(1) : '-') + ' km/h, wheel=' + sh(wheel) + ' mm, assist=' + sh(sig8(u8at(b, 0))) + '..' + sh(sig8(u8at(b, 1))), 'log-ok');
  },
  '1503': b => {                                             // GPST_MOTOR_INFO
    log('  1503 motor: nominal=' + sh(inv16(u16be(b, 0))) + ' W, max=' + sh(inv16(u16be(b, 2))) + ' W, peak=' + sh(inv16(u16be(b, 4))) + ' W', 'log-ok');
  },
  '1502': b => {                                             // GPST_BATTERY_INFO, BMS spec and health
    const soh = inv8(u8at(b, 5)), cells = u8at(b, 2), dv = inv16(u16be(b, 8)), cap = inv16(u16be(b, 0)), cyc = inv16(u16be(b, 3));
    log('  1502 battery: SoH=' + sh(soh) + ' %, cells=' + sh(cells) + ', designVoltage=' + sh(dv) + ' mV, capacity(raw)=' + sh(cap) + ', cycles=' + sh(cyc), 'log-ok');
  },
  '1509': b => {                                             // GPST_BATTERY_CHG, live battery state (SoC, voltage, current, temp)
    const soc = inv8(u8at(b, 4)), volt = inv16(u16be(b, 5)), cur = inv16(u16be(b, 0)), tmp = sig16(u16be(b, 2)), pw = inv16(u16be(b, 9));
    setTile('t-batt', soc != null ? soc + ' %' : null);
    log('  1509 battery: SoC=' + sh(soc) + ' %, voltage=' + sh(volt) + ' mV, current=' + sh(cur) + ' (raw, scaled), temp=' + (tmp != null ? (tmp / 10).toFixed(1) : '-') + ' C, power=' + sh(pw) + ' W', 'log-ok');
  },
  '150c': b => {                                             // GPST_BATTERY_CELL, BMS per cell
    const idx = inv8(u8at(b, 0)), mv = inv16(u16be(b, 1)), t = sig16(u16be(b, 3)), tmax = sig16(u16be(b, 5)), tmin = sig16(u16be(b, 7));
    log('  150C BMS cell ' + sh(idx) + ': ' + sh(mv) + ' mV, temp=' + sh(t) + ' (min ' + sh(tmin) + ', max ' + sh(tmax) + ')', 'log-ok');
  },
  '1506': b => {                                             // GPST_TRIP
    log('  1506 trip: length(raw)=' + sh(u32be(b, 0)) + ', time=' + sh(u32be(b, 4)) + ' s, odometer(raw)=' + sh(u32be(b, 8)), 'log-ok');
  },
  '1514': b => {                                             // GPST_ERROR, little-endian code list
    const codes = []; for (let o = 2; o + 1 < b.length; o += 2) { const c = u16le(b, o); if (c) codes.push('0x' + c.toString(16)); }
    log('  1514 errors: ' + (codes.length ? codes.join(', ') : 'none'), codes.length ? 'log-err' : 'log-ok');
  },
  '1f01': b => {                                             // command response, incl. immobiliser (Wegfahrsperre) status
    const op = u16be(b, 0), lk = u8at(b, 3);
    if (op === 1) { const en = lk === 0 ? 'unlocked' : lk === 1 ? 'locked' : 'unknown'; setTile('t-lock', lang === 'de' ? (lk === 0 ? 'entsperrt' : lk === 1 ? 'gesperrt' : 'unbekannt') : en); log('  1F01 immobiliser: ' + en, 'log-ok'); }
    else log('  1F01 command response opId=' + op, 'log-ok');
  },
};

// ---- BLE state -------------------------------------------------------------
let device = null, server = null;
let tuneWriteChar = null, tuneNotifyChar = null, timeSyncChar = null;
const notifyChars = [];
let connected = false, connecting = false;

function shortUuid(uuid) { const m = /^0000([0-9a-f]{4})-/.exec(uuid); if (m) return m[1]; const n = /^da1a([0-9a-f]{4})-/.exec(uuid); return n ? n[1] : uuid; }

async function pickAndConnect() {
  if (!navigator.bluetooth) { log('Web Bluetooth not available in this browser', 'log-err'); try { alert(t('noBleAlert')); } catch (e) {} return; }
  if (connecting || connected) return;
  connecting = true; setStatus('connecting'); updateConnButton();
  try {
    log('requesting device (pick your VMAX)...', 'log-tx');
    device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES });
    log('device: ' + (device.name || '(no name)') + '  id=' + device.id);
    $('devinfo').textContent = (device.name || '(no name)');
    device.addEventListener('gattserverdisconnected', onDisconnected);
    server = await device.gatt.connect();
    log('GATT connected', 'log-ok');
    await enumerateGatt();
    await writeTimeSync();     // handshake, like the app does after connect
    connected = true; connecting = false; setStatus('connected');
    updateConnButton(); setDrosselEnabled(true);
    if (!tuneWriteChar) log('WARNING: write characteristic DA1A160D not found - this may not be a newer VMAX model', 'log-err');
  } catch (e) {
    connecting = false; setStatus('disconnected'); updateConnButton();
    const msg = (e && e.message) ? e.message : String(e);
    const name = (e && e.name) ? e.name : '';
    log('connect failed: ' + (name ? name + ': ' : '') + msg, 'log-err');
    // Make the failure visible: on iOS/Bluefy the picker error is otherwise silent.
    if (/cancel/i.test(msg)) return;             // genuine user cancel: stay quiet
    let text;
    if (name === 'NotFoundError') text = t('connectNoDevice');   // no device / bluetooth off / permission
    else text = t('connectErr') + (name ? name + ': ' : '') + msg;
    try { alert(text); } catch (_) {}
  }
}

async function enumerateGatt() {
  const out = [];
  notifyChars.length = 0; tuneWriteChar = null; tuneNotifyChar = null; timeSyncChar = null;
  let services = [];
  try { services = await server.getPrimaryServices(); } catch (e) { log('getPrimaryServices failed: ' + e, 'log-err'); }
  for (const svc of services) {
    out.push('svc ' + svc.uuid);
    let chars = [];
    try { chars = await svc.getCharacteristics(); } catch (e) { out.push('  (characteristics unreadable: ' + e + ')'); continue; }
    for (const c of chars) {
      const p = c.properties || {};
      const props = ['read', 'write', 'writeWithoutResponse', 'notify', 'indicate'].filter(k => p[k]).join(',') || '-';
      out.push('  chr ' + c.uuid + '  [' + props + ']');
      if (c.uuid === TUNE_WRITE) tuneWriteChar = c;
      if (c.uuid === TUNE_NOTIFY) tuneNotifyChar = c;
      if (c.uuid === TIMESYNC_WRITE) timeSyncChar = c;
      if (p.notify || p.indicate) {
        try { await c.startNotifications(); c.addEventListener('characteristicvaluechanged', onNotify); notifyChars.push(c); }
        catch (e) { out.push('    (subscribe failed: ' + e + ')'); }
      }
    }
  }
  const el = $('chars'); if (el) el.textContent = out.join('\n');
  log('characteristics discovered: ' + out.filter(l => l.startsWith('  chr')).length + ', notify-subscribed: ' + notifyChars.length, 'log-ok');
  log('tuning write ' + (tuneWriteChar ? 'FOUND (160D)' : 'not found') + ', tuning notify ' + (tuneNotifyChar ? 'FOUND (160C)' : 'not found') + ', timesync ' + (timeSyncChar ? 'FOUND (1607)' : 'not found'));
}

async function writeTimeSync() {
  if (!timeSyncChar) { log('handshake: TimeSync characteristic DA1A1607 not present, skipped', 'log-err'); return; }
  await writeRaw(timeSyncChar, timeSyncFrame(), '1607 TimeSync (handshake)');
}

function onNotify(ev) {
  const dv = ev.target.value;
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const su = shortUuid(ev.target.uuid);
  log('RX ' + su + '  ' + bytesToHex(bytes), 'log-rx');
  const dec = DECODERS[String(su).toLowerCase()];
  if (dec) { try { dec(bytes); } catch (e) { log('  decode ' + su + ' failed: ' + e, 'log-err'); } }
}

// MotorTuning report (DA1A160C). Format from GPSTProtocolHandler::ReadCharacteristicMotorTuning:
// FD <one value byte per tuning ordinal, 0xFF = unset> [FD ...] FE. Byte position = ordinal, value = byte.
// MaxSpeed (ordinal 4) has a fixed SDK cap of 250, the other types 100.
function decodeTuning(bytes) {
  const b = [...bytes];
  const records = [];
  let i = 0;
  while (i < b.length && b[i] !== 0xFD) i++;                 // skip to first FD
  while (i < b.length && b[i] === 0xFD) {
    i++;                                                      // consume FD
    const vals = [];
    while (i < b.length && b[i] !== 0xFD && b[i] !== 0xFE) { vals.push(b[i]); i++; }
    records.push(vals);
    if (b[i] === 0xFE) { i++; break; }
  }
  if (!records.length) { log('  160C: no FD/FE record, raw ' + bytesToHex(bytes), 'log-err'); return; }
  records.forEach((vals, r) => {
    const parts = [];
    vals.forEach((v, ord) => { if (v !== 0xFF) parts.push((MT_NAMES[ord] || ('T' + ord)) + '=' + v); });
    log('  160C profile ' + (r + 1) + ': ' + (parts.join(', ') || '(all unset)'), 'log-ok');
  });
  const rec = records[0];
  const ms = (rec.length > MT.MaxSpeed && rec[MT.MaxSpeed] !== 0xFF) ? rec[MT.MaxSpeed] : null;
  setTile('t-maxnow', ms);
  setTile('t-maxcap', ms != null ? 250 : null);
  setTile('t-idx', records.length);
}

async function readTune() {
  if (tuneNotifyChar && (tuneNotifyChar.properties || {}).read) {
    try { const v = await tuneNotifyChar.readValue(); const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); log('RX 160C (read)  ' + bytesToHex(b), 'log-rx'); decodeTuning(b); return; }
    catch (e) { log('read 160C failed: ' + e, 'log-err'); }
  }
  log('160C is notify-only, waiting for the scooter to push a MotorTuning frame', 'log-tx');
}

async function writeRaw(char, bytes, label) {
  const p = char.properties || {};
  try {
    if (p.writeWithoutResponse && char.writeValueWithoutResponse) await char.writeValueWithoutResponse(bytes);
    else if (char.writeValueWithResponse) await char.writeValueWithResponse(bytes);
    else await char.writeValue(bytes);
    log('TX ' + label + '  ' + bytesToHex(bytes), 'log-tx');
    return true;
  } catch (e) { log('write failed (' + label + '): ' + e, 'log-err'); return false; }
}

async function writeDrossel(open) {
  if (!connected || !tuneWriteChar) { log('not connected or 160D missing', 'log-err'); return; }
  const idx = clampInt($('idx-in').value, 0, 7, 0);
  const val = open ? clampInt($('open-in').value, 1, 250, 30) : clampInt($('legal-in').value, 1, 250, 20);
  const ok = await confirmDialog(open ? t('confirmOpenBody') : t('confirmLegalBody'));
  if (!ok) return;
  const frame = motorTuningFrame(idx, [{ type: MT.MaxSpeed, value: val }]);
  log((open ? 'UNLOCK' : 'LOCK') + ' MaxSpeed=' + val + ' idx=' + idx + ' -> 160D', 'log-ok');
  await writeRaw(tuneWriteChar, frame, '160D MotorTuning');
  await readTune();
}

function clampInt(v, lo, hi, def) { let n = parseInt(v, 10); if (isNaN(n)) n = def; return Math.max(lo, Math.min(hi, n)); }

function onDisconnected() {
  connected = false; connecting = false; server = null;
  tuneWriteChar = null; tuneNotifyChar = null; timeSyncChar = null; notifyChars.length = 0;
  setStatus('disconnected'); resetTiles(); setDrosselEnabled(false); updateConnButton();
  log('disconnected', 'log-err');
}
function disconnectBle() {
  try { if (device && device.gatt && device.gatt.connected) device.gatt.disconnect(); } catch (e) {}
  onDisconnected();
}

// ---- UI state --------------------------------------------------------------
function updateConnButton() {
  const b = $('btn-conn'); if (!b) return;
  if (connected) { b.textContent = t('btnDisconnect'); b.dataset.act = 'disconnect'; }
  else { b.textContent = t('btnConnect'); b.dataset.act = 'connect'; }
}
function updateDrosselButtons() {
  const bo = $('btn-open'), bl = $('btn-legal'), br = $('btn-readtune');
  if (bo) bo.textContent = t('btnOpen');
  if (bl) bl.textContent = t('btnLegal');
  if (br) br.textContent = t('btnReadTune');
}
function setDrosselEnabled(on) {
  ['btn-open', 'btn-legal', 'btn-readtune', 'open-in', 'legal-in', 'idx-in'].forEach(id => { const el = $(id); if (el) el.disabled = !on; });
}

// ---- Dialogs ---------------------------------------------------------------
function confirmDialog(bodyText) {
  return new Promise(resolve => {
    const dlg = $('confirm'); if (!dlg) { resolve(window.confirm(bodyText)); return; }
    $('confirm-body').textContent = bodyText;
    const ok = $('confirm-ok'), cancel = $('confirm-cancel'), cx = $('confirm-cancel-x');
    const close = res => { cleanup(); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); resolve(res); };
    const okH = () => close(true), caH = () => close(false);
    function cleanup() { ok.removeEventListener('click', okH); cancel.removeEventListener('click', caH); if (cx) cx.removeEventListener('click', caH); }
    ok.addEventListener('click', okH); cancel.addEventListener('click', caH); if (cx) cx.addEventListener('click', caH);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
}
const HELP = { drossel: ['drosselTitle', 'drosselHelp'], disclaimer: ['footDisclaimer', 'disclaimerText'] };
function openHelp(key) {
  const h = HELP[key]; if (!h) return;
  $('help-title').textContent = t(h[0]); $('help-body').textContent = t(h[1]);
  const w = $('help-warn'); if (w) w.hidden = true;
  const dlg = $('help'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function closeHelp() { const dlg = $('help'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
// German docs are NAME.de.md, English docs NAME.md (README is language neutral).
function docFile(name) {
  if (name === 'README') return 'README.md';
  if (name === 'GUIDE') return 'GUIDE.' + lang + '.md';
  return lang === 'de' ? name + '.de.md' : name + '.md';
}
// Base doc name from an href like LICENSE.de.md / GUIDE.en.md, plus a localized title for it.
function docBaseName(url) { return url.replace(/[?#].*$/, '').replace(/\.(de|en)\.md$/i, '').replace(/\.md$/i, ''); }
function docTitleFor(url) { const k = { README: 'footReadme', GUIDE: 'footGuide', LICENSE: 'footLicense', PRIVACY: 'footPrivacy', TRADEMARKS: 'footTrademarks' }[docBaseName(url)]; return k ? t(k) : docBaseName(url); }
async function openDoc(file, title) {
  const dlg = $('doc'); $('doc-title').textContent = title; $('doc-body').textContent = lang === 'de' ? 'lädt...' : 'loading...';
  if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  try { const r = await fetch(file); const md = await r.text(); $('doc-body').innerHTML = renderMd(md); $('doc-body').scrollTop = 0; } // scan-ok: markdown of our own documents, renderMd escapes first
  catch (e) { $('doc-body').textContent = (lang === 'de' ? 'Konnte nicht laden: ' : 'Could not load: ') + file + ' (' + e + ')'; }
}
function renderMd(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Fenced code blocks out first, else the ``` pair as inline code.
  const blocks = [];
  const stashed = md.replace(/```[^\n]*\n([\s\S]*?)```/g, (m, code) => {
    blocks.push('<pre><code>' + esc(code.replace(/\n$/, '')) + '</code></pre>');
    return '\x00B' + (blocks.length - 1) + '\x00';
  });
  const html = esc(stashed)
    .replace(/^&gt;.*(?:\n&gt;.*)*/gm, block => '<blockquote>' + block.replace(/^&gt; ?/gm, '').replace(/\n/g, ' ') + '</blockquote>')
    .replace(/^### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*)$/gm, '<h2>$1</h2>')
    .replace(/^- (.*)$/gm, '&bull; $1')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
      if (/^(https?:)?\/\//i.test(url) || /^mailto:/i.test(url)) return '<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>';
      if (/^#/.test(url)) return '<a href="#" data-anchor="' + url + '">' + text + '</a>';
      if (/\.md(?:[?#].*)?$/i.test(url)) return '<a href="#" data-doclink="' + url + '">' + text + '</a>';  // stay in the modal
      return '<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>';
    })
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
  // Reinsert code blocks; drop the paragraph wrapper when a block sits alone in one.
  return html
    .replace(/<p>(\x00B\d+\x00)<\/p>/g, '$1')
    .replace(/\x00B(\d+)\x00/g, (m, i) => blocks[+i]);
}

// ---- Diagnostics scan ------------------------------------------------------
async function scanAllDevicesDiagnostic() {
  if (!navigator.bluetooth) { log('Web Bluetooth not available', 'log-err'); return; }
  try {
    const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES });
    log('scan pick: ' + (d.name || '(no name)') + '  id=' + d.id);
    const s = await d.gatt.connect();
    const svcs = await s.getPrimaryServices();
    for (const svc of svcs) { log('  svc ' + svc.uuid); }
    d.gatt.disconnect();
  } catch (e) { log('scan failed: ' + e, 'log-err'); }
}

// ---- Init ------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  buildModelDropdown();
  initTheme();
  initLangSwitch();
  applyLang();
  const bv = $('build-ver'); if (bv) bv.textContent = 'build ' + BUILD;
  logDiagnosticHeader();

  $('btn-conn').addEventListener('click', () => { if ($('btn-conn').dataset.act === 'disconnect') disconnectBle(); else pickAndConnect(); });
  { const s = $('model-in'); if (s) s.addEventListener('change', () => buildModelDropdown()); }
  $('btn-open').addEventListener('click', () => writeDrossel(true));
  $('btn-legal').addEventListener('click', () => writeDrossel(false));
  $('btn-readtune').addEventListener('click', readTune);
  { const b = $('btn-copy-log'); if (b) b.addEventListener('click', copyLog); }
  { const b = $('btn-clear-log'); if (b) b.addEventListener('click', clearLog); }
  { const b = $('btn-diag'); if (b) b.addEventListener('click', scanAllDevicesDiagnostic); }

  document.querySelectorAll('.help-btn').forEach(btn => btn.addEventListener('click', () => openHelp(btn.getAttribute('data-help'))));
  ['help-x', 'help-close'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', closeHelp); });
  ['doc-x', 'doc-close'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => { const d = $('doc'); if (d && d.close) d.close(); }); });
  { const b = $('link-disclaimer'); if (b) b.addEventListener('click', e => { e.preventDefault(); openHelp('disclaimer'); }); }
  document.querySelectorAll('[data-doc]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); const name = a.getAttribute('data-doc'); openDoc(docFile(name), (a.textContent || name).trim());
  }));
  { const db = $('doc-body'); if (db) db.addEventListener('click', e => {
      const dl = e.target.closest && e.target.closest('[data-doclink]');
      if (dl) { e.preventDefault(); const href = dl.getAttribute('data-doclink'); openDoc(href, docTitleFor(href)); return; }
      const an = e.target.closest && e.target.closest('[data-anchor]');
      if (an) { e.preventDefault(); if (an.getAttribute('data-anchor').toLowerCase().indexOf('disclaimer') >= 0) openHelp('disclaimer'); }
    }); }
  document.addEventListener('click', e => {
    const dd = e.target.closest && e.target.closest('[data-open-disclaimer]');
    if (dd) { e.preventDefault(); openHelp('disclaimer'); }
  });
});
