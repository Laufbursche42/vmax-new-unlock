'use strict';

// Laufbursche VMAX new Tool - Web Bluetooth read/diagnostic tool for the newer VMAX models
// (VMAX E-Scooter app, GPST protocol KingmeterVmax, GATT family DA1A15xx).
//
// The protocol lives in the native library libble-sdk-native-lib.so; the connect flow, TimeSync
// handshake and value decoders below are reconstructed from its disassembly and the documented
// protocol. Reading (telemetry, config, tuning report, every readable characteristic) is proven-safe.
// The limiter write (MotorTuning MaxSpeed -> DA1A160D) is NEVER sent by the vendor app and no controller
// has confirmed it accepts a written value, so writing stays disabled here (WRITE_ENABLED = false).
// This is a read-and-test instrument. Nothing here invents a UUID, opcode, offset or scale.

const BUILD = 'v28';

// Master gate for every lock/unlock/tuning write. Reading is never gated by this. If a real device
// ever confirms the controller accepts a written MaxSpeed, flip this one line to re-enable the writes.
const WRITE_ENABLED = false;

// ---- Small helpers ---------------------------------------------------------
function $(id) { return document.getElementById(id); }
function bytesToHex(b) { return [...b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' '); }
function ascii(b) { let s = ''; for (const c of b) s += (c >= 32 && c < 127) ? String.fromCharCode(c) : '.'; return s; }
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
  updateLimiterButtons();
  setStatus(statusState);
  renderSettings();
  renderAdvanced();
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

// ---- Log + redaction -------------------------------------------------------
// Lines are kept raw in logBuffer so re-render, copy and save use the same anonymized text. Timestamp is
// [HH:MM:SS.mmm] (millisecond precision, useful for BLE timing). Log strings stay technical English.
const logBuffer = [];      // { raw, cls }
let publicLog = true;      // anonymize before display/copy/save (default on)
let diagLog = false;       // capture everything raw, do not skip repeated notify frames
let deviceId = '';         // current device id, redacted from a public log
try { publicLog = localStorage.getItem('vmnu_publiclog') !== '0'; } catch (e) {}
try { diagLog = localStorage.getItem('vmnu_diaglog') === '1'; } catch (e) {}

function ts() { const d = new Date(); const p = (n, w) => String(n).padStart(w || 2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3); }
// Mask personal data before a log is shown or shared: the device id, MAC addresses, key/token/serial
// assignments, and long contiguous hex runs (space-separated frame hex is left readable).
function redact(text) {
  let s = String(text);
  if (deviceId) s = s.split(deviceId).join('[redacted-id]');
  s = s.replace(/\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g, '[redacted-mac]');
  s = s.replace(/\b(secret|token|key|aes|pwd|password|pin|mac|serial|vin|uid|imei)\b(\s*[:=]\s*)("?)([^\s",]+)\3/gi,
    (m, k, sep) => k + sep + '[redacted]');
  s = s.replace(/\b[0-9A-Fa-f]{16,}\b/g, '[redacted-hex]');
  return s;
}
function anonymize(s) { return publicLog ? redact(s) : String(s); }
function log(msg, cls) {
  const raw = '[' + ts() + '] ' + msg;
  logBuffer.push({ raw: raw, cls: cls || '' });
  const el = $('log');
  if (el) { const span = document.createElement('span'); if (cls) span.className = cls; span.textContent = anonymize(raw) + '\n'; el.appendChild(span); el.scrollTop = el.scrollHeight; }
}
function renderLog() {
  const el = $('log'); if (!el) return;
  el.textContent = '';
  logBuffer.forEach(e => { const span = document.createElement('span'); if (e.cls) span.className = e.cls; span.textContent = anonymize(e.raw) + '\n'; el.appendChild(span); });
  el.scrollTop = el.scrollHeight;
}
function logDiagnosticHeader() {
  log('VMAX new Tool build ' + BUILD + '  |  ' + navigator.userAgent);
  log('Web Bluetooth: ' + (navigator.bluetooth ? 'available' : 'MISSING - use Bluefy (iOS) or Chrome/Edge'));
}
function clearLog() { logBuffer.length = 0; const el = $('log'); if (el) el.textContent = ''; logDiagnosticHeader(); log(t('logCleared')); }
function copyLog() {
  const text = logBuffer.map(e => anonymize(e.raw)).join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => log(t('logCopied'), 'log-ok')).catch(() => copyFallback(text));
  else copyFallback(text);
}
function copyFallback(text) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); log(t('logCopied'), 'log-ok'); } catch (e) { log('copy failed: ' + e, 'log-err'); } document.body.removeChild(ta);
}
function saveLog() {
  const text = logBuffer.map(e => anonymize(e.raw)).join('\n');
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'vmax-new-log.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log(t('logSaved'), 'log-ok');
  } catch (e) { log('save failed: ' + e, 'log-err'); }
}

// ---- Status and tiles ------------------------------------------------------
let statusState = 'disconnected';
function setStatus(s) {
  statusState = s;
  const el = $('status'); if (!el) return;
  el.setAttribute('data-state', s);
  el.textContent = s === 'connected' ? t('stConnected') : s === 'connecting' ? t('stConnecting') : t('stDisconnected');
}
const TILE_IDS = ['t-speed', 't-batt', 't-volt', 't-cur', 't-power', 't-battemp', 't-speedlimit', 't-wheel',
  't-motor', 't-soh', 't-cells', 't-trip', 't-triptime', 't-total', 't-maxnow', 't-maxcap', 't-idx', 't-fault'];
function setTile(id, val) { const el = $(id); if (el) el.textContent = (val == null ? '-' : val); }
function resetTiles() { TILE_IDS.forEach(id => setTile(id, null)); }

// Snapshot of the last decoded values, so the Settings and Advanced panels render read-only rows from
// what the device actually reported. Reset on connect/disconnect.
function emptySnap() { return { serials: {} }; }
let snap = emptySnap();

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
const TUNE_WRITE = u('160d');         // MotorTuning write (WriteMotorTuning) - gated, never fired here
const TIMESYNC_WRITE = u('1607');     // handshake: WriteTimeSync sends 6 time bytes here
// To reach a service it must be in optionalServices. iOS WebKit (Bluefy) is stricter than desktop
// Chrome: it rejects requestDevice when the list holds raw numeric UUIDs or standard services, so we
// pass only the canonical 128-bit UUID strings of the DA1A service roots we read. Characteristics live
// under these roots; listing the roots enumerates every characteristic after connect.
// The Hyena/PairLink CAN-over-BLE roots are added only for the experimental, read-only CAN probe.
const HYENA_SERVICE = '48592800-6879-656e-6174-656b2e485550';
const PAIRLINK_SERVICE = '49d554a6-76b1-11e9-8f9e-2a86e4085a59';   // PairLink BLE-CAN bridge service
const PAIRLINK_UART = '0000fff0-0000-1000-8000-00805f9b34fb';       // PairLink UART transport variant
const OPTIONAL_SERVICES = ['1500', '1600', '1700', '1800', '1900', '1a00', '1c00', '1e00', '1f00'].map(u).concat([HYENA_SERVICE, PAIRLINK_SERVICE, PAIRLINK_UART]);

