'use strict';

// Every visible string of the page, in both languages. The keys match the data-t attributes in
// index.html and the t() calls in app.js. A missing entry shows as an empty element instead of
// silently falling back to the other language. German is the default. The log stays technical and
// English (ASCII).
window.I18N = {
  de: {
    pageTitle: "Laufbursche VMAX new Tool",
    brandSub: "VMAX new Tool",
    themeToLight: "Auf helle Darstellung umschalten",
    themeToDark: "Auf dunkle Darstellung umschalten",

    s1Title: "So fängst du an",
    sub: "Live über Web Bluetooth mit einem neueren VMAX-E-Scooter reden, also den Modellen der App VMAX E-Scooter (VX2, VX4, VX8, R40, R55). Diese Seite ist für das iPhone gedacht (App Bluefy), läuft aber auch in Chrome oder Edge auf Android und Desktop. Nichts verlässt dein Gerät.",
    expWarn: "Machbarkeitsstudie und Testwerkzeug. Die neueren VMAX-Modelle sprechen das GPST-Protokoll KingmeterVmax, dessen Frames aus der nativen Bibliothek der Hersteller-App rekonstruiert wurden. Die Hersteller-App selbst schreibt die Drossel nie, daher ist nicht bewiesen, dass der Controller einen geschriebenen Wert annimmt. Ob etwas wirkt, zeigt erst der Test an deinem eigenen Scooter. Kein fehlerfreier Betrieb, keine Gewährleistung, alles auf eigenes Risiko. <a href=\"#\" data-open-disclaimer>Haftungsausschluss lesen</a>.",
    ownDevice: "Nur am eigenen Fahrzeug auf privatem Gelände. Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf, die ABE erlischt und der Betrieb auf öffentlichen Wegen ist dann nicht erlaubt.",

    s2Title: "Verbindung",
    modelLabel: "Modell",
    modelAuto: "Automatisch erkennen (empfohlen)",
    mdl_vx2: "VMAX VX2",
    mdl_vx4: "VMAX VX4 / new VX4",
    mdl_vx8: "VMAX VX8",
    mdl_r40: "VMAX R40 Pro",
    mdl_r55: "VMAX R55 Pro",
    modelHint: "Die Modellwahl ist nur ein Hinweis. Verbunden wird immer über den Bluetooth-Dienst der neueren VMAX-Reihe (Service DA1A1500). Erkennt die Seite diesen Dienst nicht, ist der Scooter kein neueres Modell und gehört in das andere Tool <a href=\"https://laufbursche42.github.io/vmax-unlock/\" target=\"_blank\" rel=\"noopener\">vmax-unlock</a>.",
    btnConnect: "Verbinden",
    btnDisconnect: "Trennen",
    controlsHint: "Web Bluetooth geht auf dem iPhone nur über die App Bluefy, auf Android oder Desktop über Chrome oder Edge. Beim ersten Verbinden alle gefundenen Dienste und Merkmale zulassen.",

    liveTitle: "Live-Werte vom Scooter",
    tileSpeed: "Geschwindigkeit",
    tileMaxNow: "MaxSpeed aktuell",
    tileMaxCap: "MaxSpeed Obergrenze",
    tileIdx: "Profil-Index",
    tileBatt: "Akku",
    tileLock: "Wegfahrsperre",
    liveHint: "Diese Werte kommen aus den Notify-Merkmalen des Scooters. MaxSpeed aktuell und Obergrenze stammen aus dem MotorTuning-Merkmal, sofern dein Modell es führt. Bleiben die Felder leer, meldet der Scooter kein BLE-Tuning.",

    drosselTitle: "Drossel (Geschwindigkeit)",
    drosselIntro: "Entsperren setzt MaxSpeed auf den offenen Wert, Sperren setzt ihn auf den legalen Wert zurück. Beide schreiben denselben MotorTuning-Befehl, nur mit anderer Zahl.",
    lblOpen: "Offen (MaxSpeed)",
    lblLegal: "Legal (MaxSpeed)",
    lblIdx: "Profil-Index",
    btnOpen: "Entsperren (Drossel lösen)",
    btnLegal: "Sperren (Drossel setzen)",
    btnReadTune: "Tuning auslesen",
    drosselWarn: "Ungeprüft. Der Zahlenbereich und die Einheit von MaxSpeed sind nicht gesichert. Lies zuerst mit Tuning auslesen den aktuellen Wert und die Obergrenze aus. Bleibe beim Schreiben innerhalb der gemeldeten Grenzen.",
    drosselHint: "Der Schreibbefehl geht an das Merkmal DA1A160D. Ob der Controller ihn annimmt, entscheidet die Firmware deines Scooters. Sieh im Log nach, wie der Scooter reagiert.",

    charsTitle: "Gefundene Merkmale",
    charsHint: "Beim Verbinden listet die Seite alle Dienste und Merkmale samt Eigenschaften auf. Das hilft, das Protokoll am realen Gerät zu verstehen.",

    s6Title: "Protokoll (Log)",
    btnCopyLog: "Log kopieren",
    btnClearLog: "Log leeren",
    btnDiag: "Alle Geräte scannen",
    diagHint: "Der Scan listet in der Nähe gefundene Geräte mit ihren Diensten. Nützlich, um den richtigen Scooter und seinen Dienst zu finden.",
    logTxLegend: "gesendet",
    logRxLegend: "empfangen",

    footGuide: "Anleitung",
    footSource: "Quellcode",
    footReadme: "Readme",
    footDisclaimer: "Haftungsausschluss",
    footLicense: "Lizenz",
    footPrivacy: "Datenschutz",
    footTrademarks: "Marken",
    docClose: "Schließen",

    riskyTitle: "Bist du sicher?",
    riskyOk: "Ja, schreiben",
    riskyCancel: "Abbrechen",
    confirmOpenBody: "Das hebt die Drossel auf und setzt MaxSpeed auf den offenen Wert. Auf öffentlichen Wegen erlischt damit die ABE. Nur am eigenen Fahrzeug auf privatem Gelände.",
    confirmLegalBody: "Das setzt MaxSpeed auf den legalen Wert zurück.",

    drosselHelp: "MaxSpeed ist Typ 4 im MotorTuning des GPST-Protokolls, SpeedCut ist Typ 3. Der Befehl schreibt ein Byte je Tuning-Typ nach Merkmal DA1A160D, nicht gesetzte Typen bleiben 0xFF. Weil die Hersteller-App diesen Befehl nie sendet, ist seine Wirkung am Scooter unbewiesen und muss am eigenen Gerät getestet werden.",
    disclaimerText: "Dieses Werkzeug ist eine Machbarkeitsstudie, kein fertiges Produkt. Es gibt keine Gewährleistung und keine Garantie für fehlerfreien Betrieb. Das Anheben der Geschwindigkeit hebt die Drossel auf: die ABE erlischt und der Betrieb auf öffentlichen Wegen ist dann nicht erlaubt. Nutzung ausschließlich am eigenen Fahrzeug und auf eigenes Risiko. Die Seite spricht nur lokal per Bluetooth mit dem Gerät, es werden keine Daten an einen Server gesendet. VMAX ist eine Marke des jeweiligen Inhabers. Dieses Projekt ist unabhängig und nicht mit VMAX verbunden.",

    stDisconnected: "getrennt",
    stConnecting: "verbinde",
    stConnected: "verbunden"
  },

  en: {
    pageTitle: "Laufbursche VMAX new Tool",
    brandSub: "VMAX new Tool",
    themeToLight: "Switch to light theme",
    themeToDark: "Switch to dark theme",

    s1Title: "How to start",
    sub: "Talk live over Web Bluetooth to a newer VMAX scooter, meaning the models of the VMAX E-Scooter app (VX2, VX4, VX8, R40, R55). This page targets the iPhone (Bluefy app) but also runs in Chrome or Edge on Android and desktop. Nothing leaves your device.",
    expWarn: "Feasibility study and test tool. The newer VMAX models speak the GPST protocol KingmeterVmax, whose frames were reconstructed from the vendor app's native library. The vendor app never writes the speed limit itself, so it is not proven that the controller accepts a written value. Only a test on your own scooter shows whether anything takes effect. No error-free operation, no warranty, all at your own risk. <a href=\"#\" data-open-disclaimer>Read the disclaimer</a>.",
    ownDevice: "Only on your own vehicle on private ground. Raising the top speed removes the limiter, the road approval lapses and use on public roads is then not allowed.",

    s2Title: "Connection",
    modelLabel: "Model",
    modelAuto: "Auto detect (recommended)",
    mdl_vx2: "VMAX VX2",
    mdl_vx4: "VMAX VX4 / new VX4",
    mdl_vx8: "VMAX VX8",
    mdl_r40: "VMAX R40 Pro",
    mdl_r55: "VMAX R55 Pro",
    modelHint: "The model choice is only a hint. The page always connects over the newer VMAX line's Bluetooth service (service DA1A1500). If the page does not find that service, the scooter is not a newer model and belongs in the other tool <a href=\"https://laufbursche42.github.io/vmax-unlock/\" target=\"_blank\" rel=\"noopener\">vmax-unlock</a>.",
    btnConnect: "Connect",
    btnDisconnect: "Disconnect",
    controlsHint: "Web Bluetooth works on the iPhone only through the Bluefy app, on Android or desktop through Chrome or Edge. On first connect allow all discovered services and characteristics.",

    liveTitle: "Live values from the scooter",
    tileSpeed: "Speed",
    tileMaxNow: "MaxSpeed current",
    tileMaxCap: "MaxSpeed cap",
    tileIdx: "Profile index",
    tileBatt: "Battery",
    tileLock: "Immobiliser",
    liveHint: "These values come from the scooter's notify characteristics. MaxSpeed current and cap come from the MotorTuning characteristic if your model carries it. If the fields stay empty, the scooter reports no BLE tuning.",

    drosselTitle: "Speed limiter",
    drosselIntro: "Unlock sets MaxSpeed to the open value, lock sets it back to the legal value. Both write the same MotorTuning command, only the number differs.",
    lblOpen: "Open (MaxSpeed)",
    lblLegal: "Legal (MaxSpeed)",
    lblIdx: "Profile index",
    btnOpen: "Unlock (remove limiter)",
    btnLegal: "Lock (set limiter)",
    btnReadTune: "Read tuning",
    drosselWarn: "Unverified. The range and unit of MaxSpeed are not certain. Read the current value and cap first with Read tuning before writing. Keep within the reported limits when you write.",
    drosselHint: "The write goes to characteristic DA1A160D. Whether the controller accepts it is decided by your scooter's firmware. Watch the log for how the scooter reacts.",

    charsTitle: "Discovered characteristics",
    charsHint: "On connect the page lists all services and characteristics with their properties. This helps to understand the protocol on the real device.",

    s6Title: "Log",
    btnCopyLog: "Copy log",
    btnClearLog: "Clear log",
    btnDiag: "Scan all devices",
    diagHint: "The scan lists nearby devices with their services. Useful to find the right scooter and its service.",
    logTxLegend: "sent",
    logRxLegend: "received",

    footGuide: "Guide",
    footSource: "Source",
    footReadme: "Readme",
    footDisclaimer: "Disclaimer",
    footLicense: "License",
    footPrivacy: "Privacy",
    footTrademarks: "Trademarks",
    docClose: "Close",

    riskyTitle: "Are you sure?",
    riskyOk: "Yes, write",
    riskyCancel: "Cancel",
    confirmOpenBody: "This removes the limiter and sets MaxSpeed to the open value. On public roads this voids the road approval. Only on your own vehicle on private ground.",
    confirmLegalBody: "This sets MaxSpeed back to the legal value.",

    drosselHelp: "MaxSpeed is type 4 in the GPST protocol's MotorTuning, SpeedCut is type 3. The command writes one byte per tuning type to characteristic DA1A160D, unset types stay 0xFF. Because the vendor app never sends this command, its effect on the scooter is unproven and must be tested on your own device.",
    disclaimerText: "This tool is a feasibility study, not a finished product. There is no warranty and no guarantee of error-free operation. Raising the speed removes the throttle: the type approval becomes void and riding on public roads is then not allowed. Use it only on your own vehicle and at your own risk. The page talks to the device locally over Bluetooth only, no data is sent to any server. VMAX is a trademark of its respective owner. This project is independent and not affiliated with VMAX.",

    stDisconnected: "disconnected",
    stConnecting: "connecting",
    stConnected: "connected"
  }
};
