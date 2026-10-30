import {
  ArrowUpRight,
  Check,
  Download,
  Plus,
  Settings2,
  Terminal,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type {
  Bootstrap,
  Connector,
  ConnectorConfig,
} from "../../../shared/domain";
import { connectorTypes } from "../../app/definitions";
import {
  Button,
  Field,
  IconBox,
  Modal,
  PageHeading,
} from "../../components/ui";
import { api, post } from "../../lib/api";
import type { PageProps } from "../../lib/props";

export function ConnectorsPage({
  data,
  edit,
  act,
  refresh,
  notify,
}: PageProps & { edit: (item?: Partial<Connector>) => void }) {
  return (
    <div className="page">
      <PageHeading
        title="Data sources"
        description="Set up folders, APIs, programs and text as reusable sources."
      >
        <Button icon={Plus} variant="primary" onClick={() => edit()}>
          New connection
        </Button>
      </PageHeading>
      <div className="connector-types">
        {Object.entries(connectorTypes).map(([type, t]) => (
          <button
            key={type}
            onClick={() =>
              edit({ type: type as Connector["type"], config: {} })
            }
          >
            <IconBox icon={t.icon} color={t.color} size="large" />
            <strong>{t.label}</strong>
            <span>{t.detail}</span>
            <ArrowUpRight size={17} />
          </button>
        ))}
      </div>
      <div className="section-heading spaced">
        <h2>
          Configured data sources <span>{data.connectors.length}</span>
        </h2>
        <span className="muted-caption">Reuse across workflows</span>
      </div>
      <div className="connector-list">
        {data.connectors.map((c) => {
          const t = connectorTypes[c.type];
          return (
            <div className="connector-row" key={c.id}>
              <IconBox icon={t.icon} color={t.color} size="large" />
              <div className="connector-info">
                <strong>{c.name}</strong>
                <p>{c.description || t.detail}</p>
                <code>
                  {c.type === "folder"
                    ? c.config.path
                    : c.type === "http"
                      ? c.config.url
                      : c.type === "program"
                        ? c.config.programId
                        : "Text / JSON"}
                </code>
              </div>
              <div className="connector-badges">
                <span className="badge">{t.label}</span>
                <small>
                  <span className="tiny-dot configured" />
                  Configured
                </small>
              </div>
              <div className="row-actions">
                <Button
                  onClick={() =>
                    act("import", async () => {
                      const result = await post<{ count: number }>(
                        `/connectors/${c.id}/import`,
                      );
                      await refresh();
                      notify(`${result.count} records imported.`);
                    })
                  }
                  icon={Download}
                >
                  Import
                </Button>
                <button
                  className="icon-button"
                  aria-label={`${c.name} bearbeiten`}
                  onClick={() => edit(c)}
                >
                  <Settings2 size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${c.name}`}
                  onClick={() =>
                    act("delete", async () => {
                      await api("/connectors/" + c.id, { method: "DELETE" });
                      await refresh();
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="integration-note">
        <div>
          <Terminal size={27} />
        </div>
        <span>
          <strong>Connect programs without an API</strong>
          <p>
            Registered programs can provide JSON or text. AgentFlux imports
            their output like any other source.
          </p>
        </span>
        <span className="badge">JSON · STDOUT · REST</span>
      </div>
    </div>
  );
}

export function ConnectorModal({
  item,
  data,
  close,
  onSave,
  busy,
}: {
  item?: Partial<Connector>;
  data: Bootstrap;
  close: () => void;
  onSave: (value: Partial<Connector>) => void;
  busy: string;
}) {
  const [headerText, setHeaderText] = useState(
    JSON.stringify(item?.config?.headers || {}, null, 2),
  );
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<Omit<Connector, "id"> & { id?: string }>({
    ...{
      name: "",
      type: "folder",
      description: "",
      config: { path: data.capabilities.inbox },
    },
    ...item,
  });
  const update = (p: Partial<Connector>) => setForm({ ...form, ...p });
  const config = (p: Partial<ConnectorConfig>) =>
    update({ config: { ...form.config, ...p } });
  return (
    <Modal
      title={item?.id ? "Edit connection" : "Add data source"}
      description="The saved source will be available in the workflow editor."
      onClose={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const value =
              form.type === "http"
                ? {
                    ...form,
                    config: { ...form.config, headers: JSON.parse(headerText) },
                  }
                : form;
            setFormError("");
            onSave(value);
          } catch {
            setFormError("Additional headers must be a valid JSON object.");
          }
        }}
      >
        <div className="form-two">
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Document archive"
            />
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) =>
                update({
                  type: e.target.value as Connector["type"],
                  config: {},
                })
              }
            >
              {Object.entries(connectorTypes).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <input
            value={form.description || ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What does your team use this source for?"
          />
        </Field>
        {form.type === "folder" && (
          <Field
            label="Folder path on the server"
            hint="The local inbox is allowed. Add other paths with AGENTFLUX_IMPORT_ROOTS."
          >
            <input
              required
              value={form.config.path || ""}
              onChange={(e) => config({ path: e.target.value })}
              placeholder={data.capabilities.inbox}
            />
          </Field>
        )}
        {form.type === "folder" && (
          <div className="form-two">
            <Field label="XLSX sheet" hint="Leave blank for all sheets.">
              <input
                value={form.config.sheet || ""}
                onChange={(event) => config({ sheet: event.target.value })}
              />
            </Field>
            <Field label="XLSX header row">
              <input
                type="number"
                min={1}
                max={100}
                value={form.config.headerRow || 1}
                onChange={(event) =>
                  config({ headerRow: Number(event.target.value) })
                }
              />
            </Field>
          </div>
        )}
        {form.type === "http" && (
          <>
            <div className="form-two url-form">
              <Field label="Method">
                <select
                  value={form.config.method || "GET"}
                  onChange={(e) => config({ method: e.target.value })}
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>
              </Field>
              <Field label="API URL">
                <input
                  type="url"
                  required
                  value={form.config.url || ""}
                  onChange={(e) => config({ url: e.target.value })}
                  placeholder="http://localhost:8080/api/records"
                />
              </Field>
            </div>
            <Field
              label="Bearer token (optional)"
              hint={
                form.hasSecret
                  ? "Credentials are saved. Leave blank to keep them."
                  : "Stored encrypted on your local instance."
              }
            >
              <input
                type="password"
                autoComplete="new-password"
                value={form.secret || ""}
                onChange={(e) =>
                  update({ secret: e.target.value || undefined })
                }
                placeholder={form.hasSecret ? "••••••••" : "Enter token"}
              />
            </Field>
            <Field
              label="Additional headers (JSON)"
              hint='Beispiel: {"X-Tenant":"team-a"}'
            >
              <textarea
                rows={3}
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
              />
            </Field>
            <Field
              label="Path to records"
              hint="Optional, e.g. data.items. Leave blank to import the entire response."
            >
              <input
                value={form.config.responsePath || ""}
                onChange={(e) => config({ responsePath: e.target.value })}
                placeholder="data.items"
              />
            </Field>
            <p className="field-info">
              POST receives incoming workflow records. External transfers
              require approval.
            </p>
          </>
        )}
        {form.type === "program" && (
          <>
            <Field label="Allowed program">
              <select
                required
                value={form.config.programId || ""}
                onChange={(e) => config({ programId: e.target.value })}
              >
                <option value="">Select program</option>
                {data.capabilities.programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <p className="field-info">
              Register programs in data/programs.json with a fixed executable
              and arguments. Enable execution in Settings.
            </p>
          </>
        )}
        {form.type === "text" && (
          <Field label="Content">
            <textarea
              required
              rows={7}
              value={form.config.text || ""}
              onChange={(e) => config({ text: e.target.value })}
              placeholder='Text oder [{"title":"Mein Dokument","content":"…"}]'
            />
          </Field>
        )}
        <div className="modal-actions">
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Check}
            disabled={!!busy}
          >
            Save connection
          </Button>
        </div>
        {formError && (
          <p role="alert" className="step-error">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
