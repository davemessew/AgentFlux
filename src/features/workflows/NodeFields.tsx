import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";
import type { NodeConfig, WorkflowNode } from "../../../shared/domain";
import { kinds } from "../../app/definitions";
import { Field, IconBox, Toggle } from "../../components/ui";
import { cx, duration } from "../../lib/format";
import type { NodeFieldsProps } from "../../lib/props";

export function FluxNode({ data, selected }: NodeProps<WorkflowNode>) {
  const d = data;
  const kind = kinds[d.kind] || kinds.source;
  const Icon = kind.icon;
  return (
    <div
      className={cx(
        "flow-node",
        selected && "selected",
        d.runStatus && `run-${d.runStatus}`,
      )}
    >
      <div className="node-top">
        <IconBox icon={Icon} color={kind.color} />
        <span className="node-type">{kind.tag}</span>
        {d.runStatus === "completed" ? (
          <CheckCircle2 className="node-check" size={15} />
        ) : d.runStatus === "running" ? (
          <LoaderCircle className="spin" size={15} />
        ) : d.runStatus === "failed" ? (
          <AlertCircle className="node-error" size={15} />
        ) : (
          <MoreHorizontal size={16} />
        )}
      </div>
      <strong>{d.label}</strong>
      <div className="node-subtitle">{d.subtitle || kind.description}</div>
      <div className="node-bottom">
        <span className={cx("node-status-dot", kind.color)} />
        {d.runStatus === "completed"
          ? `${d.outputCount} records`
          : d.runStatus === "failed"
            ? "Step failed"
            : d.needsConfig
              ? "Configuration needed"
              : d.kind === "model" && !d.config?.providerId
                ? "Select model"
                : d.kind === "trigger"
                  ? "Manual / scheduled"
                  : "Ready"}
        <span>{d.durationMs !== undefined ? duration(d.durationMs) : ""}</span>
      </div>
      {d.kind !== "trigger" && (
        <Handle type="target" position={Position.Left} />
      )}{" "}
      {d.kind !== "output" &&
        (d.kind === "condition" ? (
          <>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              style={{ top: "40%" }}
            />
            <span className="branch-label yes">Yes</span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              style={{ top: "76%" }}
            />
            <span className="branch-label no">No</span>
          </>
        ) : (
          <Handle type="source" position={Position.Right} />
        ))}
    </div>
  );
}

export const nodeTypes = { flux: FluxNode };

export function ComparisonFields({
  config: c,
  update,
}: {
  config: NodeConfig;
  update: (patch: Partial<NodeConfig>) => void;
}) {
  return (
    <>
      <Field
        label="Field"
        hint="For example content, title or metadata.priority."
      >
        <input
          value={c.field || ""}
          onChange={(e) => update({ field: e.target.value })}
        />
      </Field>
      <Field label="Comparison">
        <select
          value={c.operator || "contains"}
          onChange={(e) => update({ operator: e.target.value })}
        >
          <option value="contains">contains</option>
          <option value="not_contains">does not contain</option>
          <option value="equals">equals</option>
          <option value="not_equals">does not equal</option>
          <option value="exists">exists</option>
          <option value="greater">is greater than</option>
          <option value="less">is less than</option>
        </select>
      </Field>
      {c.operator !== "exists" && (
        <Field label="Value">
          <input
            value={String(c.value ?? "")}
            onChange={(e) => update({ value: e.target.value })}
          />
        </Field>
      )}
    </>
  );
}

