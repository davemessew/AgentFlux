# AgentFlux

AgentFlux verbindet einen visuellen Workflow-Editor mit Agenten, die Aufträge aus einer Beschreibung in ausführbare Abläufe übersetzen. Die Anwendung wird lokal oder als Docker-Container betrieben. Benutzer können vorhandene lokale Modellserver oder externe kompatible APIs anschliessen.

Der Editor enthält eine Bausteinliste, eine verschiebbare Arbeitsfläche und Einstellungen zum ausgewählten Schritt. Acht Workflow-Vorlagen und 17 vorkonfigurierte Bausteine erleichtern den Einstieg. Mehrere Vorlagen verwenden synthetische Daten und benötigen keine externe Verbindung. Eigene Abläufe lassen sich importieren, exportieren, duplizieren und als Vorlage speichern.

Dateien, Ordner, HTTP-Anbindungen, registrierte Programme, direkte Texte und gespeicherte Dokumente sind mögliche Datenquellen. Bausteine bereinigen, filtern, sortieren und maskieren Inhalte. Modellschritte verarbeiten sie mit einem eigenen Prompt. Ergebnisse werden lokal abgelegt und als JSON oder CSV bereitgestellt.

Agenten erhalten einen Auftrag, einen Modellanschluss, erlaubte Datenquellen und einen optionalen Zeitplan. Sie planen Workflows und führen sie aus. Eine Lernfunktion speichert Beobachtungen mit Bezug zum Durchlauf. Wiederverwendbare Skills bestehen aus bearbeitbaren Arbeitsanweisungen. Diese Erinnerungen und Skills können spätere Aufgaben unterstützen; Modellgewichte werden dabei nicht verändert.

Die Anwendung verwendet React, TypeScript, React Flow, Express und SQLite. Die Schrift wird lokal ausgeliefert. API-Zugangsdaten werden mit AES-256-GCM verschlüsselt gespeichert. Externe Modellaufrufe benötigen explizite Freigaben. Regelbasierte Maskierung ersetzt erkannte sensible Angaben, garantiert aber keine vollständige Anonymisierung.

Die Standardkonfiguration ist eine Einzelbenutzerinstanz auf localhost. Sie enthält keine Anmeldung oder Mandantentrennung. Der Container läuft ohne Root-Rechte und verwendet ein dauerhaftes Datenvolume. Installation, Bedienung und Betrieb stehen in README.md und docs/.

AgentFlux steht unter der Apache License 2.0.