// ---- Hylink HAP v2 (CAN over BLE) - experimental, READ-ONLY probe only -----
// A parameter read is [EID 4B big-endian][DLC 1B][payload]. Controller message IDs carry bit 31.
// Only the parameter-READ opcode 0x10 is used; parameter-write 0x11 is intentionally never built.
const HAP_EID_PARAM_READ = 0x80020000;     // 0x20000 | 0x80000000
// Parameter-read payload: [0x10][addr 3B little-endian][len 2B little-endian]
function paramReadPayload(addr, len) {
  return new Uint8Array([0x10, addr & 0xff, (addr >> 8) & 0xff, (addr >> 16) & 0xff, len & 0xff, (len >> 8) & 0xff]);
}
// Controller parameters to read once the CAN channel answers (reconstructed address map). Reads only.
const CAN_PARAMS = [
  { addr: 496, len: 2, name: 'MaxSpeed deci-km/h' },
  { addr: 267, len: 2, name: 'SpeedTable[0]a' },
  { addr: 269, len: 2, name: 'SpeedTable[0]b' },
  { addr: 536, len: 9, name: 'AssistLevels' },
  { addr: 621, len: 1, name: 'AssistValue[1]' },
  { addr: 743, len: 1, name: 'PedalResponse[1]' },
  { addr: 600, len: 1, name: 'ThrottleEnabled' },
  { addr: 217, len: 22, name: 'BatteryCellInfo' },
  { addr: 8, len: 8, name: 'addr8 (unknown)' },
  { addr: 24, len: 2, name: 'addr24 (unknown)' },
  { addr: 26, len: 2, name: 'addr26 (unknown)' },
  { addr: 28, len: 24, name: 'addr28 (serial?)' },
  { addr: 249, len: 2, name: 'addr249 (unknown)' },
  { addr: 251, len: 2, name: 'addr251 (unknown)' },
  { addr: 256, len: 4, name: 'addr256 (unknown)' },
  { addr: 426, len: 1, name: 'addr426 (unknown)' },
  { addr: 456, len: 4, name: 'addr456 (unknown)' },
  { addr: 598, len: 1, name: 'addr598 (unknown)' },
  { addr: 618, len: 37, name: 'addr618 (table)' },
  { addr: 768, len: 2, name: 'addr768 (unknown)' },
  { addr: 770, len: 2, name: 'addr770 (unknown)' },
];

// ---- AES-128-ECB (for the PairLink CAN-bridge control handshake) -----------
// The bridge only forwards CAN after an AES-encrypted control handshake. Crypto is AES-128-ECB, PKCS#7.
// The fixed control key is hardcoded in the app's native lib (JNI_OnLoad -> aes_set_key): "bafangOTAcontrol".
// Byte-verified against Node's crypto aes-128-ecb (encrypt and decrypt).
const AES_FIXED_KEY = new Uint8Array([0x62,0x61,0x66,0x61,0x6e,0x67,0x4f,0x54,0x41,0x63,0x6f,0x6e,0x74,0x72,0x6f,0x6c]);
const AES_SBOX = (function () {
  const g = new Uint8Array(256), lg = new Uint8Array(256); let a = 1;
  for (let i = 0; i < 255; i++) { g[i] = a; lg[a] = i; a ^= (a << 1) ^ ((a & 0x80) ? 0x11b : 0); a &= 0xff; }
  const ginv = (b) => b === 0 ? 0 : g[(255 - lg[b]) % 255];
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) { let v = ginv(i), y = v; for (let c = 0; c < 4; c++) { y = ((y << 1) | (y >> 7)) & 0xff; v ^= y; } s[i] = (v ^ 0x63) & 0xff; }
  return s;
})();
const AES_INV_SBOX = (function () { const inv = new Uint8Array(256); for (let i = 0; i < 256; i++) inv[AES_SBOX[i]] = i; return inv; })();
const AES_RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
function aesKeyExpansion(key) {
  const w = new Uint8Array(176); w.set(key.subarray(0, 16)); let rc = 0;
  for (let i = 16; i < 176; i += 4) {
    let t0 = w[i-4], t1 = w[i-3], t2 = w[i-2], t3 = w[i-1];
    if (i % 16 === 0) { const tt = t0; t0 = AES_SBOX[t1]; t1 = AES_SBOX[t2]; t2 = AES_SBOX[t3]; t3 = AES_SBOX[tt]; t0 ^= AES_RCON[rc++]; }
    w[i] = w[i-16] ^ t0; w[i+1] = w[i-15] ^ t1; w[i+2] = w[i-14] ^ t2; w[i+3] = w[i-13] ^ t3;
  }
  return w;
}
function aesMul(a, b) { let r = 0; for (let i = 0; i < 8; i++) { if (b & 1) r ^= a; const hi = a & 0x80; a = (a << 1) & 0xff; if (hi) a ^= 0x1b; b >>= 1; } return r & 0xff; }
function aesEncBlock(inb, w) {
  const s = Uint8Array.from(inb.subarray(0, 16)); let tt;
  for (let i = 0; i < 16; i++) s[i] ^= w[i];
  for (let round = 1; round <= 10; round++) {
    for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
    tt = s[1]; s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = tt;
    tt = s[2]; s[2] = s[10]; s[10] = tt; tt = s[6]; s[6] = s[14]; s[14] = tt;
    tt = s[15]; s[15] = s[11]; s[11] = s[7]; s[7] = s[3]; s[3] = tt;
    if (round < 10) for (let c = 0; c < 4; c++) { const o = c*4, a0 = s[o], a1 = s[o+1], a2 = s[o+2], a3 = s[o+3]; s[o] = aesMul(a0,2)^aesMul(a1,3)^a2^a3; s[o+1] = a0^aesMul(a1,2)^aesMul(a2,3)^a3; s[o+2] = a0^a1^aesMul(a2,2)^aesMul(a3,3); s[o+3] = aesMul(a0,3)^a1^a2^aesMul(a3,2); }
    for (let i = 0; i < 16; i++) s[i] ^= w[round*16 + i];
  }
  return s;
}
function aesDecBlock(inb, w) {
  const s = Uint8Array.from(inb.subarray(0, 16)); let tt;
  for (let i = 0; i < 16; i++) s[i] ^= w[160 + i];
  for (let round = 9; round >= 0; round--) {
    tt = s[13]; s[13] = s[9]; s[9] = s[5]; s[5] = s[1]; s[1] = tt;
    tt = s[2]; s[2] = s[10]; s[10] = tt; tt = s[6]; s[6] = s[14]; s[14] = tt;
    tt = s[3]; s[3] = s[7]; s[7] = s[11]; s[11] = s[15]; s[15] = tt;
    for (let i = 0; i < 16; i++) s[i] = AES_INV_SBOX[s[i]];
    for (let i = 0; i < 16; i++) s[i] ^= w[round*16 + i];
    if (round > 0) for (let c = 0; c < 4; c++) { const o = c*4, a0 = s[o], a1 = s[o+1], a2 = s[o+2], a3 = s[o+3]; s[o] = aesMul(a0,14)^aesMul(a1,11)^aesMul(a2,13)^aesMul(a3,9); s[o+1] = aesMul(a0,9)^aesMul(a1,14)^aesMul(a2,11)^aesMul(a3,13); s[o+2] = aesMul(a0,13)^aesMul(a1,9)^aesMul(a2,14)^aesMul(a3,11); s[o+3] = aesMul(a0,11)^aesMul(a1,13)^aesMul(a2,9)^aesMul(a3,14); }
  }
  return s;
}
function aesEcbEnc(key, data) { const w = aesKeyExpansion(key); const out = new Uint8Array(data.length); for (let o = 0; o < data.length; o += 16) out.set(aesEncBlock(data.subarray(o, o+16), w), o); return out; }
function aesEcbDec(key, data) { const w = aesKeyExpansion(key); const out = new Uint8Array(data.length); for (let o = 0; o < data.length; o += 16) out.set(aesDecBlock(data.subarray(o, o+16), w), o); return out; }
function pkcs7pad(d) { const p = 16 - (d.length % 16); const o = new Uint8Array(d.length + p); o.set(d); o.fill(p, d.length); return o; }
function pkcs7unpad(d) { if (!d.length) return d; const p = d[d.length - 1]; return (p > 0 && p <= 16 && p <= d.length) ? d.subarray(0, d.length - p) : d; }
// gen_cmd_encry: [opcode, ...payload] -> PKCS#7 -> AES-128-ECB with the fixed control key
function genCmdEncry(opcode, payload) { const body = new Uint8Array(1 + (payload ? payload.length : 0)); body[0] = opcode & 0xff; if (payload) body.set(payload, 1); return aesEcbEnc(AES_FIXED_KEY, pkcs7pad(body)); }
function randBytes(n) { const a = new Uint8Array(n); try { (self.crypto || window.crypto).getRandomValues(a); } catch (e) { for (let i = 0; i < n; i++) a[i] = (Date.now() + i * 97) & 0xff; } return a; }
// CAN frame for a parameter read: [EID 4B big-endian][DLC 1B][payload]
function canReadFrame(addr, len) { const pl = paramReadPayload(addr, len); const f = new Uint8Array(5 + pl.length); f[0] = (HAP_EID_PARAM_READ >>> 24) & 0xff; f[1] = (HAP_EID_PARAM_READ >>> 16) & 0xff; f[2] = (HAP_EID_PARAM_READ >>> 8) & 0xff; f[3] = HAP_EID_PARAM_READ & 0xff; f[4] = pl.length & 0xff; f.set(pl, 5); return f; }

