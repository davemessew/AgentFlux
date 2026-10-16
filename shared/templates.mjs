const samples = JSON.stringify([
  { title: "Maintenance request", content: "SYNTHETIC EXAMPLE: Prepare maintenance work. Contact: lea.example@example.org.", priority: "high", department: "Operations" },
  { title: "Documentation", content: "SYNTHETIC EXAMPLE: Review and approve the work instruction.", priority: 'normal', department: "Quality" },
  { title: "Onboarding", content: "SYNTHETIC EXAMPLE: Plan onboarding for new employees.", priority: 'normal', department: "HR" }
], null, 2);

const node = (id, kind, label, config = {}, y = 150) => ({ id, type: 'flux', position: { x: 0, y }, data: { kind, label, config } });
const edge = (source, target, sourceHandle) => ({ id: `${source}-${target}-${sourceHandle || 'out'}`, source, target, ...(sourceHandle ? { sourceHandle } : {}) });
const start = () => node('start', 'trigger', "Start workflow");
const inline = () => node('input', 'source', "Sample requests", { mode: 'inline', text: samples });
function template(id, name, description, category, nodes, edges, requiresModel = false) {
  const placed = nodes.map((n, i) => ({ ...n, position: { ...n.position, x: i * 310 } }));
  return { id, name, description, category, requiresModel,
    workflow: { name, description, category, nodes: placed, edges: edges || placed.slice(1).map((n, i) => edge(placed[i].id, n.id)), policy: { allowCloud: false, redactCloud: true }, schedule: { enabled: false, intervalMinutes: 60 } } };
}

export const BUILTIN_TEMPLATES = [
  template('quick-start', "Clean and save data", "Clean three sample requests, redact contact details and save them locally. No setup required.", "No model needed", [start(), inline(), node('clean', 'transform', "Clean text", { operation: 'clean' }), node('redact', 'redact', "Redact contact details"), node('save', 'store', "Store documents"), node('result', 'output', "Show results")]),
  template('priority-routing', "Route requests by priority", "Store high-priority requests separately. Other requests remain visible in their own output.", "No model needed", [start(), inline(), node('branch', 'condition', "High priority?", { field: 'metadata.priority', operator: 'equals', value: "high" }), node('important', 'store', "Store urgent requests"), node('other', 'output', "Other requests", {}, 380)], [edge('start', 'input'), edge('input', 'branch'), edge('branch', 'important', 'true'), edge('branch', 'other', 'false')]),
  template('field-mapping', "Map JSON fields", "Select fields from a source and convert them to a consistent format.", "No model needed", [start(), inline(), node('fields', 'transform', "Map fields", { operation: 'fields', mapping: { title: 'title', abteilung: 'metadata.department', prioritaet: 'metadata.priority', text: 'content' } }), node('result', 'output', "Output JSON")]),
  template('filter-sort', "Filter and sort data", "Select requests from one department, sort them alphabetically and limit the count.", "No model needed", [start(), inline(), node('filter', 'transform', "Select Operations", { operation: 'filter', field: 'metadata.department', operator: 'equals', value: "Operations" }), node('sort', 'transform', "Sort by title", { operation: 'sort', field: 'title', direction: 'asc' }), node('limit', 'transform', "Limit to ten", { operation: 'limit', limit: 10 }), node('result', 'output', "Filtered requests")]),
  template('knowledge-cleanup', "Organise knowledge base", "Load saved documents, merge identical content and return the results.", "Saved data", [start(), node('library', 'source', "Load documents", { mode: 'library', query: '', limit: 100 }), node('dedupe', 'transform', "Remove duplicates", { operation: 'deduplicate' }), node('clean', 'transform', "Clean content", { operation: 'clean' }), node('result', 'output', "Output documents")]),
  template('folder-import', "Import a folder on a schedule", "Read a configured folder, redact data and save it. Enable the schedule in workflow settings.", "Your data source", [start(), node('source', 'source', "Read folder", { mode: 'connector', connectorId: '' }), node('redact', 'redact', "Redact data"), node('store', 'store', "Save documents")]),
  template('summary', "Summarise documents", "Summarise saved documents with your model and include sources.", "Model required", [start(), node('library', 'source', "Load documents", { mode: 'library', limit: 20 }), node('redact', 'redact', "Redact contact details"), node('model', 'model', "Create summary", { providerId: '', prompt: "Summarise the documents in English. List open tasks, owners and unresolved questions. Cite the sources.", mode: 'batch', temperature: 0.2, maxTokens: 2048 }), node('save', 'store', "Save summary"), node('result', 'output', "Show summary")], undefined, true),
  template('individual-analysis', "Analyse each document", "Create and save a separate analysis for each document. Requires a model connection.", "Model required", [start(), inline(), node('model', 'model', "Analyse request", { providerId: '', prompt: "Identify the task, responsible department and next action. Flag missing details. Answer in English.", mode: 'per-record', temperature: 0.2, maxTokens: 1024 }), node('save', 'store', "Save analyses"), node('result', 'output', "Show analyses")], undefined, true)
];

