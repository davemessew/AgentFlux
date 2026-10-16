import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Film, LoaderCircle } from 'lucide-react';
import { extractVideoFrames, videoTime, type VideoFrame } from './videoFrames';
import './video.css';

type Item = Record<string, any>;
export default function VideoWorkflow({ data, close, onOpen }: { data: Item; close: () => void; onOpen: (workflow: Item) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [providerId, setProviderId] = useState(data.providers.find((p: Item) => p.scope === 'local')?.id || data.providers[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Item | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [clarifications, setClarifications] = useState<{ question: string; answer: string }[]>([]);
  const prepared = useRef<{ file: File; frames: VideoFrame[]; duration: number } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const provider = data.providers.find((p: Item) => p.id === providerId);
  const cloud = provider?.scope === 'cloud';
  useEffect(() => () => { pending.current?.abort(); prepared.current = null; }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function analyse(event: FormEvent) {
    event.preventDefault();
    if (!file || !providerId || busy) return;
    const controller = new AbortController(); pending.current = controller;
    const replies = result?.status === 'questions' ? result.questions.map((question: string, index: number) => ({ question, answer: (answers[index] || '').trim() })) : [];
    if (replies.some((reply: { answer: string }) => !reply.answer)) { setError("Please answer the open questions."); return; }
    const conversation = [...clarifications, ...replies];
    setBusy(true); setError('');
    try {
      if (prepared.current?.file !== file) prepared.current = { file, ...await extractVideoFrames(file, controller.signal, setStatus) };
      const { frames, duration } = prepared.current;
      setStatus(`Analysing ${frames.length} frames. This may take a moment …`);
      const response = await fetch('/api/assistant/video-workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ fileName: file.name, duration, frames, prompt, providerId, allowCloud: consent, imageConsent: consent, clarifications: conversation })
      });
      const text = await response.text();
      let value: Item;
      try { value = JSON.parse(text); } catch { throw new Error("The server returned an unreadable response. Try again."); }
      if (!response.ok) throw new Error(value.error || "Video analysis failed.");
      setResult(value); setClarifications(conversation); setAnswers({});
      setStatus(value.status === 'questions' ? "The agent needs a quick answer." : "Analysis complete. Your workflow is ready.");
      if (value.status === 'ready') prepared.current = null;
    } catch (err: any) {
      if (!controller.signal.aborted) { setError(err.message || "Video analysis failed."); setStatus(''); }
    } finally {
      if (!controller.signal.aborted) { setBusy(false); pending.current = null; }
    }
  }

  function cancel() {
    pending.current?.abort(); pending.current = null; setBusy(false); setStatus("Analysis cancelled.");
  }

  function reset() {
    setResult(null); setStatus(''); setError(''); setAnswers({}); setClarifications([]); prepared.current = null;
  }

  return <div className="video-workflow">
    {!result && <form onSubmit={analyse}>
      <fieldset disabled={busy}>
        <label className="field video-file"><span><Film size={16}/>Select a recording</span><input type="file" accept="video/*,.mp4,.webm,.mov,.m4v" required onChange={e => { setFile(e.target.files?.[0] || null); reset(); }}/><small>Up to 250 MB and 30 minutes. MP4 or WebM with a codec supported by your browser.</small></label>
        {preview && <video className="video-preview" src={preview} controls preload="metadata" aria-label="Selected recording"/>}
        <label className="field"><span>What should the agent focus on? <small>(optional)</small></span><textarea rows={3} maxLength={2000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="For example: How is an invoice reviewed and filed?"/></label>
        <label className="field"><span>Vision model</span><select required value={providerId} onChange={e => { setProviderId(e.target.value); setConsent(false); }}><option value="">Select model</option>{data.providers.map((p: Item) => <option key={p.id} value={p.id}>{p.name} · {p.scope === 'local' ? "Local" : 'Cloud'}</option>)}</select><small>The selected model must support images. Text-only models cannot analyse video frames.</small></label>
        {!data.providers.length && <p className="video-notice">Connect a vision model under Models first.</p>}
        <p className="video-notice">Your browser extracts up to 24 evenly spaced frames. Only those images are analysed, without audio. Brief actions between frames may be missed.</p>
        {cloud && <>{!data.settings.allowCloud && <p className="video-error">Cloud transfers are disabled in Settings.</p>}<label className="video-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>Allow this cloud model to process the frames, filename, task and answers, and to be used for model steps in the generated workflow. Images are not automatically redacted.</span></label></>}
      </fieldset>
      {error && <p className="video-error" role="alert">{error}</p>}
      <p className="video-progress" role="status" aria-live="polite">{busy && <LoaderCircle size={16} className="spin"/>}{status}</p>
      <div className="modal-actions"><button type="button" className="button" onClick={busy ? cancel : close}>{busy ? "Cancel analysis" : "Close"}</button><button type="submit" className="button primary" disabled={busy || !file || !providerId || (cloud && (!consent || !data.settings.allowCloud))}><Film size={16}/>Analyse video</button></div>
    </form>}
    {result?.status === 'questions' && <form onSubmit={analyse} className="video-questions">
      <h3>A quick question</h3><p className="video-notice">{result.summary}</p>
      {!!clarifications.length && <details className="video-history"><summary>Previous answers</summary>{clarifications.map((reply, i) => <p key={i}><strong>{reply.question}</strong><br/>{reply.answer}</p>)}</details>}
      <fieldset disabled={busy}>{result.questions.map((question: string, i: number) => <label className="field" key={i}><span>{question}</span><textarea required rows={3} maxLength={4000} value={answers[i] || ''} onChange={e => setAnswers(previous => ({ ...previous, [i]: e.target.value }))} placeholder="Briefly describe what the agent should do …"/></label>)}</fieldset>
      {error && <p className="video-error" role="alert">{error}</p>}
      <p className="video-progress" role="status" aria-live="polite">{busy && <LoaderCircle size={16} className="spin"/>}{status}</p>
      <div className="modal-actions"><button type="button" className="button" onClick={busy ? cancel : reset}>{busy ? "Cancel analysis" : "Back to video"}</button><button type="submit" className="button primary" disabled={busy}>Send answer<ArrowRight size={16}/></button></div>
    </form>}
    {result?.status === 'ready' && <div className="video-result">
      <div className="video-result-heading"><span><Film size={19}/>{result.frameCount} frames · {videoTime(result.duration)}</span><h3>{result.workflow.name}</h3><p>{result.summary}</p></div>
      <ol className="video-steps">{result.steps.map((step: Item, i: number) => <li key={i}><time>{videoTime(step.at)}</time><div><strong>{step.label}</strong><p>{step.description}</p></div></li>)}</ol>
      <p className="video-notice">The steps are ready as an automated workflow. Save and run it in the editor.</p>
      <div className="modal-actions"><button className="button" onClick={reset}>Another video</button><button className="button primary" onClick={() => onOpen(result.workflow)}>Open in editor<ArrowRight size={16}/></button></div>
    </div>}
  </div>;
}