// MotorTuningValueType (ordinal) from the SDK
const MT = { MaxPower: 0, AssistFactor: 1, DynamicFactor: 2, SpeedCut: 3, MaxSpeed: 4 };
const MT_NAMES = ['MaxPower', 'AssistFactor', 'DynamicFactor', 'SpeedCut', 'MaxSpeed', 'Cadence', 'TorqueHuman', 'BrakeCombined', 'BrakeStatic', 'FreePushingTime', 'SupportGain'];

// Write frame per GPSTProtocolHandler::WriteMotorTuning (kept for the day the write is proven; gated off).
function motorTuningFrame(idx, entries) {
  const byType = {}; let maxType = -1;
  entries.forEach(e => { byType[e.type] = e.value & 0xFF; if (e.type > maxType) maxType = e.type; });
  const out = [idx & 0xFF];
  for (let ty = 0; ty <= maxType; ty++) out.push((ty in byType) ? byType[ty] : 0xFF);
  return new Uint8Array(out);
}

// Handshake, same as the app: WriteTimeSync sends 6 bytes [year-2000, month, day, hour, minute, second]
// to DA1A1607 once after connect. This is the ONE write the tool keeps - the required connect step.
function timeSyncFrame() {
  const d = new Date();
  return new Uint8Array([(d.getFullYear() - 2000) & 0xFF, (d.getMonth() + 1) & 0xFF, d.getDate() & 0xFF, d.getHours() & 0xFF, d.getMinutes() & 0xFF, d.getSeconds() & 0xFF]);
}

