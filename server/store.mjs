import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv, randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DATA = resolve(process.env.AGENTFLUX_DATA_DIR || join(ROOT, 'data'));
export const INBOX = join(DATA, 'inbox');
mkdirSync(INBOX, { recursive: true });
const db = new DatabaseSync(join(DATA, 'agentflux.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS objects (collection TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(collection,id)); CREATE TABLE IF NOT EXISTS secrets (id TEXT PRIMARY KEY, value TEXT NOT NULL);`);
const keyPath = join(DATA, '.vault-key');
if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600 });
const key = readFileSync(keyPath);
export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
export function list(collection) { return db.prepare('SELECT body FROM objects WHERE collection=? ORDER BY rowid DESC').all(collection).map(r => JSON.parse(r.body)); }
export function get(collection, id) { const r = db.prepare('SELECT body FROM objects WHERE collection=? AND id=?').get(collection, id); return r ? JSON.parse(r.body) : null; }
export function put(collection, value) { db.prepare('INSERT INTO objects(collection,id,body) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET body=excluded.body').run(collection, value.id, JSON.stringify(value)); return value; }
export function remove(collection, id) { db.prepare('DELETE FROM objects WHERE collection=? AND id=?').run(collection, id); }
export function secretSet(id, value) {
  if (!value) { db.prepare('DELETE FROM secrets WHERE id=?').run(id); return; }
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  db.prepare('INSERT INTO secrets(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(id, Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64'));
}
export function secretGet(id) { const item = db.prepare('SELECT value FROM secrets WHERE id=?').get(id); if (!item) return ''; const b=Buffer.from(item.value,'base64'); const d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12)); d.setAuthTag(b.subarray(12,28)); return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8'); }
export function settings() { return get('settings','main') || {id:'main',allowCloud:false,redactCloud:true,retentionDays:30,redactionTerms:[],programsEnabled:false}; }
export function saveRecords(records) {
  const existing = new Map(list('records').map(r => [r.hash,r]));
  return records.map(r => {
    const content = typeof r.content === 'string' ? r.content : JSON.stringify(r.content ?? r, null, 2);
    const source = r.source || 'Workflow';
    const hash = createHash('sha256').update(source+'\n'+content).digest('hex');
    if (existing.has(hash)) return existing.get(hash);
    const value=put('records',{id:uid(),title:r.title || 'Dokument',content,source,classification:r.classification || 'internal',metadata:r.metadata || {},hash,createdAt:now()});
    existing.set(hash,value); return value;
  });
}
export function prune() { const days = Number(settings().retentionDays); if (!Number.isFinite(days) || days < 1) return; const cutoff=Date.now()-days*86400000; for(const r of list('runs')) if(r.status!=='running' && Date.parse(r.startedAt)<cutoff){remove('runs',r.id);remove('runResults',r.id);} }
