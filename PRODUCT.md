# AgentFlux

AgentFlux ist eine lokal betreibbare Anwendung für visuelle Workflows und selbstständig arbeitende Agenten. Benutzer beschreiben einen Auftrag, verbinden einen Modellserver und wählen die erlaubten Datenquellen. Der Agent erstellt einen Ablauf, führt ihn aus und kann Learnings sowie wiederverwendbare Skills speichern.

Der Workflow-Editor bietet verschiebbare Bausteine, Anschlussprüfung, rückgängig/wiederholen, Vorlagen und JSON-Import. Ordner, HTTP-Dienste, registrierte Programme, direkte Texte und gespeicherte Dokumente dienen als Datenquellen. Modellschritte erhalten einen eigenen Prompt. Ein Agentenschritt kann zusätzlich hinterlegte Skills und Learnings verwenden.

Die Instanz richtet sich an einen Benutzer auf localhost. Modellanschlüsse unterstützen Ollama und kompatible Chat-APIs. Externe Datenübertragung ist standardmässig gesperrt. Dokumente und Ergebnisse liegen in SQLite, Zugangsdaten werden lokal verschlüsselt gespeichert.

Zeitpläne laufen, solange der Server aktiv ist. Agenten können lesen, verarbeiten und lokal speichern. Skills sind bearbeitbare Arbeitsanweisungen. Learnings sind gespeicherte Beobachtungen mit Bezug zum jeweiligen Durchlauf und verändern keine Modellgewichte.
