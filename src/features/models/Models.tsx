import {
  ArrowRight,
  BrainCircuit,
  Globe2,
  Plug,
  Plus,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Bootstrap, Provider } from "../../../shared/domain";
import {
  Button,
  Field,
  IconBox,
  Modal,
  PageHeading,
} from "../../components/ui";
import { api, post } from "../../lib/api";
import { cx } from "../../lib/format";
import type { Go, PageProps } from "../../lib/props";

export function ModelsPage({
  data,
  edit,
  act,
  refresh,
  notify,
  go,
}: PageProps & { edit: (item?: Provider, preset?: string) => void; go: Go }) {
  return (
    <div className="page">
      <PageHeading
        title="Models"
        description="Connect a local model server or an external API."
      >
        <Button variant="primary" icon={Plus} onClick={() => edit()}>
          Connect model
        </Button>
      </PageHeading>
      <div className="model-intro">
        <div className="model-intro-copy">
          <span className="mini-label">
            <BrainCircuit size={16} /> Model connections
          </span>
          <h2>
            Local and external models
            <br />
            in the same workflow.
          </h2>
          <p>
            Each AI step uses your selected connection. Supports Ollama and
            OpenAI-compatible chat APIs.
          </p>
          <div className="model-protocols">
            <span>Ollama</span>
            <span>LM Studio</span>
            <span>vLLM</span>
            <span>OpenAI-compatible</span>
          </div>
        </div>
        <div className="model-art">
          <div className="model-orbit outer" />
          <div className="model-orbit inner" />
          <div className="model-art-center">
            <BrainCircuit size={45} strokeWidth={1.1} />
          </div>
          <span className="orbit-tag local">
            <Server size={15} />
            Local
          </span>
          <span className="orbit-tag cloud">
            <Globe2 size={15} />
            Cloud
          </span>
          <span className="model-art-dot a" />
          <span className="model-art-dot b" />
        </div>
      </div>
      <div className="section-heading spaced">
        <h2>
          Connected models <span>{data.providers.length}</span>
        </h2>
        <button className="text-button" onClick={() => go("settings")}>
          <ShieldCheck size={15} />
          Manage data permissions
        </button>
      </div>
      {data.providers.length ? (
        <div className="provider-list">
          {data.providers.map((p) => (
            <div className="provider-row" key={p.id}>
              <IconBox
                icon={p.scope === "local" ? Server : Globe2}
                color={p.scope === "local" ? "green" : "purple"}
                size="large"
              />
              <div>
                <strong>{p.name}</strong>
                <p>{p.model}</p>
                <code>{p.baseUrl}</code>
              </div>
              <span className={cx("badge", p.scope === "local" && "green")}>
                {p.scope === "local" ? "Local" : "Cloud"}
              </span>
              <div className="row-actions">
                <Button
                  icon={RefreshCw}
                  onClick={() =>
                    act("discover", async () => {
                      const result = await post<{ models: string[] }>(
                        `/providers/${p.id}/discover`,
                      );
                      notify(
                        `${result.models.length} models available: ${result.models.slice(0, 3).join(", ")}`,
                      );
                    })
                  }
                >
                  List models
                </Button>
                <button
                  className="icon-button"
                  aria-label="Edit model"
                  onClick={() => edit(p)}
                >
                  <Settings2 size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Remove model"
                  onClick={() =>
                    act("delete", async () => {
                      await api("/providers/" + p.id, { method: "DELETE" });
                      await refresh();
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="model-choices">
          <button onClick={() => edit(undefined, "ollama")}>
            <IconBox icon={Server} color="green" size="large" />
            <div>
              <h3>A local model</h3>
              <p>Connect Ollama or your local model server.</p>
              <span>
                Set up local server <ArrowRight size={15} />
              </span>
            </div>
            <span className="choice-badge">LOCAL</span>
          </button>
          <button onClick={() => edit(undefined, "cloud")}>
            <IconBox icon={Globe2} color="purple" size="large" />
            <div>
              <h3>An external model</h3>
              <p>
                Connect an external API. Data transfers require separate
                approval.
              </p>
              <span>
                Connect API <ArrowRight size={15} />
              </span>
            </div>
          </button>
        </div>
      )}
      <div className="privacy-strip">
        <ShieldCheck size={21} />
        <p>
          <strong>Cloud transfers are blocked by default.</strong> Cloud calls
          need global and per-workflow approval. Redaction can remove detected
          information but does not guarantee anonymisation.
        </p>
      </div>
    </div>
  );
}

export function ProviderModal({
  data,
  item,
  preset,
  close,
  onSave,
  busy,
}: {
  data: Bootstrap;
  item?: Provider;
  preset?: string;
  close: () => void;
  onSave: (value: Partial<Provider>) => void;
  busy: string;
}) {
  const [form, setForm] = useState<Omit<Provider, "id"> & { id?: string }>({
    ...{
      name: "",
      type: preset === "cloud" ? "openai" : "ollama",
      scope: preset === "cloud" ? "cloud" : "local",
      baseUrl:
        preset === "cloud"
          ? ""
          : data.capabilities.modelDefaults?.ollama || "http://127.0.0.1:11434",
      model: "",
    },
    ...item,
  });
  const update = (p: Partial<Provider>) => setForm({ ...form, ...p });
  return (
    <Modal
      title={item ? "Edit model" : "Add model"}
      description="Enter your server or provider's address and model ID."
      onClose={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        {!item && (
          <Field label="Server preset">
            <select
              defaultValue=""
              onChange={(e) => {
                const host = data.capabilities.container
                  ? "host.docker.internal"
                  : "127.0.0.1";
                const presets: Record<string, Partial<Provider>> = {
                  ollama: {
                    name: "Ollama",
                    type: "ollama",
                    scope: "local",
                    baseUrl: `http://${host}:11434`,
                  },
                  lmstudio: {
                    name: "LM Studio",
                    type: "openai",
                    scope: "local",
                    baseUrl: `http://${host}:1234/v1`,
                  },
                  vllm: {
                    name: "vLLM",
                    type: "openai",
                    scope: "local",
                    baseUrl: `http://${host}:8000/v1`,
                  },
                  external: {
                    name: "External model server",
                    type: "openai",
                    scope: "cloud",
                    baseUrl: "",
                  },
                };
                if (presets[e.target.value]) update(presets[e.target.value]);
              }}
            >
              <option value="">Choose preset</option>
              <option value="ollama">Ollama</option>
              <option value="lmstudio">LM Studio</option>
              <option value="vllm">vLLM</option>
              <option value="external">External compatible API</option>
            </select>
          </Field>
        )}
        <Field label="Display name">
          <input
            required
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Local model server"
          />
        </Field>
        <div className="form-two">
          <Field label="Protocol">
            <select
              value={form.type}
              onChange={(e) =>
                update({
                  type: e.target.value as Provider["type"],
                  baseUrl:
                    e.target.value === "ollama"
                      ? data.capabilities.modelDefaults?.ollama ||
                        "http://127.0.0.1:11434"
                      : data.capabilities.modelDefaults?.openai ||
                        "http://127.0.0.1:1234/v1",
                })
              }
            >
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI-compatible API</option>
            </select>
          </Field>
          <Field label="Connection type">
            <select
              value={form.scope}
              onChange={(e) =>
                update({ scope: e.target.value as Provider["scope"] })
              }
            >
              <option value="local">Local network</option>
              <option value="cloud">External cloud</option>
            </select>
          </Field>
        </div>
        <Field
          label="Base URL"
          hint={
            form.type === "ollama"
              ? "Without /api/chat. In Docker, use host.docker.internal if needed."
              : "Include the API prefix, e.g. http://localhost:1234/v1. Without /chat/completions."
          }
        >
          <input
            required
            type="url"
            value={form.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder="https://dein-anbieter.example/v1"
          />
        </Field>
        <Field
          label="Model ID"
          hint="The exact model name on your server or with your provider."
        >
          <input
            required
            value={form.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder="Enter model ID"
          />
        </Field>
        <Field
          label="API key (optional)"
          hint={
            item?.hasKey
              ? "A key is saved. Leave blank to keep it."
              : "Encrypted locally. Never returned to the browser."
          }
        >
          <input
            type="password"
            autoComplete="new-password"
            value={form.apiKey || ""}
            onChange={(e) => update({ apiKey: e.target.value || undefined })}
          />
        </Field>
        {form.scope === "cloud" && (
          <div className="field-info">
            External calls remain blocked until approved in Settings and in the
            workflow.
          </div>
        )}
        <div className="modal-actions">
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!!busy} icon={Plug}>
            Connect model
          </Button>
        </div>
      </form>
    </Modal>
  );
}
