# Datenschutzerklärung

Diese Webanwendung ist darauf gebaut, deine Daten auf deinem Gerät zu halten. Es gibt genau **eine**
Ausnahme, die du selbst auslöst: den optionalen Firmware-Login. Diese Erklärung sagt genau, was die
Anwendung mit deinen Daten tut und was nicht.

## Kurz gefasst

Der Bluetooth-Teil sammelt nichts: keine Statistik, keine Telemetrie, keine Verfolgung, keine Werbung,
keine Cookies und keine Skripte von Dritten. Nichts davon geht an den Entwickler.

Die **einzige** Ausnahme ist die optionale **Firmware-Sektion** (Abschnitt "Firmware laden"). Wenn du sie
benutzt, gehen der von dir eingegebene Zugangs-Token und die Geräte-Kennungen deines Scooters direkt an den
Hersteller-Server `api.gpstuner.com`, an sonst niemanden. Es gibt dort **keinen Login und kein Passwort**.
Benutzt du sie nicht, verlässt nichts dein Gerät.

## Welche Daten auf deinem Gerät bleiben

Alles Folgende bleibt auf deinem Gerät und wird nirgendwohin hochgeladen:

- Die Live-Daten des Scooters, über Bluetooth LE gelesen (die rohen Antworten, die der Scooter
  zurückschickt).
- Die Einstellungen, die du auf der Seite triffst (offener und legaler MaxSpeed-Wert, Profil-Index).
  Sie leben nur in der offenen Seite während deiner Sitzung.
- Die Wahl von Sprache und Darstellung. Sie liegt im lokalen Speicher deines Browsers und verlässt
  dein Gerät nicht.
- Das Protokoll auf dem Bildschirm. Es lebt nur in der offenen Seite während deiner Sitzung.

## Die optionale Firmware-Sektion: was, wohin, wozu

**Wozu.** Die Firmware der neueren VMAX-Modelle wird vom Hersteller nur authentifiziert ausgeliefert. Die
Sektion fragt den Firmware-Server des Herstellers direkt danach - denselben Server, den auch die
offizielle App anspricht. Sie ist rein optional und **experimentell**.

**Ehrlicher Stand.** Nach unserer Analyse ist dieser Weg über die Cloud derzeit praktisch zu: den
Endpunkt, den die aktuelle offizielle App nutzt, hat der Hersteller abgeschaltet und der noch lebende
Endpunkt liefert nur für eine Geräte-`uuid`, die seine Registry kennt. In aller Regel kommt daher
`Invalid uuid`. Die Felder bleiben trotzdem, für den Fall, dass jemand eine gültige `uuid` (und einen
gültigen Token) hat.

**Kein Login.** Diese Seite meldet dich **nicht** an und fragt **weder E-Mail noch Passwort** ab. Du gibst
selbst zwei Dinge ein, falls du sie hast: einen **Zugangs-Token** und deine **Geräte-uuid**.

**Was übertragen wird und wohin.** Ausschließlich an den Hersteller-Server `https://api.gpstuner.com`, per
HTTPS, direkt aus deinem Browser:

- Der von dir eingegebene **Zugangs-Token** (als `Authorization: Bearer`-Header, genau wie die App).
- Die **Geräte-Kennungen** (`uuid`, Modell, Controller, Serial, aktuelle Firmware-Version) als
  Formularfelder an `POST /api/device/update`.

Das ist derselbe Server und derselbe Weg, den auch die offizielle App für die Firmware nutzt. Diese Seite
fügt nichts hinzu und leitet nichts um.

**Was dabei nicht passiert.**

- Der **Entwickler** dieser Seite sieht deine Eingaben **nie**. Es gibt keinen Server dieses Projekts, der
  dazwischensitzt. Die Verbindung geht direkt von deinem Browser zum Hersteller.
- Es wird **nichts gespeichert**. Token und `uuid` leben nur im Speicher der offenen Seite, bis du sie
  schließt oder neu lädst. In der Ausgabe auf dem Bildschirm wird der Token maskiert, damit ein kopiertes
  Protokoll gefahrlos teilbar ist.
- Es gibt dabei **keine Statistik, kein Tracking und keine Weitergabe an Dritte** durch diese Seite.

**Beim Hersteller.** Was der Hersteller-Server mit den Anfragen macht, etwa Zugriffsprotokolle, liegt
allein beim Hersteller (GPS-Tuner beziehungsweise VMAX), genauso wie bei der offiziellen App. Darauf hat
diese Seite keinen Einfluss.

**Freiwillig.** Die Sektion ist rein optional. Willst du nur Live-Werte lesen oder die Drossel am eigenen
Gerät testen, brauchst du sie nicht, dann verlässt nichts dein Gerät.

## Die Netzverbindungen im Überblick

Die Anwendung baut nur in diesen Fällen eine Verbindung auf, in keinem anderen:

1. **Laden der Seite.** Dein Browser holt die statischen Dateien vom Anbieter (zum Beispiel GitHub
   Pages): `index.html`, `app.js`, `i18n.js`, `styles.css` und das Symbol. Der Anbieter sieht dabei
   deine IP-Adresse und welche Datei du abgerufen hast, die üblichen Zugriffsprotokolle jeder Website.
   Er sieht nie Daten des Scooters, keine Kommandos und keine Zugangsdaten.
2. **Bluetooth LE zum Scooter.** Eine lokale Funkverbindung über Web Bluetooth, keine Internetverbindung.
   Kommandos und Antworten laufen nur zwischen deinem Browser und dem Scooter.
3. **Optionale Firmware-Sektion zu `api.gpstuner.com`.** Nur wenn du sie im Abschnitt "Firmware laden"
   selbst startest, wie oben beschrieben.

## Kein Backend des Entwicklers

Es gibt keinen Server dieses Projekts, der deine Daten annimmt, kein Konto beim Entwickler, keine Cloud
dieses Projekts. Die einzige externe Verbindung mit deinen Daten ist die, die **du** mit der
Firmware-Sektion direkt zum **Hersteller** auslöst.

## Kontakt

Bei Fragen zum Datenschutz wende dich an den Autor (Laufbursche) auf GitHub:
https://laufbursche42.github.io/Laufbursche42/
