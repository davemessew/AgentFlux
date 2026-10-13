# AgentFlux

AgentFlux führt beschriebene Aufgaben als visuelle Workflows aus. Agenten können passende Abläufe erstellen, nach Zeitplan arbeiten und Learnings sowie wiederverwendbare Skills speichern. Die Anwendung läuft auf dem eigenen Rechner oder in Docker.

Der Editor enthält 17 vorkonfigurierte Bausteine und acht Workflow-Vorlagen. Quellen lassen sich mit Maus oder Touch auf die Arbeitsfläche ziehen und verbinden. Änderungen können rückgängig gemacht werden; eigene Abläufe lassen sich duplizieren, als Vorlage speichern und als JSON importieren oder exportieren.

## Mit Docker starten

Docker mit Compose wird vorausgesetzt. Im Projektordner ausführen:

```sh
docker compose up --build -d
```

Danach `http://127.0.0.1:4310` öffnen. Das Image heisst `agentflux:local`. Port 4310 ist nur vom eigenen Rechner aus erreichbar. Der Server läuft im Container als Benutzer `node`; seine Daten bleiben im benannten Volume `agentflux-data` erhalten.

```sh
docker compose logs -f agentflux
docker compose stop
```

`docker compose down` entfernt den Container und das Netzwerk, behält aber die Daten. `docker compose down -v` löscht auch das Datenvolume.

## Ohne Docker starten

Node.js 24 oder neuer und pnpm 11.25.0 installieren. Im Projektordner:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Alternativ unter Windows `./start.ps1`, unter macOS/Linux `sh ./start.sh` ausführen. Beide Skripte installieren die festgeschriebenen Abhängigkeiten, bauen die Oberfläche und starten den Server. Für die Entwicklung: `pnpm dev`. Dabei läuft Vite auf Port 5173 und der API-Server auf Port 4310.

## Erste Schritte

1. Unter **Vorlagen** den Ablauf **Daten bereinigen und speichern** öffnen. Er verwendet synthetische Aufträge und benötigt keinen Modellserver. Mit **Workflow starten** ausführen und die Ergebnisse im Durchlauf öffnen.
2. Unter **Modelle** einen vorhandenen Modellserver verbinden. Voreinstellungen für Ollama, LM Studio und vLLM berücksichtigen den Docker-Betrieb. Modell-ID und gegebenenfalls Zugangsdaten eintragen.
3. Unter **Agenten** einen Agenten anlegen: Auftrag beschreiben, Modell und erlaubte Datenquellen wählen, anschliessend speichern und starten. Der Agent plant einen Workflow und führt ihn aus. Für wiederkehrende Aufgaben einen Zeitplan aktivieren.
4. Alternativ unter **Vorlagen > Auftrag beschreiben** einen einmaligen Workflow erstellen lassen. Der Entwurf lässt sich vor dem Start im Editor bearbeiten.

Das Sprachmodell wird separat betrieben. AgentFlux kann einen vorhandenen lokalen Modellserver oder einen externen Anbieter ansprechen. Für externe Anbieter wird meist ein eigener API-Schlüssel benötigt.

| Modellserver | Native Installation | AgentFlux in Docker |
| --- | --- | --- |
| Ollama auf dem Host | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |
| OpenAI-kompatibler Server auf dem Host | z. B. `http://127.0.0.1:1234/v1` | z. B. `http://host.docker.internal:1234/v1` |

Compose richtet `host.docker.internal` ein. Der Modellserver muss Verbindungen aus dem Container annehmen können. Falls er nur auf `127.0.0.1` lauscht, kann dafür eine Anpassung seiner Netzwerkeinstellungen nötig sein. Als Modell-ID den Namen eines verfügbaren Modells eintragen. Bei OpenAI-kompatiblen Servern gehört `/v1` in die Basis-URL, wenn der Server diesen Pfad verwendet.

## Dateien und Anbindungen

Unterstützt werden TXT, MD, CSV, JSON, JSONL, HTML, XML, PDF, DOCX und XLSX. PDFs benötigen auslesbaren Text; OCR ist nicht enthalten. Der Import begrenzt Dateien und HTTP-Antworten auf 12 MB sowie einen Import auf 500 Datensätze. Ordnerquellen lesen bis zu 40 passende Dateien aus dem gewählten Ordner, ohne Unterordner zu durchsuchen.

Ordnerquellen dürfen standardmässig auf `data/inbox` zugreifen. Weitere Wurzelverzeichnisse werden über `AGENTFLUX_IMPORT_ROOTS` freigegeben, getrennt durch Semikolon. Unter PowerShell zum Beispiel:

```powershell
$env:AGENTFLUX_IMPORT_ROOTS = 'C:\Dokumente;D:\Exporte'
pnpm start
```

Für Docker müssen die Ordner zusätzlich in den Container eingebunden werden. Ein Beispiel für `compose.override.yaml`:

```yaml
services:
  agentflux:
    environment:
      AGENTFLUX_IMPORT_ROOTS: /imports
    volumes:
      - ./imports:/imports:ro
```

Den Host-Ordner `imports` vorher anlegen und in der Oberfläche `/imports` als Quellpfad verwenden. Mehrere Containerpfade ebenfalls mit Semikolon trennen. Host-Pfade allein sind innerhalb eines Containers nicht erreichbar.

