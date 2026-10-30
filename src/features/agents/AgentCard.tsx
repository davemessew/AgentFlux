import {
  Bot,
  ChevronRight,
  Clock3,
  FileText,
  Pause,
  Play,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Agent, Provider } from "../../../shared/domain";
import { api, post } from "../../lib/api";
import { AgentQuestions } from "./Questions";
import { dateText, statusText } from "./format";
export function AgentCard({
  agent,
  readyModels,
  busy,
  act,
  setAgentDraft,
  onOpenWorkflow,
  reload,
}: {
  agent: Agent & { id: string };
  readyModels: Provider[];
  busy: string;
  act: (
    key: string,
    action: () => Promise<unknown>,
    success?: string,
  ) => Promise<void>;
  setAgentDraft: (agent: Agent) => void;
  onOpenWorkflow?: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const provider = readyModels.find((item) => item.id === agent.providerId);
  const busyKey = busy === `run:${agent.id}` || busy === `stop:${agent.id}`;
  const isRunning = ["planning", "running", "stopping", "learning"].includes(
    agent.status || "idle",
  );
  return (
    <article className="agent-card" key={agent.id}>
      <div className="agent-card-top">
        <span className="agent-icon">
          <Bot size={19} />
        </span>
        <span className={`agents-status ${agent.status || "idle"}`}>
          <i />
          {statusText[agent.status || "idle"] || "Ready"}
        </span>
        <button
          className="icon-button agent-delete"
          aria-label={`Delete ${agent.name}`}
          title="Delete agent"
          disabled={busyKey}
          onClick={() => {
            if (window.confirm(`Delete agent “${agent.name}”?`))
              void act(
                `delete:${agent.id}`,
                () => api(`/agents/${agent.id}`, { method: "DELETE" }),
                "Agent deleted.",
              );
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <h2>{agent.name}</h2>
      {agent.planRevision && (
        <small>
          Plan {agent.planRevision} · reused until the task or permissions
          change
        </small>
      )}
      {agent.status === "waiting" && (
        <AgentQuestions
          key={JSON.stringify(agent.pendingQuestions)}
          agent={agent}
          done={() => void reload()}
        />
      )}
      <p className="agent-objective">{agent.objective}</p>
      <div className="agent-facts">
        <span>
          <Sparkles size={13} />
          {provider?.name || "Model missing"}
          {provider?.model ? ` · ${provider.model}` : ""}
        </span>
        <span>
          <FileText size={13} />
          {agent.connectorIds?.length || 0} sources ·{" "}
          {agent.skillIds?.length || 0} Skills
        </span>
        <span>
          <Clock3 size={13} />
          {agent.enabled
            ? `Every ${agent.intervalMinutes} minutes`
            : "No schedule"}
        </span>
      </div>
      <div className="agent-last-run">
        {agent.lastRunAt ? (
          <>
            <span>Last run</span>
            <time>{dateText(agent.lastRunAt)}</time>
            <b className={agent.lastRunStatus}>
              {statusText[agent.lastRunStatus || "idle"] || agent.lastRunStatus}
            </b>
          </>
        ) : (
          <span>No runs yet</span>
        )}
      </div>
      {agent.lastError && (
        <p className="agent-inline-error">{agent.lastError}</p>
      )}
      {agent.lastLearningError && (
        <p className="agent-inline-warning">
          Analysis failed: {agent.lastLearningError}
        </p>
      )}
      <div className="agent-actions">
        {isRunning ? (
          <button
            className="button agent-stop"
            disabled={busy === `stop:${agent.id}`}
            onClick={() =>
              void act(
                `stop:${agent.id}`,
                () => post(`/agents/${agent.id}/stop`, {}),
                "Agent is stopping.",
              )
            }
          >
            <Pause size={15} />
            {agent.status === "learning" ? "Stop learning" : "Stop"}
          </button>
        ) : (
          <button
            className="button primary"
            disabled={busyKey || !provider || agent.status === "waiting"}
            onClick={() =>
              void act(
                `run:${agent.id}`,
                () => post(`/agents/${agent.id}/run`, {}),
                "Agent started.",
              )
            }
          >
            <Play size={15} />
            {busyKey ? "Starting …" : "Run now"}
          </button>
        )}
        <button
          className="button"
          disabled={busyKey}
          onClick={() => setAgentDraft(structuredClone(agent))}
        >
          <Save size={15} />
          Settings
        </button>
        {agent.planWorkflowId && !isRunning && (
          <button
            className="button"
            onClick={() =>
              void act(
                `replan:${agent.id}`,
                () => post(`/agents/${agent.id}/replan`, {}),
                "Creating a new plan.",
              )
            }
          >
            Replan
          </button>
        )}
        {agent.lastWorkflowId && (
          <button
            className="button agent-open-workflow"
            onClick={() => onOpenWorkflow?.(agent.lastWorkflowId!)}
            disabled={!onOpenWorkflow}
          >
            Open workflow
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
