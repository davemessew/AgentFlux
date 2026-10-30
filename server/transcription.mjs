import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { request } from './connectors.mjs';
import { settings, secretGet } from './store.mjs';

export function transcriptionSettings() {
  return { baseUrl: process.env.AGENTFLUX_TRANSCRIPTION_URL || 'http://127.0.0.1:8090/v1', model: 'base', scope: 'local', ...(settings().transcription || {}) };
}

export async function transcribe(file, offset, duration, options, signal) {
  const config = transcriptionSettings();
  const external = config.scope === 'cloud';
  if (external && (!settings().allowCloud || !options.allowCloud || !options.audioConsent)) throw new Error('External transcription requires global approval and explicit consent to send unredacted audio.');
  const boundary = `AgentFlux-${randomUUID()}`;
  const bytes = await readFile(file);
  const fields = { model: config.model, response_format: 'verbose_json', 'timestamp_granularities[]': 'segment' };
  const chunks = Object.entries(fields).map(([key, value]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`));
  const body=Buffer.concat(chunks);
  const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': String(body.length) };
  const token = secretGet('transcription'); if (token) headers.Authorization = `Bearer ${token}`;
  const response = JSON.parse(await request(config.baseUrl.replace(/\/$/, '') + '/audio/transcriptions', { method: 'POST', headers, body, signal, timeoutMs: 300000 }, !external));
  if (!Array.isArray(response.segments)) throw new Error('The transcription service must return timestamped segments (verbose_json).');
  const segments = response.segments.map(segment => {
    if (typeof segment.text !== 'string' || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0 || segment.end < segment.start || segment.end > duration + 2) throw new Error('The transcription service returned invalid timestamps.');
    return { start: offset + segment.start, end: offset + Math.min(duration, segment.end), text: segment.text.trim().slice(0, 4000) };
  }).filter(segment => segment.text);
  if (segments.length > 500) throw new Error('Too many transcript segments were returned.');
  return { segments, language: response.language || null, external };
}
