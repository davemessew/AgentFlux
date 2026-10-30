import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function mediaCommand(executable, args, signal, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', failure;
    const stop = error => { failure = error; child.kill('SIGKILL'); };
    const abort = () => stop(signal.reason || new Error('Media analysis cancelled.'));
    const timer = setTimeout(() => stop(new Error('Media processing timed out.')), timeoutMs);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 2000000) stop(new Error('Media metadata is too large.')); });
    child.stderr.on('data', chunk => { stderr += chunk; if (stderr.length > 4000000) stop(new Error('Media decoder output limit exceeded.')); });
    child.on('error', error => { failure = error.code === 'ENOENT' ? new Error('FFmpeg and ffprobe are required. Use the Docker release or install both on the server.') : error; });
    child.on('close', code => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (failure) reject(failure); else if (code !== 0) reject(new Error(`Media decoding failed: ${stderr.slice(-800)}`)); else resolve({ stdout, stderr });
    });
  });
}

export async function probeVideo(file, signal) {
  const { stdout } = await mediaCommand(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', file], signal, 30000);
  const metadata = JSON.parse(stdout), video = metadata.streams?.find(stream => stream.codec_type === 'video');
  const duration = Number(metadata.format?.duration || video?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0 || duration > 1800) throw new Error('Choose a video between 0 and 30 minutes with a readable duration.');
  if (video.width * video.height > 3840 * 2160 * 2) throw new Error('Video resolution exceeds the decoding limit. Export at 4K or lower.');
  return { duration, width: video.width, height: video.height, hasAudio: metadata.streams.some(stream => stream.codec_type === 'audio') };
}

export function videoSegments(duration) {
  const segments = [];
  for (let start = 0; start < duration; start += 60) segments.push({ start: Math.max(0, start - 3), end: Math.min(duration, start + 63) });
  return segments;
}

export function selectFrames(candidates, start, end, limit = 24) {
  const selected = new Map();
  // Keep timeline coverage even in static scenes, then spend the remaining slots on changes.
  for (let at = start; at < end; at += 5) {
    const nearest = candidates.reduce((best, frame) => !best || Math.abs(frame.at - at) < Math.abs(best.at - at) ? frame : best, null);
    if (nearest) selected.set(nearest.at, nearest);
  }
  const seen = new Set([...selected.values()].map(frame => frame.hash));
  const changes = candidates.filter(frame => {
    if (selected.has(frame.at) || seen.has(frame.hash)) return false;
    seen.add(frame.hash); return true;
  });
  const remaining = Math.min(limit - selected.size, changes.length);
  for (let index = 0; index < remaining; index++) {
    const frame = changes[Math.floor(index * changes.length / remaining)];
    selected.set(frame.at, frame);
  }
  return [...selected.values()].sort((a, b) => a.at - b.at);
}

export async function extractSegment(file, directory, segment, signal, withAudio) {
  await mkdir(directory, { recursive: true });
  const duration = segment.end - segment.start;
  const input = ['-nostdin', '-hide_banner', '-protocol_whitelist', 'file,pipe', '-ss', String(segment.start), '-i', file, '-t', String(duration)];
  const filter = `trim=duration=${duration},setpts=PTS-STARTPTS,fps=2,scale=1280:1280:force_original_aspect_ratio=decrease,select='isnan(prev_selected_t)+gt(scene,0.008)+gte(t-prev_selected_t,5)',showinfo`;
  const { stderr } = await mediaCommand(process.env.FFMPEG_PATH || 'ffmpeg', [...input, '-an', '-vf', filter, '-fps_mode', 'vfr', '-q:v', '4', '-frames:v', '140', join(directory, 'frame-%04d.jpg')], signal);
  const timestamps = [...stderr.matchAll(/\bn:\s*\d+\s+pts:.*?pts_time:([\d.]+)/g)].map(match => segment.start + Number(match[1]));
  const names = (await readdir(directory)).filter(name => name.endsWith('.jpg')).sort();
  if (!names.length || names.length !== timestamps.length) throw new Error('Could not match decoded frames to their timestamps.');
  const candidates = [];
  for (let index = 0; index < names.length; index++) {
    const bytes = await readFile(join(directory, names[index]));
    if (bytes.length > 1000000) throw new Error('A video frame exceeds the 1 MB analysis limit.');
    candidates.push({ at: timestamps[index], image: bytes.toString('base64'), hash: createHash('sha256').update(bytes).digest('hex') });
  }
  const frames = selectFrames(candidates, segment.start, segment.end);
  let audio;
  if (withAudio) {
    audio = join(directory, 'audio.wav');
    await mediaCommand(process.env.FFMPEG_PATH || 'ffmpeg', [...input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audio], signal);
  }
  return { frames, audio, candidates: candidates.length, cleanup: () => rm(directory, { recursive: true, force: true }) };
}
