import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { EventEmitter, once } from 'node:events';
import express from 'express';
import ExcelJS from 'exceljs';

process.env.AGENTFLUX_DATA_DIR = await mkdtemp(join(tmpdir(), 'agentflux-contracts-'));
const store = await import('../server/store.mjs');
const { validateWorkflow, startRun, setPublisher } = await import('../server/engine.mjs');
const { selectedSkills, setupAgents } = await import('../server/agents.mjs');
const { cleanWorkflow } = await import('../shared/workflow.mjs');
const { extract } = await import('../server/connectors.mjs');
const { taskReport } = await import('../server/task-reports.mjs');
const { OUTBOX } = await import('../server/delivery.mjs');
const events = new EventEmitter();
let runtime;
setPublisher((type, value) => { runtime?.onRunEvent(type, value); events.emit(type, value); });

function waitFor(type, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { events.off(type, listener); reject(new Error(`Timed out waiting for ${type}`)); }, 10000);
    const listener = value => { if (predicate(value)) { clearTimeout(timeout); events.off(type, listener); resolve(value); } };
    events.on(type, listener);
  });
}
function workflow(id, config = { mode: 'connector', connectorId: 'input' }) {
  const nodes = ['trigger', 'source', 'output'].map((kind, index) => ({ id: kind, type: 'flux', position: { x: index * 280, y: 0 }, data: { kind, label: kind, config: kind === 'source' ? config : {} } }));
  return { id, name: id, nodes, edges: [{ id: 'a', source: 'trigger', target: 'source' }, { id: 'b', source: 'source', target: 'output' }], policy: { allowCloud: false }, schedule: { enabled: false }, delivery: { directory: OUTBOX, formats: ['json', 'csv', 'md'] }, incremental: true };
}
async function execute(value) { const done = waitFor('run', run => run.workflowId === value.id && run.status !== 'running'); startRun(value); return done; }
store.put('connectors', { id: 'input', name: 'Requests', type: 'text', config: { text: JSON.stringify([{ title: 'Order', content: 'Call Jane about order 42.' }]) } });

test('connector sources, legacy sources and impossible combinations', async () => {
  assert.doesNotThrow(() => validateWorkflow(workflow('connector')));
  assert.equal(cleanWorkflow(workflow('legacy', { connectorId: 'input' })).nodes[1].data.config.mode, 'connector');
  assert.throws(() => validateWorkflow(workflow('invalid', { mode: 'library', connectorId: 'input' })), /cannot also/);
  const result = await execute(workflow('inline', { mode: 'inline', text: 'Example input' }));
  assert.equal(result.status, 'completed');
  assert.equal(store.get('runResults', result.id).records[0].content, 'Example input');
});

test('unreviewed generated skills never become active instructions', () => {
  store.put('skills', { id: 'approved', status: 'active', instructions: 'Approved instruction' });
  store.put('skills', { id: 'suggestion', agentId: 'agent', status: 'unreviewed', instructions: 'Unreviewed instruction' });
  assert.deepEqual(selectedSkills({ id: 'agent', skillIds: ['approved', 'suggestion'], createSkills: true }).map(skill => skill.id), ['approved']);
});

test('spreadsheets expose unique named fields and preserve source coordinates', async () => {
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('Orders');
  sheet.addRow(['Customer', 'Amount', 'Amount', '']); sheet.addRow(['Alice', 20, { formula: 'B2*2', result: 40 }, 'Open']);
  const other = book.addWorksheet('Archive'); other.addRow(['Name']); other.addRow(['Old']);
  const records = await extract(Buffer.from(await book.xlsx.writeBuffer()), 'orders.xlsx', { sheet: 'Orders', headerRow: 1 });
  assert.equal(records.length, 1);
  assert.deepEqual(JSON.parse(records[0].content), { Customer: 'Alice', Amount: 20, Amount_2: 40, column_4: 'Open' });
  assert.equal(records[0].metadata.sheet, 'Orders'); assert.equal(records[0].metadata.row, 2);
});

test('delivery commits before checkpointing, repeated inputs are skipped and changed inputs run', async () => {
  const value = workflow('incremental');
  const first = await execute(value);
  assert.equal(first.status, 'completed'); assert.equal(first.delivery.status, 'delivered');
  const report = JSON.parse(await readFile(join(first.delivery.directory, 'report.json')));
  assert.equal(report.records[0].source, 'Requests');
  assert.equal((await readdir(first.delivery.directory)).length, 4);
  const second = await execute(value);
  assert.equal(second.delivery.status, 'no_changes'); assert.equal(second.outputCount, 0); assert.equal(second.skippedCount, 1);
  store.put('connectors', { ...store.get('connectors', 'input'), config: { text: JSON.stringify([{ title: 'Order', content: 'Call Jane about order 43.' }]) } });
  const third = await execute(value);
  assert.equal(third.outputCount, 1); assert.notEqual(third.delivery.directory, first.delivery.directory);
});

