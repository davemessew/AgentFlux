const samples = JSON.stringify([
  { title: 'Wartungsauftrag', content: 'SYNTHETISCHES BEISPIEL: Wartung vorbereiten. Kontakt: lea.beispiel@example.org.', priority: 'hoch', department: 'Betrieb' },
  { title: 'Dokumentation', content: 'SYNTHETISCHES BEISPIEL: Arbeitsanweisung überarbeiten und freigeben.', priority: 'normal', department: 'Qualität' },
  { title: 'Einführung', content: 'SYNTHETISCHES BEISPIEL: Einführung für neue Mitarbeitende planen.', priority: 'normal', department: 'Personal' }
], null, 2);

const node = (id, kind, label, config = {}, y = 150) => ({ id, type: 'flux', position: { x: 0, y }, data: { kind, label, config } });
const edge = (source, target, sourceHandle) => ({ id: `${source}-${target}-${sourceHandle || 'out'}`, source, target, ...(sourceHandle ? { sourceHandle } : {}) });
const start = () => node('start', 'trigger', 'Workflow starten');
const inline = () => node('input', 'source', 'Beispielaufträge', { mode: 'inline', text: samples });
function template(id, name, description, category, nodes, edges, requiresModel = false) {
  const placed = nodes.map((n, i) => ({ ...n, position: { ...n.position, x: i * 310 } }));
  return { id, name, description, category, requiresModel,
    workflow: { name, description, category, nodes: placed, edges: edges || placed.slice(1).map((n, i) => edge(placed[i].id, n.id)), policy: { allowCloud: false, redactCloud: true }, schedule: { enabled: false, intervalMinutes: 60 } } };
}

export const BUILTIN_TEMPLATES = [
  template('quick-start', 'Daten bereinigen und speichern', 'Drei synthetische Aufträge bereinigen, Kontaktdaten maskieren und lokal ablegen. Ohne Einrichtung nutzbar.', 'Ohne Modell', [start(), inline(), node('clean', 'transform', 'Text bereinigen', { operation: 'clean' }), node('redact', 'redact', 'Kontaktdaten maskieren'), node('save', 'store', 'Dokumente ablegen'), node('result', 'output', 'Ergebnisse anzeigen')]),
  template('priority-routing', 'Aufträge nach Priorität verteilen', 'Hohe Priorität getrennt ablegen. Alle übrigen Aufträge bleiben in einer eigenen Ausgabe sichtbar.', 'Ohne Modell', [start(), inline(), node('branch', 'condition', 'Hohe Priorität?', { field: 'metadata.priority', operator: 'equals', value: 'hoch' }), node('important', 'store', 'Dringende Aufträge speichern'), node('other', 'output', 'Übrige Aufträge', {}, 380)], [edge('start', 'input'), edge('input', 'branch'), edge('branch', 'important', 'true'), edge('branch', 'other', 'false')]),
  template('field-mapping', 'JSON-Felder zuordnen', 'Felder aus einer Datenquelle auswählen und in ein einheitliches Format bringen.', 'Ohne Modell', [start(), inline(), node('fields', 'transform', 'Felder zuordnen', { operation: 'fields', mapping: { title: 'title', abteilung: 'metadata.department', prioritaet: 'metadata.priority', text: 'content' } }), node('result', 'output', 'JSON ausgeben')]),
  template('filter-sort', 'Daten filtern und sortieren', 'Aufträge einer Abteilung auswählen, alphabetisch sortieren und die Anzahl begrenzen.', 'Ohne Modell', [start(), inline(), node('filter', 'transform', 'Betrieb auswählen', { operation: 'filter', field: 'metadata.department', operator: 'equals', value: 'Betrieb' }), node('sort', 'transform', 'Nach Titel sortieren', { operation: 'sort', field: 'title', direction: 'asc' }), node('limit', 'transform', 'Auf zehn begrenzen', { operation: 'limit', limit: 10 }), node('result', 'output', 'Gefilterte Aufträge')]),
  template('knowledge-cleanup', 'Wissensspeicher aufbereiten', 'Gespeicherte Dokumente laden, identische Inhalte zusammenführen und als Ergebnis bereitstellen.', 'Gespeicherte Daten', [start(), node('library', 'source', 'Dokumente laden', { mode: 'library', query: '', limit: 100 }), node('dedupe', 'transform', 'Duplikate entfernen', { operation: 'deduplicate' }), node('clean', 'transform', 'Inhalte bereinigen', { operation: 'clean' }), node('result', 'output', 'Dokumente ausgeben')]),
  template('folder-import', 'Ordner regelmässig einlesen', 'Eine eingerichtete Ordnerquelle einlesen, maskieren und speichern. Den Zeitplan kannst du in den Einstellungen aktivieren.', 'Eigene Datenquelle', [start(), node('source', 'source', 'Ordner einlesen', { mode: 'connector', connectorId: '' }), node('redact', 'redact', 'Daten maskieren'), node('store', 'store', 'Dokumente speichern')]),
  template('summary', 'Dokumente zusammenfassen', 'Gespeicherte Dokumente mit deinem Modell zu einer Zusammenfassung mit Quellen zusammenführen.', 'Mit Modell', [start(), node('library', 'source', 'Dokumente laden', { mode: 'library', limit: 20 }), node('redact', 'redact', 'Kontaktdaten maskieren'), node('model', 'model', 'Zusammenfassung erstellen', { providerId: '', prompt: 'Fasse die Dokumente auf Deutsch zusammen. Nenne offene Aufgaben, Zuständigkeiten und ungeklärte Fragen. Gib die Quellen an.', mode: 'batch', temperature: 0.2, maxTokens: 2048 }), node('save', 'store', 'Zusammenfassung speichern'), node('result', 'output', 'Zusammenfassung anzeigen')], undefined, true),
  template('individual-analysis', 'Jedes Dokument einzeln auswerten', 'Für jedes Dokument eine eigene Auswertung erstellen und speichern. Benötigt einen Modellanschluss.', 'Mit Modell', [start(), inline(), node('model', 'model', 'Auftrag auswerten', { providerId: '', prompt: 'Nenne die Aufgabe, die zuständige Abteilung und die nächste konkrete Handlung. Falls Angaben fehlen, benenne sie. Antworte auf Deutsch.', mode: 'per-record', temperature: 0.2, maxTokens: 1024 }), node('save', 'store', 'Auswertungen speichern'), node('result', 'output', 'Auswertungen anzeigen')], undefined, true)
];