// ---- Decoders (byte layout reconstructed from the ReadCharacteristic* parsers) -------------------
// Integers are big-endian except the DA1A1514 error list (little-endian). Sentinels mark "invalid".
// Values with an unproven physical scale are kept raw and labelled raw - no divisor is invented.
function u16be(b, o) { return (o + 1 < b.length) ? ((b[o] << 8) | b[o + 1]) : null; }
function u16le(b, o) { return (o + 1 < b.length) ? (b[o] | (b[o + 1] << 8)) : null; }
function u32be(b, o) { return (o + 3 < b.length) ? (b[o] * 16777216 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]) : null; }
function u8at(b, o) { return o < b.length ? b[o] : null; }
function inv16(v) { return (v == null || v === 0xFFFF) ? null : v; }
function inv8(v) { return (v == null || v === 0xFF) ? null : v; }
function sig16(v) { if (v == null || v === 0x8000) return null; return v >= 0x8000 ? v - 0x10000 : v; }
function sig8(v) { if (v == null || v === 0x80) return null; return v >= 0x80 ? v - 0x100 : v; }
// Signed 16-bit temperature, both 0x8000 and 0xFFFF are "not available" sentinels.
function tsig(b, o) { const v = u16be(b, o); if (v == null || v === 0x8000 || v === 0xFFFF) return null; return v >= 0x8000 ? v - 0x10000 : v; }
function sh(v) { return v == null ? '-' : v; }
function tempC(v) { return v == null ? null : (v / 10).toFixed(1); }
// 16-bit SMART packed date: year=(v>>9)+1970, month=(v>>5)&0xF, day=v&0x1F.
function smartDate(v) { if (v == null || v === 0xFFFF || v === 0) return null; const y = (v >> 9) + 1970, mo = (v >> 5) & 0xF, da = v & 0x1F; return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0'); }

// Dispatch table: short UUID -> decoder. Each logs the decoded fields (English, ASCII), fills tiles and
// updates the snapshot for the Settings/Advanced panels.
const DECODERS = {
  '160c': decodeTuning,
  '1505': b => {                                             // GPST_SENSORS, live ride data (BikePerformance)
    const mp = sig16(u16be(b, 0)), hp = sig16(u16be(b, 2)), tq = sig16(u16be(b, 4)), spd = sig16(u16be(b, 6)), cad = sig16(u16be(b, 8)), rng = sig16(u16be(b, 10));
    setTile('t-speed', spd);
    log('  1505 sensors: speed=' + sh(spd) + ' (raw), motorPower=' + sh(mp) + ' W, humanPower=' + sh(hp) + ' W, torque=' + sh(tq) + ', cadence=' + sh(cad) + ' rpm, range=' + sh(rng) + ' km', 'log-ok');
  },
  '1501': b => {                                             // GPST_INFO, static config incl. speed limit
    const amin = sig8(u8at(b, 0)), amax = sig8(u8at(b, 1)), wheel = inv16(u16be(b, 2)), lim = inv16(u16be(b, 4));
    snap.speedLimit = lim != null ? lim / 10 : null; snap.wheel = wheel; snap.assistMin = amin; snap.assistMax = amax;
    setTile('t-speedlimit', snap.speedLimit != null ? snap.speedLimit.toFixed(1) : null);
    setTile('t-wheel', wheel);
    log('  1501 info: speedLimit=' + (lim != null ? (lim / 10).toFixed(1) : '-') + ' km/h, wheel=' + sh(wheel) + ' mm, assist=' + sh(amin) + '..' + sh(amax), 'log-ok');
  },
  '1503': b => {                                             // GPST_MOTOR_INFO
    snap.motorNom = inv16(u16be(b, 0)); snap.motorMax = inv16(u16be(b, 2)); snap.motorPeak = inv16(u16be(b, 4));
    snap.motorCfg = inv8(u8at(b, 6)); snap.assistFacMin = inv16(u16be(b, 7)); snap.assistFacMax = inv16(u16be(b, 9));
    setTile('t-motor', snap.motorNom != null ? snap.motorNom + '/' + sh(snap.motorMax) : null);
    log('  1503 motor: nominal=' + sh(snap.motorNom) + ' W, max=' + sh(snap.motorMax) + ' W, peak=' + sh(snap.motorPeak) + ' W, config=' + sh(snap.motorCfg), 'log-ok');
  },
  '1502': b => {                                             // GPST_BATTERY_INFO, BMS spec and health
    snap.battCap = inv16(u16be(b, 0)); snap.battCells = u8at(b, 2); snap.battCycles = inv16(u16be(b, 3));
    snap.battSoH = inv8(u8at(b, 5)); snap.battFullChg = inv16(u16be(b, 6)); snap.battDesignV = inv16(u16be(b, 8));
    snap.battMfgDate = smartDate(u16be(b, 14));
    setTile('t-soh', snap.battSoH != null ? snap.battSoH + ' %' : null);
    setTile('t-cells', snap.battCells);
    log('  1502 battery: SoH=' + sh(snap.battSoH) + ' %, cells=' + sh(snap.battCells) + ', cycles=' + sh(snap.battCycles) + ', designVoltage=' + sh(snap.battDesignV) + ' mV, capacity(raw)=' + sh(snap.battCap) + ', mfgDate=' + (snap.battMfgDate || '-'), 'log-ok');
  },
  '1509': b => {                                             // GPST_BATTERY_CHG, live battery state
    const cur = inv16(u16be(b, 0)), tmp = tsig(b, 2), soc = inv8(u8at(b, 4)), volt = inv16(u16be(b, 5)),
      chg = inv16(u16be(b, 7)), pw = sig16(u16be(b, 9)), rem = inv16(u16be(b, 11));
    snap.battRem = rem;
    setTile('t-batt', soc != null ? soc + ' %' : null);
    setTile('t-volt', volt != null ? volt + ' mV' : null);
    setTile('t-cur', cur);
    setTile('t-power', pw != null ? pw + ' W' : null);
    setTile('t-battemp', tmp != null ? tempC(tmp) + ' C' : null);
    log('  1509 battery: SoC=' + sh(soc) + ' %, voltage=' + sh(volt) + ' mV, current=' + sh(cur) + ' (raw), chargeCurrent=' + sh(chg) + ' (raw), temp=' + (tmp != null ? tempC(tmp) : '-') + ' C, power=' + sh(pw) + ' W, remCapacity=' + sh(rem) + ' (raw)', 'log-ok');
  },
  '150a': b => {                                             // GPST_MOTOR_CHG, live motor
    snap.mCur = inv16(u16be(b, 0)); snap.mVolt = sig16(u16be(b, 2)); snap.mRpm = sig16(u16be(b, 4)); snap.mTorque = sig16(u16be(b, 6)); snap.mTemp = tsig(b, 8);
    log('  150A motor live: current=' + sh(snap.mCur) + ', voltage=' + sh(snap.mVolt) + ', rpm=' + sh(snap.mRpm) + ', torque=' + sh(snap.mTorque) + ', temp=' + sh(snap.mTemp) + ' (all raw, engine scale)', 'log-ok');
  },
  '1508': b => {                                             // GPST_UPDATE, status (BikeUpdate)
    const ch = u8at(b, 2); snap.stLight = u8at(b, 0); snap.stScoop = u8at(b, 1); snap.stCharge = (ch == null ? null : (ch & 0x0F));
    snap.stAssist = u8at(b, 3); snap.stFront = u8at(b, 4); snap.stRear = u8at(b, 5); snap.stPower = u8at(b, 6); snap.stBrake = u8at(b, 7); snap.stCtrlTemp = tsig(b, 9);
    log('  1508 status: light=' + sh(snap.stLight) + ', scoopMode=' + sh(snap.stScoop) + ', charging=' + sh(snap.stCharge) + ', assistLevel=' + sh(snap.stAssist) + ', gear=' + sh(snap.stFront) + '/' + sh(snap.stRear) + ', power=' + sh(snap.stPower) + ', brakeLight=' + sh(snap.stBrake) + ', ctrlTemp=' + sh(snap.stCtrlTemp) + ' (raw, engine scale)', 'log-ok');
  },
  '150c': b => {                                             // GPST_BATTERY_CELL, BMS per cell
    const idx = inv8(u8at(b, 0)), mv = inv16(u16be(b, 1)), tp = tsig(b, 3), tmax = tsig(b, 5), tmin = tsig(b, 7);
    log('  150C BMS cell ' + sh(idx) + ': ' + sh(mv) + ' mV, temp=' + sh(tp) + ' (min ' + sh(tmin) + ', max ' + sh(tmax) + ')', 'log-ok');
  },
  '1506': b => {                                             // GPST_TRIP, trip / odometer
    const len = u32be(b, 0), tm = u32be(b, 4), odo = u32be(b, 8), odt = u32be(b, 12);
    setTile('t-trip', len); setTile('t-triptime', tm != null ? tm + ' s' : null); setTile('t-total', odo);
    log('  1506 trip: length(raw)=' + sh(len) + ', time=' + sh(tm) + ' s, odometer(raw)=' + sh(odo) + ', odometerTime=' + sh(odt) + ' s', 'log-ok');
  },
  '1507': b => {                                             // GPST_TOTAL_TRIP, lifetime
    snap.totTime = u32be(b, 0); snap.totMax = sig16(u16be(b, 4)); snap.totAvg = sig16(u16be(b, 6));
    log('  1507 total: totalTime=' + sh(snap.totTime) + ' s, maxSpeed=' + sh(snap.totMax) + ' (raw), avgSpeed=' + sh(snap.totAvg) + ' (raw)', 'log-ok');
  },
  '150d': b => {                                             // GPST_STATS, session stats (fixed head only)
    snap.stMax = sig16(u16be(b, 0)); snap.stAvg = sig16(u16be(b, 2)); snap.stMaxCad = sig16(u16be(b, 4)); snap.stAvgCad = sig16(u16be(b, 6));
    log('  150D stats: maxSpeed=' + sh(snap.stMax) + ' (raw), avgSpeed=' + sh(snap.stAvg) + ' (raw), maxCadence=' + sh(snap.stMaxCad) + ', avgCadence=' + sh(snap.stAvgCad), 'log-ok');
  },
  '1504': b => {                                             // GPST_FIRMWAREID (ASCII fields; layout not offset-fixed)
    snap.firmware = ascii(b).replace(/\.+/g, ' ').trim();
    log('  1504 firmwareId: "' + ascii(b) + '"', 'log-ok');
  },
  '1514': b => {                                             // GPST_ERROR, little-endian code list from offset 0
    const codes = []; for (let o = 0; o + 1 < b.length; o += 2) { const c = u16le(b, o); if (c) codes.push('0x' + c.toString(16)); }
    snap.errors = codes;
    setTile('t-fault', codes.length ? codes.length : '0');
    log('  1514 errors: ' + (codes.length ? codes.join(', ') : 'none'), codes.length ? 'log-err' : 'log-ok');
  },
  '1f01': b => {                                             // command response, incl. immobiliser state (read-only, Sachs-gated; not a VMAX fact)
    const op = u16be(b, 0), lk = u8at(b, 3);
    if (op === 1) { const en = lk === 0 ? 'unlocked' : lk === 1 ? 'locked' : 'unknown'; log('  1F01 command reply: lock state = ' + en + ' (not available on the VMAX line)', 'log-ok'); }
    else log('  1F01 command response opId=' + op, 'log-ok');
  },
};
// Serial group DA1A150E-1512: ASCII strings. Store by role name; keep them out of tiles.
const SERIAL_NAMES = { '150e': 'Serial', '150f': 'Display', '1510': 'Battery', '1511': 'Controller', '1512': 'Motor' };
Object.keys(SERIAL_NAMES).forEach(su => {
  DECODERS[su] = b => { const s = ascii(b).replace(/\.+/g, '').trim(); snap.serials[SERIAL_NAMES[su]] = s; log('  ' + su.toUpperCase() + ' ' + SERIAL_NAMES[su] + ' serial: ' + s, 'log-ok'); };
});

// ---- BLE state -------------------------------------------------------------
let device = null, server = null;
let tuneWriteChar = null, tuneNotifyChar = null, timeSyncChar = null;
const notifyChars = [];
const readChars = [];
let connected = false, connecting = false;
let lastFrame = {};

// iOS WebKit (Bluefy) reports UUIDs uppercase, desktop Chrome lowercase - normalize before matching.
function shortUuid(uuid) { uuid = String(uuid).toLowerCase(); const m = /^0000([0-9a-f]{4})-/.exec(uuid); if (m) return m[1]; const n = /^da1a([0-9a-f]{4})-/.exec(uuid); return n ? n[1] : uuid; }

async function pickAndConnect() {
  if (!navigator.bluetooth) { log('Web Bluetooth not available in this browser', 'log-err'); try { alert(t('noBleAlert')); } catch (e) {} return; }
  if (connecting || connected) return;
  connecting = true; snap = emptySnap(); setStatus('connecting'); updateConnButton();
  try {
    log('requesting device (pick your VMAX)...', 'log-tx');
    device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES });
    deviceId = device.id || '';
    log('device: ' + (device.name || '(no name)') + '  id=' + device.id);
    $('devinfo').textContent = (device.name || '(no name)');
    device.addEventListener('gattserverdisconnected', onDisconnected);
    server = await device.gatt.connect();
    log('GATT connected', 'log-ok');
    await enumerateGatt();
    await writeTimeSync();     // handshake, like the app does after connect
    connected = true; connecting = false; setStatus('connected');
    updateConnButton(); setLimiterEnabled(true);
    await readAll();     // snapshot the read-only config (incl. 1501 speed limit) right after connect
  } catch (e) {
    connecting = false; setStatus('disconnected'); updateConnButton();
    const msg = (e && e.message) ? e.message : String(e);
    const name = (e && e.name) ? e.name : '';
    log('connect failed: ' + (name ? name + ': ' : '') + msg, 'log-err');
    if (/cancel/i.test(msg)) return;             // genuine user cancel: stay quiet
    let text;
    if (name === 'NotFoundError') text = t('connectNoDevice');
    else text = t('connectErr') + (name ? name + ': ' : '') + msg;
    try { alert(text); } catch (_) {}
  }
}

