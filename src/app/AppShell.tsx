import { parseWorkflow } from "../lib/workflow";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  Play,
  RefreshCw,
  Workflow,
  X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type {
  Connector,
  Provider,
  Run,
  WorkflowDefinition as WF,
  WorkflowTemplate,
} from "../../shared/domain";
import {
  cleanWorkflow,
  cloneWorkflow,
  workflowIssues,
  workflowKey,
} from "../../shared/workflow.mjs";
import { Button, IconBox, Logo, Modal } from "../components/ui";
import AgentsPage from "../features/agents/AgentsPage";
import {
  ConnectorModal,
  ConnectorsPage,
} from "../features/connections/Connections";
import { DataPage } from "../features/knowledge/Knowledge";
import { ModelsPage, ProviderModal } from "../features/models/Models";
import { Overview } from "../features/overview/Overview";
import { RunDrawer, RunsPage } from "../features/runs/Runs";
import { SettingsPage } from "../features/settings/Settings";
import VideoWorkflow from "../features/video/VideoWorkflow";
import { AssistantModal, WorkflowModal } from "../features/workflows/dialogs";
import { TemplatePage } from "../features/workflows/Templates";
import { api, errorMessage, post } from "../lib/api";
import { cx, downloadJson } from "../lib/format";
import { Sidebar, Topbar } from "./Chrome";
import { type View } from "./definitions";
import { initialWorkflow, restoreDraft } from "./drafts";
import { SearchModal } from "./Search";
import { useApplicationData } from "./useApplicationData";
const WorkflowPage = lazy(() => import("../features/workflows/WorkflowPage"));

