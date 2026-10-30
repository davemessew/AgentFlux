import { useState } from "react";
import type {
  Agent,
  Bootstrap,
  Delivery,
  Run,
  WorkflowDefinition,
  WorkflowNode,
} from "../../../shared/domain";
import { DeliveryFields } from "../../components/DeliveryFields";
import { Button, Field, Modal, Toggle } from "../../components/ui";
import { errorMessage, post } from "../../lib/api";

export function QuickTask({
  data,
  close,
  done,
}: {
  data: Bootstrap;
  close: () => void;
  done: (run?: Run) => void;
}) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState<"tasks" | "text" | "prepare">("tasks");
  const [sources, setSources] = useState<string[]>([]);
  const [providerId, setProviderId] = useState(data.providers[0]?.id || "");
  const [delivery, setDelivery] = useState<Delivery | null>({
    directory: data.capabilities.outbox,
    formats: ["json", "md"],
  });
  const [intervalMinutes, setInterval] = useState(60);
  const [scheduled, setScheduled] = useState(false);
  const [allowCloud, setCloud] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const provider = data.providers.find((item) => item.id === providerId);
  async function start() {
    setBusy(true);
    setError("");
    try {
      if (!sources.length) throw new Error("Select at least one input source.");
      if (delivery)
        await post("/output-directory", { directory: delivery.directory });
      let startedRun: Run | undefined;
      if (mode === "prepare") {
        const nodes: WorkflowNode[] = [
          {
            id: "start",
            type: "flux",
            position: { x: 0, y: 100 },
            data: { kind: "trigger", label: "Start", config: {} },
          },
          ...sources.map((connectorId, index): WorkflowNode => ({
            id: `source-${index}`,
            type: "flux",
            position: { x: 280, y: index * 160 },
            data: {
              kind: "source",
              label:
                data.connectors.find((item) => item.id === connectorId)?.name ||
                "Input",
              config: { mode: "connector", connectorId },
            },
          })),
          {
            id: "clean",
            type: "flux",
            position: { x: 560, y: 100 },
            data: {
              kind: "transform",
              label: "Clean text",
              config: { operation: "clean" },
            },
          },
          {
            id: "output",
            type: "flux",
            position: { x: 840, y: 100 },
            data: { kind: "output", label: "Deliver results", config: {} },
          },
        ];
        const workflow: WorkflowDefinition = {
          id: crypto.randomUUID(),
          name,
          description:
            "Import changed records, clean text and deliver a report.",
          category: "Recurring task",
          nodes,
          edges: [
            ...sources.flatMap((_, index) => [
              { id: `in-${index}`, source: "start", target: `source-${index}` },
              {
                id: `out-${index}`,
                source: `source-${index}`,
                target: "clean",
              },
            ]),
            { id: "result", source: "clean", target: "output" },
          ],
          policy: { allowCloud: false, redactCloud: true },
          schedule: { enabled: scheduled, intervalMinutes },
          delivery,
          incremental: true,
        };
        const saved = await post<WorkflowDefinition>("/workflows", workflow);
        startedRun = await post<Run>(`/workflows/${saved.id}/run`);
      } else {
        const agent = await post<Agent>("/agents", {
          name,
          objective,
          providerId,
          connectorIds: sources,
          skillIds: [],
          intervalMinutes,
          enabled: scheduled,
          policy: { allowCloud },
          useMemory: true,
          useKnowledgeBase: false,
          learn: true,
          createSkills: false,
          maxSteps: 12,
          delivery,
          incremental: true,
          resultMode: mode,
        });
        await post(`/agents/${agent.id}/run`);
      }
      done(startedRun);
      close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title="Set up a recurring task"
      description="Choose the inputs and the result. The agent handles the steps and asks if anything is missing."
      onClose={close}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <Field label="Task name">
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekly action list"
          />
        </Field>
        <Field label="Result">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="tasks">
              Tasks with sources, owners and open questions
            </option>
            <option value="text">A report based on my instructions</option>
            <option value="prepare">
              Clean and export records without a model
            </option>
          </select>
        </Field>
        {mode !== "prepare" && (
          <Field label="What should the agent do?">
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={3}
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Find follow-ups in incoming documents. Include the source and leave missing owners or dates unresolved."
            />
          </Field>
        )}
        <fieldset className="task-sources">
          <legend>Permitted inputs</legend>
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
                  checked={sources.includes(item.id)}
                  onChange={(event) =>
                    setSources(
                      event.target.checked
                        ? [...sources, item.id]
                        : sources.filter((id) => id !== item.id),
                    )
                  }
                />
                <span>
                  {item.name}
                  <small>{item.type}</small>
                </span>
              </label>
            ))}
          {!data.connectors.length && <p>Add a connection first.</p>}
        </fieldset>
        {mode !== "prepare" && (
          <>
            <Field label="Model">
              <select
                required
                value={providerId}
                onChange={(event) => {
                  setProviderId(event.target.value);
                  setCloud(false);
                }}
              >
                <option value="">Select model</option>
                {data.providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.scope}
                  </option>
                ))}
              </select>
            </Field>
            {provider?.scope === "cloud" && (
              <Toggle
                label="Allow this external model"
                checked={allowCloud}
                onChange={setCloud}
                description="Requires global approval in Settings. Selected input data will be sent to the provider."
              />
            )}
          </>
        )}
        <DeliveryFields
          value={delivery}
          onChange={setDelivery}
          defaultDirectory={data.capabilities.outbox}
        />
        <Toggle
          label="Repeat automatically"
          checked={scheduled}
          onChange={setScheduled}
          description="Only new or changed inputs are processed after successful delivery."
        />
        {scheduled && (
          <Field label="Every (minutes)">
            <input
              type="number"
              min={1}
              max={525600}
              required
              value={intervalMinutes}
              onChange={(event) => setInterval(Number(event.target.value))}
            />
          </Field>
        )}
        {error && (
          <p role="alert" className="step-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy}>
            {busy ? "Starting…" : "Save and start"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
