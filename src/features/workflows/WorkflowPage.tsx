import { ReactFlowProvider } from "@xyflow/react";
import {
  History,
  LoaderCircle,
  MousePointer2,
  Move,
  Play,
  Plus,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type {
  Bootstrap,
  Run,
  WorkflowDefinition as WF,
} from "../../../shared/domain";
import { kinds } from "../../app/definitions";
import { Button, Empty, IconBox } from "../../components/ui";
import { post } from "../../lib/api";
import { cx, formatDate } from "../../lib/format";
import type { Act, Go, Notify } from "../../lib/props";
import { NodeFields, nodeTypes } from "./NodeFields";
import WorkflowStudio from "./WorkflowStudio";
export default function WorkflowPage({
  data,
  workflow,
  dirty,
  currentRun,
  busy,
  activeRun,
  openWorkflow,
  save,
  go,
  notify,
  setModal,
  act,
  setSelectedRun,
  run,
  newWorkflow,
  setWorkflow,
}: {
  data: Bootstrap;
  workflow: WF | null;
  dirty: boolean;
  currentRun?: Run;
  busy: string;
  activeRun: boolean;
  openWorkflow: (w: WF | undefined) => void;
  save: () => Promise<WF>;
  go: Go;
  notify: Notify;
  setModal: (value: { type: string }) => void;
  act: Act;
  setSelectedRun: (run: Run) => void;
  run: () => unknown;
  newWorkflow: () => void;
  setWorkflow: Dispatch<SetStateAction<WF | null>>;
}) {
  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div className="workflow-picker">
          <IconBox icon={Workflow} color="green" />
          <div>
            <select
              aria-label="Select workflow"
              value={workflow?.id || ""}
              onChange={(e) =>
                openWorkflow(
                  data.workflows.find((w) => w.id === e.target.value),
                )
              }
            >
              {!data.workflows.find((w) => w.id === workflow?.id) &&
                workflow && (
                  <option value={workflow.id}>{workflow.name}</option>
                )}
              {data.workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <p>
              {workflow?.description || "Add, connect and configure steps."}
            </p>
          </div>
        </div>
        <div className="heading-actions">
          <button
            className="icon-button"
            title="Workflow settings"
            onClick={() => setModal({ type: "workflow" })}
          >
            <Settings2 size={19} />
          </button>
          <button
            className="icon-button"
            title="Templates and new workflows"
            onClick={() => go("templates")}
          >
            <Plus size={19} />
          </button>
          <Button
            icon={Save}
            disabled={!!busy}
            onClick={() =>
              act("save", async () => {
                await save();
                notify("Workflow saved.");
              })
            }
          >
            Save
          </Button>
          {activeRun && (
            <Button
              variant="danger"
              onClick={() =>
                act("cancel", async () => {
                  await post("/runs/" + currentRun!.id + "/cancel");
                  notify("Cancellation requested. Completed steps are kept.");
                })
              }
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            icon={activeRun ? LoaderCircle : Play}
            disabled={!!busy || activeRun || !workflow}
            onClick={run}
          >
            {activeRun ? "Running …" : "Start workflow"}
          </Button>
        </div>
      </div>
      <div className="studio-subbar">
        <div className="studio-tabs">
          <span className="selected">
            <Workflow size={14} />
            Editor
          </span>
          <button
            onClick={() => {
              if (currentRun) setSelectedRun(currentRun);
              else notify("Start the workflow to see its results.");
            }}
          >
            <History size={14} />
            Last run
            {currentRun && (
              <span className={cx("tiny-dot", currentRun.status)} />
            )}
          </button>
        </div>
        <div className="canvas-meta">
          <span>
            <Shield size={13} />
            {workflow?.policy?.allowCloud
              ? "External transfers allowed"
              : "External transfers blocked"}
          </span>
          <span>{workflow?.nodes?.length || 0} steps</span>
          <button onClick={() => setModal({ type: "assistant" })}>
            <Sparkles size={14} />
            Draft workflow
          </button>
        </div>
      </div>
      {workflow ? (
        <ReactFlowProvider key={workflow.id}>
          <WorkflowStudio
            workflow={workflow}
            onChange={setWorkflow}
            data={data}
            currentRun={dirty ? null : currentRun}
            kinds={kinds}
            nodeTypes={nodeTypes}
            NodeFields={NodeFields}
          />
        </ReactFlowProvider>
      ) : (
        <Empty
          icon={Workflow}
          title="Create workflow"
          description="Build a workflow from reusable steps."
        >
          <Button onClick={newWorkflow} icon={Plus}>
            Create workflow
          </Button>
        </Empty>
      )}
      <div className="studio-footer">
        <span>
          <MousePointer2 size={13} />
          Drag and connect steps
        </span>
        <span>
          <Move size={13} />
          Drag an empty area to pan
        </span>
        <span className="footer-right">
          {dirty
            ? "Draft saved in this browser"
            : workflow?.updatedAt
              ? `Saved ${formatDate(workflow.updatedAt)}`
              : "Not saved yet"}
          <span className="status-dot" />
        </span>
      </div>
    </div>
  );
}
