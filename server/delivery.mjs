import { createHash } from 'node:crypto';
import { mkdir, realpath, rename, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { DATA, get, put, now } from './store.mjs';
import { cleanWorkflow } from '../shared/workflow.mjs';

export const OUTBOX = join(DATA, 'outbox');
export const outputRoots = () => [OUTBOX, ...(process.env.AGENTFLUX_OUTPUT_ROOTS || '').split(';').filter(Boolean)];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const inside = (root, path) => { const rel = relative(root, path); return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)); };

export function validateDelivery(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || typeof value.directory !== 'string' || !value.directory.trim() || value.directory.length > 4096) throw new Error('Choose an output directory.');
  if (!Array.isArray(value.formats) || !value.formats.length || value.formats.some(format => !['json', 'csv', 'md'].includes(format))) throw new Error('Choose JSON, CSV or Markdown output.');
  return { directory: value.directory, formats: [...new Set(value.formats)] };
}

export async function outputDirectory(directory) {
  await mkdir(OUTBOX, { recursive: true });
  const target = resolve(directory || OUTBOX);
  for (const candidate of outputRoots()) {
    const root = await realpath(candidate).catch(() => null);
    if (!root || !inside(resolve(candidate), target)) continue;
    // Check each existing ancestor before creating anything through a symlink.
    let current = root;
    for (const part of relative(resolve(candidate), target).split(/[\\/]/).filter(Boolean)) {
      current = join(current, part);
      await mkdir(current).catch(error => { if (error.code !== 'EEXIST') throw error; });
      current = await realpath(current);
      if (!inside(root, current)) throw new Error('Output directory escapes its configured root.');
    }
    return current;
  }
  throw new Error('Output directory is outside AGENTFLUX_OUTPUT_ROOTS. Use the outbox or mount and allow an output folder.');
}

export function executionRevision(workflow, connectors = [], providers = []) {
  const { updatedAt, schedule, ...plan } = cleanWorkflow(workflow);
  return hash({ plan, providers, sources: connectors.map(({ id, type, config }) => ({ id, type, config })) });
}

export function newInputs(workflow, revision, nodeId, records) {
  const previous = workflow.incremental ? new Set(get('checkpoints', `${workflow.id}:${revision}:${nodeId}`)?.fingerprints || []) : new Set();
  return records.map(record => {
    const { inputKeys, ...metadata } = record.metadata || {};
    const fingerprint = hash({ source: record.source, content: record.content, metadata });
    return { ...record, metadata: { ...metadata, inputKeys: [{ nodeId, fingerprint }] } };
  }).filter(record => !previous.has(record.metadata.inputKeys[0].fingerprint));
}

export function inputKeys(records) {
  const keys = new Map();
  for (const record of records) for (const key of record.metadata?.inputKeys || []) keys.set(`${key.nodeId}:${key.fingerprint}`, key);
  return [...keys.values()];
}

export function checkpoint(workflow, revision, records) {
  if (!workflow.incremental) return;
  const groups = new Map();
  for (const { nodeId, fingerprint } of inputKeys(records)) {
    if (!groups.has(nodeId)) groups.set(nodeId, []);
    groups.get(nodeId).push(fingerprint);
  }
  for (const [nodeId, fingerprints] of groups) {
    const id = `${workflow.id}:${revision}:${nodeId}`;
    put('checkpoints', { id, workflowId: workflow.id, revision, nodeId, fingerprints: [...new Set([...(get('checkpoints', id)?.fingerprints || []), ...fingerprints])], updatedAt: now() });
  }
}

const csvCell = value => '"' + String(value ?? '').replace(/^[=+@\-]/, match => `'${match}`).replace(/"/g, '""') + '"';
export function reportFor(records) {
  return records.map(record => {
    let tasks = [], summary = '';
    try { const parsed = JSON.parse(record.content); tasks = Array.isArray(parsed.tasks) ? parsed.tasks : []; summary = typeof parsed.summary === 'string' ? parsed.summary : ''; } catch {}
    return { title: record.title, content: record.content, source: record.source, references: record.metadata?.sources || [{ source: record.source, sheet: record.metadata?.sheet, row: record.metadata?.row }], tasks, summary };
  });
}

const sourceText = sources => (sources || []).map(item => typeof item === 'string' ? item : [item.source, item.sheet && `sheet ${item.sheet}`, item.row && `row ${item.row}`].filter(Boolean).join(', ')).join('; ');
const line = value => String(value ?? '').replace(/[\r\n]+/g, ' ');
function markdownReport(report) {
  return report.map(item => {
    if (!item.tasks.length) return `## ${line(item.title)}\n\n${item.summary || item.content}\n\nSources: ${sourceText(item.references)}\n`;
    return `## ${line(item.title)}\n\n${item.summary}\n\n` + item.tasks.map(task =>
      `### ${line(task.title)}\n\n${task.description || ''}\n\n` +
      `- Owner: ${line(task.owner || 'Unresolved')}\n- Due date: ${line(task.dueDate || 'Unresolved')}\n- Priority: ${line(task.priority || 'Unspecified')}\n- Sources: ${sourceText(task.sources)}\n` +
      (task.openQuestions?.length ? `\nOpen questions:\n${task.openQuestions.map(question => `- ${line(question)}`).join('\n')}\n` : '')
    ).join('\n');
  }).join('\n');
}
function csvReport(report) {
  const rows = [['Title', 'Description', 'Owner', 'Due date', 'Priority', 'Sources', 'Open questions']];
  for (const item of report) {
    if (item.tasks.length) for (const task of item.tasks) rows.push([task.title, task.description, task.owner, task.dueDate, task.priority, sourceText(task.sources), (task.openQuestions || []).join('; ')]);
    else rows.push([item.title, item.content, '', '', '', sourceText(item.references), '']);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export async function deliver(workflow, run, records, revision, signal) {
  const config = validateDelivery(workflow.delivery);
  if (!config || !records.length) return { status: records.length ? 'saved' : 'no_changes', files: [] };
  signal?.throwIfAborted();
  const directory = await outputDirectory(config.directory);
  const report = reportFor(records);
  const key = hash({ workflowId: workflow.id, revision, inputs: inputKeys(records).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)), report: inputKeys(records).length ? undefined : report });
  const target = join(directory, `agentflux-${key.slice(0, 24)}`);
  const existing = await readFile(join(target, 'manifest.json'), 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (existing) {
    if (existing.key !== key) throw new Error('An unrelated report already occupies the delivery path.');
    return { status: 'delivered', directory: target, files: existing.files, reused: true };
  }
  const staging = join(directory, `.agentflux-${run.id}.tmp`);
  await mkdir(staging, { recursive: false });
  const files = config.formats.map(format => `report.${format}`);
  try {
    for (const format of config.formats) {
      const content = format === 'json' ? JSON.stringify({ workflow: workflow.name, records: report }, null, 2)
        : format === 'csv' ? csvReport(report)
        : `# ${line(workflow.name)}\n\n` + markdownReport(report);
      await writeFile(join(staging, `report.${format}`), content, { flag: 'wx' });
    }
    await writeFile(join(staging, 'manifest.json'), JSON.stringify({ key, workflowId: workflow.id, revision, runId: run.id, files, createdAt: now() }), { flag: 'wx' });
    signal?.throwIfAborted();
    await rename(staging, target);
    return { status: 'delivered', directory: target, files, reused: false };
  } finally { await rm(staging, { recursive: true, force: true }); }
}
