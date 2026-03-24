export const NODE_KINDS = ['trigger', 'source', 'transform', 'condition', 'redact', 'model', 'agent', 'store', 'output'];

export function cleanWorkflow(workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || '',
    category: workflow.category || 'Eigener Workflow',
    nodes: (workflow.nodes || []).map(n => ({
      id: n.id, type: 'flux', position: { x: n.position?.x, y: n.position?.y },
      data: { kind: n.data?.kind, label: n.data?.label, config: structuredClone(n.data?.config || {}) }
    })),
    edges: (workflow.edges || []).map(e => ({
      id: e.id, source: e.source, target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {})
    })),
    policy: { allowCloud: workflow.policy?.allowCloud === true, redactCloud: workflow.policy?.redactCloud !== false },
    schedule: { enabled: workflow.schedule?.enabled === true, intervalMinutes: Number(workflow.schedule?.intervalMinutes) || 60,
      nextRunAt: workflow.schedule?.nextRunAt || null },
    ...(workflow.updatedAt ? { updatedAt: workflow.updatedAt } : {})
  };
}

export function workflowKey(workflow) {
  if (!workflow) return '';
  const { updatedAt, ...value } = cleanWorkflow(workflow);
  delete value.schedule.nextRunAt;
  return JSON.stringify(value);
}

export function canConnect(nodes, edges, connection, ignoredEdgeId) {
  const source = nodes.find(n => n.id === connection.source);
  const target = nodes.find(n => n.id === connection.target);
  if (!source || !target || source.id === target.id || target.data.kind === 'trigger' || source.data.kind === 'output') return false;
  if (source.data.kind === 'condition' && !['true', 'false'].includes(connection.sourceHandle)) return false;
  if (source.data.kind !== 'condition' && connection.sourceHandle) return false;
  const remaining = edges.filter(e => e.id !== ignoredEdgeId);
  if (remaining.some(e => e.source === source.id && e.target === target.id && (e.sourceHandle || '') === (connection.sourceHandle || ''))) return false;
  const pending = [target.id], seen = new Set();
  while (pending.length) {
    const id = pending.pop();
    if (id === source.id) return false;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of remaining) if (edge.source === id) pending.push(edge.target);
  }
  return true;
}

