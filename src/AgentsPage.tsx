import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, BookOpen, Bot, Check, ChevronRight, Clock3, Download, FileText, Film, Lightbulb, Pause, Play, Plus, RotateCcw, Save, Sparkles, Trash2, X } from 'lucide-react';
import './agents.css';

type Item = Record<string, any>;
type Tab = 'agents' | 'skills' | 'learnings';
type Props = { data: Item; notify: (message: string, error?: boolean) => void; refresh: () => Promise<unknown>; onOpenWorkflow?: (workflowId: string) => void; onVideo: () => void };

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Request failed.");
  return value;
}
const post = (path: string, value: unknown) => api(path, { method: 'POST', body: JSON.stringify(value) });
const dateText = (value?: string) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : "No runs yet";
const statusText: Record<string, string> = { idle: "Ready", planning: "Planning workflow", running: "Running", stopping: "Stopping", learning: "Learning", completed: "Completed", failed: "Failed", cancelled: "Stopped", interrupted: "Interrupted" };
const freshAgent = () => ({ name: '', objective: '', providerId: '', connectorIds: [] as string[], skillIds: [] as string[], intervalMinutes: 60, enabled: false, useMemory: true, useKnowledgeBase: true, learn: true, createSkills: false, maxSteps: 12, policy: { allowCloud: false } });