export const BLOCK_PRESETS = [
  { id: 'start', kind: 'trigger', label: 'Start', description: 'Ablauf manuell oder nach Zeitplan starten', config: {} },
  { id: 'connector', kind: 'source', label: 'Datenquelle', description: 'Ordner, API oder Programm', config: { mode: 'connector', connectorId: '' } },
  { id: 'inline', kind: 'source', label: 'Text und JSON', description: 'Inhalt direkt im Schritt bearbeiten', config: { mode: 'inline', text: samples } },
  { id: 'library', kind: 'source', label: 'Wissensspeicher', description: 'Gespeicherte Dokumente verwenden', config: { mode: 'library', query: '', limit: 30 } },
  { id: 'clean', kind: 'transform', label: 'Text bereinigen', description: 'Leerzeichen und Zeilenumbrüche ordnen', config: { operation: 'clean' } },
  { id: 'deduplicate', kind: 'transform', label: 'Duplikate entfernen', description: 'Identische Inhalte zusammenführen', config: { operation: 'deduplicate' } },
  { id: 'filter', kind: 'transform', label: 'Datensätze filtern', description: 'Nur passende Einträge weitergeben', config: { operation: 'filter', field: 'content', operator: 'contains', value: '' } },
  { id: 'sort', kind: 'transform', label: 'Sortieren', description: 'Nach einem Feld anordnen', config: { operation: 'sort', field: 'title', direction: 'asc' } },
  { id: 'limit', kind: 'transform', label: 'Anzahl begrenzen', description: 'Die ersten zehn Einträge verwenden', config: { operation: 'limit', limit: 10 } },
  { id: 'fields', kind: 'transform', label: 'Felder zuordnen', description: 'Ein eigenes Ausgabeformat erstellen', config: { operation: 'fields', mapping: { title: 'title', text: 'content' } } },
  { id: 'condition', kind: 'condition', label: 'Verzweigen', description: 'Ja- und Nein-Ausgang verbinden', config: { field: 'metadata.priority', operator: 'equals', value: 'hoch' } },
  { id: 'redact', kind: 'redact', label: 'Angaben maskieren', description: 'Erkannte sensible Angaben ersetzen', config: {} },
  { id: 'summary', kind: 'model', label: 'Zusammenfassen', description: 'Einen Überblick mit Quellen erstellen', config: { providerId: '', prompt: 'Fasse die Dokumente auf Deutsch zusammen. Nenne die Quellen und offene Fragen.', mode: 'batch', temperature: 0.2, maxTokens: 2048 } },
  { id: 'extract', kind: 'model', label: 'Aufgaben herauslesen', description: 'Jedes Dokument einzeln auswerten', config: { providerId: '', prompt: 'Extrahiere Aufgaben, Zuständigkeiten und Termine. Nenne fehlende Angaben. Verwende nur Informationen aus dem Dokument.', mode: 'per-record', temperature: 0.1, maxTokens: 1024 } },
  { id: 'agent', kind: 'agent', label: 'Agent beauftragen', description: 'Mit Auftrag, Wissen und Skills arbeiten', config: { agentId: '', prompt: '', skillIds: [], useMemory: true } },
  { id: 'store', kind: 'store', label: 'Lokal speichern', description: 'Dokumente im Wissensspeicher ablegen', config: {} },
  { id: 'output', kind: 'output', label: 'Ergebnis ausgeben', description: 'Vollständige Ergebnisse herunterladen', config: {} }
];
