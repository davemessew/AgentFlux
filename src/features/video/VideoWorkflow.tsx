import { CheckCircle2, Film, LoaderCircle, Play, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  Bootstrap,
  Delivery,
  Run,
  WorkflowDefinition,
} from "../../../shared/domain";
import type { MediaJob } from "../../../shared/media-types";
import { DeliveryFields } from "../../components/DeliveryFields";
import { Button, Field, Toggle } from "../../components/ui";
import { api, errorMessage, post } from "../../lib/api";
import "../../video.css";

const active = (job: MediaJob | null) =>
  !!job &&
  ["queued", "extracting", "transcribing", "analysing", "planning"].includes(
    job.status,
  );
const stamp = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
const phase: Record<string, string> = {
  queued: "Uploaded",
  extracting: "Finding screen changes",
  transcribing: "Transcribing speech",
  analysing: "Analysing this segment",
  planning: "Building the workflow",
  questions: "A few details are missing",
  ready: "Workflow ready",
  failed: "Analysis stopped",
  cancelled: "Cancelled",
};

export default function VideoWorkflow({
  data,
  close,
  onOpen,
  onSaved,
}: {
  data: Bootstrap;
  close: () => void;
  onOpen: (workflow: WorkflowDefinition) => void;
  onSaved: (run?: Run | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [providerId, setProvider] = useState(data.providers[0]?.id || ""),
    [prompt, setPrompt] = useState("");
  const [connectorIds, setConnectors] = useState<string[]>([]),
    [useKnowledgeBase, setKnowledge] = useState(false);
  const [analyzeAudio, setAudio] = useState(true),
    [imageConsent, setImageConsent] = useState(false),
    [audioConsent, setAudioConsent] = useState(false);
  const [maxCalls, setMaxCalls] = useState(40),
    [maxTokens, setMaxTokens] = useState(131072);
  const [delivery, setDelivery] = useState<Delivery | null>({
    directory: data.capabilities.outbox,
    formats: ["json", "md"],
  });
  const [job, setJob] = useState<MediaJob | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const running = active(job);
  const provider = data.providers.find((item) => item.id === providerId);
  const externalSpeech =
    analyzeAudio && data.settings.transcription?.scope === "cloud";
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    try {
      const id = localStorage.getItem("agentflux:video-job");
      if (id)
        void api<MediaJob>(`/video/jobs/${encodeURIComponent(id)}`)
          .then((value) => {
            setJob(value);
            setConnectors(value.configuration?.connectorIds || []);
            setKnowledge(value.configuration?.useKnowledgeBase || false);
          })
          .catch(() => localStorage.removeItem("agentflux:video-job"));
    } catch {}
  }, []);
  useEffect(() => {
    if (!job?.id || !running) return;
    const events = new EventSource(`/api/video/jobs/${job.id}/events`);
    events.onmessage = (message) => {
      try {
        const value: MediaJob = JSON.parse(message.data);
        setJob(value);
        setError("");
      } catch {}
    };
    events.onerror = () =>
      setError(
        "The connection was interrupted. Analysis continues on the server; reconnecting…",
      );
    return () => events.close();
  }, [job?.id, running]);

  async function start() {
    setBusy(true);
    setError("");
    try {
      if (!file) throw new Error("Choose a recording.");
      if (file.size > 250 * 1024 * 1024)
        throw new Error("Recordings must be no larger than 250 MB.");
      if (delivery)
        await post("/output-directory", { directory: delivery.directory });
      const body = new FormData();
      body.append("file", file);
      body.append(
        "options",
        JSON.stringify({
          providerId,
          prompt,
          connectorIds,
          useKnowledgeBase,
          analyzeAudio,
          imageConsent,
          audioConsent,
          allowCloud: imageConsent || audioConsent,
          delivery,
          maxCalls,
          maxTokens,
        }),
      );
      const next = await api<MediaJob>("/video/jobs", { method: "POST", body });
      setJob(next);
      setAnswers({});
      localStorage.setItem("agentflux:video-job", next.id);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function answer() {
    if (!job?.result?.questions) return;
    setBusy(true);
    setError("");
    try {
      setJob(
        await post<MediaJob>(`/video/jobs/${job.id}/answers`, {
          answers: job.result.questions.map((question) => ({
            question,
            answer: answers[question] || "",
          })),
          connectorIds,
          useKnowledgeBase,
        }),
      );
      setAnswers({});
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function save(run: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await post<{
        workflow: WorkflowDefinition;
        run: Run | null;
      }>(`/video/jobs/${job?.id}/save`, { run });
      onSaved(result.run);
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="video-workflow">
      <fieldset disabled={running || busy}>
        <Field
          label="Recording"
          hint="Up to 30 minutes and 250 MB. Raw media is removed after analysis or cancellation."
        >
          <input
            className="video-file"
            type="file"
            accept="video/*,.mkv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </Field>
        {preview && (
          <video
            className="video-preview"
            src={preview}
            controls
            preload="metadata"
          />
        )}
        <Field label="Vision model">
          <select
            value={providerId}
            required
            onChange={(event) => {
              setProvider(event.target.value);
              setImageConsent(false);
            }}
          >
            <option value="">Select a model with image support</option>
            {data.providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.model}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Focus (optional)">
          <textarea
            rows={2}
            maxLength={2000}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Explain the intake process and turn it into a recurring task."
          />
        </Field>
        <fieldset className="task-sources">
          <legend>Permitted workflow inputs</legend>
          {data.connectors
            .filter(
              (item) =>
                item.type !== "program" &&
                (item.type !== "http" ||
                  (item.config.method || "GET") === "GET"),
            )
            .map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={connectorIds.includes(item.id)}
                  onChange={(event) =>
                    setConnectors(
                      event.target.checked
                        ? [...connectorIds, item.id]
                        : connectorIds.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.name}
              </label>
            ))}
        </fieldset>
        <Toggle
          label="Allow knowledge base input"
          checked={useKnowledgeBase}
          onChange={setKnowledge}
        />
        <Toggle
          label="Analyse spoken explanations"
          checked={analyzeAudio}
          onChange={setAudio}
          description={`Speech service: ${data.settings.transcription?.scope || "local"} · ${data.settings.transcription?.model || "base"}. Configure it in Settings.`}
        />
        {provider?.scope === "cloud" && (
          <Toggle
            label="Send unredacted frames to this external model"
            checked={imageConsent}
            onChange={setImageConsent}
            description="Screenshots can contain private data. Global external transfers must also be enabled."
          />
        )}
        {externalSpeech && (
          <Toggle
            label="Send unredacted audio to the external speech service"
            checked={audioConsent}
            onChange={setAudioConsent}
            description="This approval is separate from permission to send images."
          />
        )}
        <DeliveryFields
          value={delivery}
          onChange={setDelivery}
          defaultDirectory={data.capabilities.outbox}
        />
        <details className="video-history">
          <summary>Analysis budget</summary>
          <div className="form-two">
            <Field label="Maximum model calls">
              <input
                type="number"
                min={2}
                max={64}
                value={maxCalls}
                onChange={(event) => setMaxCalls(Number(event.target.value))}
              />
            </Field>
            <Field label="Maximum reported tokens">
              <input
                type="number"
                min={4096}
                max={524288}
                step={4096}
                value={maxTokens}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
              />
            </Field>
          </div>
          <p>
            One visual analysis per minute, plus planning and any clarification
            rounds. Speech requests are separate. Token counts use provider
            usage when available.
          </p>
        </details>
      </fieldset>
      <p className="video-notice">
        Screen changes are sampled at two frames per second. Overlapping
        segments retain periodic frames and up to 24 selected images each. Brief
        actions can still be missed; the agent asks about uncertain steps.
        Workflows use supported connections, not desktop click replay.
      </p>
      {!running && (
        <Button
          icon={Film}
          variant="primary"
          disabled={
            busy ||
            !file ||
            !providerId ||
            (provider?.scope === "cloud" && !imageConsent) ||
            (externalSpeech && !audioConsent)
          }
          onClick={() => void start()}
        >
          {busy
            ? "Uploading…"
            : job
              ? "Analyse a new recording"
              : "Analyse recording"}
        </Button>
      )}
      {job && (
        <section className="video-job" aria-live="polite">
          <div className="video-progress">
            {running ? (
              <LoaderCircle className="spin" size={16} />
            ) : job.status === "ready" ? (
              <CheckCircle2 size={16} />
            ) : (
              <Film size={16} />
            )}
            <strong>{phase[job.status] || job.status}</strong>
            <span>{job.fileName}</span>
          </div>
          {job.coverage && (
            <>
              <progress
                value={job.coverage.completed}
                max={job.coverage.total}
              />
              <p>
                {job.coverage.completed}/{job.coverage.total} segments ·{" "}
                {stamp(job.coverage.coveredSeconds)}/
                {stamp(job.coverage.duration)} timeline covered ·{" "}
                {job.coverage.frameCount} selected images
              </p>
            </>
          )}
          <p>
            {job.budget.calls}/{job.budget.maxCalls} model calls ·{" "}
            {job.budget.tokens.toLocaleString()} tokens · audio:{" "}
            {job.audioStatus || "pending"}
          </p>
          {running && (
            <Button
              onClick={async () => {
                try {
                  await post(`/video/jobs/${job.id}/cancel`);
                } catch (cause) {
                  setError(errorMessage(cause));
                }
              }}
            >
              Cancel analysis
            </Button>
          )}
          {job.error && (
            <p className="video-error" role="alert">
              {job.error} No complete workflow was created.
            </p>
          )}
        </section>
      )}
      {job?.status === "questions" && (
        <form
          className="video-questions"
          onSubmit={(event) => {
            event.preventDefault();
            void answer();
          }}
        >
          <h3>A quick clarification</h3>
          <p>{job.result?.summary}</p>
          {job.result?.questions?.map((question) => (
            <Field key={question} label={question}>
              <textarea
                required
                rows={2}
                maxLength={4000}
                value={answers[question] || ""}
                onChange={(event) =>
                  setAnswers({ ...answers, [question]: event.target.value })
                }
              />
            </Field>
          ))}
          <Button variant="primary" disabled={busy}>
            Answer and continue
          </Button>
        </form>
      )}
      {job?.status === "ready" && job.result?.workflow && (
        <section className="video-result">
          <div className="video-result-heading">
            <h3>{job.result.workflow.name}</h3>
            <p>{job.result.summary}</p>
          </div>
          <ol className="video-steps">
            {job.result.steps?.map((step, index) => (
              <li key={index}>
                <time>{stamp(step.at)}</time>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="modal-actions">
            <Button
              disabled={busy}
              onClick={() => onOpen(job.result!.workflow!)}
            >
              Optional editor
            </Button>
            <Button
              icon={Save}
              disabled={busy}
              onClick={() => void save(false)}
            >
              Save workflow
            </Button>
            <Button
              icon={Play}
              variant="primary"
              disabled={busy}
              onClick={() => void save(true)}
            >
              Save and start
            </Button>
          </div>
        </section>
      )}
      {error && (
        <p className="video-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