async function enumerateGatt() {
  const out = [];
  notifyChars.length = 0; readChars.length = 0; tuneWriteChar = null; tuneNotifyChar = null; timeSyncChar = null; lastFrame = {};
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
      const cu = String(c.uuid).toLowerCase();     // iOS WebKit (Bluefy) reports UUIDs uppercase
      if (cu === TUNE_WRITE) tuneWriteChar = c;
      if (cu === TUNE_NOTIFY) tuneNotifyChar = c;
      if (cu === TIMESYNC_WRITE) timeSyncChar = c;
      if (p.read) readChars.push(c);
      if (p.notify || p.indicate) {
        try { await c.startNotifications(); c.addEventListener('characteristicvaluechanged', onNotify); notifyChars.push(c); }
        catch (e) { out.push('    (subscribe failed: ' + e + ')'); }
      }
    }
  }
  const el = $('chars'); if (el) el.textContent = out.join('\n');
  log('characteristics discovered: ' + out.filter(l => l.startsWith('  chr')).length + ', notify-subscribed: ' + notifyChars.length, 'log-ok');
  log('tuning report ' + (tuneNotifyChar ? 'FOUND (160C)' : 'not found') + ', timesync ' + (timeSyncChar ? 'FOUND (1607)' : 'not found'));
}

