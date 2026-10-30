// Tests use their own container and volume; existing installations stay untouched.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';

const image = process.argv[2] || 'agentflux:0.3.0';
const keep = process.argv.includes('--keep');
const reportIndex = process.argv.indexOf('--report');
const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : null;
const id = `agentflux-release-test-${process.pid}-${Date.now()}`;
const volume = `${id}-data`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();
const socket = createServer();
await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const url = `http://127.0.0.1:${port}`;
const checks = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(check, description, timeout = 60000) {
  const end = Date.now() + timeout;
  let last, delay = 200;
  while (Date.now() < end) {
    const state = JSON.parse(docker('inspect', '--format', '{{json .State}}', id));
    assert.equal(state.Running, true, `Container exited with code ${state.ExitCode}`);
    try { const value = await check(); if (value) return value; } catch (error) { last = error; }
    await pause(delay);
    delay = Math.min(2000, delay * 1.5);
  }
  throw new Error(`${description} timed out${last ? ': ' + last.message : ''}`);
}

async function api(path, options = {}) {
  const response = await fetch(url + path, { ...options, signal: AbortSignal.timeout(10000), headers: { Origin: url, ...options.headers } });
  const text = await response.text();
  assert.equal(response.ok, true, `${path}: ${response.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function start() {
  docker('run', '-d', '--name', id, '--init', '--publish', `127.0.0.1:${port}:${port}`, '--env', `PORT=${port}`, '--mount', `type=volume,source=${volume},target=/app/data`, image);
}

function vaultHash() {
  return docker('exec', id, 'node', '--input-type=module', '-e', "import{readFileSync}from'node:fs';import{createHash}from'node:crypto';console.log(createHash('sha256').update(readFileSync('/app/data/.vault-key')).digest('hex'))");
}

let success = false, report;
try {
  docker('volume', 'create', volume);
  start();
  const health = await until(() => api('/api/health'), 'HTTP readiness');
  assert.equal(health.version, '0.3.0');
  assert.equal(health.name, 'AgentFlux');
  checks.push('HTTP health and release version');
  const html = await (await fetch(url)).text();
  assert.match(html, /<div id="root"><\/div>/);
  const asset = html.match(/src="([^\"]+\.js)"/);
  assert.ok(asset, 'Built frontend script is linked');
  assert.equal((await fetch(url + asset[1])).status, 200);
  checks.push('Built UI and JavaScript assets');
  const bootstrap = await api('/api/bootstrap');
  assert.equal(bootstrap.capabilities.container, true);
  assert.ok(bootstrap.workflows.some(w => w.id === 'document-flow'));
  assert.ok(bootstrap.templates.length >= 8);
  assert.equal(bootstrap.stats.records, 3);
  assert.equal(bootstrap.providers.length, 0);
  checks.push('Fresh data volume, sample workflows and templates');
  assert.equal(docker('exec', id, 'id', '-u'), '1000');
  checks.push('Container runs as non-root');
  assert.match(docker('exec', id, 'ffmpeg', '-version'), /ffmpeg version/);
  assert.match(docker('exec', id, 'ffprobe', '-version'), /ffprobe version/);
  checks.push('FFmpeg and ffprobe are included');
  await until(() => docker('inspect', '--format', '{{.State.Health.Status}}', id) === 'healthy', 'Docker healthcheck');
  checks.push('Docker reports healthy');
  const run = await api('/api/workflows/document-flow/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const completed = await until(async () => {
    const current = (await api('/api/runs')).find(r => r.id === run.id);
    if (current?.status === 'failed' || current?.status === 'cancelled') throw new Error(JSON.stringify(current));
    return current?.status === 'completed' && current;
  }, 'Sample workflow');
  assert.ok(completed.recordCount > 0);
  const result = await api(`/api/runs/${run.id}/result`);
  assert.ok(result.records.length > 0);
  checks.push('Sample workflow completes and exposes its result');
  const form = new FormData();
  form.append('files', new Blob(['Release smoke test: persistent local document.'], { type: 'text/plain' }), 'release-smoke.txt');
  const uploaded = await api('/api/uploads', { method: 'POST', body: form });
  assert.equal(uploaded.count, 1);
  const recordId = uploaded.records[0].id;
  const keyHash = vaultHash();
  docker('stop', '--time', '10', id);
  docker('rm', id);
  start();
  await until(() => api('/api/health'), 'Readiness after container recreation');
  const saved = await api(`/api/records/${recordId}`);
  assert.match(saved.content, /persistent local document/);
  assert.equal(vaultHash(), keyHash);
  assert.ok((await api('/api/runs')).some(r => r.id === run.id && r.status === 'completed'));
  checks.push('Document, completed run and vault key survive container recreation');
  const imageInfo = JSON.parse(docker('image', 'inspect', image))[0];
  report = { image, imageId: imageInfo.Id, platform: `${imageInfo.Os}/${imageInfo.Architecture}`, checks, url, container: keep ? id : null, volume: keep ? volume : null, passed: true };
  if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
  success = true;
} finally {
  if (!success) { try { execFileSync('docker', ['logs', '--tail', '30', id], { stdio: 'inherit', timeout: 10000 }); } catch {} }
  if (!keep || !success) {
    try { docker('rm', '-f', id); } catch {}
    try { docker('volume', 'rm', volume); } catch {}
  }
}
console.log(JSON.stringify(report, null, 2));
