import {
  ArrowUpRight,
  BookOpen,
  Copy,
  Download,
  LoaderCircle,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type {
  Bootstrap,
  WorkflowDefinition as WF,
} from "../../../shared/domain";
import { DeliveryFields } from "../../components/DeliveryFields";
import { Button, Field, Modal, Toggle } from "../../components/ui";

export function WorkflowModal({
  workflow,
  defaultDirectory,
  close,
  onSave,
  onExport,
  onDelete,
  onDuplicate,
  onSaveTemplate,
}: {
  workflow: WF;
  defaultDirectory: string;
  close: () => void;
  onSave: (value: WF) => void;
  onExport: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
}) {
  const [form, setForm] = useState<WF>(structuredClone(workflow));
  return (
    <Modal title="Workflow settings" onClose={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <Field label="Name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={2}
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Toggle
          label="Allow cloud processing"
          description="Global approval in Settings is also required."
          checked={form.policy?.allowCloud}
          onChange={(value: boolean) =>
            setForm({ ...form, policy: { ...form.policy, allowCloud: value } })
          }
        />
        <Toggle
          label="Redact before cloud calls"
          checked={form.policy?.redactCloud !== false}
          onChange={(value: boolean) =>
            setForm({ ...form, policy: { ...form.policy, redactCloud: value } })
          }
        />
        <Toggle
          label="Run automatically"
          description="Only runs while AgentFlux is active. Program and POST sources require a manual start."
          checked={form.schedule?.enabled}
          onChange={(value: boolean) =>
            setForm({ ...form, schedule: { ...form.schedule, enabled: value } })
          }
        />
        {form.schedule?.enabled && (
          <Field label="Interval (minutes)">
            <input
              type="number"
              min="1"
              required
              value={form.schedule.intervalMinutes || 60}
              onChange={(e) =>
                setForm({
                  ...form,
                  schedule: {
                    ...form.schedule,
                    intervalMinutes: Number(e.target.value),
                  },
                })
              }
            />
          </Field>
        )}
        <Toggle
          label="Only new or changed inputs"
          checked={form.incremental}
          onChange={(incremental) => setForm({ ...form, incremental })}
          description="Inputs are remembered after successful delivery."
        />
        <DeliveryFields
          value={form.delivery}
          onChange={(delivery) => setForm({ ...form, delivery })}
          defaultDirectory={defaultDirectory}
        />
        <div className="workflow-modal-tools">
          <Button type="button" icon={Copy} onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button type="button" icon={BookOpen} onClick={onSaveTemplate}>
            Save as template
          </Button>
          <Button type="button" icon={Download} onClick={onExport}>
            Export JSON
          </Button>
          <Button
            type="button"
            variant="danger"
            icon={Trash2}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
        <div className="modal-actions">
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon={Save}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AssistantModal({
  data,
  close,
  onGenerate,
  busy,
}: {
  data: Bootstrap;
  close: () => void;
  onGenerate: (value: {
    prompt: string;
    providerId: string;
    allowCloud: boolean;
  }) => void;
  busy: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [providerId, setProviderId] = useState(data.providers[0]?.id || "");
  const [allowCloud, setAllowCloud] = useState(false);
  return (
    <Modal
      title="Draft a workflow with AI"
      description="The selected model creates a draft you can edit."
      onClose={close}
    >
      <div className="assistant-symbol">
        <Sparkles size={27} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGenerate({ prompt, providerId, allowCloud });
        }}
      >
        <Field label="What should the workflow do?">
          <textarea
            required
            minLength={5}
            maxLength={4000}
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Read files from my inbox, redact personal information and save a summary …"
          />
        </Field>
        <div className="suggestion-pills">
          {[
            "Import and clean data",
            "Filter important records",
            "Summarise documents",
          ].map((p) => (
            <button type="button" key={p} onClick={() => setPrompt(p)}>
              {p}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
        <Field label="Model for the draft">
          <select
            required
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            <option value="">Select model</option>
            {data.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.scope === "local" ? "Local" : "Cloud"}
              </option>
            ))}
          </select>
        </Field>
        {!data.providers.length && (
          <p className="field-info">
            Connect your model server under Models first. It will be called to
            create the draft.
          </p>
        )}
        {data.providers.find((p) => p.id === providerId)?.scope === "cloud" && (
          <Toggle
            checked={allowCloud}
            onChange={setAllowCloud}
            label="Send description to this cloud model"
            description="Sends your task and the names and types of your connections. No stored documents."
          />
        )}
        <div className="modal-actions">
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!!busy || !providerId}
            icon={busy === "assistant" ? LoaderCircle : Sparkles}
          >
            {busy === "assistant" ? "Creating draft …" : "Draft workflow"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