async function writeTimeSync() {
  if (!timeSyncChar) { log('handshake: TimeSync characteristic DA1A1607 not present, skipped', 'log-err'); return; }
  await writeRaw(timeSyncChar, timeSyncFrame(), '1607 TimeSync (handshake)');
}

// Read every readable characteristic once. Surfaces the read-only config that notifications never push
// (above all DA1A1501 with the speed limit). Reading is safe: it never changes anything on the scooter.
async function readAll() {
  if (!connected) { log('not connected', 'log-err'); return; }
  log('reading all ' + readChars.length + ' readable characteristics...', 'log-tx');
  for (const c of readChars) {
    const su = String(shortUuid(c.uuid)).toLowerCase();
    try {
      const v = await c.readValue();
      const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      const hex = bytesToHex(bytes);
      log('RX ' + su + '  ' + hex, 'log-rx');
      lastFrame[su] = hex;
      const dec = DECODERS[su];
      if (dec) { try { dec(bytes); } catch (e) { log('  decode ' + su + ' failed: ' + e, 'log-err'); } }
    } catch (e) { log('  read ' + su + ' failed: ' + e, 'log-err'); }
  }
  renderSettings(); renderAdvanced();
  log('read all done', 'log-ok');
}

// CAN probe: experimental, READ-ONLY. Sends a HAP v2 parameter-READ for the speed-limit address over the
// Hyena/CAN bridge and lets the raw responses show in the log. It requests values only - it writes
// nothing to the scooter's configuration. On real hardware this bridge often does not answer at all.
async function probeSpeedLimit() {
  if (!connected || !server) { log('not connected', 'log-err'); return; }
  let svc = null;
  try {
    const services = await server.getPrimaryServices();
    log('CAN: services on device: ' + services.map(s => s.uuid).join(', '), 'log-tx');
    let pl = null, hy = null, da = null;
    for (const s of services) { const su = String(s.uuid).toLowerCase(); if (su === PAIRLINK_SERVICE) pl = s; else if (su === HYENA_SERVICE) hy = s; else if (/^da1a1900-/.test(su)) da = s; }
    svc = pl || hy || da;
  } catch (e) { log('CAN: service scan failed: ' + e, 'log-err'); return; }
  if (!svc) { log('CAN: no CAN bridge service found (PairLink 49d554a6 / Hyena 48592800 / DA1A1900)', 'log-err'); try { alert(t('canNotFound')); } catch (_) {} return; }
  log('CAN: using service ' + svc.uuid, 'log-ok');
  let chars = [];
  try { chars = await svc.getCharacteristics(); } catch (e) { log('CAN: characteristics unreadable: ' + e, 'log-err'); return; }
  const props = c => (c && c.properties) || {};
  const writeChars = chars.filter(c => { const p = props(c); return p.write || p.writeWithoutResponse; });
  const notifyChars2 = chars.filter(c => { const p = props(c); return p.notify || p.indicate; });
  if (!writeChars.length) { log('CAN: no writable characteristic in the CAN service', 'log-err'); try { alert(t('canNotFound')); } catch (_) {} return; }
  log('CAN: write=' + writeChars.map(c => shortUuid(c.uuid)).join(',') + ' notify=' + notifyChars2.map(c => shortUuid(c.uuid)).join(','), 'log-tx');

  let anyResolve = null; const anyQ = [];
  const onAny = ev => {
    const dv = ev.target.value; const raw = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    let dec = raw; try { if (raw.length && raw.length % 16 === 0) dec = pkcs7unpad(aesEcbDec(AES_FIXED_KEY, raw)); } catch (e) {}
    log('RX ' + shortUuid(ev.target.uuid) + '  ' + bytesToHex(dec) + '  (dec)', 'log-rx');
    const item = { uuid: ev.target.uuid, dec }; if (anyResolve) { const r = anyResolve; anyResolve = null; r(item); } else anyQ.push(item);
  };
  const waitAny = ms => new Promise(res => { if (anyQ.length) return res(anyQ.shift()); anyResolve = res; setTimeout(() => { if (anyResolve === res) { anyResolve = null; res(null); } }, ms); });
  for (const c of notifyChars2) { try { await c.startNotifications(); } catch (e) {} c.addEventListener('characteristicvaluechanged', onAny); }

  try {
    // Find the control-write characteristic: send the encrypted 0x01 to each writable one until a 0x02 arrives.
    let control = null, nonce = null, reply = null;
    for (const wc of writeChars) {
      while (anyQ.length) anyQ.shift();
      nonce = randBytes(4);
      log('CAN handshake: 0x01 -> ' + shortUuid(wc.uuid) + ' nonce ' + bytesToHex(nonce), 'log-tx');
      await writeRaw(wc, genCmdEncry(0x01, nonce), 'ctrl 0x01 -> ' + shortUuid(wc.uuid));
      const r = await waitAny(2500);
      if (r && r.dec[0] === 0x02 && r.dec.length >= 11) { control = wc; reply = r.dec; log('CAN handshake: 0x02 on ' + shortUuid(r.uuid) + ' -> control = ' + shortUuid(wc.uuid), 'log-ok'); break; }
    }
    if (!control) {
      log('CAN handshake: no 0x02 from any write characteristic - DA1A1900 does not answer the handshake we have.', 'log-err');
    } else {
      const rand4 = reply.subarray(1, 5), rand6 = reply.subarray(5, 11);
      const dyn = new Uint8Array(16);
      for (let i = 0; i < 4; i++) { dyn[i*3] = nonce[i]; dyn[i*3+1] = rand4[i]; dyn[i*3+2] = rand6[i]; }
      dyn[12] = 0x55; dyn[13] = 0xAA; dyn[14] = rand6[4]; dyn[15] = rand6[5];
      log('CAN handshake: dynamic key ' + bytesToHex(dyn), 'log-ok');
      await writeRaw(control, genCmdEncry(0x08, null), 'ctrl 0x08'); let r = await waitAny(2500);
      log('CAN handshake: after 0x08 got ' + (r ? bytesToHex(r.dec) : 'timeout'), r && r.dec[0] === 0x09 ? 'log-ok' : 'log-err');
      await writeRaw(control, genCmdEncry(0x12, null), 'ctrl 0x12'); r = await waitAny(2500);
      let bo = 0; if (r && r.dec[0] === 0x13 && r.dec.length >= 2) { bo = r.dec[1]; log('CAN handshake: 0x13 bo=' + bo + ' - CAN channel open', 'log-ok'); }
      else log('CAN handshake: expected 0x13, got ' + (r ? bytesToHex(r.dec) : 'timeout') + '; continuing with bo=0', 'log-err');
      const tx = writeChars.find(c => c !== control) || control;
      log('CAN: reading MaxSpeed 496 / Assist 536 / Throttle 600 via ' + shortUuid(tx.uuid), 'log-tx');
      for (const pr of CAN_PARAMS) {
        let frame = canReadFrame(pr.addr, pr.len);
        if (bo & 2) frame = aesEcbEnc(dyn, pkcs7pad(frame));
        await writeRaw(tx, frame, 'CAN read addr ' + pr.addr + ' ' + pr.name + (bo & 2 ? ' (enc)' : ''));
        await sleep(900);
      }
      await sleep(1500);
    }
    log('CAN: re-reading all readable characteristics', 'log-tx');
    await readAll();
    await sleep(3000);   // listen a bit more for any late traffic on any notify characteristic
    log('CAN: full sweep done', 'log-ok');
  } finally {
    for (const c of notifyChars2) c.removeEventListener('characteristicvaluechanged', onAny);
  }
}

