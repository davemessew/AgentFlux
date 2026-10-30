import {
  Activity,
  BookOpen,
  Bot,
  Check,
  Download,
  Film,
  Lightbulb,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import "../../agents.css";
import { AgentCard } from "./AgentCard";
import { AgentForm } from "./AgentForm";
import { dateText } from "./format";
import { QuickTask } from "./QuickTask";
import { SkillForm } from "./SkillForm";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Agent,
  AgentState,
  Bootstrap,
  Run,
  Skill,
} from "../../../shared/domain";
import { api, errorMessage, post } from "../../lib/api";
type Tab = "agents" | "skills" | "learnings";
type Props = {
  data: Bootstrap;
  notify: (message: string, error?: boolean) => void;
  refresh: () => Promise<unknown>;
  onOpenWorkflow?: (workflowId: string) => void;
  onVideo: () => void;
  onRun: (run: Run) => void;
};

export default function AgentsPage({
  data,
  notify,
  refresh,
  onOpenWorkflow,
  onVideo,
  onRun,
}: Props) {
  const [quickTask, setQuickTask] = useState(false);
  const [tab, setTab] = useState<Tab>("agents");
  const [state, setState] = useState<AgentState>({
    agents: data.agents || [],
    skills: data.skills || [],
    learnings: data.learnings || [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [agentDraft, setAgentDraft] = useState<Agent | null>(null);
  const [skillDraft, setSkillDraft] = useState<Skill | null>(null);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setState(await api<AgentState>("/agents/state"));
      setError("");
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const events = new EventSource("/api/events");
    let timer: ReturnType<typeof setTimeout> | undefined;
    events.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (["agents", "skill", "learning", "run"].includes(message.type)) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            reload();
            refresh().catch(() => {});
          }, 180);
        }
      } catch {
        /* Unbekannte Serverereignisse werden ignoriert. */
      }
    };
    return () => {
      clearTimeout(timer);
      events.close();
    };
  }, [reload, refresh]);

  const act = async (
    key: string,
    action: () => Promise<unknown>,
    success?: string,
  ) => {
    setBusy(key);
    try {
      await action();
      await reload();
      await refresh();
      if (success) notify(success);
    } catch (e: unknown) {
      notify(errorMessage(e) || "Action failed.", true);
    } finally {
      setBusy("");
    }
  };

  const saveAgent = (event: FormEvent) => {
    event.preventDefault();
    if (!agentDraft) return;
    void act(
      "agent-save",
      async () => {
        await post("/agents", agentDraft);
        setAgentDraft(null);
      },
      "Agent saved.",
    );
  };
  const saveSkill = (event: FormEvent) => {
    event.preventDefault();
    if (!skillDraft) return;
    void act(
      "skill-save",
      async () => {
        await post("/skills", skillDraft);
        setSkillDraft(null);
      },
      "Skill saved.",
    );
  };
  const exportJson = (label: string, items: unknown[]) => {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `agentflux-${label}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const visibleAgents = useMemo(
    () =>
      state.agents.filter(
        (agent) =>
          !search ||
          `${agent.name} ${agent.objective}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [state.agents, search],
  );
  const activeSkills = useMemo(
    () => state.skills.filter((skill) => skill.status === "active").length,
    [state.skills],
  );
  const readyModels = data.providers || [];
  const connectors = data.connectors || [];

  return (
    <div className="page agents-page">
      {quickTask && (
        <QuickTask
          data={data}
          close={() => setQuickTask(false)}
          done={(run) => {
            if (run) onRun(run);
            void reload();
            void refresh();
            notify(
              "Task started. Progress and delivered files appear in Runs.",
            );
          }}
        />
      )}
      <div className="page-heading agents-heading">
        <div>
          <div className="agents-eyebrow">
            <span className="status-dot" />
            Agentic AI platform
          </div>
          <h1>Agents</h1>
          <p>
            Create agents that plan workflows from descriptions, read approved
            sources and run on your schedule.
          </p>
        </div>
        <div className="agents-heading-actions">
          <button className="button" onClick={onVideo}>
            <Film size={16} />
            Analyse video
          </button>
          <button
            className="button"
            onClick={() => void reload()}
            disabled={loading}
          >
            <RotateCcw size={15} className={loading ? "agents-spin" : ""} />
            Refresh
          </button>
          <button
            className="button primary"
            onClick={() => {
              setQuickTask(true);
            }}
          >
            <Plus size={16} />
            Create agent
          </button>
        </div>
      </div>
      <div className="agents-metrics">
        <div>
          <span>
            <Bot size={15} />
            Agents
          </span>
          <strong>{state.agents.length}</strong>
          <small>
            {state.agents.filter((agent) => agent.enabled).length} scheduled
          </small>
        </div>
        <div>
          <span>
            <BookOpen size={15} />
            Reviewed skills
          </span>
          <strong>{activeSkills}</strong>
          <small>{state.skills.length - activeSkills} awaiting review</small>
        </div>
        <div>
          <span>
            <Lightbulb size={15} />
            Observations
          </span>
          <strong>{state.learnings.length}</strong>
          <small>
            {
              state.learnings.filter((item) => item.status === "unreviewed")
                .length
            }{" "}
            unreviewed
          </small>
        </div>
      </div>
      <div className="agents-toolbar">
        <div className="agents-tabs" role="tablist" aria-label="Agent sections">
          <button
            role="tab"
            aria-selected={tab === "agents"}
            className={tab === "agents" ? "selected" : ""}
            onClick={() => setTab("agents")}
          >
            <Bot size={15} />
            Agents <span>{state.agents.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "skills"}
            className={tab === "skills" ? "selected" : ""}
            onClick={() => setTab("skills")}
          >
            <BookOpen size={15} />
            Skills <span>{state.skills.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "learnings"}
            className={tab === "learnings" ? "selected" : ""}
            onClick={() => setTab("learnings")}
          >
            <Lightbulb size={15} />
            Learnings <span>{state.learnings.length}</span>
          </button>
        </div>
        {tab === "agents" && (
          <input
            className="agents-search"
            aria-label="Search agents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents"
          />
        )}
        {tab === "skills" && (
          <button
            className="button"
            onClick={() =>
              setSkillDraft({
                name: "",
                description: "",
                instructions: "",
                status: "unreviewed",
              })
            }
          >
            <Plus size={15} />
            Add skill
          </button>
        )}
        {tab !== "agents" && (
          <button
            className="icon-button agents-export"
            title="Export JSON"
            onClick={() =>
              exportJson(tab, tab === "skills" ? state.skills : state.learnings)
            }
          >
            <Download size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="agents-error">
          <Activity size={17} />
          <span>{error}</span>
          <button onClick={() => void reload()}>Reload</button>
        </div>
      )}
      {tab === "agents" &&
        (visibleAgents.length ? (
          <div className="agent-grid">
            {visibleAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                readyModels={readyModels}
                busy={busy}
                act={act}
                setAgentDraft={setAgentDraft}
                onOpenWorkflow={onOpenWorkflow}
                reload={reload}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bot}
            title={search ? "No matches" : "No agents yet"}
            description={
              search
                ? "Try another search term."
                : "Describe a task. The agent plans a workflow and runs it when you start it or according to your schedule."
            }
            action={
              !search ? (
                <button
                  className="button primary"
                  onClick={() => {
                    setQuickTask(true);
                  }}
                >
                  <Plus size={15} />
                  Create agent
                </button>
              ) : null
            }
          />
        ))}

      {tab === "skills" &&
        (state.skills.length ? (
          <div className="agents-list">
            {state.skills.map((skill) => (
              <article className="knowledge-card" key={skill.id}>
                <div className="knowledge-icon">
                  <BookOpen size={17} />
                </div>
                <div className="knowledge-main">
                  <div className="knowledge-title">
                    <h2>{skill.name}</h2>
                    <span className={`review-label ${skill.status}`}>
                      {skill.status === "active"
                        ? "Reviewed"
                        : skill.status === "rejected"
                          ? "Rejected"
                          : "Needs review"}
                    </span>
                  </div>
                  <p>{skill.description || skill.instructions}</p>
                  <small>
                    Version {skill.version || 1}
                    {skill.sourceRunId
                      ? ` · from run ${skill.sourceRunId.slice(0, 8)}`
                      : ""}
                    {skill.updatedAt ? ` · ${dateText(skill.updatedAt)}` : ""}
                  </small>
                </div>
                <div className="knowledge-actions">
                  <button
                    className="icon-button"
                    title="Edit skill"
                    onClick={() => setSkillDraft(structuredClone(skill))}
                  >
                    <Save size={16} />
                  </button>
                  {skill.status !== "active" && (
                    <button
                      className="button"
                      onClick={() =>
                        void act(
                          `skill-review:${skill.id}`,
                          () => post("/skills", { ...skill, status: "active" }),
                          "Skill reviewed and approved.",
                        )
                      }
                    >
                      <Check size={15} />
                      Review
                    </button>
                  )}
                  <button
                    className="icon-button danger"
                    title="Delete skill"
                    onClick={() => {
                      if (window.confirm(`Delete skill “${skill.name}”?`))
                        void act(
                          `skill-delete:${skill.id}`,
                          () =>
                            api(`/skills/${skill.id}`, { method: "DELETE" }),
                          "Skill deleted.",
                        );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No skills yet"
            description="Add reusable instructions or enable skill creation in the agent settings. Review new skills before use."
            action={
              <button
                className="button primary"
                onClick={() =>
                  setSkillDraft({
                    name: "",
                    description: "",
                    instructions: "",
                    status: "unreviewed",
                  })
                }
              >
                <Plus size={15} />
                Add skill
              </button>
            }
          />
        ))}

      {tab === "learnings" &&
        (state.learnings.length ? (
          <div className="agents-list">
            {state.learnings.map((item) => (
              <article className="knowledge-card learning-card" key={item.id}>
                <div className="knowledge-icon learning">
                  <Lightbulb size={17} />
                </div>
                <div className="knowledge-main">
                  <div className="knowledge-title">
                    <h2>{item.title}</h2>
                    <span className={`review-label ${item.status}`}>
                      {item.status === "confirmed"
                        ? "Confirmed"
                        : item.status === "rejected"
                          ? "Rejected"
                          : "Observation"}
                    </span>
                  </div>
                  <p>{item.content}</p>
                  <small>
                    {item.agentName ||
                      state.agents.find((agent) => agent.id === item.agentId)
                        ?.name ||
                      "Deleted agent"}
                    {item.createdAt ? ` · ${dateText(item.createdAt)}` : ""}
                    {item.sourceRunId
                      ? ` · Run ${item.sourceRunId.slice(0, 8)}`
                      : ""}
                  </small>
                </div>
                <div className="knowledge-actions">
                  {item.status !== "confirmed" && (
                    <button
                      className="button"
                      onClick={() =>
                        void act(
                          `learning-review:${item.id}`,
                          () =>
                            post(`/learnings/${item.id}/review`, {
                              status: "confirmed",
                            }),
                          "Observation confirmed.",
                        )
                      }
                    >
                      <Check size={15} />
                      Confirm
                    </button>
                  )}
                  {item.status !== "rejected" && (
                    <button
                      className="icon-button danger"
                      title="Reject"
                      onClick={() =>
                        void act(
                          `learning-reject:${item.id}`,
                          () =>
                            post(`/learnings/${item.id}/review`, {
                              status: "rejected",
                            }),
                          "Observation rejected.",
                        )
                      }
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    className="icon-button danger"
                    title="Delete observation"
                    onClick={() => {
                      if (window.confirm(`Delete observation “${item.title}”?`))
                        void act(
                          `learning-delete:${item.id}`,
                          () =>
                            api(`/learnings/${item.id}`, { method: "DELETE" }),
                          "Observation deleted.",
                        );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No learnings yet"
            description="After a run, an agent can save observations for future planning. New observations are unreviewed."
          />
        ))}

      {agentDraft && (
        <AgentForm
          draft={agentDraft}
          onChange={setAgentDraft}
          onClose={() => setAgentDraft(null)}
          onSave={saveAgent}
          busy={busy}
          data={data}
          skills={state.skills}
        />
      )}

      {skillDraft && (
        <SkillForm
          draft={skillDraft}
          onChange={setSkillDraft}
          onClose={() => setSkillDraft(null)}
          onSave={saveSkill}
          busy={busy}
        />
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="agents-empty">
      <span>
        <Icon size={25} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
