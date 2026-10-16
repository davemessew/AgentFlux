export type VideoFrame = { at: number; image: string };
const abortError = () => new DOMException("Cancelled", 'AbortError');

function waitForVideo(video: HTMLVideoElement, event: string, signal: AbortSignal, action?: () => void) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      video.removeEventListener(event, ready);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      error ? reject(error) : resolve();
    };
    const ready = () => finish();
    const failed = () => finish(new Error("Cannot read this video. Try an H.264 MP4 or WebM file."));
    const aborted = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error("Reading the video timed out. Try a shorter clip.")), 15000);
    video.addEventListener(event, ready, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
    else { try { action?.(); } catch (error) { finish(error as Error); } }
  });
}

export async function extractVideoFrames(file: File, signal: AbortSignal, progress: (message: string) => void) {
  if (!file.size || file.size > 250 * 1024 * 1024) throw new Error("Select a video no larger than 250 MB.");
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) throw new Error("Select a video file, such as MP4 or WebM.");
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  try {
    progress("Reading video …");
    await waitForVideo(video, 'loadeddata', signal, () => { video.src = url; video.load(); });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1800) throw new Error("Select a recording no longer than 30 minutes.");
    if (!video.videoWidth || !video.videoHeight) throw new Error("The video has no readable image track.");
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error("This browser cannot process the video frames.");
    const count = Math.min(24, Math.max(1, Math.ceil(duration)));
    const frames: VideoFrame[] = [];
    let bytes = 0;
    for (let i = 0; i < count; i++) {
      if (signal.aborted) throw abortError();
      const at = count === 1 ? 0 : i * Math.max(0, duration - 0.1) / (count - 1);
      if (Math.abs(video.currentTime - at) > 0.001) await waitForVideo(video, 'seeked', signal, () => { video.currentTime = at; });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg', 0.72).split(',')[1];
      bytes += image.length;
      if (image.length > 750000 || bytes > 10000000) throw new Error("The frames are too large. Use a lower-resolution recording.");
      frames.push({ at: Math.round(at * 100) / 100, image });
      progress(`Prepared frame ${i + 1} of ${count} …`);
    }
    return { frames, duration };
  } finally {
    video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
  }
}

export function videoTime(seconds: number) {
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
