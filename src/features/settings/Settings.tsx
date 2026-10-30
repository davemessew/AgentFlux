import {
  History,
  LockKeyhole,
  Save,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import type { Settings } from "../../../shared/domain";
import {
  Button,
  Field,
  IconBox,
  PageHeading,
  Toggle,
} from "../../components/ui";
import { post } from "../../lib/api";
import type { PageProps } from "../../lib/props";

export function SettingsPage({ data, act, refresh, notify }: PageProps) {
  const [form, setForm] = useState<Settings>(data.settings);
  const update = (p: Partial<Settings>) => setForm({ ...form, ...p });
  return (
    <div className="page settings-page">
      <PageHeading
        title="Settings"
        description="Choose how data is processed and which connections are allowed."
      >
        <Button
          variant="primary"
          icon={Save}
          onClick={() =>
            act("settings", async () => {
              await post("/settings", form);
              await refresh();
              notify("Settings saved.");
            })
          }
        >
          Save changes
        </Button>
      </PageHeading>
      <div className="settings-layout">
        <div>
          {form.transcription && (
            <section className="settings-section">
              <div className="settings-section-title">
                <h2>Speech recognition</h2>
              </div>
              <p>
                Docker includes local speech recognition with the base model.
                The model is separate from your vision provider.
              </p>
              <Field label="Speech API URL">
                <input
                  type="url"
                  required
                  value={form.transcription.baseUrl}
                  onChange={(event) =>
                    update({
                      transcription: {
                        ...form.transcription!,
                        baseUrl: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <div className="form-two">
                <Field label="Model">
                  <input
                    value={form.transcription.model}
                    onChange={(event) =>
                      update({
                        transcription: {
                          ...form.transcription!,
                          model: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Connection type">
                  <select
                    value={form.transcription.scope}
                    onChange={(event) =>
                      update({
                        transcription: {
                          ...form.transcription!,
                          scope: event.target.value as "local" | "cloud",
                        },
                      })
                    }
                  >
                    <option value="local">Local network</option>
                    <option value="cloud">External service</option>
                  </select>
                </Field>
              </div>
              <Field
                label="API key (optional)"
                hint={
                  form.transcription.hasKey
                    ? "A key is saved. Leave blank to keep it."
                    : "Stored encrypted on this instance."
                }
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.transcription.apiKey || ""}
                  onChange={(event) =>
                    update({
                      transcription: {
                        ...form.transcription!,
                        apiKey: event.target.value || undefined,
                      },
                    })
                  }
                />
              </Field>
              <p className="fine-print">
                External services need an audio transcription endpoint with
                timestamped verbose JSON. Every recording requires separate
                consent before audio is sent.
              </p>
            </section>
          )}
          <section className="settings-section">
            <div className="settings-section-title">
              <IconBox icon={ShieldCheck} color="green" />
              <div>
                <h2>Data and privacy</h2>
                <p>Explicit approval for external processing.</p>
              </div>
            </div>
            <Toggle
              checked={form.allowCloud}
              onChange={(v: boolean) => update({ allowCloud: v })}
              label="Allow external data transfers"
              description="Each workflow also needs its own approval for cloud models and external POST requests."
            />
            <Toggle
              checked={form.redactCloud}
              onChange={(v: boolean) => update({ redactCloud: v })}
              label="Redact before cloud calls"
              description="Replaces detected email addresses, Swiss phone numbers, social security numbers, IBANs and custom terms."
            />
            <Field
              label="Redact custom terms"
              hint="One term per line, e.g. names, customer numbers or internal project names."
            >
              <textarea
                rows={5}
                value={(form.redactionTerms || []).join("\n")}
                onChange={(e) =>
                  update({ redactionTerms: e.target.value.split("\n") })
                }
                placeholder="Internal project name&#10;Person's name"
              />
            </Field>
          </section>
          <section className="settings-section">
            <div className="settings-section-title">
              <IconBox icon={Terminal} color="orange" />
              <div>
                <h2>Local programs</h2>
                <p>Use existing applications as data sources.</p>
              </div>
            </div>
            <Toggle
              checked={form.programsEnabled}
              onChange={(v: boolean) => update({ programsEnabled: v })}
              label="Run registered programs"
              description="Only entries in data/programs.json. Fixed arguments, no shell, 30-second timeout."
            />
          </section>
          <section className="settings-section">
            <div className="settings-section-title">
              <IconBox icon={History} color="blue" />
              <div>
                <h2>Retention</h2>
                <p>History stays on this instance.</p>
              </div>
            </div>
            <Field
              label="Keep runs for (days)"
              hint="Knowledge base documents are managed separately and are not deleted automatically."
            >
              <input
                type="number"
                min="1"
                max="365"
                value={form.retentionDays}
                onChange={(e) =>
                  update({ retentionDays: Number(e.target.value) })
                }
              />
            </Field>
          </section>
        </div>
        <aside className="settings-aside">
          <div className="security-illustration">
            <LockKeyhole size={38} strokeWidth={1.2} />
          </div>
          <h3>Local storage</h3>
          <p>
            Workflows, documents and history are stored in the local SQLite
            database. API keys are encrypted on the same instance.
          </p>
          <div className="aside-facts">
            <span>
              Default deployment<strong>Localhost</strong>
            </span>
            <span>
              Database<strong>SQLite</strong>
            </span>
            <span>
              API keys<strong>AES-256-GCM</strong>
            </span>
            <span>
              Licence<strong>Apache 2.0</strong>
            </span>
          </div>
          <p className="fine-print">
            This is a single-user instance. Redaction does not guarantee
            anonymisation. Review external providers and their data handling
            before using business data.
          </p>
        </aside>
      </div>
    </div>
  );
}
