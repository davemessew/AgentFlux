import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, BookOpen, Bot, Check, ChevronRight, Clock3, Download, FileText, Lightbulb, Pause, Play, Plus, RotateCcw, Save, Sparkles, Trash2, X } from 'lucide-react';
import './agents.css';

type Item = Record<string, any>;
type Tab = 'agents' | 'skills' | 'learnings';
type Props = { data: Item; notify: (message: string, error?: boolean) => void; refresh: () => Promise<unknown>; onOpenWorkflow?: (workflowId: string) => void };

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Die Anfrage ist fehlgeschlagen.');
  return value;
}
const post = (path: string, value: unknown) => api(path, { method: 'POST', body: JSON.stringify(value) });
const dateText = (value?: string) => value ? new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Noch kein Durchlauf';
const statusText: Record<string, string> = { idle: 'Bereit', planning: 'Plant Workflow', running: 'Läuft', stopping: 'Wird gestoppt', learning: 'Lernt', completed: 'Abgeschlossen', failed: 'Fehlgeschlagen', cancelled: 'Gestoppt', interrupted: 'Unterbrochen' };
const freshAgent = () => ({ name: '', objective: '', providerId: '', connectorIds: [] as string[], skillIds: [] as string[], intervalMinutes: 60, enabled: false, useMemory: true, useKnowledgeBase: true, learn: true, createSkills: false, maxSteps: 12, policy: { allowCloud: false } });