HTTP-Anbindungen unterstützen GET und POST. Zugangsdaten gehören in das verschlüsselt gespeicherte Bearer-Token-Feld; zusätzliche Header mit Namen wie `Authorization`, `Cookie`, `Token`, `Secret` oder `API-Key` werden abgewiesen. Programm-Anbindungen lesen eine feste Freigabeliste aus `data/programs.json` und müssen zusätzlich in den Einstellungen aktiviert werden. Zeitpläne sind auf lesende Quellen begrenzt; Programme und HTTP-POST-Quellen benötigen einen manuellen Start. Details und ein Beispiel stehen in [docs/operations.md](operations.md).

## Daten und Grenzen

Die mitgelieferte Konfiguration betreibt eine Einzelbenutzerinstanz auf localhost. Sie enthält keine Anmeldung, Benutzerrollen oder Mandantentrennung. Ein gemeinsam oder öffentlich erreichbarer Betrieb benötigt eine vorgeschaltete Zugangskontrolle und eine passende Netzwerkfreigabe.

Bevor ein Workflow Daten an ein externes KI-Modell oder per HTTP-POST an externe Adressen versendet, muss der Versand an zwei Stellen freigegeben sein: in den allgemeinen Einstellungen und im Workflow. HTTP-GET-Anfragen an externe Server sind auch ohne diese Freigaben möglich. Dabei können Angaben in der URL und in eigenen Headern übertragen werden.

Die optionale Maskierung sucht nach E-Mail-Adressen, bestimmten Schweizer Telefonnummern, AHV-Nummern, Schweizer IBANs und selbst hinterlegten Begriffen. Dafür verwendet sie reguläre Ausdrücke. Diese können Angaben übersehen oder harmlose Inhalte verändern. Die Maskierung gewährleistet weder vollständige Anonymisierung noch die Einhaltung von Datenschutzvorschriften. Vor dem Einsatz mit vertraulichen Daten müssen die Erkennung und die ausgehenden Inhalte geprüft werden. Auch KI-Ergebnisse brauchen eine fachliche Prüfung.

API-Schlüssel und Verbindungstoken werden mit AES-256-GCM verschlüsselt in SQLite gespeichert. Der dazugehörige Schlüssel liegt daneben in `data/.vault-key`. Wer das gesamte Datenverzeichnis lesen kann, kann daher auch diese Zugangsdaten entschlüsseln. Dokumente, Workflow-Daten und Laufprotokolle liegen unverschlüsselt vor. Bei einer Sicherung müssen die Datenbank und `.vault-key` gemeinsam aufbewahrt werden; siehe [docs/operations.md](operations.md).

## Workflows und Agenten

Die Bausteine lesen Daten ein, bereinigen Texte, ordnen Felder zu, filtern und sortieren Datensätze, verzweigen nach Bedingungen, maskieren Angaben, rufen Modelle oder eingerichtete Agenten auf und speichern Ergebnisse. Modellschritte enthalten einen eigenen Prompt und verarbeiten die Dokumente zusammen oder einzeln. Agentenschritte verwenden bei Bedarf gespeicherte Learnings und ausgewählte Skills.

Unvollständige Workflows können als Entwurf gespeichert werden. Vor der Ausführung meldet die Anwendung fehlende Quellen, Modelle und Verbindungen. Kreisförmige Verbindungen sind ausgeschlossen. Ein laufender Workflow kann abgebrochen werden; bereits abgeschlossene Schreibvorgänge bleiben erhalten. Die Ergebnisse stehen getrennt vom Laufprotokoll als JSON und CSV bereit. Ein erneuter Start führt den gesamten Ablauf noch einmal aus.

Ein Agent erstellt für seinen Auftrag einen neuen Workflow aus vorhandenen Bausteinen. Seine Quellen und Freigaben kommen aus der gespeicherten Konfiguration. Selbstständig geplante Abläufe verwenden lesende Anbindungen; Programmstarts und HTTP-POST gehören in ausdrücklich eingerichtete manuelle Workflows.

Learnings werden als Beobachtungen mit Bezug auf einen Durchlauf gespeichert. Sie sind in der Anwendung einsehbar, bestätigbar und löschbar. Das Lernen verändert keine Modellgewichte. Skills bestehen aus wiederverwendbaren Arbeitsanweisungen und können bearbeitet und für weitere Aufträge ausgewählt werden. Sie führen keinen eigenen Programmcode aus und erweitern keine Berechtigungen.

Zeitpläne benötigen einen laufenden Server. Laufende Aufgaben desselben Agenten oder Workflows überlappen nicht. Planungs-, Ausführungs- und Lernfehler werden getrennt angezeigt. Die Bedienelemente und Abläufe sind in [docs/workflows.md](workflows.md) beschrieben.

## Projektstruktur

- `src`: Web-Oberfläche und visueller Editor
- `shared`: Workflow-Regeln und Vorlagen
- `server`: API, Ausführung, Agenten, Anbindungen und Speicherung
- `examples`: registrierbarer lokaler Programm-Export
- `docs`: Bedienung und Betrieb

## Lizenz

AgentFlux steht unter der Apache License 2.0; der vollständige Text liegt in [LICENSE](LICENSE). Abhängigkeiten behalten ihre jeweiligen Lizenzen.
