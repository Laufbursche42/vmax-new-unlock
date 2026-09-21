# Datenschutzerklärung

Diese Webanwendung ist darauf gebaut, deine Daten auf deinem Gerät zu halten. Es gibt genau **eine**
Ausnahme, die du selbst auslöst: den optionalen Firmware-Login. Diese Erklärung sagt genau, was die
Anwendung mit deinen Daten tut und was nicht.

## Kurz gefasst

Der Bluetooth-Teil sammelt nichts: keine Statistik, keine Telemetrie, keine Verfolgung, keine Werbung,
keine Cookies und keine Skripte von Dritten. Nichts davon geht an den Entwickler.

Die **einzige** Ausnahme ist der optionale **Firmware-Login** (Abschnitt "Firmware laden"). Wenn du ihn
benutzt, gehen deine E-Mail, dein Passwort und die Geräte-Kennungen deines Scooters direkt an den
Hersteller-Server `vmax.gpstuner.com`, an sonst niemanden. Benutzt du ihn nicht, verlässt nichts dein
Gerät.

## Welche Daten auf deinem Gerät bleiben

Alles Folgende bleibt auf deinem Gerät und wird nirgendwohin hochgeladen:

- Die Live-Daten des Scooters, über Bluetooth LE gelesen (die rohen Antworten, die der Scooter
  zurückschickt).
- Die Einstellungen, die du auf der Seite triffst (offener und legaler MaxSpeed-Wert, Profil-Index).
  Sie leben nur in der offenen Seite während deiner Sitzung.
- Die Wahl von Sprache und Darstellung. Sie liegt im lokalen Speicher deines Browsers und verlässt
  dein Gerät nicht.
- Das Protokoll auf dem Bildschirm. Es lebt nur in der offenen Seite während deiner Sitzung.

## Der optionale Firmware-Login: was, wohin, wozu

**Wozu.** Die Firmware der neueren VMAX-Modelle wird vom Hersteller nur konto-authentifiziert
ausgeliefert. Um sie zu holen, muss man sich mit dem VMAX- beziehungsweise GPS-Tuner-Konto anmelden,
genau wie die offizielle App. Das ist der einzige bekannte Weg, an die Firmware dieser Modelle zu
kommen.

**Was übertragen wird und wohin.** Ausschließlich an den Hersteller-Server `https://vmax.gpstuner.com`,
per HTTPS, direkt aus deinem Browser:

- Beim Einloggen: deine **E-Mail** und dein **Passwort** an `POST /api/login`. Die Antwort ist ein
  Zugangs-Token.
- Beim Firmware-Prüfen und -Laden: der **Zugangs-Token** plus die **Geräte-Kennungen** (Modell,
  Controller, Serial, aktuelle Firmware-Version) an `POST /api/device/updates` beziehungsweise
  `POST /api/device/update`.

Das ist derselbe Server und derselbe Weg, den auch die offizielle App nutzt. Diese Seite fügt nichts
hinzu und leitet nichts um.

**Was dabei nicht passiert.**

- Der **Entwickler** dieser Seite sieht deine Zugangsdaten **nie**. Es gibt keinen Server dieses
  Projekts, der dazwischensitzt. Die Verbindung geht direkt von deinem Browser zum Hersteller.
- Es werden **keine Zugangsdaten gespeichert**. E-Mail und Passwort werden nur für die Anfrage benutzt,
  der Token lebt nur im Speicher der offenen Seite, bis du sie schließt oder neu lädst.
- Es gibt dabei **keine Statistik, kein Tracking und keine Weitergabe an Dritte** durch diese Seite.

**Beim Hersteller.** Was der Hersteller-Server mit den Anfragen macht, etwa Zugriffsprotokolle, liegt
allein beim Hersteller (GPS-Tuner beziehungsweise VMAX), genauso wie bei der offiziellen App. Darauf
hat diese Seite keinen Einfluss.

**Freiwillig.** Der Login ist rein optional. Willst du nur Live-Werte lesen oder die Drossel am eigenen
Gerät testen, brauchst du ihn nicht, dann verlässt nichts dein Gerät.

## Die Netzverbindungen im Überblick

Die Anwendung baut nur in diesen Fällen eine Verbindung auf, in keinem anderen:

1. **Laden der Seite.** Dein Browser holt die statischen Dateien vom Anbieter (zum Beispiel GitHub
   Pages): `index.html`, `app.js`, `i18n.js`, `styles.css` und das Symbol. Der Anbieter sieht dabei
   deine IP-Adresse und welche Datei du abgerufen hast, die üblichen Zugriffsprotokolle jeder Website.
   Er sieht nie Daten des Scooters, keine Kommandos und keine Zugangsdaten.
2. **Bluetooth LE zum Scooter.** Eine lokale Funkverbindung über Web Bluetooth, keine Internetverbindung.
   Kommandos und Antworten laufen nur zwischen deinem Browser und dem Scooter.
3. **Optionaler Firmware-Login zu `vmax.gpstuner.com`.** Nur wenn du ihn im Abschnitt "Firmware laden"
   selbst startest, wie oben beschrieben.

## Kein Backend des Entwicklers

Es gibt keinen Server dieses Projekts, der deine Daten annimmt, kein Konto beim Entwickler, keine Cloud
dieses Projekts. Die einzige externe Verbindung mit deinen Daten ist die, die **du** mit dem
Firmware-Login direkt zum **Hersteller** auslöst.

## Kontakt

Bei Fragen zum Datenschutz wende dich an den Autor (Laufbursche) auf GitHub:
https://laufbursche42.github.io/Laufbursche42/
