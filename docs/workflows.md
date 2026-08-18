# Workflows und Agenten bedienen

## Einen Workflow aus einer Beschreibung erstellen

Unter Vorlagen auf „Auftrag beschreiben“ klicken. Nenne die Quelle, die Verarbeitung und das Ergebnis, zum Beispiel: „Lies die Dokumente aus dem Wissensspeicher, fasse offene Aufgaben zusammen und speichere die Zusammenfassung.“ Wähle einen Modellanschluss. Ein externes Modell benötigt eine Freigabe für die Übertragung.

Der Entwurf öffnet sich im Editor. Fehlende Einstellungen erscheinen rechts und unterhalb der Arbeitsfläche. Die Ausführung beginnt erst mit „Workflow starten“. Dazu wird der aktuelle Ablauf gespeichert.

## Bausteine bearbeiten

Bausteine aus der linken Liste auf die Arbeitsfläche ziehen. Ein Klick fügt einen Baustein hinter der ausgewählten Stelle ein und verbindet ihn, sofern der Anschluss passt. Auf Touch-Geräten die Liste vertikal scrollen oder einen Baustein seitlich auf die Arbeitsfläche ziehen.

Die Anschlüsse verbinden die Schritte von links nach rechts. Bedingungen haben einen Ja- und einen Nein-Ausgang. Eine nicht verbundene Verzweigung gibt ihre Datensätze nicht weiter. Speicher-Schritte können ein Ergebnis ablegen und danach an weitere Schritte übergeben.

Ein Klick auf einen Schritt öffnet seine Einstellungen. Bei Text- und JSON-Quellen lässt sich der Inhalt direkt eingeben. Modell- und Agentenschritte erhalten einen Arbeitsauftrag als Prompt. Modellschritte können die Dokumente gemeinsam oder einzeln verarbeiten.

Die Werkzeugleiste bietet rückgängig, wiederholen, automatisches Anordnen, Duplizieren und Löschen. Die Tastenkürzel sind Ctrl Z, Ctrl Y, Ctrl S und die Löschtaste. Entwürfe bleiben zusätzlich in diesem Browser gespeichert. Ein anderer Browser erhält erst die auf dem Server gespeicherte Fassung.

## Vorlagen und Austausch

Der Vorlagenkatalog enthält Abläufe mit synthetischen Daten, Verarbeitungsschritte für gespeicherte Dokumente sowie Vorlagen für eigene Quellen und Modelle. Mit „Verwenden“ entsteht eine unabhängige Kopie.

In den Workflow-Einstellungen kann der aktuelle Ablauf als eigene Vorlage gespeichert oder als JSON exportiert werden. „JSON importieren“ im Vorlagenbereich erstellt einen neuen Workflow. Externe Freigaben und Zeitpläne sind bei Kopien und Importen zunächst deaktiviert. Quellen und Modelle müssen auf der Zielinstanz vorhanden sein oder neu zugeordnet werden. Zugangsdaten sind nicht Teil eines Workflow-Exports.

## Einen Agenten einrichten

Im Bereich Agenten einen Namen, einen konkreten Auftrag und einen Modellanschluss eintragen. Danach die erlaubten Anbindungen und bei Bedarf vorhandene Skills auswählen. Der Agent verwendet nur diese Quellen. Seine Modell- und Cloudfreigaben werden aus der gespeicherten Konfiguration übernommen.

„Jetzt starten“ beginnt einen vollständigen Zyklus: Ablauf planen, Workflow ausführen und bei aktivierter Lernfunktion Beobachtungen speichern. Der entstandene Workflow kann im Editor geöffnet werden. Ein Agentenschritt innerhalb eines Workflows bearbeitet dagegen nur seine eingehenden Daten und plant keine weiteren Abläufe.

Ein aktiver Zeitplan startet weitere Zyklen im gewählten Intervall. Während ein Zyklus läuft, beginnt für denselben Agenten kein zweiter. „Stoppen“ bricht laufende Planung, Ausführung oder Nachbearbeitung ab. Bereits gespeicherte Daten bleiben erhalten. Zum dauerhaften Pausieren den Zeitplan ausschalten.

## Learnings und Skills

Nach abgeschlossenen Durchläufen kann der Agent Beobachtungen in seiner Wissenssammlung ablegen. Jeder Eintrag verweist auf den zugrunde liegenden Lauf. Neue Einträge sind zunächst unbestätigt. In der Ansicht Learnings können sie geprüft, bestätigt oder entfernt werden. Gespeicherte Beobachtungen dienen als Kontext für spätere Aufgaben und sind keine garantierten Fakten.

Ein Skill ist eine wiederverwendbare Arbeitsanweisung mit Name, Beschreibung und Prompt. Die optionale automatische Skill-Erstellung schlägt solche Anweisungen aus den Ergebnissen vor. Skills lassen sich bearbeiten und passenden Agenten oder Bausteinen zuordnen. Bei aktivierter automatischer Skill-Erstellung kann der Agent eigene Vorschläge in späteren Aufträgen wiederverwenden; sie bleiben als unbestätigt gekennzeichnet. Änderungen werden versioniert. Skills enthalten keine ausführbaren Skripte und ändern keine Freigaben.

## Ergebnisse und Abbruch

Durchläufe zeigen Status, Laufzeit, Fehler und eine kurze Vorschau pro Schritt. Vollständige Ausgaben der Endschritte werden separat gespeichert und können als JSON oder CSV heruntergeladen werden. Wenn ein Ablauf mehr als 500 Ergebnisdatensätze erzeugt, wird die Begrenzung angezeigt. Die gespeicherte Auswahl bleibt herunterladbar. Ergebnisse unterliegen derselben Aufbewahrungsfrist wie der Laufverlauf; Dokumente im Wissensspeicher bleiben bis zur Löschung erhalten.

„Erneut ausführen“ startet den gesamten gespeicherten Ablauf erneut. Quellen werden dabei neu eingelesen und schreibende Schritte erneut ausgeführt. Ein Abbruch setzt bereits ausgeführte Aktionen nicht zurück.

## Grenzen der Ausführung

Workflows haben höchstens 40 Schritte und 100 Verbindungen. Pro Instanz können bis zu vier Workflows gleichzeitig laufen, pro Workflow einer. Ein Durchlauf hat ein Zeitlimit von zehn Minuten. Einzelne Importe und Schritte sind auf 500 Datensätze begrenzt. Im Modus „Jedes Dokument einzeln“ verarbeitet ein Modellschritt höchstens 50 Dokumente.

Modelle und Anbindungen müssen erreichbar und korrekt konfiguriert sein. Ohne Modellanschluss funktionieren die Vorlagen ohne Modell, aber keine Planung, Agentenverarbeitung oder automatische Lernfunktion.

Ein Agentenzyklus umfasst Planung, Ausführung und Lernen. Er ist auf zehn Minuten und 24 Modellaufrufe begrenzt. Die Tokenzählung verwendet die Angaben des Modellservers, ersatzweise das angeforderte Ausgabelimit, und beendet weitere Aufrufe bei ausgeschöpftem Budget von 32.768 Tokens. Dies ist kein genaues Abrechnungslimit für externe Anbieter.