function onNotify(ev) {
  const dv = ev.target.value;
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const su = String(shortUuid(ev.target.uuid)).toLowerCase();
  const hex = bytesToHex(bytes);
  if (!diagLog && lastFrame[su] === hex) return;    // same frame as last time: skip so the log stays readable (unless diag)
  lastFrame[su] = hex;
  log('RX ' + su + '  ' + hex, 'log-rx');
  const dec = DECODERS[su];
  if (dec) { try { dec(bytes); renderSettings(); renderAdvanced(); } catch (e) { log('  decode ' + su + ' failed: ' + e, 'log-err'); } }
}

// MotorTuning report (DA1A160C). Format from GPSTProtocolHandler::ReadCharacteristicMotorTuning:
// FD <one value byte per tuning ordinal, 0xFF = unset> [FD ...] FE. Byte position = ordinal, value = byte.
// MaxSpeed (ordinal 4) has a fixed SDK cap of 250, the other types 100. Reading this is safe.
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
  snap.tuning = records;
  const rec = records[0];
  const ms = (rec.length > MT.MaxSpeed && rec[MT.MaxSpeed] !== 0xFF) ? rec[MT.MaxSpeed] : null;
  snap.tuneMax = ms; snap.tuneCap = ms != null ? 250 : null; snap.tuneCount = records.length;
  setTile('t-maxnow', ms);
  setTile('t-maxcap', ms != null ? 250 : null);
  setTile('t-idx', records.length);
}

async function readTune() {
  if (tuneNotifyChar && (tuneNotifyChar.properties || {}).read) {
    try { const v = await tuneNotifyChar.readValue(); const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); log('RX 160C (read)  ' + bytesToHex(b), 'log-rx'); decodeTuning(b); renderSettings(); renderAdvanced(); return; }
    catch (e) { log('read 160C failed: ' + e, 'log-err'); }
  }
  if (!tuneNotifyChar) { log(t('tuneUnavail'), 'log-err'); return; }
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

