# Anleitung

Diese Anleitung führt Schritt für Schritt durch das VMAX new Tool, vom ersten Verbinden über das
Auslesen bis zum Setzen der Drossel. Sie setzt nichts voraus.

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
Hell/Dunkel-Schalter und der Sprachumschaltung DE/EN.

## 2. Verbinden

In der Karte **Verbindung** steht ein Auswahlfeld für das Modell. Es ist nur ein Hinweis, verbunden
wird immer über den Dienst `DA1A1500`. Tippe auf **Verbinden** und wähle deinen Scooter aus der
Geräteliste. Lass beim ersten Mal alle Dienste und Merkmale zu. Nach dem Verbinden steht der Status
auf **verbunden**.

## 3. Merkmale ansehen

Die Karte **Gefundene Merkmale** listet alle Dienste und Merkmale mit ihren Eigenschaften (read,
write, notify). Das Tool abonniert jedes Notify-Merkmal automatisch. Findet es das Schreib-Merkmal
`DA1A160D` nicht, ist der Scooter wahrscheinlich kein neueres Modell.

## 4. Tuning auslesen

Tippe in der Karte **Drossel** auf **Tuning auslesen**. Meldet der Scooter über das Merkmal
`DA1A160C` ein MotorTuning, erscheint es roh im Log. Dieser Schritt verändert nichts. Er zeigt, ob
dein Modell überhaupt ein beschreibbares MaxSpeed führt und welchen Wert und welche Obergrenze es
meldet.

## 5. Drossel setzen

In der Karte **Drossel** stehen zwei Felder und zwei Knöpfe:

- **Offen (MaxSpeed):** der Wert, den **Entsperren** schreibt.
- **Legal (MaxSpeed):** der Wert, den **Sperren** schreibt.
- **Profil-Index:** in der Regel 0. Das Auslesen zeigt den richtigen Index.

Entsperren (Drossel lösen) schreibt den offenen Wert, Sperren (Drossel setzen) den legalen. Beide
schreiben denselben MotorTuning-Befehl nach `DA1A160D`, nur mit anderer Zahl. Vor dem Entsperren
fragt ein Dialog nach.

Wichtig und ehrlich: Die Hersteller-App sendet diesen Befehl nie. Ob der Controller ihn annimmt und
ob MaxSpeed die Drossel wirklich verändert, ist nicht bewiesen. Lies zuerst aus, bleibe innerhalb
der gemeldeten Grenzen und beobachte im Log, wie der Scooter reagiert.

## 6. Log

Die Karte **Protokoll** zeigt jeden gesendeten und empfangenen Frame als Hex. Mit **Log kopieren**
gibst du den Mitschnitt weiter, das hilft, das Protokoll am realen Gerät zu verstehen. **Alle Geräte
scannen** listet Bluetooth-Geräte in der Nähe mit ihren Diensten.

## Wenn etwas nicht klappt

- **Der Scooter taucht nicht in der Liste auf.** Ist er an und in Reichweite? Nutze **Alle Geräte
  scannen**.
- **Kein Notify kommt an.** Prüfe im Log, ob RX-Zeilen erscheinen. Manche Modelle senden erst nach
  einer kurzen Anlaufzeit oder erwarten einen bestimmten Verbindungsaufbau.
- **Der Schreibbefehl bewirkt nichts.** Das kann am fehlenden Handshake liegen oder daran, dass der
  Controller den Befehl nicht kennt. Schick den Log, dann lässt sich der Ablauf nachziehen.

## Recht

Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf. Die ABE erlischt und der Betrieb auf
öffentlichen Wegen ist dann nicht erlaubt. Nutze das Werkzeug nur am eigenen Fahrzeug auf privatem
Gelände und auf eigenes Risiko.