export default function App() {
  const { data, refresh, loadError, connected, selectedRun, setSelectedRun } =
    useApplicationData();
  const [view, setView] = useState<View>(
    () => (location.hash.slice(1) as View) || "overview",
  );
  const [workflow, setWorkflow] = useState<WF | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
    id: number;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState<{
    type: string;
    item?: Partial<Connector> | Provider;
    preset?: string;
  } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const notify = useCallback(
    (message: string, error = false) =>
      setToast({ message, error, id: Date.now() }),
    [],
  );
  useEffect(() => {
    if (data)
      setWorkflow((current) => current || initialWorkflow(data.workflows));
  }, [data]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const go = (next: View) => {
    setView(next);
    location.hash = next;
    setMobileNav(false);
  };
  useEffect(() => {
    const h = () => setView((location.hash.slice(1) as View) || "overview");
    window.addEventListener("hashchange", h);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal({ type: "search" });
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", h);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const act = async <T,>(
    label: string,
    fn: () => Promise<T>,
  ): Promise<T | undefined> => {
    setBusy(label);
    try {
      return await fn();
    } catch (e: unknown) {
      notify(errorMessage(e), true);
    } finally {
      setBusy("");
    }
  };
  const savedWorkflow = data?.workflows.find((w) => w.id === workflow?.id);
  const dirty =
    !!workflow && workflowKey(workflow) !== workflowKey(savedWorkflow);
  useEffect(() => {
    if (!workflow) return;
    try {
      localStorage.setItem("agentflux:last-workflow", workflow.id);
      if (dirty)
        localStorage.setItem(
          "agentflux:draft:" + workflow.id,
          JSON.stringify(cleanWorkflow(workflow)),
        );
      else localStorage.removeItem("agentflux:draft:" + workflow.id);
    } catch {}
  }, [workflow, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const save = async (w = workflow) => {
    if (!w) throw new Error("No workflow selected.");
    const before = workflowKey(workflow);
    const saved = await post<WF>("/workflows", cleanWorkflow(w));
    setWorkflow((current) =>
      current?.id === saved.id && workflowKey(current) === before
        ? saved
        : current,
    );
    await refresh();
    return saved;
  };
  const run = () =>
    act("run", async () => {
      if (!workflow) throw new Error("Select a workflow first.");
      const issues = workflowIssues(workflow, data || {});
      if (issues.length) throw new Error(issues[0].message);
      const saved = await save();
      const r = await post<Run>(`/workflows/${saved.id}/run`);
      setSelectedRun(r);
      notify("Workflow started. Steps will appear live.");
    });
  const openWorkflow = (w: WF | undefined) => {
    if (!w) {
      go("templates");
      return;
    }
    setWorkflow(restoreDraft(structuredClone(w)));
    go("studio");
  };
  const newWorkflow = () => {
    const w: WF = {
      id: crypto.randomUUID(),
      name: "My new workflow",
      description: "",
      category: "Custom workflow",
      nodes: [
        {
          id: "start",
          type: "flux",
          position: { x: 100, y: 150 },
          data: { kind: "trigger", label: "Start workflow", config: {} },
        },
      ],
      edges: [],
      policy: { allowCloud: false, redactCloud: true },
      schedule: { enabled: false, intervalMinutes: 60 },
    };
    setWorkflow(w);
    go("studio");
  };
  const upload = async (files: FileList | File[]) =>
    act("upload", async () => {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const result = await api<{ count: number }>("/uploads", {
        method: "POST",
        body: form,
      });
      notify(`${result.count} records imported and saved.`);
      await refresh();
      window.dispatchEvent(new Event("records-changed"));
    });
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s" &&
        workflow
      ) {
        event.preventDefault();
        void act("save", async () => {
          await save();
          notify("Workflow saved.");
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [workflow]);
  const duplicateWorkflow = () => {
    if (!workflow) return;
    setWorkflow(cloneWorkflow(workflow, workflow.name + " (Copy)"));
    setModal(null);
    go("studio");
  };
  const useTemplate = (template: WorkflowTemplate) => {
    const next = cloneWorkflow(template.workflow, template.name);
    if (data?.providers.length === 1)
      next.nodes.forEach((n) => {
        if (n.data.kind === "model")
          n.data.config.providerId = data.providers[0].id;
      });
    setWorkflow(next);
    go("studio");
  };
  const importWorkflow = (file: File) =>
    act("import-workflow", async () => {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Workflow files must be no larger than 2 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      const raw = parseWorkflow(
        parsed && typeof parsed === "object" && "workflow" in parsed
          ? parsed.workflow
          : parsed,
      );
      const imported = cloneWorkflow(raw, raw.name + " (Import)");
      const saved = await post<WF>("/workflows", imported);
      await refresh();
      openWorkflow(saved);
      notify("Workflow imported. Assign sources and models in the editor.");
    });
  if (!data)
    return (
      <div className="boot-screen">
        <Logo />
        <h2>{loadError ? "AgentFlux is unavailable" : "Starting AgentFlux"}</h2>
        <p>{loadError || "Connecting to your local AgentFlux instance."}</p>
        {loadError && (
          <Button onClick={() => location.reload()} icon={RefreshCw}>
            Reconnect
          </Button>
        )}
      </div>
    );
  const currentRun = data.runs.find((r) => r.workflowId === workflow?.id);
  const activeRun = currentRun?.status === "running";
  return (
    <div className="app-shell">
      <Sidebar
        data={data}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        view={view}
        go={go}
        connected={connected}
        setModal={setModal}
      />
      <main className="main-shell">
        <Topbar
          mobileNav={mobileNav}
          setMobileNav={setMobileNav}
          view={view}
          setModal={setModal}
        />
        {view === "overview" && (
          <Overview
            data={data}
            openWorkflow={openWorkflow}
            go={go}
            newWorkflow={() => go("templates")}
            assistant={() => setModal({ type: "assistant" })}
          />
        )}
        {view === "templates" && (
          <TemplatePage
            data={data}
            choose={useTemplate}
            create={newWorkflow}
            importFile={importWorkflow}
            assistant={() => setModal({ type: "assistant" })}
            act={act}
            refresh={refresh}
          />
        )}
        {view === "agents" && (
          <AgentsPage
            data={data}
            notify={notify}
            refresh={refresh}
            onVideo={() => setModal({ type: "video" })}
            onRun={setSelectedRun}
            onOpenWorkflow={async (id: string) => {
              const next = await refresh();
              openWorkflow(next.workflows.find((w) => w.id === id));
            }}
          />
        )}
        {!connected && (
          <div className="connection-banner" role="status">
            Server connection lost. Changes remain saved as a draft in this
            browser.
          </div>
        )}
        {view === "studio" && (
          <Suspense fallback={<p className="page">Loading editor…</p>}>
            <WorkflowPage
              data={data}
              workflow={workflow}
              dirty={dirty}
              currentRun={currentRun}
              busy={busy}
              activeRun={activeRun}
              openWorkflow={openWorkflow}
              save={save}
              go={go}
              notify={notify}
              setModal={setModal}
              act={act}
              setSelectedRun={setSelectedRun}
              run={run}
              newWorkflow={newWorkflow}
              setWorkflow={setWorkflow}
            />
          </Suspense>
        )}
        {view === "data" && (
          <DataPage
            data={data}
            upload={upload}
            busy={busy}
            act={act}
            notify={notify}
            refresh={refresh}
          />
        )}
        {view === "connectors" && (
          <ConnectorsPage
            data={data}
            edit={(item?: Partial<Connector>) =>
              setModal({ type: "connector", item })
            }
            act={act}
            refresh={refresh}
            notify={notify}
          />
        )}
        {view === "models" && (
          <ModelsPage
            data={data}
            edit={(item?: Provider, preset?: string) =>
              setModal({ type: "provider", item, preset })
            }
            act={act}
            refresh={refresh}
            notify={notify}
            go={go}
          />
        )}
        {view === "runs" && (
          <RunsPage data={data} select={setSelectedRun} go={go} />
        )}
        {view === "settings" && (
          <SettingsPage
            data={data}
            act={act}
            refresh={refresh}
            notify={notify}
          />
        )}
      </main>
      {toast && (
        <div role="status" className={cx("toast", toast.error && "error")}>
          {toast.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal?.type === "connector" && (
        <ConnectorModal
          item={modal.item as Partial<Connector> | undefined}
          data={data}
          close={() => setModal(null)}
          onSave={(value) =>
            act("connector", async () => {
              await post("/connectors", value);
              await refresh();
              setModal(null);
              notify("Connection saved.");
            })
          }
          busy={busy}
        />
      )}
      {modal?.type === "provider" && (
        <ProviderModal
          data={data}
          item={modal.item as Provider | undefined}
          preset={modal.preset}
          close={() => setModal(null)}
          onSave={(value) =>
            act("provider", async () => {
              await post("/providers", value);
              await refresh();
              setModal(null);
              notify("Model connection saved.");
            })
          }
          busy={busy}
        />
      )}
      {modal?.type === "workflow" && workflow && (
        <WorkflowModal
          defaultDirectory={data.capabilities.outbox}
          workflow={workflow}
          onDuplicate={duplicateWorkflow}
          onSaveTemplate={() =>
            act("template", async () => {
              await post("/workflow-templates", {
                name: workflow.name,
                workflow: cleanWorkflow(workflow),
              });
              await refresh();
              notify("Saved as a template.");
            })
          }
          close={() => setModal(null)}
          onSave={(value) =>
            act("save", async () => {
              await save(value);
              setModal(null);
              notify("Workflow settings saved.");
            })
          }
          onExport={() => {
            downloadJson(workflow, `${workflow.name}.json`);
          }}
          onDelete={() =>
            act("delete", async () => {
              await api("/workflows/" + workflow.id, { method: "DELETE" });
              localStorage.removeItem("agentflux:draft:" + workflow.id);
              localStorage.removeItem("agentflux:last-workflow");
              setWorkflow(null);
              await refresh();
              setModal(null);
              go("overview");
            })
          }
        />
      )}
      {modal?.type === "assistant" && (
        <AssistantModal
          data={data}
          close={() => setModal(null)}
          busy={busy}
          onGenerate={(value) =>
            act("assistant", async () => {
              const w = await post<WF>("/assistant/workflow", value);
              setWorkflow(w);
              setModal(null);
              go("studio");
              notify("Draft created. Review the steps before running it.");
            })
          }
        />
      )}
      {modal?.type === "video" && (
        <Modal
          wide
          title="Workflow from a video"
          description="Let the agent identify visible actions and turn them into an editable workflow."
          onClose={() => setModal(null)}
        >
          <VideoWorkflow
            onSaved={(run) => {
              void refresh();
              if (run) setSelectedRun(run);
              notify(run ? "Workflow started." : "Workflow saved.");
            }}
            data={data}
            close={() => setModal(null)}
            onOpen={(w) => {
              setWorkflow(w);
              setModal(null);
              go("studio");
              notify("Workflow opened in the optional editor.");
            }}
          />
        </Modal>
      )}
      {modal?.type === "search" && (
        <SearchModal
          data={data}
          close={() => setModal(null)}
          choose={(w) => {
            openWorkflow(w);
            setModal(null);
          }}
          go={(v: View) => {
            go(v);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "help" && (
        <Modal
          title="Quick start"
          description="The example workflow uses synthetic data only."
          onClose={() => setModal(null)}
        >
          <div className="guide-list">
            <div>
              <IconBox icon={FolderOpen} color="blue" />
              <span>
                <strong>1. Connect your data</strong>
                <p>
                  Use the sample inbox, upload files or connect your own API.
                </p>
              </span>
            </div>
            <div>
              <IconBox icon={Workflow} color="purple" />
              <span>
                <strong>2. Edit the workflow</strong>
                <p>
                  Drag steps into the editor. Connect them and configure each
                  step.
                </p>
              </span>
            </div>
            <div>
              <IconBox icon={Play} color="green" />
              <span>
                <strong>3. Run and review</strong>
                <p>Each run shows its input data, outputs and any errors.</p>
              </span>
            </div>
          </div>
          <p className="fine-print">
            The included data is synthetic. AI steps need a model connection.
            External data transfers stay disabled until approved.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setModal(null);
              go("studio");
            }}
            icon={ArrowRight}
          >
            Open editor
          </Button>
        </Modal>
      )}
      {selectedRun && (
        <RunDrawer
          key={selectedRun.id}
          run={selectedRun}
          close={() => setSelectedRun(null)}
          act={act}
          notify={notify}
          select={setSelectedRun}
        />
      )}
    </div>
  );
}