export function workflowIssues(workflow, context = {}) {
  const issues = [], nodes = workflow.nodes || [], edges = workflow.edges || [];
  const add = (message, nodeId) => issues.push({ message, ...(nodeId ? { nodeId } : {}) });
  if (!workflow.name?.trim()) add('Gib dem Workflow einen Namen.');
  if (!nodes.length) { add('Füge einen Start und mindestens einen Verarbeitungsschritt hinzu.'); return issues; }
  const starts = nodes.filter(n => n.data.kind === 'trigger');
  if (starts.length !== 1) add('Ein Workflow braucht genau einen Start.');
  if (nodes.length < 2) add('Verbinde den Start mit einer Datenquelle oder einem Verarbeitungsschritt.');
  const visited = new Set(), pending = starts.map(n => n.id);
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    edges.filter(e => e.source === id).forEach(e => pending.push(e.target));
  }
  for (const edge of edges) if (!canConnect(nodes, edges, edge, edge.id)) add('Eine Verbindung ist doppelt, kreisförmig oder verwendet einen ungültigen Anschluss.', edge.target);
  for (const n of nodes) {
    const c = n.data.config || {}, kind = n.data.kind;
    if (!visited.has(n.id)) add('Dieser Schritt ist nicht mit dem Start verbunden.', n.id);
    if (!n.data.label?.trim()) add('Gib dem Schritt eine Bezeichnung.', n.id);
    if (!NODE_KINDS.includes(kind)) add('Dieser Bausteintyp wird nicht unterstützt.', n.id);
    if (kind === 'source') {
      if (c.mode === 'inline') {
        if (!c.text?.trim()) add('Trage Text oder JSON als Eingabe ein.', n.id);
      } else if (c.mode !== 'library') {
        const connector = context.connectors?.find(item => item.id === c.connectorId);
        if (!c.connectorId || (context.connectors && !connector)) add('Wähle eine vorhandene Datenquelle.', n.id);
        if (connector?.type === 'program' && context.settings && !context.settings.programsEnabled) add('Aktiviere registrierte Programme in den Einstellungen.', n.id);
        if (workflow.schedule?.enabled && (connector?.type === 'program' || connector?.config?.method === 'POST')) add('Programme und POST-Anfragen benötigen einen manuellen Start. Deaktiviere den Zeitplan.', n.id);
      }
    }
    if (kind === 'model') {
      const provider = context.providers?.find(item => item.id === c.providerId);
      if (!c.providerId || (context.providers && !provider)) add('Wähle ein verbundenes Modell.', n.id);
      if (!c.prompt?.trim()) add('Beschreibe den Arbeitsauftrag für das Modell.', n.id);
      if (provider?.scope === 'cloud' && (!workflow.policy?.allowCloud || (context.settings && !context.settings.allowCloud))) add('Dieses externe Modell braucht eine Freigabe im Workflow und in den Einstellungen.', n.id);
    }
    if (kind === 'agent') {
      if (!c.agentId || (context.agents && !context.agents.some(a => a.id === c.agentId))) add('Wähle einen eingerichteten Agenten.', n.id);
    }
    if (kind === 'transform' && c.operation === 'fields') {
      try {
        const mapping = typeof c.mapping === 'string' ? JSON.parse(c.mapping) : c.mapping;
        if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) || Object.values(mapping).some(v => typeof v !== 'string')) throw new Error();
      } catch { add('Trage eine gültige JSON-Feldzuordnung mit Textpfaden ein.', n.id); }
    }
    if (kind === 'condition' || (kind === 'transform' && ['filter', 'sort'].includes(c.operation))) {
      if (!c.field?.trim()) add('Gib das Feld an, etwa metadata.priority.', n.id);
    }
    if (kind === 'condition') {
      if (!edges.some(e => e.source === n.id)) add('Verbinde mindestens einen Ja- oder Nein-Ausgang.', n.id);
    } else if (!['store', 'output'].includes(kind) && !edges.some(e => e.source === n.id)) {
      add('Verbinde diesen Schritt mit einem Folgeschritt oder einer Ausgabe.', n.id);
    }
  }
  return issues;
}

export function cloneWorkflow(workflow, name = workflow.name) {
  const value = cleanWorkflow(workflow);
  const ids = new Map(value.nodes.map(n => [n.id, crypto.randomUUID()]));
  return {
    ...value, id: crypto.randomUUID(), name, updatedAt: undefined,
    policy: { ...value.policy, allowCloud: false },
    schedule: { enabled: false, intervalMinutes: value.schedule.intervalMinutes, nextRunAt: null },
    nodes: value.nodes.map(n => ({ ...n, id: ids.get(n.id) })),
    edges: value.edges.map(e => ({ ...e, id: crypto.randomUUID(), source: ids.get(e.source), target: ids.get(e.target) }))
  };
}

export function arrangeWorkflow(workflow) {
  const depths = new Map(), pending = new Set(workflow.nodes.map(n => n.id));
  for (let pass = 0; pending.size && pass < workflow.nodes.length; pass++) {
    for (const id of [...pending]) {
      const incoming = workflow.edges.filter(e => e.target === id);
      if (incoming.every(e => depths.has(e.source))) {
        depths.set(id, incoming.length ? Math.max(...incoming.map(e => depths.get(e.source))) + 1 : 0);
        pending.delete(id);
      }
    }
  }
  const rows = new Map();
  return { ...workflow, nodes: workflow.nodes.map(n => {
    const column = depths.get(n.id) || 0, row = rows.get(column) || 0;
    rows.set(column, row + 1);
    return { ...n, position: { x: column * 310, y: row * 210 + 100 } };
  }) };
}
