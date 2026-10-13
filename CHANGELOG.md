# Änderungen

## 0.2.0

### Docker-Release

- Fertiges Linux/amd64-Image mit Node.js und gebauter Web-Oberfläche.
- Compose-Datei zum Starten des heruntergeladenen Images ohne lokalen Build.
- HTTP-Healthcheck für Docker und `docker compose up --wait`.
- Daten bleiben in einem benannten Volume; der Dienst läuft als Benutzer `node`.
- Download-Anleitung, Quellcode-Paket und SHA-256-Prüfsummen im GitHub-Release.

### Anwendung

- Visueller Workflow-Editor mit 17 Bausteinvorlagen, acht Workflows, Undo/Redo und JSON-Import/-Export.
- Agenten mit Aufträgen, Zeitplänen, Learnings und wiederverwendbaren Skills.
- Lokaler Wissensspeicher, Dateiimporte und Anbindungen für Ordner, HTTP und freigegebene Programme.
- Ollama und OpenAI-kompatible Modellserver mit getrennten Freigaben für externe Verarbeitung.
- Ein Syntaxfehler in der Modellanbindung behoben, der den Serverstart verhindert hat.

### Prüfungen

- Containerstart, API und gebaute Oberfläche.
- Healthcheck und Ausführung als Benutzer ohne Root-Rechte.
- Ausführung eines Beispiel-Workflows und Abruf seiner Ergebnisse.
- Datenerhalt von Dokumenten, Durchläufen und Vault-Schlüssel nach Austausch des Containers.
- Antwortverarbeitung für Ollama und OpenAI-kompatible Endpunkte mit lokalen Testantworten.

Die Modelltests verwenden Testantworten. Ein produktiver externer Modellanbieter ist nicht Bestandteil der Release-Prüfung.
