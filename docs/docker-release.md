# AgentFlux 0.2.0 mit Docker installieren

Das Release enthält ein fertig gebautes Image für **Linux/amd64**. Benötigt werden Docker Engine oder Docker Desktop mit Linux-Containern und das Compose-Plugin. Auf dem Host brauchst du weder Node.js noch pnpm. Ein KI-Modell wird separat angebunden.

## Dateien herunterladen

Öffne [Release v0.2.0](https://github.com/davemessew/AgentFlow/releases/tag/v0.2.0) und lade die gewünschten Dateien in einen neuen Ordner:

| Datei | Zweck |
| --- | --- |
| `agentflux-0.2.0-linux-amd64.tar.gz` | Fertiges Docker-Image mit Anwendung, Oberfläche und Node.js |
| `compose.yaml` | Startkonfiguration mit persistentem Volume |
| `SHA256SUMS.txt` | Prüfsummen der Release-Dateien |
| `INSTALL.md` | Diese Anleitung als lokale Kopie |
| `AgentFlux-0.2.0-source.zip` | Optional: Quellcode zum eigenen Bauen |

## Prüfen und starten

Unter Linux prüft `sha256sum --check --ignore-missing SHA256SUMS.txt` die heruntergeladenen Dateien. Unter PowerShell zeigt `Get-FileHash .\agentflux-0.2.0-linux-amd64.tar.gz -Algorithm SHA256` die Prüfsumme des Images; vergleiche sie mit dem Eintrag in `SHA256SUMS.txt`.

Im Downloadordner:

```sh
docker load -i agentflux-0.2.0-linux-amd64.tar.gz
docker compose up -d --wait
docker compose ps
```

Danach [http://localhost:4310](http://localhost:4310) öffnen. Der Dienst soll als `healthy` angezeigt werden. Ein vorhandener Dienst auf Port 4310 muss vor dem Start gestoppt oder separat konfiguriert werden.

Das Image wird lokal geladen. Die Release-Konfiguration verwendet `pull_policy: never`, damit Docker kein anderes Image aus einer Registry abruft. Laden und Starten funktionieren nach dem Download auch ohne Internet. Externe Anbindungen und Cloud-Modelle benötigen ihre jeweilige Verbindung.

## Daten behalten und sichern

Compose speichert die Anwendungsdaten im benannten Volume `agentflux-data`; Docker setzt standardmässig den Compose-Projektnamen davor. Nutze für Updates denselben Ordner beziehungsweise denselben Compose-Projektnamen. Der Container läuft als Benutzer `node` mit UID 1000.

Für eine konsistente Sicherung den Dienst mit `docker compose stop` anhalten und das vollständige Volume einschliesslich `.vault-key` sichern. Datenbank und Schlüssel gehören zusammen. Anschliessend `docker compose up -d --wait` ausführen.

`docker compose down` entfernt Container und Netzwerk und behält das Volume. **`docker compose down -v` löscht auch die gespeicherten Daten.**

## Aktualisieren

1. Den Dienst stoppen und das Datenvolume sichern.
2. Das neue Image herunterladen, Prüfsumme kontrollieren und mit `docker load -i DATEINAME` laden.
3. Die neue Compose-Datei im bisherigen Projektordner verwenden. Eigene Volumes und Importpfade übernehmen.
4. `docker compose up -d --wait` ausführen und Status sowie Dokumente prüfen.

Für einen Rückwechsel das bisherige Image und dessen Compose-Datei aufbewahren. Ob ein neuerer Datenstand mit einer älteren Version kompatibel ist, hängt von der Version ab. Behalte deshalb die Sicherung vor dem Update.

## Modelle, Ordner und Erreichbarkeit

Ollama auf dem Host ist aus dem Container normalerweise über `http://host.docker.internal:11434` erreichbar. Bei OpenAI-kompatiblen Servern beispielsweise `http://host.docker.internal:1234/v1` eintragen. Der Modellserver muss Verbindungen aus dem Container erlauben.

Zusätzliche Ordner als Volume einbinden und den Containerpfad in `AGENTFLUX_IMPORT_ROOTS` freigeben. Mehrere Pfade mit Semikolon trennen. Beispiele: [Installation](https://github.com/davemessew/AgentFlow/blob/main/docs/installation.md) und [Betrieb](https://github.com/davemessew/AgentFlow/blob/main/docs/operations.md).

Die Standardkonfiguration bindet nur `127.0.0.1:4310`. AgentFlux enthält keine Anmeldung. Für Zugriff von anderen Rechnern sind eine passende Freigabe, Zugangskontrolle und Host-Konfiguration erforderlich.

## Selbst bauen

```sh
git clone https://github.com/davemessew/AgentFlow.git
cd AgentFlow
docker compose up --build -d --wait
```

Das vorgebaute Release wurde auf Linux/amd64 geprüft. Andere Architekturen werden durch dieses Release nicht als getestet ausgewiesen.
