# Datenschutzerklärung

Diese Webanwendung hält deine Daten auf deinem Gerät. Es gibt keinen Server dieses Projekts, der etwas
annimmt. Diese Erklärung sagt genau, was die Anwendung mit deinen Daten tut und was nicht.

## Kurz gefasst

Die Anwendung sammelt nichts: keine Statistik, keine Telemetrie, keine Verfolgung, keine Werbung, keine
Cookies und keine Skripte von Dritten. Der Bluetooth-Teil spricht nur lokal mit dem Gerät. Es verlässt
nichts dein Gerät außer dem Laden der Seite selbst.

## Welche Daten auf deinem Gerät bleiben

Alles Folgende bleibt auf deinem Gerät und wird nirgendwohin hochgeladen:

- Die Live-Daten des Scooters, über Bluetooth LE gelesen (die rohen Antworten, die der Scooter
  zurückschickt), samt Konfiguration und Einstellungen, die die Seite ausliest.
- Die Wahl von Sprache und Darstellung. Sie liegt im lokalen Speicher deines Browsers und verlässt
  dein Gerät nicht.
- Das Protokoll auf dem Bildschirm. Es lebt nur in der offenen Seite während deiner Sitzung. Die
  Anonymisierung des Logs (standardmäßig an) schwärzt Adressen, Seriennummern und Geräte-IDs, damit ein
  geteiltes Log gefahrlos ist.

## Die Netzverbindungen im Überblick

Die Anwendung baut nur in diesen Fällen eine Verbindung auf, in keinem anderen:

1. **Laden der Seite.** Dein Browser holt die statischen Dateien vom Anbieter (zum Beispiel GitHub
   Pages): `index.html`, `app.js`, `i18n.js`, `styles.css` und das Symbol. Der Anbieter sieht dabei
   deine IP-Adresse und welche Datei du abgerufen hast, die üblichen Zugriffsprotokolle jeder Website.
   Er sieht nie Daten des Scooters, keine Kommandos und keine Zugangsdaten.
2. **Bluetooth LE zum Scooter.** Eine lokale Funkverbindung über Web Bluetooth, keine Internetverbindung.
   Anfragen und Antworten laufen nur zwischen deinem Browser und dem Scooter.

## Kein Backend des Entwicklers

Es gibt keinen Server dieses Projekts, der deine Daten annimmt, kein Konto beim Entwickler, keine Cloud
dieses Projekts. Nichts geht an Dritte.

## Kontakt

Bei Fragen zum Datenschutz wende dich an den Autor (Laufbursche) auf GitHub:
https://laufbursche42.github.io/Laufbursche42/