export const BLOCK_PRESETS = [
  { id: 'start', kind: 'trigger', label: 'Start', description: "Start manually or on a schedule", config: {} },
  { id: 'connector', kind: 'source', label: "Data source", description: "Folder, API or program", config: { mode: 'connector', connectorId: '' } },
  { id: 'inline', kind: 'source', label: "Text and JSON", description: "Edit content directly in the step", config: { mode: 'inline', text: samples } },
  { id: 'library', kind: 'source', label: "Knowledge base", description: "Use saved documents", config: { mode: 'library', query: '', limit: 30 } },
  { id: 'clean', kind: 'transform', label: "Clean text", description: "Tidy whitespace and line breaks", config: { operation: 'clean' } },
  { id: 'deduplicate', kind: 'transform', label: "Remove duplicates", description: "Merge identical content", config: { operation: 'deduplicate' } },
  { id: 'filter', kind: 'transform', label: "Filter records", description: "Pass matching records", config: { operation: 'filter', field: 'content', operator: 'contains', value: '' } },
  { id: 'sort', kind: 'transform', label: "Sort", description: "Order by a field", config: { operation: 'sort', field: 'title', direction: 'asc' } },
  { id: 'limit', kind: 'transform', label: "Limit count", description: "Use the first ten records", config: { operation: 'limit', limit: 10 } },
  { id: 'fields', kind: 'transform', label: "Map fields", description: "Create a custom output format", config: { operation: 'fields', mapping: { title: 'title', text: 'content' } } },
  { id: 'condition', kind: 'condition', label: "Branch", description: "Connect Yes and No outputs", config: { field: 'metadata.priority', operator: 'equals', value: "high" } },
  { id: 'redact', kind: 'redact', label: "Redact information", description: "Replace detected sensitive information", config: {} },
  { id: 'summary', kind: 'model', label: "Summarise", description: "Create an overview with sources", config: { providerId: '', prompt: "Summarise the documents in English. Cite sources and open questions.", mode: 'batch', temperature: 0.2, maxTokens: 2048 } },
  { id: 'extract', kind: 'model', label: "Extract tasks", description: "Analyse each document", config: { providerId: '', prompt: "Extract tasks, owners and deadlines. Flag missing information. Use only the document's contents.", mode: 'per-record', temperature: 0.1, maxTokens: 1024 } },
  { id: 'agent', kind: 'agent', label: "Delegate to agent", description: "Work with tasks, knowledge and skills", config: { agentId: '', prompt: '', skillIds: [], useMemory: true } },
  { id: 'store', kind: 'store', label: "Save locally", description: "Store documents in the knowledge base", config: {} },
  { id: 'output', kind: 'output', label: "Output results", description: "Download full results", config: {} }
];
