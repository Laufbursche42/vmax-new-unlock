# Anleitung

Diese Anleitung führt Schritt für Schritt durch das VMAX new Tool: verbinden, alle Werte auslesen und die
dokumentierten Einstellungen und die Drossel schreiben. Sie setzt nichts voraus.

**Wichtig vorweg:** Der Schreibbefehl wird gesendet, seine Wirkung ist an echter Hardware aber
unbestätigt. Der Schreibbefehl für die Drossel ist aus der Hersteller-App rekonstruiert, wird von ihr aber
nie selbst gesendet, und kein Controller hat je bestätigt, dass er einen geschriebenen Wert annimmt. Das
Tool sendet die dokumentierten Schreibbefehle auf Anforderung; ob ein echter Controller darauf reagiert,
ist unbestätigt (Hardware-Test steht aus). Auslesen ist bewiesen sicher und funktioniert immer.

## Was du brauchst

- Einen neueren VMAX-E-Scooter aus der App VMAX E-Scooter (VX2, VX4, new VX4, VX8, R40 Pro, R55 Pro).
  Diese Modelle sprechen das GPST-Protokoll KingmeterVmax über den Bluetooth-Dienst `DA1A1500`.
- Einen Browser mit Web Bluetooth: **Chrome** auf Android oder Desktop, **Bluefy** auf dem iPhone.
  Safari hat kein Web Bluetooth.
- Den Scooter an und in Reichweite.

Gehört dein Scooter zur klassischen Reihe (Bluetooth-Name `hw_` oder `zyd_`, App VMAX connect), dann
nimm das [Schwester-Tool vmax-unlock](https://laufbursche42.github.io/vmax-unlock/). Dieses Tool ist nur für die neueren Modelle.

## 1. Seite öffnen

Öffne die Seite im passenden Browser. Oben siehst du den Kopf mit Verbindungsstatus, dem
Hell/Dunkel-Schalter und der Sprachumschaltung DE/EN, darunter den Hinweis-Banner.

## 2. Verbinden

In der Karte **Verbindung** steht ein Auswahlfeld für das Modell. Es ist nur ein Hinweis, verbunden
wird immer über den Dienst `DA1A1500`. Dieses Protokoll braucht **keinen PIN und kein Passwort** - du
wählst nur dein Gerät im Bluetooth-Dialog. Tippe auf **Verbinden** und wähle deinen Scooter aus der
Liste. Lass beim ersten Mal alle Dienste und Merkmale zu. Nach dem Verbinden steht der Status auf
**verbunden**, und die Seite liest automatisch einmal alle lesbaren Merkmale aus.

## 3. Werte ansehen

- Die Karte **Live-Werte** zeigt Geschwindigkeit, Akku, Spannung, Leistung, Temperatur, Limit, Motor,
  Tuning und mehr als Kacheln. Rohwerte ohne gesicherte Einheit sind als solche markiert.
- Die Karte **Einstellungen** zeigt die ausgelesene Konfiguration (Limit, Radgröße, Unterstützung,
  Motor- und Akku-Kenndaten, MotorTuning) und darunter die **Ändern (schreiben)**-Steuerungen für die
  Komfortfunktionen, die die Hersteller-App schreibt (Licht, Unterstützungsstufe, Start-Modus,
  Schiebehilfe, Signalton, Einheiten und mehr). Wert wählen und auf **Setzen** tippen; der Befehl geht als
  SetSetting an `DA1A1A03`, jeweils mit Sicherheitsabfrage.
- Die Karte **Erweiterte Einstellungen** zeigt das vollständige MotorTuning, Akku-Detail, Live-Motor,
  Status, Statistik, Firmware, Seriennummern und Fehlercodes, dazu die Liste aller gefundenen Merkmale.
- **Alles auslesen** liest die Werte erneut, ohne neu zu verbinden.

## 4. Tuning auslesen

In den erweiterten Einstellungen liest **Tuning auslesen** das MotorTuning-Merkmal `DA1A160C`. Meldet der
Scooter ein MotorTuning, erscheinen die Werte in der Anzeige und im Log. Das verändert nichts. Auf den
gemessenen Geräten fehlt dieses Merkmal oft ganz.

## 5. Drossel

Die Karte **Drossel** schreibt MotorTuning an `DA1A160D`. **Entsperren** setzt MaxSpeed auf den offenen
Wert, **Sperren** auf den legalen Wert zurück; beide schreiben denselben MotorTuning-Befehl, ein optionaler
**SpeedCut**-Wert wird mitgeschrieben. MaxSpeed und SpeedCut sind rohe Byte-Werte (Obergrenze 250 und 100).
Vor jedem Schreiben kommt eine Sicherheitsabfrage. Der Befehl wird gesendet, seine Wirkung an einem echten
Controller ist aber unbestätigt - die Hersteller-App sendet ihn nie. Fehlt das Merkmal `DA1A160D` auf dem
Gerät, bleiben die Tasten deaktiviert, weil es dann kein Ziel zum Schreiben gibt.

## 6. Log

Die Karte **Protokoll** zeigt jeden gesendeten und empfangenen Frame als Hex mit Zeitstempel, dazu die
dekodierten Werte. Standardmäßig ist das Log **anonymisiert** (Adressen, Seriennummern und Geräte-IDs
werden geschwärzt), damit du es gefahrlos teilen kannst. Mit **Log kopieren** oder **Als .txt speichern**
gibst du den Mitschnitt weiter, das hilft, das Protokoll am realen Gerät zu verstehen. Das
**Diagnose-Log** schneidet zusätzlich jedes rohe Frame mit. **Alle Geräte scannen** listet Bluetooth-Geräte
in der Nähe mit ihren Diensten.

## Wenn etwas nicht klappt

- **Der Scooter taucht nicht in der Liste auf.** Ist er an und in Reichweite? Nutze **Alle Geräte
  scannen**.
- **Kein Notify kommt an.** Prüfe im Log, ob RX-Zeilen erscheinen. Manche Modelle senden erst nach
  einer kurzen Anlaufzeit.
- **Ein Wert bleibt leer.** Dann meldet der Scooter diesen Wert über Bluetooth nicht. Schick den Log,
  dann lässt sich der Ablauf nachziehen.

## Recht

Das Anheben der Höchstgeschwindigkeit würde die Drossel aufheben. Die ABE erlischt und der Betrieb auf
öffentlichen Wegen ist dann nicht erlaubt. Nutze das Werkzeug nur am eigenen Fahrzeug auf privatem
Gelände und auf eigenes Risiko.