// Limiter write - kept for the day a real device proves it, but hard-gated behind WRITE_ENABLED. While
// WRITE_ENABLED is false the buttons stay disabled and this never fires.
async function writeLimiter(open) {
  if (!WRITE_ENABLED) { log('limiter write is disabled (see the banner)', 'log-err'); return; }
  if (!connected) { log('not connected', 'log-err'); return; }
  if (!tuneWriteChar) { log('MotorTuning write (DA1A160D) not present on this scooter', 'log-err'); try { alert(t('tuneUnavail')); } catch (_) {} return; }
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
  connected = false; connecting = false; server = null; snap = emptySnap();
  tuneWriteChar = null; tuneNotifyChar = null; timeSyncChar = null; notifyChars.length = 0; lastFrame = {};
  setStatus('disconnected'); resetTiles(); setLimiterEnabled(false); updateConnButton();
  renderSettings(); renderAdvanced();
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
function updateLimiterButtons() {
  const bo = $('btn-open'), bl = $('btn-legal'), br = $('btn-readtune');
  if (bo) bo.textContent = t('btnOpen');
  if (bl) bl.textContent = t('btnLegal');
  if (br) br.textContent = t('btnReadTune');
}
// Read controls turn on once connected; write controls are AND-gated by WRITE_ENABLED, so connect never
// un-greys them. While WRITE_ENABLED is false they stay disabled with the .is-blocked style.
function setLimiterEnabled(on) {
  const canWrite = on && WRITE_ENABLED && !!tuneWriteChar;
  ['btn-open', 'btn-legal', 'open-in', 'legal-in', 'idx-in'].forEach(id => { const el = $(id); if (el) { el.disabled = !canWrite; el.classList.toggle('is-blocked', !canWrite); } });
  const br = $('btn-readtune'); if (br) br.disabled = !(on && !!tuneNotifyChar);
  const ra = $('btn-readall'); if (ra) ra.disabled = !on;
  const cp = $('btn-canprobe'); if (cp) cp.disabled = !on;
}

// ---- Settings / Advanced read-only panels ----------------------------------
function roRow(labelKey, value) {
  const row = document.createElement('div'); row.className = 'ro-row';
  const l = document.createElement('span'); l.className = 'ro-lbl'; l.textContent = t(labelKey);
  const v = document.createElement('span'); v.className = 'ro-val'; v.textContent = (value == null || value === '') ? '-' : value;
  row.appendChild(l); row.appendChild(v); return row;
}
function joinParts(parts) { const p = parts.filter(x => x != null && x !== ''); return p.length ? p.join('  |  ') : null; }

function renderSettings() {
  const body = $('settings-body'), empty = $('settings-empty'); if (!body) return;
  body.textContent = '';
  if (!connected) { if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  body.appendChild(roRow('lblSetSpeedLimit', snap.speedLimit != null ? snap.speedLimit.toFixed(1) + ' km/h' : null));
  body.appendChild(roRow('lblSetWheel', snap.wheel != null ? snap.wheel + ' mm' : null));
  body.appendChild(roRow('lblSetAssist', (snap.assistMin != null || snap.assistMax != null) ? (sh(snap.assistMin) + ' .. ' + sh(snap.assistMax)) : null));
  body.appendChild(roRow('lblSetMotor', joinParts([
    snap.motorNom != null ? snap.motorNom + ' W' : null,
    snap.motorMax != null ? snap.motorMax + ' W' : null,
    snap.motorPeak != null ? snap.motorPeak + ' W' : null])));
  body.appendChild(roRow('lblSetBattery', joinParts([
    snap.battCells != null ? snap.battCells + ' cells' : null,
    snap.battCycles != null ? snap.battCycles + ' cycles' : null,
    snap.battSoH != null ? snap.battSoH + ' % SoH' : null])));
  body.appendChild(roRow('lblSetTuning', snap.tuneMax != null ? (snap.tuneMax + ' / cap ' + sh(snap.tuneCap) + ' / ' + sh(snap.tuneCount) + ' profile(s)') : null));
}

function renderAdvanced() {
  const body = $('advanced-body'), empty = $('advanced-empty'); if (!body) return;
  body.textContent = '';
  if (!connected) { if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  // MotorTuning full ordinal decode of the first profile
  let tuneStr = null;
  if (snap.tuning && snap.tuning.length) {
    const parts = []; snap.tuning[0].forEach((v, ord) => { if (v !== 0xFF) parts.push((MT_NAMES[ord] || ('T' + ord)) + '=' + v); });
    tuneStr = parts.length ? parts.join(', ') : '(all unset)';
  }
  body.appendChild(roRow('lblAdvTuning', tuneStr));
  body.appendChild(roRow('lblAdvBattery', joinParts([
    snap.battDesignV != null ? snap.battDesignV + ' mV' : null,
    snap.battCap != null ? 'cap ' + snap.battCap + ' (raw)' : null,
    snap.battFullChg != null ? 'full ' + snap.battFullChg + ' (raw)' : null,
    snap.battMfgDate ? 'mfg ' + snap.battMfgDate : null])));
  const motorLive = joinParts([
    snap.mCur != null ? 'I ' + snap.mCur : null,
    snap.mVolt != null ? 'U ' + snap.mVolt : null,
    snap.mRpm != null ? snap.mRpm + ' rpm' : null,
    snap.mTemp != null ? 'temp ' + snap.mTemp : null]);
  body.appendChild(roRow('lblAdvMotorLive', motorLive === null ? null : motorLive + ' (raw)'));
  body.appendChild(roRow('lblAdvStatus', joinParts([
    snap.stLight != null ? 'light ' + snap.stLight : null,
    snap.stCharge != null ? 'charge ' + snap.stCharge : null,
    snap.stAssist != null ? 'assist ' + snap.stAssist : null,
    snap.stCtrlTemp != null ? 'ctrlTemp ' + snap.stCtrlTemp + ' (raw)' : null])));
  body.appendChild(roRow('lblAdvStats', joinParts([
    snap.stMax != null ? 'max ' + snap.stMax + ' (raw)' : null,
    snap.stAvg != null ? 'avg ' + snap.stAvg + ' (raw)' : null,
    snap.stMaxCad != null ? 'maxCad ' + snap.stMaxCad : null])));
  body.appendChild(roRow('lblAdvTotal', joinParts([
    snap.totTime != null ? snap.totTime + ' s' : null,
    snap.totMax != null ? 'max ' + snap.totMax + ' (raw)' : null,
    snap.totAvg != null ? 'avg ' + snap.totAvg + ' (raw)' : null])));
  body.appendChild(roRow('lblAdvFirmware', snap.firmware || null));
  const serials = Object.keys(snap.serials).map(k => k + ': ' + snap.serials[k]).filter(x => x.split(': ')[1]);
  body.appendChild(roRow('lblAdvSerials', serials.length ? serials.join('  |  ') : null));
  body.appendChild(roRow('lblAdvErrors', (snap.errors && snap.errors.length) ? snap.errors.join(', ') : 'none'));
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
const HELP = {
  limiter: ['limiterTitle', 'limiterHelp'],
  disclaimer: ['footDisclaimer', 'disclaimerText'],
  publiclog: ['publicLogTitle', 'publicLogHelpHtml'],
  diaglog: ['diagLogTitle', 'diagLogHelpHtml'],
};
function openHelp(key) {
  const h = HELP[key]; if (!h) return;
  $('help-title').textContent = t(h[0]);
  const body = $('help-body'); const s = t(h[1]);
  if (/[<&]/.test(s)) body.innerHTML = s; else body.textContent = s; // scan-ok: our own translation table
  const w = $('help-warn'); if (w) w.hidden = true;
  const dlg = $('help'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function closeHelp() { const dlg = $('help'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
// German docs are NAME.de.md, English docs NAME.md (README is language neutral, GUIDE is GUIDE.<lang>.md).
function docFile(name) {
  if (name === 'README') return 'README.md';
  if (name === 'GUIDE') return 'GUIDE.' + lang + '.md';
  return lang === 'de' ? name + '.de.md' : name + '.md';
}
function docBaseName(url) { return url.replace(/[?#].*$/, '').replace(/\.(de|en)\.md$/i, '').replace(/\.md$/i, ''); }
function docTitleFor(url) { const k = { README: 'footReadme', GUIDE: 'footGuide', LICENSE: 'footLicense', PRIVACY: 'footPrivacy', TRADEMARKS: 'footTrademarks' }[docBaseName(url)]; return k ? t(k) : docBaseName(url); }
async function openDoc(file, title) {
  const dlg = $('doc'); $('doc-title').textContent = title; $('doc-body').textContent = t('docLoading');
  if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  try { const r = await fetch(file); const md = await r.text(); $('doc-body').innerHTML = renderMd(md); $('doc-body').scrollTop = 0; } // scan-ok: markdown of our own documents, renderMd escapes first
  catch (e) { $('doc-body').textContent = t('docLoadErr') + file + ' (' + e + ')'; }
}
function renderMd(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      if (/\.md(?:[?#].*)?$/i.test(url)) return '<a href="#" data-doclink="' + url + '">' + text + '</a>';
      return '<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>';
    })
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
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
  setLimiterEnabled(false);   // grey the write controls from the start

  { const pc = $('public-log'); if (pc) { pc.checked = publicLog; pc.addEventListener('change', () => { publicLog = pc.checked; try { localStorage.setItem('vmnu_publiclog', publicLog ? '1' : '0'); } catch (e) {} renderLog(); }); } }
  { const dc = $('diag-log'); if (dc) { dc.checked = diagLog; dc.addEventListener('change', () => { diagLog = dc.checked; try { localStorage.setItem('vmnu_diaglog', diagLog ? '1' : '0'); } catch (e) {} }); } }

  $('btn-conn').addEventListener('click', () => { if ($('btn-conn').dataset.act === 'disconnect') disconnectBle(); else pickAndConnect(); });
  { const s = $('model-in'); if (s) s.addEventListener('change', () => buildModelDropdown()); }
  // write buttons stay disabled (WRITE_ENABLED=false); listeners attached so flipping the flag re-enables them
  { const b = $('btn-open'); if (b) b.addEventListener('click', () => writeLimiter(true)); }
  { const b = $('btn-legal'); if (b) b.addEventListener('click', () => writeLimiter(false)); }
  { const b = $('btn-readtune'); if (b) b.addEventListener('click', readTune); }
  { const b = $('btn-readall'); if (b) b.addEventListener('click', readAll); }
  { const b = $('btn-canprobe'); if (b) b.addEventListener('click', probeSpeedLimit); }
  { const b = $('btn-copy-log'); if (b) b.addEventListener('click', copyLog); }
  { const b = $('btn-clear-log'); if (b) b.addEventListener('click', clearLog); }
  { const b = $('btn-save-log'); if (b) b.addEventListener('click', saveLog); }
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
