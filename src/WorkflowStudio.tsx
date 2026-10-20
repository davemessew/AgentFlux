import { useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, applyNodeChanges, applyEdgeChanges, BackgroundVariant } from '@xyflow/react';
import { Plus, Search, Undo2, Redo2, LayoutGrid, Copy, Trash2, PanelRightClose, PanelRightOpen, AlertCircle, CheckCircle2, MousePointer2, Workflow } from 'lucide-react';
import { BLOCK_PRESETS } from '../shared/templates.mjs';
import { arrangeWorkflow, canConnect, workflowIssues, workflowKey } from '../shared/workflow.mjs';

type Item = Record<string, any>;
export default function WorkflowStudio({ workflow, onChange, data, currentRun, kinds, nodeTypes, NodeFields }: any) {
  const flow = useReactFlow();
  const canvas = useRef<HTMLDivElement>(null);
  const latest = useRef(workflow);
  latest.current = workflow;
  const undo = useRef<Item[]>([]), redo = useRef<Item[]>([]);
  const [, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [library, setLibrary] = useState(true);
  const [inspector, setInspector] = useState(() => window.innerWidth >= 1100);
  const [notice, setNotice] = useState('');
  const [ghost, setGhost] = useState<Item | null>(null);
  const pointer = useRef<Item | null>(null);
  const skipClick = useRef(false), reconnecting = useRef<string | undefined>(undefined);
  const lastEdit = useRef({ key: '', time: 0 });
  const selectedNode = workflow.nodes.find((n: Item) => n.id === selected);
  const issues = workflowIssues(workflow, data);

  function remember(value: Item, group = '') {
    const now = Date.now();
    if (group && lastEdit.current.key === group && now - lastEdit.current.time < 600) {
      lastEdit.current.time = now; return;
    }
    lastEdit.current = { key: group, time: now };
    if (!undo.current.length || workflowKey(undo.current.at(-1)) !== workflowKey(value)) undo.current.push(structuredClone(value));
    undo.current = undo.current.slice(-60); redo.current = []; setRevision(v => v + 1);
  }
  function commit(update: (w: Item) => Item, group = '', record = true) {
    if (record) remember(latest.current, group);
    latest.current = update(latest.current);
    onChange((previous: Item) => update(previous));
  }
  function travel(back: boolean) {
    const from = back ? undo : redo, to = back ? redo : undo;
    const value = from.current.pop(); if (!value) return;
    to.current.push(structuredClone(latest.current));
    latest.current = value; onChange(value); setRevision(v => v + 1); setSelected(null);
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault(); travel(event.key.toLowerCase() === 'z' && !event.shiftKey);
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  function create(preset: Item, position?: Item) {
    if (latest.current.nodes.length >= 40) { setNotice('Ein Workflow kann höchstens 40 Schritte enthalten.'); return; }
    if (preset.kind === 'trigger' && latest.current.nodes.some((n: Item) => n.data.kind === 'trigger')) {
      setNotice('Der Workflow hat bereits einen Start.'); return;
    }
    const anchor = latest.current.nodes.find((n: Item) => n.id === selected);
    const rect = canvas.current?.getBoundingClientRect();
    const config = structuredClone(preset.config);
    if (preset.kind === 'model' && data.providers.length === 1) config.providerId = data.providers[0].id;
    if (preset.kind === 'agent' && data.agents?.length === 1) config.agentId = data.agents[0].id;
    const id = crypto.randomUUID(), edgeId = crypto.randomUUID();
    const newNode = { id, type: 'flux', position: position || (anchor ? { x: anchor.position.x + 310, y: anchor.position.y } : flow.screenToFlowPosition({ x: (rect?.left || 0) + (rect?.width || 700) / 2, y: (rect?.top || 0) + (rect?.height || 400) / 2 })), data: { kind: preset.kind, label: preset.label, config } };
    commit(w => {
      const nodes = [...w.nodes, newNode];
      const connection = { id: edgeId, source: anchor?.id, target: id, ...(anchor?.data.kind === 'condition' ? { sourceHandle: 'true' } : {}) };
      return { ...w, nodes, edges: !position && anchor && canConnect(nodes, w.edges, connection) ? [...w.edges, connection] : w.edges };
    });
    setNotice(''); setSelected(id); setInspector(true);
    if (!position) requestAnimationFrame(() => flow.fitView({ padding: 0.2, duration: 250, maxZoom: 1 }));
  }
  function removeSelected() {
    if (!selected) return;
    commit(w => ({ ...w, nodes: w.nodes.filter((n: Item) => n.id !== selected), edges: w.edges.filter((e: Item) => e.source !== selected && e.target !== selected) }));
    setSelected(null);
  }
  function duplicateSelected() {
    if (!selectedNode || selectedNode.data.kind === 'trigger') return;
    create({ kind: selectedNode.data.kind, label: selectedNode.data.label, config: selectedNode.data.config }, { x: selectedNode.position.x + 40, y: selectedNode.position.y + 190 });
  }
  const updateConfig = (patch: Item) => commit(w => ({ ...w, nodes: w.nodes.map((n: Item) => n.id === selected ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } } : n) }), `config:${selected}`);
  const presets = BLOCK_PRESETS.filter(p => `${p.label} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  const nodes = workflow.nodes.map((n: Item) => {
    const step = currentRun?.steps.find((s: Item) => s.nodeId === n.id), config = n.data.config || {};
    let subtitle = kinds[n.data.kind]?.description;
    if (n.data.kind === 'source') subtitle = config.mode === 'inline' ? 'Text oder JSON im Schritt' : config.mode === 'library' ? 'Lokaler Wissensspeicher' : data.connectors.find((c: Item) => c.id === config.connectorId)?.name || 'Quelle auswählen';
    if (n.data.kind === 'model') subtitle = data.providers.find((p: Item) => p.id === config.providerId)?.name || 'Modell auswählen';
    if (n.data.kind === 'agent') subtitle = data.agents?.find((a: Item) => a.id === config.agentId)?.name || 'Agent auswählen';
    return { ...n, selected: n.id === selected, data: { ...n.data, subtitle, runStatus: step?.status, durationMs: step?.durationMs, outputCount: step?.outputCount, needsConfig: issues.some((i: Item) => i.nodeId === n.id) } };
  });
  return <div className="studio-workspace">
    <div className={`node-library ${!library ? 'collapsed' : ''}`}>
      <div className="library-heading"><strong>Bausteine</strong><button className="icon-button" onClick={() => setLibrary(!library)} aria-label="Bausteinliste umschalten"><PanelRightClose size={16}/></button></div>
      {library && <><p>Ziehen oder anklicken. Ein Klick fügt den Baustein hinter der Auswahl ein.</p><div className="palette-search"><Search size={14}/><input aria-label="Bausteine suchen" value={query} onChange={e => setQuery(e.target.value)} placeholder="Baustein suchen"/></div>
        <div className="library-items">{presets.map(preset => { const kind = kinds[preset.kind], Icon = kind.icon; return <button key={preset.id} className="library-node" style={{ touchAction: 'pan-y' }}
          onPointerDown={e => { if (e.button !== 0) return; skipClick.current = false; pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, preset, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { const drag = pointer.current; if (!drag || drag.id !== e.pointerId) return; if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (drag.moved) { setGhost({ x: e.clientX, y: e.clientY, label: preset.label }); e.preventDefault(); } }}
          onPointerUp={e => { const drag = pointer.current; pointer.current = null; setGhost(null); if (!drag) return; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if (drag.moved) { skipClick.current = true; const rect = canvas.current?.getBoundingClientRect(); if (rect && document.elementFromPoint(e.clientX, e.clientY)?.closest('.flow-container') && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) create(drag.preset, flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })); } }}
          onPointerCancel={() => { pointer.current = null; setGhost(null); skipClick.current = true; }}
          onClick={() => { if (skipClick.current) { skipClick.current = false; return; } create(preset); }}>
          <span className={`icon-box ${kind.color}`}><Icon size={18}/></span><span><strong>{preset.label}</strong><small>{preset.description}</small></span><Plus size={13}/></button>; })}</div>
        {!presets.length && <p>Kein passender Baustein.</p>}</>}
    </div>
    <div ref={canvas} className="flow-container" onDragOver={e => { if (e.dataTransfer.types.includes('application/agentflux')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('application/agentflux'); const preset = BLOCK_PRESETS.find(p => p.id === id || p.kind === id); if (preset) create(preset, flow.screenToFlowPosition({ x: e.clientX, y: e.clientY })); }}>
      <div className="canvas-tools" role="toolbar" aria-label="Workflow bearbeiten">
        <button title="Rückgängig (Ctrl Z)" aria-label="Rückgängig" disabled={!undo.current.length} onClick={() => travel(true)}><Undo2 size={16}/></button>
        <button title="Wiederholen (Ctrl Y)" aria-label="Wiederholen" disabled={!redo.current.length} onClick={() => travel(false)}><Redo2 size={16}/></button>
        <button title="Schritte anordnen" onClick={() => { commit(arrangeWorkflow); requestAnimationFrame(() => flow.fitView({ padding: 0.18, duration: 250, maxZoom: 1 })); }}><LayoutGrid size={16}/><span>Anordnen</span></button>
        <button title="Auswahl duplizieren" aria-label="Auswahl duplizieren" disabled={!selectedNode || selectedNode.data.kind === 'trigger'} onClick={duplicateSelected}><Copy size={16}/></button>
        <button title="Auswahl löschen" aria-label="Auswahl löschen" disabled={!selectedNode} onClick={removeSelected}><Trash2 size={16}/></button>
      </div>
      <ReactFlow nodes={nodes} edges={workflow.edges.map((e: Item) => ({ ...e, type: 'smoothstep', animated: currentRun?.status === 'running', label: e.sourceHandle === 'true' ? 'Ja' : e.sourceHandle === 'false' ? 'Nein' : undefined, style: { stroke: '#8995b4', strokeWidth: 1.8 } }))} nodeTypes={nodeTypes}
        onNodesChange={changes => { const meaningful = changes.filter(c => c.type !== 'select'); if (!meaningful.length) return; commit(w => { const next = applyNodeChanges(meaningful, w.nodes), ids = new Set(next.map(n => n.id)); return { ...w, nodes: next, edges: w.edges.filter((e: Item) => ids.has(e.source) && ids.has(e.target)) }; }, 'position', meaningful.some(c => c.type === 'remove')); }}
        onNodeDragStart={() => remember(latest.current)}
        onEdgesChange={changes => commit(w => ({ ...w, edges: applyEdgeChanges(changes, w.edges) }), '', changes.some(c => c.type === 'remove'))}
        isValidConnection={connection => canConnect(latest.current.nodes, latest.current.edges, connection, reconnecting.current)}
        onConnect={connection => { if (!canConnect(latest.current.nodes, latest.current.edges, connection)) return; const edge = { ...connection, id: crypto.randomUUID() }; commit(w => ({ ...w, edges: [...w.edges, edge] })); }}
        onReconnectStart={(_event, edge) => { reconnecting.current = edge.id; }}
        onReconnect={(edge, connection) => { if (canConnect(latest.current.nodes, latest.current.edges, connection, edge.id)) commit(w => ({ ...w, edges: w.edges.map((e: Item) => e.id === edge.id ? { ...e, ...connection } : e) })); }}
        onReconnectEnd={() => { reconnecting.current = undefined; }}
        onNodeClick={(_event, node) => { setSelected(node.id); setInspector(true); }} onPaneClick={() => setSelected(null)}
        fitView fitViewOptions={{ padding: 0.2, maxZoom: 0.9 }} minZoom={0.15} maxZoom={1.8} deleteKeyCode={['Backspace', 'Delete']} proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#cbd3e8"/><Controls showInteractive={false}/><MiniMap nodeColor={n => ['model', 'agent'].includes(String(n.data.kind)) ? '#b9a2ee' : '#a3b5f7'} maskColor="rgba(246,248,253,0.8)" pannable zoomable/>
      </ReactFlow>
      <button className="inspector-toggle icon-button" aria-label="Schritteinstellungen umschalten" onClick={() => setInspector(!inspector)}><PanelRightOpen size={18}/></button>
      <div className={`canvas-readiness ${issues.length ? 'needs-input' : 'ready'}`} aria-live="polite">{issues.length ? <AlertCircle size={15}/> : <CheckCircle2 size={15}/>}<span>{notice || (issues.length ? `${issues.length} ${issues.length === 1 ? 'Einstellung fehlt' : 'Einstellungen fehlen'}` : 'Zum Start bereit')}</span>{issues.length > 0 && <button onClick={() => { setSelected(issues[0].nodeId || null); setInspector(true); }}>Anzeigen</button>}</div>
    </div>
    {inspector && <aside className="node-inspector"><div className="inspector-heading"><span>{selectedNode ? 'Schritt konfigurieren' : 'Workflow'}</span><button className="icon-button" aria-label="Details schliessen" onClick={() => setInspector(false)}><PanelRightClose size={16}/></button></div>
      {selectedNode ? <><div className="inspector-node-title"><h3>{kinds[selectedNode.data.kind]?.label}</h3><p>{kinds[selectedNode.data.kind]?.description}</p></div><div className="inspector-fields"><label className="field"><span>Bezeichnung</span><input maxLength={120} value={selectedNode.data.label} onChange={e => { const label = e.target.value; commit(w => ({ ...w, nodes: w.nodes.map((n: Item) => n.id === selected ? { ...n, data: { ...n.data, label } } : n) }), `label:${selected}`); }}/></label><NodeFields node={selectedNode} data={data} update={updateConfig}/></div><div className="node-local-issues">{issues.filter((i: Item) => i.nodeId === selected).map((i: Item, index: number) => <p key={index}><AlertCircle size={14}/>{i.message}</p>)}</div></> : <><div className="inspector-idle"><MousePointer2 size={30}/><h3>Schritt auswählen</h3><p>Klicke einen Baustein an, um seinen Auftrag und seine Einstellungen zu bearbeiten.</p></div><div className="workflow-facts"><div><span>Schritte</span><strong>{workflow.nodes.length}</strong></div><div><span>Verbindungen</span><strong>{workflow.edges.length}</strong></div><div><span>Ausführung</span><strong>{workflow.schedule?.enabled ? 'Zeitplan' : 'Manuell'}</strong></div></div></>}
      {issues.length > 0 && <div className="workflow-issues"><h4>Vor dem Start</h4>{issues.map((issue: Item, index: number) => <button key={index} onClick={() => setSelected(issue.nodeId || null)}><AlertCircle size={14}/><span>{issue.message}</span></button>)}</div>}
      {workflow.lastScheduleError && <p className="step-error">Zeitplan: {workflow.lastScheduleError}</p>}
    </aside>}
    {ghost && <div className="palette-drag-preview" style={{ left: ghost.x + 14, top: ghost.y + 14 }}><Workflow size={16}/>{ghost.label}</div>}
  </div>;
}
