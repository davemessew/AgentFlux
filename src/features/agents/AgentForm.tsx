import { Bot, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import type { Agent, Bootstrap, Skill } from "../../../shared/domain";
import { DeliveryFields } from "../../components/DeliveryFields";
export function AgentForm({
  draft,
  onChange,
  onClose,
  onSave,
  busy,
  data,
  skills,
}: {
  draft: Agent;
  onChange: (draft: Agent) => void;
  onClose: () => void;
  onSave: (event: FormEvent) => void;
  busy: string;
  data: Bootstrap;
  skills: (Skill & { id: string })[];
}) {
  const readyModels = data.providers,
    connectors = data.connectors,
    activeSkills = skills.filter((skill) => skill.status === "active").length;
  return (
    <div
      className="agents-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="agents-modal" onSubmit={onSave}>
        <div className="agents-modal-head">
          <div>
            <span className="agents-eyebrow">
              <Bot size={14} />
              Configuration
            </span>
            <h2>{draft.id ? "Edit agent" : "Create agent"}</h2>
            <p>
              The agent plans a workflow from your description. It runs when
              started manually or on your schedule.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={() => onClose()}
          >
            <X size={19} />
          </button>
        </div>
        <div className="agents-form-scroll">
          <DeliveryFields
            value={draft.delivery}
            onChange={(delivery) => onChange({ ...draft, delivery })}
            defaultDirectory={data.capabilities.outbox}
          />
          <label className="agents-toggle">
            <span>
              <strong>Only new or changed inputs</strong>
              <small>Progress advances after results are delivered.</small>
            </span>
            <input
              type="checkbox"
              checked={!!draft.incremental}
              onChange={(event) =>
                onChange({ ...draft, incremental: event.target.checked })
              }
            />
            <i />
          </label>
          <label className="agents-field">
            <span>Result type</span>
            <select
              value={draft.resultMode || "text"}
              onChange={(event) =>
                onChange({
                  ...draft,
                  resultMode: event.target.value as "tasks" | "text",
                })
              }
            >
              <option value="text">Report</option>
              <option value="tasks">Structured task list</option>
            </select>
          </label>
          <label className="agents-field">
            <span>Name</span>
            <input
              required
              maxLength={120}
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="For example: Weekly support report"
            />
          </label>
          <label className="agents-field">
            <span>Task</span>
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={5}
              value={draft.objective}
              onChange={(e) =>
                onChange({ ...draft, objective: e.target.value })
              }
              placeholder="What should the agent do regularly? Describe the result, limits and processing needed."
            />
            <small>The task is sent to the selected model for planning.</small>
          </label>
          <label className="agents-field">
            <span>Model</span>
            <select
              required
              value={draft.providerId}
              onChange={(e) => {
                const provider = readyModels.find(
                  (item) => item.id === e.target.value,
                );
                onChange({
                  ...draft,
                  providerId: e.target.value,
                  policy: {
                    ...draft.policy,
                    allowCloud:
                      provider?.scope === "cloud"
                        ? draft.policy?.allowCloud === true
                        : false,
                  },
                });
              }}
            >
              <option value="">Select model</option>
              {readyModels.map((provider) => (
                <option value={provider.id} key={provider.id}>
                  {provider.name} · {provider.model}
                  {provider.scope === "cloud" ? " · external" : " · local"}
                </option>
              ))}
            </select>
            {!readyModels.length && (
              <small>Connect a model under Models first.</small>
            )}
          </label>
          <div className="agents-field">
            <span>Read-only data sources</span>
            <small>
              Only selected sources are available. Programs and HTTP POST are
              blocked.
            </small>
            <div className="agents-check-grid">
              {connectors
                .filter(
                  (connector) =>
                    connector.type !== "program" &&
                    (connector.type !== "http" ||
                      (connector.config?.method || "GET").toUpperCase() ===
                        "GET"),
                )
                .map((connector) => (
                  <label key={connector.id}>
                    <input
                      type="checkbox"
                      checked={(draft.connectorIds || []).includes(
                        connector.id,
                      )}
                      onChange={(event) =>
                        onChange({
                          ...draft,
                          connectorIds: event.target.checked
                            ? [...(draft.connectorIds || []), connector.id]
                            : draft.connectorIds.filter(
                                (id: string) => id !== connector.id,
                              ),
                        })
                      }
                    />
                    <span>
                      <strong>{connector.name}</strong>
                      <small>
                        {connector.type === "http"
                          ? "HTTP GET"
                          : connector.type === "folder"
                            ? "Folder"
                            : connector.type === "text"
                              ? "Text"
                              : connector.type}
                      </small>
                    </span>
                  </label>
                ))}
            </div>
            {!connectors.length && (
              <p className="agents-empty-hint">
                No data sources configured yet.
              </p>
            )}
          </div>
          <div className="agents-field">
            <span>Instructions with status</span>
            <small>
              Select reviewed skills. Suggested skills stay inactive until you
              approve them.
            </small>
            <div className="agents-check-grid">
              {skills
                .filter((skill) => skill.status === "active")
                .map((skill) => (
                  <label key={skill.id}>
                    <input
                      type="checkbox"
                      checked={(draft.skillIds || []).includes(skill.id)}
                      onChange={(event) =>
                        onChange({
                          ...draft,
                          skillIds: event.target.checked
                            ? [...(draft.skillIds || []), skill.id]
                            : draft.skillIds.filter(
                                (id: string) => id !== skill.id,
                              ),
                        })
                      }
                    />
                    <span>
                      <strong>{skill.name}</strong>
                      <small>Version {skill.version || 1}</small>
                    </span>
                  </label>
                ))}
            </div>
            {!activeSkills && (
              <p className="agents-empty-hint">
                Review a skill under Skills first.
              </p>
            )}
          </div>
          <label className="agents-field agents-interval">
            <span>Repeat</span>
            <div>
              <input
                type="number"
                min={1}
                max={525600}
                value={draft.intervalMinutes}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    intervalMinutes: Number(e.target.value),
                  })
                }
              />
              <span>minutes</span>
            </div>
            <small>
              The schedule starts the agent automatically. Sources remain
              read-only.
            </small>
          </label>
          <label className="agents-toggle">
            <span>
              <strong>Scheduled</strong>
              <small>
                The first run begins after the selected interval when saved.
              </small>
            </span>
            <input
              type="checkbox"
              checked={!!draft.enabled}
              onChange={(e) =>
                onChange({ ...draft, enabled: e.target.checked })
              }
            />
            <i />
          </label>
          <label className="agents-toggle">
            <span>
              <strong>Build learnings</strong>
              <small>Suggest observations after completed runs.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.learn !== false}
              onChange={(e) => onChange({ ...draft, learn: e.target.checked })}
            />
            <i />
          </label>
          <label className="agents-toggle">
            <span>
              <strong>Suggest skills</strong>
              <small>
                Create reusable instructions from runs; review before use.
              </small>
            </span>
            <input
              type="checkbox"
              checked={!!draft.createSkills}
              onChange={(e) =>
                onChange({
                  ...draft,
                  createSkills: e.target.checked,
                })
              }
            />
            <i />
          </label>
          <label className="agents-toggle">
            <span>
              <strong>Include observations</strong>
              <small>Use up to eight previous observations as context.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.useMemory !== false}
              onChange={(e) =>
                onChange({
                  ...draft,
                  useMemory: e.target.checked,
                })
              }
            />
            <i />
          </label>
          <label className="agents-toggle">
            <span>
              <strong>Use knowledge base documents</strong>
              <small>
                Include existing documents as context and allow them as a
                workflow source.
              </small>
            </span>
            <input
              type="checkbox"
              checked={draft.useKnowledgeBase !== false}
              onChange={(e) =>
                onChange({
                  ...draft,
                  useKnowledgeBase: e.target.checked,
                })
              }
            />
            <i />
          </label>
          {draft.providerId &&
            readyModels.find((provider) => provider.id === draft.providerId)
              ?.scope === "cloud" && (
              <label className="agents-toggle cloud-toggle">
                <span>
                  <strong>Allow external model</strong>
                  <small>
                    Also requires global cloud approval. Data is redacted before
                    transfer.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={!!draft.policy?.allowCloud}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      policy: {
                        ...draft.policy,
                        allowCloud: e.target.checked,
                      },
                    })
                  }
                />
                <i />
              </label>
            )}
          <label className="agents-field agents-interval">
            <span>Maximum workflow steps</span>
            <div>
              <input
                type="number"
                min={2}
                max={16}
                value={draft.maxSteps || 12}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    maxSteps: Number(e.target.value),
                  })
                }
              />
              <span>steps</span>
            </div>
            <small>Limits automatically planned workflows to 16 steps.</small>
          </label>
        </div>
        <div className="agents-modal-actions">
          <button type="button" className="button" onClick={() => onClose()}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy === "agent-save" || !readyModels.length}
          >
            <Save size={15} />
            {busy === "agent-save" ? "Saving …" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
