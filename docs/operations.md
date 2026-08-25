# Betrieb und Konfiguration

## Laufzeit

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Native Bind-Adresse; im Container `0.0.0.0` |
| `PORT` | `4310` | HTTP-Port |
| `AGENTFLUX_DATA_DIR` | `data` im Projekt | SQLite, Schlüssel und Posteingang; im Container `/app/data` |
| `AGENTFLUX_IMPORT_ROOTS` | leer | Zusätzliche freigegebene Ordner, mit Semikolon getrennt |
| `AGENTFLUX_ALLOWED_HOSTS` | leer | Zusätzliche zulässige Hostnamen, mit Komma getrennt; keine Zugangskontrolle |

Die Compose-Datei verwendet ein benanntes Volume. Sein Zielverzeichnis im Image gehört dem Benutzer `node`. Wer stattdessen einen eigenen Host-Ordner einbindet, muss ihn für UID/GID 1000 schreibbar machen. Zusätzliche erlaubte Hostnamen schützen den Dienst nicht vor unbefugtem Zugriff.

## Programm-Anbindungen

Programme laufen auf demselben System wie der AgentFlux-Server. Bei Docker müssen sie im Container vorhanden und unter Linux lauffähig sein. Windows-Programme auf dem Host lassen sich darüber nicht direkt starten.

Eine selbst angelegte Datei `data/programs.json` ersetzt die eingebaute Demo-Freigabeliste. Für die Containerinstallation kann sie beispielsweise enthalten:

```json
{
  "demo-export": {
    "name": "Beispiel-Export",
    "executable": "/usr/local/bin/node",
    "args": ["/app/examples/export-records.mjs"]
  }
}
```

Bei nativer Ausführung absolute Pfade zur lokalen Node-Installation und zum Skript verwenden. Der Wert `programId` der Anbindung verweist auf den Schlüssel in dieser Datei, hier `demo-export`. In den Einstellungen müssen Programm-Anbindungen aktiviert sein.

Die Freigabeliste legt ausführbare Datei und Argumente fest. AgentFlux startet sie mit `shell: false`, schreibt die Eingabedatensätze als JSON nach stdin und liest JSON oder Text aus stdout. Arbeitsverzeichnis ist das Datenverzeichnis. Nach 30 Sekunden oder bei zu grosser Ausgabe wird der Prozess abgebrochen. Programme laufen mit den Rechten des AgentFlux-Prozesses; die Freigabeliste ist keine Sandbox.

## Sicherung

Vor einer Dateisicherung den Dienst stoppen. So passen die SQLite-Datenbank und ihre WAL-Dateien beim Kopieren zusammen. Das vollständige Datenverzeichnis bzw. Docker-Volume sichern, einschliesslich versteckter Dateien und `.vault-key`. Ohne den ursprünglichen Schlüssel lassen sich die gespeicherten API-Zugangsdaten nicht wiederherstellen. Die Sicherung samt Schlüssel daher genauso sorgfältig schützen wie die Zugangsdaten selbst.

Für eine Wiederherstellung den Dienst stoppen, die zusammengehörigen Daten und den Schlüssel zurückspielen, die Schreibrechte für den Dienstbenutzer wiederherstellen und danach starten. `docker compose down -v` entfernt den Datenträger unwiderruflich, sofern keine Sicherung existiert.

## Aktualisieren

Nach Änderungen am Quelltext `docker compose up --build -d` ausführen. Das benannte Datenvolume bleibt bestehen. Nativ zuerst `pnpm install --frozen-lockfile`, dann `pnpm build` ausführen und den Server neu starten.

Zeitpläne werden vom laufenden Server verarbeitet. Ein gestoppter Dienst führt keine Workflows aus. Geplante Läufe mit Programm- oder HTTP-POST-Quellen werden an diesen Schritten abgewiesen; solche Workflows müssen manuell gestartet werden. Die übrigen Schritte können weiterhin Ergebnisse speichern oder freigegebene KI-Modelle aufrufen.

KI-Ausgaben hängen vom gewählten Modell ab; eine konfigurierte Verbindung allein bestätigt weder die Erreichbarkeit noch die Qualität eines Modells.
