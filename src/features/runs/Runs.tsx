import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  History,
  Play,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  Bootstrap,
  RecordItem,
  Run,
  RunResult,
} from "../../../shared/domain";
import { kinds } from "../../app/definitions";
import {
  Button,
  Empty,
  IconBox,
  PageHeading,
  Status,
} from "../../components/ui";
import { api, post } from "../../lib/api";
import {
  downloadCsv,
  downloadJson,
  duration,
  formatDate,
} from "../../lib/format";
import type { Act, Go, Notify } from "../../lib/props";

export function RunsPage({
  data,
  select,
  go,
}: {
  data: Bootstrap;
  select: (run: Run) => void;
  go: Go;
}) {
  return (
    <div className="page">
      <PageHeading
        title="Runs"
        description="Executions, results and errors from your workflows."
      />
      {data.runs.length ? (
        <div className="runs-list">
          <div className="run-table-head">
            <span>Workflow</span>
            <span>Status</span>
            <span>Trigger</span>
            <span>Duration</span>
            <span>Start</span>
            <span />
          </div>
          {data.runs.map((run) => (
            <button
              className="run-table-row"
              key={run.id}
              onClick={() => select(run)}
            >
              <span className="run-title">
                <IconBox icon={Workflow} color="green" />
                <strong>{run.workflowName}</strong>
              </span>
              <Status status={run.status} />
              <span>
                {run.trigger === "schedule"
                  ? "Schedule"
                  : run.trigger === "agent"
                    ? "Agent"
                    : "Manual"}
              </span>
              <span>
                {run.durationMs !== undefined
                  ? duration(run.durationMs)
                  : "Running …"}
              </span>
              <span>{formatDate(run.startedAt)}</span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <Empty
          icon={History}
          title="No runs yet"
          description="Start a workflow to see its steps and results here."
        >
          <Button variant="primary" icon={Play} onClick={() => go("studio")}>
            Open workflow editor
          </Button>
        </Empty>
      )}
      <div className="privacy-strip">
        <Clock3 size={20} />
        <p>
          History is stored locally. Retention:{" "}
          <strong>{data.settings.retentionDays} days.</strong> The preview
          includes up to three documents per step.
        </p>
      </div>
    </div>
  );
}

export function RunDrawer({
  run,
  close,
  act,
  notify,
  select,
}: {
  run: Run;
  close: () => void;
  act: Act;
  notify: Notify;
  select: (run: Run) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [result, setResult] = useState<RecordItem[] | null>(null);
  const [resultError, setResultError] = useState("");
  const [resultInfo, setResultInfo] = useState({
    truncated: false,
    totalCount: 0,
  });
  useEffect(() => {
    let active = true;
    setResult(null);
    setResultError("");
    if (run.status !== "running")
      api<RunResult>("/runs/" + run.id + "/result")
        .then((value) => {
          if (active) {
            setResult(value.records || []);
            setResultInfo({
              truncated: value.truncated === true,
              totalCount: value.totalCount ?? value.records?.length ?? 0,
            });
          }
        })
        .catch((error) => {
          if (active) setResultError(error.message);
        });
    return () => {
      active = false;
    };
  }, [run.id, run.status]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close]);
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <aside
        className="run-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="View run"
      >
        <div className="drawer-top">
          <span>
            <History size={18} />
            Run
          </span>
          <button className="icon-button" aria-label="Close" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <h2>{run.workflowName}</h2>
        <div className="run-summary">
          <Status status={run.status} />
          <span>{formatDate(run.startedAt)}</span>
          {run.durationMs !== undefined && (
            <span>{duration(run.durationMs)}</span>
          )}
        </div>
        {run.error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            {run.error}
          </div>
        )}
        <section className="delivery-summary" aria-live="polite">
          <strong>
            {run.phase === "delivering"
              ? "Writing reports…"
              : run.delivery?.status === "delivered"
                ? "Delivered"
                : run.delivery?.status === "no_changes"
                  ? "No new inputs"
                  : "Results"}
          </strong>
          {run.delivery?.directory && (
            <>
              <p>
                <code>{run.delivery.directory}</code>
              </p>
              <p>
                {run.delivery.files.join(" · ")}
                {run.delivery.reused ? " · existing delivery reused" : ""}
              </p>
            </>
          )}
          {run.inputCount !== undefined && (
            <small>
              {run.inputCount} new or changed inputs · {run.skippedCount || 0}{" "}
              already delivered
            </small>
          )}
        </section>
        <div className="run-actions">
          {run.status === "running" ? (
            <Button
              variant="danger"
              onClick={() =>
                act("cancel", async () => {
                  await post("/runs/" + run.id + "/cancel");
                  notify("Cancellation requested. Completed writes are kept.");
                })
              }
            >
              Cancel run
            </Button>
          ) : (
            <Button
              icon={Play}
              onClick={() =>
                act("retry", async () => {
                  const next = await post<Run>("/runs/" + run.id + "/retry");
                  select(next);
                  notify("New run started with the saved settings.");
                })
              }
            >
              Run again
            </Button>
          )}
          <Button
            icon={Download}
            onClick={() =>
              downloadJson(run, `agentflux-verlauf-${run.id}.json`)
            }
          >
            Export history
          </Button>
        </div>
        <div className="run-step-list">
          {run.steps.map((step) => {
            const kind = kinds[step.kind] || kinds.source;
            return (
              <div className="run-step" key={step.nodeId}>
                <button
                  onClick={() =>
                    setOpen(open === step.nodeId ? null : step.nodeId)
                  }
                >
                  <IconBox icon={kind.icon} color={kind.color} />
                  <span>
                    <strong>{step.label}</strong>
                    <small>
                      {step.inputCount} in · {step.outputCount} out ·{" "}
                      {duration(step.durationMs)}
                    </small>
                  </span>
                  <Status status={step.status} />
                  <ChevronDown size={16} />
                </button>
                {step.detail && (
                  <div className="step-detail">{step.detail}</div>
                )}
                {step.error && <div className="step-error">{step.error}</div>}
                {open === step.nodeId && (
                  <div className="step-previews">
                    {step.preview?.length ? (
                      step.preview.map((preview, i: number) => (
                        <div key={i}>
                          <strong>{preview.title}</strong>
                          <pre>{preview.content}</pre>
                          <small>{preview.source}</small>
                        </div>
                      ))
                    ) : (
                      <p>No output for this step.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {run.status !== "running" && (
          <section className="run-results">
            <h3>
              {resultInfo.truncated ? "Limited result output" : "Full results"}
            </h3>
            {resultError ? (
              <p className="step-error">{resultError}</p>
            ) : result === null ? (
              <p>Loading results.</p>
            ) : (
              <>
                <p>
                  {resultInfo.truncated
                    ? `${result.length} of ${resultInfo.totalCount} records saved. Downloads contain this selection. Limit the input or split the workflow.`
                    : `${result.length} records from the final steps.`}{" "}
                  {run.recordCount || 0} saved to the knowledge base.
                </p>
                <div className="run-actions">
                  <Button
                    icon={Download}
                    disabled={!result.length}
                    onClick={() =>
                      downloadJson(
                        result,
                        `agentflux-ergebnisse-${run.id}.json`,
                      )
                    }
                  >
                    Download JSON
                  </Button>
                  <Button
                    icon={Download}
                    disabled={!result.length}
                    onClick={() =>
                      downloadCsv(result, `agentflux-ergebnisse-${run.id}.csv`)
                    }
                  >
                    Download CSV
                  </Button>
                </div>
                {result.slice(0, 10).map((record, index) => (
                  <details key={index}>
                    <summary>{record.title}</summary>
                    <pre>{record.content}</pre>
                    <small>{record.source}</small>
                  </details>
                ))}
                {result.length > 10 && (
                  <p>Downloads contain {result.length} saved records.</p>
                )}
              </>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}