export default function AgentsPage({ data, notify, refresh, onOpenWorkflow }: Props) {
  const [tab, setTab] = useState<Tab>('agents');
  const [state, setState] = useState<{ agents: Item[]; skills: Item[]; learnings: Item[] }>({ agents: data.agents || [], skills: data.skills || [], learnings: data.learnings || [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [agentDraft, setAgentDraft] = useState<Item | null>(null);
  const [skillDraft, setSkillDraft] = useState<Item | null>(null);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try { setState(await api('/agents/state')); setError(''); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    reload();
    const events = new EventSource('/api/events');
    let timer: ReturnType<typeof setTimeout> | undefined;
    events.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if (['agents', 'skill', 'learning', 'run'].includes(message.type)) {
          clearTimeout(timer);
          timer = setTimeout(() => { reload(); refresh().catch(() => {}); }, 180);
        }
      } catch { /* Unbekannte Serverereignisse werden ignoriert. */ }
    };
    return () => { clearTimeout(timer); events.close(); };
  }, [reload, refresh]);

  const act = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try { await action(); await reload(); await refresh(); if (success) notify(success); }
    catch (e: any) { notify(e.message || 'Die Aktion ist fehlgeschlagen.', true); }
    finally { setBusy(''); }
  };

  const saveAgent = (event: FormEvent) => {
    event.preventDefault();
    if (!agentDraft) return;
    void act('agent-save', async () => { await post('/agents', agentDraft); setAgentDraft(null); }, 'Agent gespeichert.');
  };
  const saveSkill = (event: FormEvent) => {
    event.preventDefault();
    if (!skillDraft) return;
    void act('skill-save', async () => { await post('/skills', skillDraft); setSkillDraft(null); }, 'Skill gespeichert.');
  };
  const exportJson = (label: string, items: Item[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `agentflux-${label}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  const visibleAgents = useMemo(() => state.agents.filter(agent => !search || `${agent.name} ${agent.objective}`.toLowerCase().includes(search.toLowerCase())), [state.agents, search]);
  const activeSkills = useMemo(() => state.skills.filter(skill => skill.status === 'active').length, [state.skills]);
  const readyModels = data.providers || [];
  const connectors = data.connectors || [];

  return <div className="page agents-page">
    <div className="page-heading agents-heading">
      <div><div className="agents-eyebrow"><span className="status-dot"/>Arbeitsbereich · Automatisierung</div><h1>Agenten</h1><p>Erstelle Agenten, die aus Beschreibungen begrenzte Workflows planen, freigegebene Quellen lesen und in deinem Zeitplan arbeiten.</p></div>
      <div className="agents-heading-actions"><button className="button" onClick={() => void reload()} disabled={loading}><RotateCcw size={15} className={loading ? 'agents-spin' : ''}/>Aktualisieren</button><button className="button primary" onClick={() => { const draft = freshAgent(); draft.providerId = readyModels[0]?.id || ''; setAgentDraft(draft); }}><Plus size={16}/>Agent erstellen</button></div>
    </div>
    <div className="agents-metrics">
      <div><span><Bot size={15}/>Agenten</span><strong>{state.agents.length}</strong><small>{state.agents.filter(agent => agent.enabled).length} mit Zeitplan</small></div>
      <div><span><BookOpen size={15}/>Geprüfte Skills</span><strong>{activeSkills}</strong><small>{state.skills.length - activeSkills} noch zu prüfen</small></div>
      <div><span><Lightbulb size={15}/>Beobachtungen</span><strong>{state.learnings.length}</strong><small>{state.learnings.filter(item => item.status === 'unreviewed').length} noch ungeprüft</small></div>
    </div>
    <div className="agents-toolbar">
      <div className="agents-tabs" role="tablist" aria-label="Agentenbereiche">
        <button role="tab" aria-selected={tab === 'agents'} className={tab === 'agents' ? 'selected' : ''} onClick={() => setTab('agents')}><Bot size={15}/>Agenten <span>{state.agents.length}</span></button>
        <button role="tab" aria-selected={tab === 'skills'} className={tab === 'skills' ? 'selected' : ''} onClick={() => setTab('skills')}><BookOpen size={15}/>Skills <span>{state.skills.length}</span></button>
        <button role="tab" aria-selected={tab === 'learnings'} className={tab === 'learnings' ? 'selected' : ''} onClick={() => setTab('learnings')}><Lightbulb size={15}/>Learnings <span>{state.learnings.length}</span></button>
      </div>
      {tab === 'agents' && <input className="agents-search" aria-label="Agenten suchen" value={search} onChange={e => setSearch(e.target.value)} placeholder="Agenten suchen"/>}
      {tab === 'skills' && <button className="button" onClick={() => setSkillDraft({ name: '', description: '', instructions: '', status: 'unreviewed' })}><Plus size={15}/>Skill anlegen</button>}
      {tab !== 'agents' && <button className="icon-button agents-export" title="JSON exportieren" onClick={() => exportJson(tab, tab === 'skills' ? state.skills : state.learnings)}><Download size={16}/></button>}
    </div>

    {error && <div className="agents-error"><Activity size={17}/><span>{error}</span><button onClick={() => void reload()}>Erneut laden</button></div>}
    {tab === 'agents' && (visibleAgents.length ? <div className="agent-grid">{visibleAgents.map(agent => {
      const provider = readyModels.find((item: Item) => item.id === agent.providerId);
      const busyKey = busy === `run:${agent.id}` || busy === `stop:${agent.id}`;
      const isRunning = ['planning', 'running', 'stopping', 'learning'].includes(agent.status);
      return <article className="agent-card" key={agent.id}>
        <div className="agent-card-top"><span className="agent-icon"><Bot size={19}/></span><span className={`agents-status ${agent.status || 'idle'}`}><i/>{statusText[agent.status] || 'Bereit'}</span><button className="icon-button agent-delete" aria-label={`${agent.name} löschen`} title="Agent löschen" disabled={busyKey} onClick={() => { if (window.confirm(`Agent „${agent.name}“ löschen?`)) void act(`delete:${agent.id}`, () => api(`/agents/${agent.id}`, { method: 'DELETE' }), 'Agent gelöscht.'); }}><Trash2 size={15}/></button></div>
        <h2>{agent.name}</h2><p className="agent-objective">{agent.objective}</p>
        <div className="agent-facts"><span><Sparkles size={13}/>{provider?.name || 'Modell fehlt'}{provider?.model ? ` · ${provider.model}` : ''}</span><span><FileText size={13}/>{agent.connectorIds?.length || 0} Quellen · {agent.skillIds?.length || 0} Skills</span><span><Clock3 size={13}/>{agent.enabled ? `Alle ${agent.intervalMinutes} Minuten` : 'Kein Zeitplan'}</span></div>
        <div className="agent-last-run">{agent.lastRunAt ? <><span>Letzter Durchlauf</span><time>{dateText(agent.lastRunAt)}</time><b className={agent.lastRunStatus}>{statusText[agent.lastRunStatus] || agent.lastRunStatus}</b></> : <span>Noch kein Durchlauf</span>}</div>
        {agent.lastError && <p className="agent-inline-error">{agent.lastError}</p>}
        {agent.lastLearningError && <p className="agent-inline-warning">Auswertung fehlgeschlagen: {agent.lastLearningError}</p>}
        <div className="agent-actions">
          {isRunning ? <button className="button agent-stop" disabled={busy === `stop:${agent.id}`} onClick={() => void act(`stop:${agent.id}`, () => post(`/agents/${agent.id}/stop`, {}), 'Agent wird gestoppt.')}><Pause size={15}/>{agent.status === 'learning' ? 'Lernen stoppen' : 'Stoppen'}</button> : <button className="button primary" disabled={busyKey || !provider} onClick={() => void act(`run:${agent.id}`, () => post(`/agents/${agent.id}/run`, {}), 'Agent plant einen Workflow.')}><Play size={15}/>{busyKey ? 'Startet …' : 'Jetzt starten'}</button>}
          <button className="button" disabled={busyKey} onClick={() => setAgentDraft(structuredClone(agent))}><Save size={15}/>Einstellungen</button>
          {agent.lastWorkflowId && <button className="button agent-open-workflow" onClick={() => onOpenWorkflow?.(agent.lastWorkflowId)} disabled={!onOpenWorkflow}>Workflow öffnen<ChevronRight size={15}/></button>}
        </div>
      </article>;
    })}</div> : <EmptyState icon={Bot} title={search ? 'Keine Treffer' : 'Noch keine Agenten'} description={search ? 'Passe den Suchbegriff an.' : 'Beschreibe einen Auftrag. Der Agent plant daraus einen begrenzten Workflow und startet ihn erst auf deinen Befehl oder nach deinem Zeitplan.'} action={!search ? <button className="button primary" onClick={() => { const draft = freshAgent(); draft.providerId = readyModels[0]?.id || ''; setAgentDraft(draft); }}><Plus size={15}/>Agent erstellen</button> : null}/>)}

    {tab === 'skills' && (state.skills.length ? <div className="agents-list">{state.skills.map(skill => <article className="knowledge-card" key={skill.id}>
      <div className="knowledge-icon"><BookOpen size={17}/></div><div className="knowledge-main"><div className="knowledge-title"><h2>{skill.name}</h2><span className={`review-label ${skill.status}`}>{skill.status === 'active' ? 'Geprüft' : skill.status === 'rejected' ? 'Verworfen' : 'Prüfung nötig'}</span></div><p>{skill.description || skill.instructions}</p><small>Version {skill.version || 1}{skill.sourceRunId ? ` · aus Durchlauf ${skill.sourceRunId.slice(0, 8)}` : ''}{skill.updatedAt ? ` · ${dateText(skill.updatedAt)}` : ''}</small></div><div className="knowledge-actions"><button className="icon-button" title="Skill bearbeiten" onClick={() => setSkillDraft(structuredClone(skill))}><Save size={16}/></button>{skill.status !== 'active' && <button className="button" onClick={() => void act(`skill-review:${skill.id}`, () => post('/skills', { ...skill, status: 'active' }), 'Skill geprüft und freigegeben.') }><Check size={15}/>Prüfen</button>}<button className="icon-button danger" title="Skill löschen" onClick={() => { if (window.confirm(`Skill „${skill.name}“ löschen?`)) void act(`skill-delete:${skill.id}`, () => api(`/skills/${skill.id}`, { method: 'DELETE' }), 'Skill gelöscht.'); }}><Trash2 size={15}/></button></div>
    </article>)}</div> : <EmptyState icon={BookOpen} title="Noch keine Skills" description="Lege wiederverwendbare Anweisungen an oder aktiviere das Erstellen von Skills in den Agent-Einstellungen. Neue Skills müssen geprüft werden, bevor Agenten sie verwenden." action={<button className="button primary" onClick={() => setSkillDraft({ name: '', description: '', instructions: '', status: 'unreviewed' })}><Plus size={15}/>Skill anlegen</button>}/>)}

    {tab === 'learnings' && (state.learnings.length ? <div className="agents-list">{state.learnings.map(item => <article className="knowledge-card learning-card" key={item.id}>
      <div className="knowledge-icon learning"><Lightbulb size={17}/></div><div className="knowledge-main"><div className="knowledge-title"><h2>{item.title}</h2><span className={`review-label ${item.status}`}>{item.status === 'confirmed' ? 'Bestätigt' : item.status === 'rejected' ? 'Verworfen' : 'Beobachtung'}</span></div><p>{item.content}</p><small>{item.agentName || state.agents.find(agent => agent.id === item.agentId)?.name || 'Gelöschter Agent'}{item.createdAt ? ` · ${dateText(item.createdAt)}` : ''}{item.sourceRunId ? ` · Durchlauf ${item.sourceRunId.slice(0, 8)}` : ''}</small></div><div className="knowledge-actions">
        {item.status !== 'confirmed' && <button className="button" onClick={() => void act(`learning-review:${item.id}`, () => post(`/learnings/${item.id}/review`, { status: 'confirmed' }), 'Beobachtung bestätigt.') }><Check size={15}/>Bestätigen</button>}
        {item.status !== 'rejected' && <button className="icon-button danger" title="Verwerfen" onClick={() => void act(`learning-reject:${item.id}`, () => post(`/learnings/${item.id}/review`, { status: 'rejected' }), 'Beobachtung verworfen.') }><X size={16}/></button>}
        <button className="icon-button danger" title="Beobachtung löschen" onClick={() => { if (window.confirm(`Beobachtung „${item.title}“ löschen?`)) void act(`learning-delete:${item.id}`, () => api(`/learnings/${item.id}`, { method: 'DELETE' }), 'Beobachtung gelöscht.'); }}><Trash2 size={15}/></button>
      </div></article>)}</div> : <EmptyState icon={Lightbulb} title="Noch keine Learnings" description="Wenn ein Agent einen Durchlauf abgeschlossen hat, kann er daraus Beobachtungen für spätere Planung ableiten. Sie bleiben zunächst ungeprüft."/>)}

    {agentDraft && <div className="agents-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAgentDraft(null); }}><form className="agents-modal" onSubmit={saveAgent}>
      <div className="agents-modal-head"><div><span className="agents-eyebrow"><Bot size={14}/>Konfiguration</span><h2>{agentDraft.id ? 'Agent bearbeiten' : 'Agent erstellen'}</h2><p>Der Agent plant einen Workflow aus deiner Beschreibung. Der Workflow startet nur nach einem manuellen Start oder nach deinem Zeitplan.</p></div><button type="button" className="icon-button" aria-label="Schliessen" onClick={() => setAgentDraft(null)}><X size={19}/></button></div>
      <div className="agents-form-scroll">
        <label className="agents-field"><span>Name</span><input required maxLength={120} value={agentDraft.name} onChange={e => setAgentDraft({ ...agentDraft, name: e.target.value })} placeholder="Zum Beispiel: Wöchentlicher Supportbericht"/></label>
        <label className="agents-field"><span>Auftrag</span><textarea required minLength={10} maxLength={4000} rows={5} value={agentDraft.objective} onChange={e => setAgentDraft({ ...agentDraft, objective: e.target.value })} placeholder="Was soll der Agent regelmässig erledigen? Beschreibe Ergebnis, Grenzen und gewünschte Verarbeitung."/><small>Der Auftrag wird als Workflow-Plan an das ausgewählte Modell gesendet.</small></label>
        <label className="agents-field"><span>Modell</span><select required value={agentDraft.providerId} onChange={e => { const provider = readyModels.find((item: Item) => item.id === e.target.value); setAgentDraft({ ...agentDraft, providerId: e.target.value, policy: { ...agentDraft.policy, allowCloud: provider?.scope === 'cloud' ? agentDraft.policy?.allowCloud === true : false } }); }}><option value="">Modell auswählen</option>{readyModels.map((provider: Item) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.model}{provider.scope === 'cloud' ? ' · extern' : ' · lokal'}</option>)}</select>{!readyModels.length && <small>Verbinde zuerst ein Modell im Bereich Modelle.</small>}</label>
        <div className="agents-field"><span>Lesende Datenquellen</span><small>Nur ausgewählte Quellen sind verfügbar. Programme und HTTP-POST sind gesperrt.</small><div className="agents-check-grid">{connectors.filter((connector: Item) => connector.type !== 'program' && (connector.type !== 'http' || (connector.config?.method || 'GET').toUpperCase() === 'GET')).map((connector: Item) => <label key={connector.id}><input type="checkbox" checked={(agentDraft.connectorIds || []).includes(connector.id)} onChange={event => setAgentDraft({ ...agentDraft, connectorIds: event.target.checked ? [...(agentDraft.connectorIds || []), connector.id] : agentDraft.connectorIds.filter((id: string) => id !== connector.id) })}/><span><strong>{connector.name}</strong><small>{connector.type === 'http' ? 'HTTP GET' : connector.type === 'folder' ? 'Ordner' : connector.type === 'text' ? 'Text' : connector.type}</small></span></label>)}</div>{!connectors.length && <p className="agents-empty-hint">Es sind noch keine Datenquellen eingerichtet.</p>}</div>
        <div className="agents-field"><span>Arbeitsanweisungen mit Status</span><small>Geprüfte Skills kannst du auswählen. Eigene ungeprüfte Vorschläge werden als unsichere Hinweise kenntlich gemacht.</small><div className="agents-check-grid">{state.skills.filter(skill => skill.status === 'active').map(skill => <label key={skill.id}><input type="checkbox" checked={(agentDraft.skillIds || []).includes(skill.id)} onChange={event => setAgentDraft({ ...agentDraft, skillIds: event.target.checked ? [...(agentDraft.skillIds || []), skill.id] : agentDraft.skillIds.filter((id: string) => id !== skill.id) })}/><span><strong>{skill.name}</strong><small>Version {skill.version || 1}</small></span></label>)}</div>{!activeSkills && <p className="agents-empty-hint">Prüfe zuerst einen Skill im Bereich Skills.</p>}</div>
        <label className="agents-field agents-interval"><span>Wiederholung</span><div><input type="number" min={1} max={525600} value={agentDraft.intervalMinutes} onChange={e => setAgentDraft({ ...agentDraft, intervalMinutes: Number(e.target.value) })}/><span>Minuten</span></div><small>Der Zeitplan startet den Agenten automatisch. Quellen bleiben lesend.</small></label>
        <label className="agents-toggle"><span><strong>Zeitplan aktiv</strong><small>Beim Speichern beginnt der erste Lauf nach dem gewählten Intervall.</small></span><input type="checkbox" checked={!!agentDraft.enabled} onChange={e => setAgentDraft({ ...agentDraft, enabled: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Learnings aufbauen</strong><small>Nach abgeschlossenen Durchläufen Beobachtungen vorschlagen.</small></span><input type="checkbox" checked={agentDraft.learn !== false} onChange={e => setAgentDraft({ ...agentDraft, learn: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Skills vorschlagen</strong><small>Wiederverwendbare Anweisungen aus Durchläufen erzeugen, vor Verwendung prüfen.</small></span><input type="checkbox" checked={!!agentDraft.createSkills} onChange={e => setAgentDraft({ ...agentDraft, createSkills: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Beobachtungen einbeziehen</strong><small>Bis zu acht bisherige Beobachtungen als Hinweise verwenden.</small></span><input type="checkbox" checked={agentDraft.useMemory !== false} onChange={e => setAgentDraft({ ...agentDraft, useMemory: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Texte aus dem Wissensspeicher verwenden</strong><small>Vorhandene Dokumente als Kontext einbeziehen und als Datenquelle im Workflow erlauben.</small></span><input type="checkbox" checked={agentDraft.useKnowledgeBase !== false} onChange={e => setAgentDraft({ ...agentDraft, useKnowledgeBase: e.target.checked })}/><i/></label>
        {agentDraft.providerId && readyModels.find((provider: Item) => provider.id === agentDraft.providerId)?.scope === 'cloud' && <label className="agents-toggle cloud-toggle"><span><strong>Externes Modell freigeben</strong><small>Erfordert zusätzlich die globale Cloud-Freigabe. Daten werden vor dem Versand maskiert.</small></span><input type="checkbox" checked={!!agentDraft.policy?.allowCloud} onChange={e => setAgentDraft({ ...agentDraft, policy: { ...agentDraft.policy, allowCloud: e.target.checked } })}/><i/></label>}
        <label className="agents-field agents-interval"><span>Maximale Workflow-Schritte</span><div><input type="number" min={2} max={16} value={agentDraft.maxSteps || 12} onChange={e => setAgentDraft({ ...agentDraft, maxSteps: Number(e.target.value) })}/><span>Schritte</span></div><small>Begrenzt den automatisch geplanten Ablauf auf höchstens 16 Schritte.</small></label>
      </div>
      <div className="agents-modal-actions"><button type="button" className="button" onClick={() => setAgentDraft(null)}>Abbrechen</button><button className="button primary" disabled={busy === 'agent-save' || !readyModels.length}><Save size={15}/>{busy === 'agent-save' ? 'Speichert …' : 'Speichern'}</button></div>
    </form></div>}

    {skillDraft && <div className="agents-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSkillDraft(null); }}><form className="agents-modal skill-modal" onSubmit={saveSkill}>
      <div className="agents-modal-head"><div><span className="agents-eyebrow"><BookOpen size={14}/>Wiederverwendbare Anweisung</span><h2>{skillDraft.id ? 'Skill bearbeiten' : 'Skill anlegen'}</h2><p>Skills enthalten Textanweisungen. Sie werden nie als Code ausgeführt und müssen vor der Nutzung geprüft werden.</p></div><button type="button" className="icon-button" aria-label="Schliessen" onClick={() => setSkillDraft(null)}><X size={19}/></button></div>
      <div className="agents-form-scroll">
        <label className="agents-field"><span>Name</span><input required maxLength={120} value={skillDraft.name} onChange={e => setSkillDraft({ ...skillDraft, name: e.target.value })}/></label>
        <label className="agents-field"><span>Kurzbeschreibung</span><input maxLength={500} value={skillDraft.description || ''} onChange={e => setSkillDraft({ ...skillDraft, description: e.target.value })}/></label>
        <label className="agents-field"><span>Anweisungen</span><textarea required minLength={20} maxLength={4000} rows={9} value={skillDraft.instructions} onChange={e => setSkillDraft({ ...skillDraft, instructions: e.target.value })} placeholder="Beschreibe den wiederverwendbaren Arbeitsschritt."/><small>Die Anweisung wird als normaler Text mit dem Auftrag des Agenten kombiniert.</small></label>
        {skillDraft.id && <label className="agents-field"><span>Prüfstatus</span><select value={skillDraft.status} onChange={e => setSkillDraft({ ...skillDraft, status: e.target.value })}><option value="unreviewed">Prüfung nötig</option><option value="active">Geprüft und freigegeben</option><option value="rejected">Verworfen</option></select><small>Eine Änderung erstellt eine neue Version.</small></label>}
      </div>
      <div className="agents-modal-actions"><button type="button" className="button" onClick={() => setSkillDraft(null)}>Abbrechen</button><button className="button primary" disabled={busy === 'skill-save'}><Save size={15}/>{busy === 'skill-save' ? 'Speichert …' : 'Speichern'}</button></div>
    </form></div>}
  </div>;
}

function EmptyState({ icon: Icon, title, description, action }: any) {
  return <div className="agents-empty"><span><Icon size={25}/></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
