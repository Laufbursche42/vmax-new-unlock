# Datenschutzerklärung

Diese Webanwendung ist darauf gebaut, deine Daten auf deinem Gerät zu halten. Diese Erklärung sagt
genau, was sie mit deinen Daten tut und was nicht.

## Kurz gefasst

Die Anwendung sammelt nichts. Es gibt keine Anmeldung, keine Statistik, keine Telemetrie, keine
Verfolgung, keine Werbung, keine Cookies und keine Skripte von Dritten. Nichts geht an den Entwickler
oder an ein Backend des Herstellers.

## Welche Daten die Anwendung verarbeitet und wo sie bleiben

Alles Folgende bleibt auf deinem Gerät und wird nirgendwohin hochgeladen:

- Die Live-Daten des Scooters, über Bluetooth LE gelesen (die rohen Antworten, die der Scooter
  zurückschickt).
- Die Einstellungen, die du auf der Seite triffst (offener und legaler MaxSpeed-Wert, Profil-Index).
  Sie leben nur in der offenen Seite während deiner Sitzung.
- Die Wahl von Sprache und Darstellung. Sie liegt im lokalen Speicher deines Browsers und verlässt
  dein Gerät nicht.
- Das Protokoll auf dem Bildschirm. Es lebt nur in der offenen Seite während deiner Sitzung, wird
  nicht hochgeladen.

## Die einzige Netzverbindung

Die Anwendung baut in genau zwei Fällen eine Verbindung auf, in keinem anderen:

### 1. Laden der Seite

Wenn du die Seite öffnest oder neu lädst, holt dein Browser die statischen Dateien vom Anbieter, also
`index.html`, `app.js`, `i18n.js`, `styles.css` und das Symbol. Das ist zum Beispiel GitHub Pages.
Der Anbieter sieht dabei zwei Dinge: deine **IP-Adresse** und welche Datei du abgerufen hast. Das
sind die üblichen Zugriffsprotokolle, die jede Website hat. Er sieht **nie** Daten des Scooters oder
Kommandos. Diese Daten erreichen überhaupt keinen Server. Sie liegen nur auf deinem Gerät und wandern
nur über die lokale Bluetooth-Verbindung, siehe unten.

### 2. Bluetooth LE zum Scooter

Eine lokale Funkverbindung zu deinem Scooter über Web Bluetooth. Das ist keine Internetverbindung,
dafür verlassen keine Daten dein Gerät über das Netz. Die Kommandos und die Antworten, die der
Scooter zurückschickt, laufen ausschließlich zwischen deinem Browser und dem Scooter.

## Kein Backend des Entwicklers oder des Herstellers

Nichts geht an den Entwickler oder an ein Backend des Herstellers. Es gibt kein Konto in einer Cloud
und keinen Server dieses Projekts, der deine Daten annimmt. Zum Vergleich: die Original-App der
neueren VMAX-Modelle meldet dich an und spricht mit einem Backend des Herstellers. Diese Anwendung
tut nichts davon.

## Kontakt

Bei Fragen zum Datenschutz wende dich an den Autor (Laufbursche) auf GitHub:
https://laufbursche42.github.io/Laufbursche42/