export function NodeFields({ node, data, update }: NodeFieldsProps) {
  const c = node.data.config || {};
  switch (node.data.kind) {
    case "trigger":
      return (
        <Field label="Initial input" hint="Passed to the first step.">
          <textarea
            rows={4}
            value={c.input || ""}
            placeholder="Optional context"
            onChange={(e) => update({ input: e.target.value })}
          />
        </Field>
      );
    case "source":
      return (
        <>
          <Field label="Source">
            <select
              value={
                c.mode === "library"
                  ? "__library"
                  : c.mode === "inline"
                    ? "__inline"
                    : c.connectorId || ""
              }
              onChange={(e) =>
                update(
                  e.target.value === "__library"
                    ? {
                        mode: "library",
                        connectorId: undefined,
                        text: undefined,
                      }
                    : e.target.value === "__inline"
                      ? {
                          mode: "inline",
                          connectorId: undefined,
                          query: undefined,
                          text: c.text || "",
                        }
                      : {
                          mode: "connector",
                          connectorId: e.target.value,
                          text: undefined,
                          query: undefined,
                        },
                )
              }
            >
              <option value="">Select source</option>
              <option value="__inline">Enter text or JSON</option>
              <option value="__library">Search knowledge base</option>
              {data.connectors.map((source) => (
                <option value={source.id} key={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </Field>
          {c.mode === "inline" && (
            <Field
              label="Text or JSON"
              hint="A JSON array creates one record per item."
            >
              <textarea
                className="code-input"
                rows={12}
                value={c.text || ""}
                onChange={(e) => update({ text: e.target.value })}
              />
            </Field>
          )}
          {c.mode === "library" && (
            <>
              <Field label="Search term">
                <input
                  value={c.query || ""}
                  onChange={(e) => update({ query: e.target.value })}
                />
              </Field>
              <Field label="Maximum documents">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={c.limit || 30}
                  onChange={(e) => update({ limit: Number(e.target.value) })}
                />
              </Field>
            </>
          )}
          <p className="field-info">
            Add more folders, APIs and programs under Connections.
          </p>
        </>
      );
    case "transform":
      return (
        <>
          <Field label="Processing">
            <select
              value={c.operation || "clean"}
              onChange={(e) =>
                update({
                  operation: e.target.value,
                  ...(["filter", "sort"].includes(e.target.value) && !c.field
                    ? { field: "content" }
                    : {}),
                })
              }
            >
              <option value="clean">Clean text</option>
              <option value="deduplicate">Remove duplicates</option>
              <option value="filter">Filter records</option>
              <option value="sort">Sort</option>
              <option value="limit">Limit count</option>
              <option value="fields">Map fields</option>
            </select>
          </Field>
          {c.operation === "filter" && (
            <ComparisonFields config={c} update={update} />
          )}
          {c.operation === "sort" && (
            <>
              <Field label="Field">
                <input
                  value={c.field || "title"}
                  onChange={(e) => update({ field: e.target.value })}
                />
              </Field>
              <Field label="Order">
                <select
                  value={c.direction || "asc"}
                  onChange={(e) =>
                    update({
                      direction: e.target.value as NodeConfig["direction"],
                    })
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </Field>
            </>
          )}
          {c.operation === "limit" && (
            <Field label="Count">
              <input
                type="number"
                min="1"
                max="500"
                value={c.limit || 10}
                onChange={(e) => update({ limit: Number(e.target.value) })}
              />
            </Field>
          )}
          {c.operation === "fields" && (
            <Field
              label="Field mapping (JSON)"
              hint='Beispiel: {"title":"title","abteilung":"metadata.department"}'
            >
              <textarea
                className="code-input"
                rows={7}
                value={
                  typeof c.mapping === "string"
                    ? c.mapping
                    : JSON.stringify(
                        c.mapping || { title: "title", text: "content" },
                        null,
                        2,
                      )
                }
                onChange={(e) => update({ mapping: e.target.value })}
              />
            </Field>
          )}
        </>
      );
    case "condition":
      return (
        <>
          <ComparisonFields config={c} update={update} />
          <p className="field-info">
            Connect Yes and No to their next steps. An unconnected output
            discards its matching records.
          </p>
        </>
      );
    case "model":
      return (
        <>
          <Field label="Model">
            <select
              value={c.providerId || ""}
              onChange={(e) => update({ providerId: e.target.value })}
            >
              <option value="">Select model</option>
              {data.providers.map((provider) => (
                <option value={provider.id} key={provider.id}>
                  {provider.name} ·{" "}
                  {provider.scope === "local" ? "Local" : "Cloud"}
                </option>
              ))}
            </select>
          </Field>
          {!data.providers.length && (
            <p className="field-info">Add a model server under Models.</p>
          )}
          <Field label="Task">
            <textarea
              rows={8}
              value={c.prompt || ""}
              onChange={(e) => update({ prompt: e.target.value })}
              placeholder="What should the model do with the incoming documents?"
            />
          </Field>
          <Field label="Processing">
            <select
              value={c.mode || "batch"}
              onChange={(e) =>
                update({ mode: e.target.value as NodeConfig["mode"] })
              }
            >
              <option value="batch">All documents together</option>
              <option value="per-record">
                Each document separately (up to 50)
              </option>
            </select>
          </Field>
          <div className="form-two">
            <Field label="Temperature">
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={c.temperature ?? 0.2}
                onChange={(e) =>
                  update({ temperature: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Output tokens">
              <input
                type="number"
                min="128"
                max="16384"
                step="128"
                value={c.maxTokens || 2048}
                onChange={(e) => update({ maxTokens: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Result title">
            <input
              value={c.title || ""}
              placeholder="Summary"
              onChange={(e) => update({ title: e.target.value })}
            />
          </Field>
        </>
      );
    case "agent":
      return (
        <>
          <Field label="Agent">
            <select
              value={c.agentId || ""}
              onChange={(e) => update({ agentId: e.target.value })}
            >
              <option value="">Select agent</option>
              {(data.agents || []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="field-info">
            Set up agents under Agents. This step processes incoming data using
            the agent's model and skills.
          </p>
          <Field
            label="Task for this step"
            hint="Leave blank to use the agent's saved task."
          >
            <textarea
              rows={8}
              value={c.prompt || ""}
              onChange={(e) => update({ prompt: e.target.value })}
              placeholder="What should the agent do here?"
            />
          </Field>
          <Toggle
            label="Use learnings"
            description="Include relevant saved observations as context."
            checked={c.useMemory !== false}
            onChange={(value: boolean) => update({ useMemory: value })}
          />
          <div className="field">
            <span>Additional skills</span>
            {(data.skills || [])
              .filter((skill) => skill.status === "active")
              .map((skill) => (
                <label className="skill-choice" key={skill.id}>
                  <input
                    type="checkbox"
                    checked={(c.skillIds || []).includes(skill.id)}
                    onChange={(e) =>
                      update({
                        skillIds: e.target.checked
                          ? [...(c.skillIds || []), skill.id]
                          : (c.skillIds || []).filter(
                              (id: string) => id !== skill.id,
                            ),
                      })
                    }
                  />
                  {skill.name}
                </label>
              ))}
            {!data.skills?.length && <small>No skills yet.</small>}
          </div>
        </>
      );
    case "redact":
      return (
        <div className="mask-explanation">
          <ShieldCheck size={23} />
          <strong>Redact before processing</strong>
          <p>
            Replaces detected email addresses, Swiss phone numbers, social
            security numbers, Swiss IBANs and custom terms.
          </p>
          <small>
            Add custom terms in Settings. Detection is not exhaustive.
          </small>
        </div>
      );
    case "store":
      return (
        <div className="field-info with-icon">
          <Database size={22} />
          <p>
            Saves documents locally. Identical content from the same source is
            not duplicated. The output can connect to further steps.
          </p>
        </div>
      );
    default:
      return (
        <div className="field-info with-icon">
          <FileText size={22} />
          <p>
            Full results are available to download as JSON and CSV in the run
            details.
          </p>
        </div>
      );
  }
}
