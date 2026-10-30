import { list, now, settings, uid } from './store.mjs';
import { validateWorkflow } from './engine.mjs';
import { cleanWorkflow, workflowIssues } from '../shared/workflow.mjs';
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const stamp=value=>`${Math.floor(value/60).toString().padStart(2,'0')}:${Math.floor(value%60).toString().padStart(2,'0')}`;
function mappedStep(step, provider, connectors) {
  const c = object(step.config) ? step.config : {};
  switch (step.kind) {
    case 'source':
      if (c.mode === 'library') return { kind: 'source', config: { mode: 'library', query: text(c.query, 500), limit: 30 } };
      if (connectors.some(item => item.id === c.connectorId)) return { kind: 'source', config: { mode: 'connector', connectorId: c.connectorId } };
      break;
    case 'transform':
      if (['clean', 'deduplicate', 'limit'].includes(c.operation)) return { kind: 'transform', config: { operation: c.operation, ...(c.operation === 'limit' ? { limit: Math.max(1, Math.min(500, Math.round(Number(c.limit) || 10))) } : {}) } };
      break;
    case 'model': return { kind: 'model', config: { providerId: provider.id, prompt: text(c.prompt, 4000) || text(step.description, 1500) } };
    case 'redact': case 'store': return { kind: step.kind, config: {} };
  }
  return null;
}

export function readClarifications(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 30 || value.some(item => !object(item) || typeof item.question !== 'string' || !item.question.trim() || item.question.length > 1000 || typeof item.answer !== 'string' || !item.answer.trim() || item.answer.length > 4000)) throw new Error('Answers must contain text and be no longer than 4,000 characters.');
  return value.map(item => ({ question: item.question.trim(), answer: item.answer.trim() }));
}

function questionResult(summary, questions, duration, frames) {
  return { status: 'questions', summary, questions: [...new Set(questions)].slice(0, 3), duration, frameCount: frames.length };
}

export function makeDraft(parsed, frames, provider, connectors, fileName, duration, allowCloud, delivery, audioStatus) {
  const questions = Array.isArray(parsed?.questions) ? parsed.questions.map(value => text(value, 1000)).filter(Boolean) : [];
  if (questions.length) return questionResult(text(parsed.summary, 3000) || 'Some workflow details are missing.', questions, duration, frames);
  if (object(parsed) && Array.isArray(parsed.steps) && !parsed.steps.length) return questionResult(text(parsed.summary, 3000) || 'The workflow is not clear from these frames yet.', ['Which steps does the recording show, and what should the workflow produce?'], duration, frames);
  if (!object(parsed) || !text(parsed.name, 120) || !text(parsed.summary, 3000) || !Array.isArray(parsed.steps) || !parsed.steps.length || parsed.steps.length > 24) throw new Error('The model did not return a readable workflow. Try another vision model or a shorter clip.');
  const steps = parsed.steps.map(step => {
    if (!object(step) || !Number.isInteger(step.frame) || step.frame < 1 || step.frame > frames.length || !text(step.label, 120) || !text(step.description, 1500)) throw new Error('The model returned steps without valid frame references. Try the analysis again.');
    const mapped = mappedStep(step, provider, connectors);
    if (!mapped) questions.push(`How should "${text(step.label, 120)}" run automatically? Describe the action and the connection it should use${connectors.length ? ` (${connectors.map(c => c.name).join(', ')})` : '. No connection has been configured yet'}.`);
    return { at: frames[step.frame - 1].at, label: text(step.label, 120), description: text(step.description, 1500), ...mapped };
  }).sort((a, b) => a.at - b.at);
  if (questions.length) return questionResult(text(parsed.summary, 3000), questions, duration, frames);
  const summary = text(parsed.summary, 3000);
  const observed = steps.map(step => `[${stamp(step.at)}] ${step.label}: ${step.description}`).join('\n');
  const nodes = [
    { id: uid(), data: { kind: 'trigger', label: 'Start workflow', config: {} } },
    ...steps.map(step => ({ id: uid(), data: { kind: step.kind, label: step.label, config: { ...step.config, observation: { at: step.at, description: step.description } } } })),
    { id: uid(), data: { kind: 'output', label: 'View result', config: {} } }
  ].map((node, i) => ({ ...node, type: 'flux', position: { x: i * 310, y: 150 } }));
  const workflow = cleanWorkflow({
    id: uid(), name: text(parsed.name, 120), category: 'Video analysis',
    description: `${summary}\n\nRecording: ${fileName} (${stamp(duration)}), ${frames.length} observed events; audio: ${audioStatus}.\n${observed}`,
    nodes, edges: nodes.slice(1).map((node, i) => ({ id: uid(), source: nodes[i].id, target: node.id })),
    policy: { allowCloud: allowCloud && provider.scope === 'cloud', redactCloud: true }, schedule: { enabled: false, intervalMinutes: 60 }, delivery, incremental: true, updatedAt: now()
  });
  validateWorkflow(workflow);
  const issues = workflowIssues(workflow, { providers: list('providers'), connectors: list('connectors'), settings: settings() });
  if (issues.length) return questionResult(summary, issues.map(issue => `For "${workflow.nodes.find(n => n.id === issue.nodeId)?.data.label || workflow.name}", a requirement is missing: ${issue.message} Which approved alternative should the agent use?`), duration, frames);
  return { status: 'ready', workflow, summary, steps: steps.map(({ config, ...step }) => step), duration, frameCount: frames.length };
}