test('failed delivery does not advance input checkpoints and retry delivery is idempotent', async () => {
  const invalid = workflow('failure'); invalid.delivery.directory = join(tmpdir(), 'outside-approved-output');
  const failed = await execute(invalid);
  assert.equal(failed.status, 'failed');
  assert.equal(store.list('checkpoints').filter(item => item.workflowId === invalid.id).length, 0);
  const retry = workflow('retry'); retry.incremental = false;
  const a = await execute(retry), b = await execute(retry);
  assert.equal(a.delivery.directory, b.delivery.directory); assert.equal(b.delivery.reused, true);
});

test('structured reports reject invented citations and leave unsupported fields unresolved', () => {
  const records = [{ title: 'Note', source: 'note.md', content: 'Call Jane.', metadata: {} }];
  const report = JSON.parse(taskReport(JSON.stringify({ tasks: [{ title: 'Call Jane', sourceRefs: ['source-1'], owner: 'Bob', dueDate: '2030-01-01' }] }), records));
  assert.equal(report.tasks[0].owner, null); assert.equal(report.tasks[0].dueDate, null);
  assert.equal(report.tasks[0].sources[0].source, 'note.md');
  assert.throws(() => taskReport(JSON.stringify({ tasks: [{ title: 'Fake', sourceRefs: ['source-9'] }] }), records), /not supplied/);
});

test('agent plans are reused, source changes revise the same plan and questions resume automatically', async () => {
  let planningCalls = 0, ask = false;
  const model = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const prompt = JSON.parse(body).messages[1].content;
    planningCalls++;
    const response = ask && !prompt.includes('Keep the original names') ? { questions: ['How should names be handled?'] } : workflow('generated');
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(response) } }], usage: { total_tokens: 40 } }));
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  store.put('providers', { id: 'test-model', name: 'Fixture', type: 'openai', scope: 'local', model: 'fixture', baseUrl: `http://127.0.0.1:${model.address().port}` });
  const app = express(); app.use(express.json()); runtime = setupAgents(app, { publish: (type, value) => events.emit(type, value), startRun, validateWorkflow });
  app.use((error, _req, res, _next) => res.status(400).json({ error: error.message }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const post = async (path, body = {}) => { const result = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const value = await result.json(); assert.equal(result.ok, true, JSON.stringify(value)); return value; };
  try {
    const agent = await post('/api/agents', { name: 'Recurring', objective: 'Read and prepare incoming requests.', providerId: 'test-model', connectorIds: ['input'], skillIds: [], learn: false, useKnowledgeBase: false, incremental: true });
    const cycle = async () => { const done = waitFor('agents', value => value.id === agent.id && value.status === 'completed'); await post(`/api/agents/${agent.id}/run`); return done; };
    const first = await cycle(), second = await cycle();
    assert.equal(planningCalls, 1); assert.equal(first.planWorkflowId, second.planWorkflowId);
    store.put('connectors', { ...store.get('connectors', 'input'), config: { text: 'A changed source.' } });
    const third = await cycle(); assert.equal(planningCalls, 2); assert.equal(third.planWorkflowId, first.planWorkflowId); assert.equal(third.planRevision, 2);
    const edited = store.get('workflows', third.planWorkflowId);
    edited.nodes.find(node => node.data.kind === 'source').data.config = { connectorId: 'not-selected' };
    store.put('workflows', edited);
    const repaired = await cycle();
    assert.equal(planningCalls, 3); assert.equal(repaired.planWorkflowId, first.planWorkflowId); assert.equal(repaired.planRevision, 3);
    ask = true;
    const waiting = waitFor('agents', value => value.id === agent.id && value.status === 'waiting'); await post(`/api/agents/${agent.id}/replan`); await waiting;
    const completed = waitFor('agents', value => value.id === agent.id && value.status === 'completed'); await post(`/api/agents/${agent.id}/answers`, { answers: { 'question-1': 'Keep the original names' } }); await completed;
    assert.equal(store.list('workflows').filter(item => item.agentId === agent.id).length, 1);
  } finally { runtime = null; server.closeAllConnections(); model.closeAllConnections(); await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => model.close(resolve))]); }
});


test('task delivery produces readable Markdown and one CSV row per task', async () => {
  const { deliver } = await import('../server/delivery.mjs');
  const source = [{ title: 'Note', source: 'note.md', content: 'Jane: urgent follow-up.', metadata: {} }];
  const content = taskReport(JSON.stringify({ summary: 'One follow-up.', tasks: [{ title: 'Call supplier', sourceRefs: ['source-1'], owner: 'Jane', priority: 'urgent' }] }), source);
  const result = await deliver(workflow('task-report'), { id: 'task-report' }, [{ title: 'Follow-ups', content, source: 'Report' }], 'report-test');
  const markdown = await readFile(join(result.directory, 'report.md'), 'utf8');
  assert.match(markdown, /### Call supplier/); assert.match(markdown, /Owner: Jane/); assert.match(markdown, /Due date: Unresolved/); assert.match(markdown, /Sources: note.md/);
  const csv = await readFile(join(result.directory, 'report.csv'), 'utf8');
  assert.match(csv, /"Call supplier","","Jane","","urgent","note.md"/);
});