export default function AgentsPage({ data, notify, refresh, onOpenWorkflow, onVideo }: Props) {
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
    catch (e: any) { notify(e.message || "Action failed.", true); }
    finally { setBusy(''); }
  };

  const saveAgent = (event: FormEvent) => {
    event.preventDefault();
    if (!agentDraft) return;
    void act('agent-save', async () => { await post('/agents', agentDraft); setAgentDraft(null); }, "Agent saved.");
  };
  const saveSkill = (event: FormEvent) => {
    event.preventDefault();
    if (!skillDraft) return;
    void act('skill-save', async () => { await post('/skills', skillDraft); setSkillDraft(null); }, "Skill saved.");
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
      <div><div className="agents-eyebrow"><span className="status-dot"/>Agentic AI platform</div><h1>Agents</h1><p>Create agents that plan workflows from descriptions, read approved sources and run on your schedule.</p></div>
      <div className="agents-heading-actions"><button className="button" onClick={onVideo}><Film size={16}/>Analyse video</button><button className="button" onClick={() => void reload()} disabled={loading}><RotateCcw size={15} className={loading ? 'agents-spin' : ''}/>Refresh</button><button className="button primary" onClick={() => { const draft = freshAgent(); draft.providerId = readyModels[0]?.id || ''; setAgentDraft(draft); }}><Plus size={16}/>Create agent</button></div>
    </div>
    <div className="agents-metrics">
      <div><span><Bot size={15}/>Agents</span><strong>{state.agents.length}</strong><small>{state.agents.filter(agent => agent.enabled).length} scheduled</small></div>
      <div><span><BookOpen size={15}/>Reviewed skills</span><strong>{activeSkills}</strong><small>{state.skills.length - activeSkills} awaiting review</small></div>
      <div><span><Lightbulb size={15}/>Observations</span><strong>{state.learnings.length}</strong><small>{state.learnings.filter(item => item.status === 'unreviewed').length} unreviewed</small></div>
    </div>
    <div className="agents-toolbar">
      <div className="agents-tabs" role="tablist" aria-label="Agent sections">
        <button role="tab" aria-selected={tab === 'agents'} className={tab === 'agents' ? 'selected' : ''} onClick={() => setTab('agents')}><Bot size={15}/>Agents <span>{state.agents.length}</span></button>
        <button role="tab" aria-selected={tab === 'skills'} className={tab === 'skills' ? 'selected' : ''} onClick={() => setTab('skills')}><BookOpen size={15}/>Skills <span>{state.skills.length}</span></button>
        <button role="tab" aria-selected={tab === 'learnings'} className={tab === 'learnings' ? 'selected' : ''} onClick={() => setTab('learnings')}><Lightbulb size={15}/>Learnings <span>{state.learnings.length}</span></button>
      </div>
      {tab === 'agents' && <input className="agents-search" aria-label="Search agents" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents"/>}
      {tab === 'skills' && <button className="button" onClick={() => setSkillDraft({ name: '', description: '', instructions: '', status: 'unreviewed' })}><Plus size={15}/>Add skill</button>}
      {tab !== 'agents' && <button className="icon-button agents-export" title="Export JSON" onClick={() => exportJson(tab, tab === 'skills' ? state.skills : state.learnings)}><Download size={16}/></button>}
    </div>

    {error && <div className="agents-error"><Activity size={17}/><span>{error}</span><button onClick={() => void reload()}>Reload</button></div>}
    {tab === 'agents' && (visibleAgents.length ? <div className="agent-grid">{visibleAgents.map(agent => {
      const provider = readyModels.find((item: Item) => item.id === agent.providerId);
      const busyKey = busy === `run:${agent.id}` || busy === `stop:${agent.id}`;
      const isRunning = ['planning', 'running', 'stopping', 'learning'].includes(agent.status);
      return <article className="agent-card" key={agent.id}>
        <div className="agent-card-top"><span className="agent-icon"><Bot size={19}/></span><span className={`agents-status ${agent.status || 'idle'}`}><i/>{statusText[agent.status] || "Ready"}</span><button className="icon-button agent-delete" aria-label={`Delete ${agent.name}`} title="Delete agent" disabled={busyKey} onClick={() => { if (window.confirm(`Delete agent “${agent.name}”?`)) void act(`delete:${agent.id}`, () => api(`/agents/${agent.id}`, { method: 'DELETE' }), "Agent deleted."); }}><Trash2 size={15}/></button></div>
        <h2>{agent.name}</h2><p className="agent-objective">{agent.objective}</p>
        <div className="agent-facts"><span><Sparkles size={13}/>{provider?.name || "Model missing"}{provider?.model ? ` · ${provider.model}` : ''}</span><span><FileText size={13}/>{agent.connectorIds?.length || 0} sources · {agent.skillIds?.length || 0} Skills</span><span><Clock3 size={13}/>{agent.enabled ? `Every ${agent.intervalMinutes} minutes` : "No schedule"}</span></div>
        <div className="agent-last-run">{agent.lastRunAt ? <><span>Last run</span><time>{dateText(agent.lastRunAt)}</time><b className={agent.lastRunStatus}>{statusText[agent.lastRunStatus] || agent.lastRunStatus}</b></> : <span>No runs yet</span>}</div>
        {agent.lastError && <p className="agent-inline-error">{agent.lastError}</p>}
        {agent.lastLearningError && <p className="agent-inline-warning">Analysis failed: {agent.lastLearningError}</p>}
        <div className="agent-actions">
          {isRunning ? <button className="button agent-stop" disabled={busy === `stop:${agent.id}`} onClick={() => void act(`stop:${agent.id}`, () => post(`/agents/${agent.id}/stop`, {}), "Agent is stopping.")}><Pause size={15}/>{agent.status === 'learning' ? "Stop learning" : "Stop"}</button> : <button className="button primary" disabled={busyKey || !provider} onClick={() => void act(`run:${agent.id}`, () => post(`/agents/${agent.id}/run`, {}), "Agent is planning a workflow.")}><Play size={15}/>{busyKey ? "Starting …" : "Run now"}</button>}
          <button className="button" disabled={busyKey} onClick={() => setAgentDraft(structuredClone(agent))}><Save size={15}/>Settings</button>
          {agent.lastWorkflowId && <button className="button agent-open-workflow" onClick={() => onOpenWorkflow?.(agent.lastWorkflowId)} disabled={!onOpenWorkflow}>Open workflow<ChevronRight size={15}/></button>}
        </div>
      </article>;
    })}</div> : <EmptyState icon={Bot} title={search ? "No matches" : "No agents yet"} description={search ? "Try another search term." : "Describe a task. The agent plans a workflow and runs it when you start it or according to your schedule."} action={!search ? <button className="button primary" onClick={() => { const draft = freshAgent(); draft.providerId = readyModels[0]?.id || ''; setAgentDraft(draft); }}><Plus size={15}/>Create agent</button> : null}/>)}

    {tab === 'skills' && (state.skills.length ? <div className="agents-list">{state.skills.map(skill => <article className="knowledge-card" key={skill.id}>
      <div className="knowledge-icon"><BookOpen size={17}/></div><div className="knowledge-main"><div className="knowledge-title"><h2>{skill.name}</h2><span className={`review-label ${skill.status}`}>{skill.status === 'active' ? "Reviewed" : skill.status === 'rejected' ? "Rejected" : "Needs review"}</span></div><p>{skill.description || skill.instructions}</p><small>Version {skill.version || 1}{skill.sourceRunId ? ` · from run ${skill.sourceRunId.slice(0, 8)}` : ''}{skill.updatedAt ? ` · ${dateText(skill.updatedAt)}` : ''}</small></div><div className="knowledge-actions"><button className="icon-button" title="Edit skill" onClick={() => setSkillDraft(structuredClone(skill))}><Save size={16}/></button>{skill.status !== 'active' && <button className="button" onClick={() => void act(`skill-review:${skill.id}`, () => post('/skills', { ...skill, status: 'active' }), "Skill reviewed and approved.") }><Check size={15}/>Review</button>}<button className="icon-button danger" title="Delete skill" onClick={() => { if (window.confirm(`Delete skill “${skill.name}”?`)) void act(`skill-delete:${skill.id}`, () => api(`/skills/${skill.id}`, { method: 'DELETE' }), "Skill deleted."); }}><Trash2 size={15}/></button></div>
    </article>)}</div> : <EmptyState icon={BookOpen} title="No skills yet" description="Add reusable instructions or enable skill creation in the agent settings. Review new skills before use." action={<button className="button primary" onClick={() => setSkillDraft({ name: '', description: '', instructions: '', status: 'unreviewed' })}><Plus size={15}/>Add skill</button>}/>)}

    {tab === 'learnings' && (state.learnings.length ? <div className="agents-list">{state.learnings.map(item => <article className="knowledge-card learning-card" key={item.id}>
      <div className="knowledge-icon learning"><Lightbulb size={17}/></div><div className="knowledge-main"><div className="knowledge-title"><h2>{item.title}</h2><span className={`review-label ${item.status}`}>{item.status === 'confirmed' ? "Confirmed" : item.status === 'rejected' ? "Rejected" : "Observation"}</span></div><p>{item.content}</p><small>{item.agentName || state.agents.find(agent => agent.id === item.agentId)?.name || "Deleted agent"}{item.createdAt ? ` · ${dateText(item.createdAt)}` : ''}{item.sourceRunId ? ` · Run ${item.sourceRunId.slice(0, 8)}` : ''}</small></div><div className="knowledge-actions">
        {item.status !== 'confirmed' && <button className="button" onClick={() => void act(`learning-review:${item.id}`, () => post(`/learnings/${item.id}/review`, { status: 'confirmed' }), "Observation confirmed.") }><Check size={15}/>Confirm</button>}
        {item.status !== 'rejected' && <button className="icon-button danger" title="Reject" onClick={() => void act(`learning-reject:${item.id}`, () => post(`/learnings/${item.id}/review`, { status: 'rejected' }), "Observation rejected.") }><X size={16}/></button>}
        <button className="icon-button danger" title="Delete observation" onClick={() => { if (window.confirm(`Delete observation “${item.title}”?`)) void act(`learning-delete:${item.id}`, () => api(`/learnings/${item.id}`, { method: 'DELETE' }), "Observation deleted."); }}><Trash2 size={15}/></button>
      </div></article>)}</div> : <EmptyState icon={Lightbulb} title="No learnings yet" description="After a run, an agent can save observations for future planning. New observations are unreviewed."/>)}

    {agentDraft && <div className="agents-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAgentDraft(null); }}><form className="agents-modal" onSubmit={saveAgent}>
      <div className="agents-modal-head"><div><span className="agents-eyebrow"><Bot size={14}/>Configuration</span><h2>{agentDraft.id ? "Edit agent" : "Create agent"}</h2><p>The agent plans a workflow from your description. It runs when started manually or on your schedule.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setAgentDraft(null)}><X size={19}/></button></div>
      <div className="agents-form-scroll">
        <label className="agents-field"><span>Name</span><input required maxLength={120} value={agentDraft.name} onChange={e => setAgentDraft({ ...agentDraft, name: e.target.value })} placeholder="For example: Weekly support report"/></label>
        <label className="agents-field"><span>Task</span><textarea required minLength={10} maxLength={4000} rows={5} value={agentDraft.objective} onChange={e => setAgentDraft({ ...agentDraft, objective: e.target.value })} placeholder="What should the agent do regularly? Describe the result, limits and processing needed."/><small>The task is sent to the selected model for planning.</small></label>
        <label className="agents-field"><span>Model</span><select required value={agentDraft.providerId} onChange={e => { const provider = readyModels.find((item: Item) => item.id === e.target.value); setAgentDraft({ ...agentDraft, providerId: e.target.value, policy: { ...agentDraft.policy, allowCloud: provider?.scope === 'cloud' ? agentDraft.policy?.allowCloud === true : false } }); }}><option value="">Select model</option>{readyModels.map((provider: Item) => <option value={provider.id} key={provider.id}>{provider.name} · {provider.model}{provider.scope === 'cloud' ? " · external" : " · local"}</option>)}</select>{!readyModels.length && <small>Connect a model under Models first.</small>}</label>
        <div className="agents-field"><span>Read-only data sources</span><small>Only selected sources are available. Programs and HTTP POST are blocked.</small><div className="agents-check-grid">{connectors.filter((connector: Item) => connector.type !== 'program' && (connector.type !== 'http' || (connector.config?.method || 'GET').toUpperCase() === 'GET')).map((connector: Item) => <label key={connector.id}><input type="checkbox" checked={(agentDraft.connectorIds || []).includes(connector.id)} onChange={event => setAgentDraft({ ...agentDraft, connectorIds: event.target.checked ? [...(agentDraft.connectorIds || []), connector.id] : agentDraft.connectorIds.filter((id: string) => id !== connector.id) })}/><span><strong>{connector.name}</strong><small>{connector.type === 'http' ? 'HTTP GET' : connector.type === 'folder' ? "Folder" : connector.type === 'text' ? 'Text' : connector.type}</small></span></label>)}</div>{!connectors.length && <p className="agents-empty-hint">No data sources configured yet.</p>}</div>
        <div className="agents-field"><span>Instructions with status</span><small>Select reviewed skills. The agent's own unreviewed suggestions are marked as uncertain context.</small><div className="agents-check-grid">{state.skills.filter(skill => skill.status === 'active').map(skill => <label key={skill.id}><input type="checkbox" checked={(agentDraft.skillIds || []).includes(skill.id)} onChange={event => setAgentDraft({ ...agentDraft, skillIds: event.target.checked ? [...(agentDraft.skillIds || []), skill.id] : agentDraft.skillIds.filter((id: string) => id !== skill.id) })}/><span><strong>{skill.name}</strong><small>Version {skill.version || 1}</small></span></label>)}</div>{!activeSkills && <p className="agents-empty-hint">Review a skill under Skills first.</p>}</div>
        <label className="agents-field agents-interval"><span>Repeat</span><div><input type="number" min={1} max={525600} value={agentDraft.intervalMinutes} onChange={e => setAgentDraft({ ...agentDraft, intervalMinutes: Number(e.target.value) })}/><span>minutes</span></div><small>The schedule starts the agent automatically. Sources remain read-only.</small></label>
        <label className="agents-toggle"><span><strong>Scheduled</strong><small>The first run begins after the selected interval when saved.</small></span><input type="checkbox" checked={!!agentDraft.enabled} onChange={e => setAgentDraft({ ...agentDraft, enabled: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Build learnings</strong><small>Suggest observations after completed runs.</small></span><input type="checkbox" checked={agentDraft.learn !== false} onChange={e => setAgentDraft({ ...agentDraft, learn: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Suggest skills</strong><small>Create reusable instructions from runs; review before use.</small></span><input type="checkbox" checked={!!agentDraft.createSkills} onChange={e => setAgentDraft({ ...agentDraft, createSkills: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Include observations</strong><small>Use up to eight previous observations as context.</small></span><input type="checkbox" checked={agentDraft.useMemory !== false} onChange={e => setAgentDraft({ ...agentDraft, useMemory: e.target.checked })}/><i/></label>
        <label className="agents-toggle"><span><strong>Use knowledge base documents</strong><small>Include existing documents as context and allow them as a workflow source.</small></span><input type="checkbox" checked={agentDraft.useKnowledgeBase !== false} onChange={e => setAgentDraft({ ...agentDraft, useKnowledgeBase: e.target.checked })}/><i/></label>
        {agentDraft.providerId && readyModels.find((provider: Item) => provider.id === agentDraft.providerId)?.scope === 'cloud' && <label className="agents-toggle cloud-toggle"><span><strong>Allow external model</strong><small>Also requires global cloud approval. Data is redacted before transfer.</small></span><input type="checkbox" checked={!!agentDraft.policy?.allowCloud} onChange={e => setAgentDraft({ ...agentDraft, policy: { ...agentDraft.policy, allowCloud: e.target.checked } })}/><i/></label>}
        <label className="agents-field agents-interval"><span>Maximum workflow steps</span><div><input type="number" min={2} max={16} value={agentDraft.maxSteps || 12} onChange={e => setAgentDraft({ ...agentDraft, maxSteps: Number(e.target.value) })}/><span>steps</span></div><small>Limits automatically planned workflows to 16 steps.</small></label>
      </div>
      <div className="agents-modal-actions"><button type="button" className="button" onClick={() => setAgentDraft(null)}>Cancel</button><button className="button primary" disabled={busy === 'agent-save' || !readyModels.length}><Save size={15}/>{busy === 'agent-save' ? "Saving …" : "Save"}</button></div>
    </form></div>}

    {skillDraft && <div className="agents-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSkillDraft(null); }}><form className="agents-modal skill-modal" onSubmit={saveSkill}>
      <div className="agents-modal-head"><div><span className="agents-eyebrow"><BookOpen size={14}/>Reusable instruction</span><h2>{skillDraft.id ? "Edit skill" : "Add skill"}</h2><p>Skills are text instructions. They are never executed as code and should be reviewed before use.</p></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setSkillDraft(null)}><X size={19}/></button></div>
      <div className="agents-form-scroll">
        <label className="agents-field"><span>Name</span><input required maxLength={120} value={skillDraft.name} onChange={e => setSkillDraft({ ...skillDraft, name: e.target.value })}/></label>
        <label className="agents-field"><span>Short description</span><input maxLength={500} value={skillDraft.description || ''} onChange={e => setSkillDraft({ ...skillDraft, description: e.target.value })}/></label>
        <label className="agents-field"><span>Instructions</span><textarea required minLength={20} maxLength={4000} rows={9} value={skillDraft.instructions} onChange={e => setSkillDraft({ ...skillDraft, instructions: e.target.value })} placeholder="Describe the reusable task."/><small>The instruction is included as plain text alongside the agent's task.</small></label>
        {skillDraft.id && <label className="agents-field"><span>Review status</span><select value={skillDraft.status} onChange={e => setSkillDraft({ ...skillDraft, status: e.target.value })}><option value="unreviewed">Needs review</option><option value="active">Reviewed and approved</option><option value="rejected">Rejected</option></select><small>Editing creates a new version.</small></label>}
      </div>
      <div className="agents-modal-actions"><button type="button" className="button" onClick={() => setSkillDraft(null)}>Cancel</button><button className="button primary" disabled={busy === 'skill-save'}><Save size={15}/>{busy === 'skill-save' ? "Saving …" : "Save"}</button></div>
    </form></div>}
  </div>;
}

function EmptyState({ icon: Icon, title, description, action }: any) {
  return <div className="agents-empty"><span><Icon size={25}/></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
