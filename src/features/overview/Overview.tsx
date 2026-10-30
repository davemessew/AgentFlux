import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Cable,
  Check,
  ChevronRight,
  Database,
  FolderOpen,
  History,
  LockKeyhole,
  Play,
  Plug,
  Plus,
  Server,
  Sparkles,
  Workflow,
} from "lucide-react";
import type {
  Bootstrap,
  WorkflowDefinition as WF,
} from "../../../shared/domain";
import { type View } from "../../app/definitions";
import { Button, IconBox, Logo } from "../../components/ui";
import { cx } from "../../lib/format";
import type { Go } from "../../lib/props";

export function Overview({
  data,
  openWorkflow,
  go,
  newWorkflow,
  assistant,
}: {
  data: Bootstrap;
  openWorkflow: (w: WF) => void;
  go: Go;
  newWorkflow: () => void;
  assistant: () => void;
}) {
  return (
    <div className="page overview-page">
      <div className="page-heading">
        <div>
          <div className="hello-line">
            <span className="status-dot" />
            Local AI platform
          </div>
          <h1>Overview</h1>
          <p>Workflows, data sources and models on your instance.</p>
        </div>
        <Button icon={Plus} variant="primary" onClick={newWorkflow}>
          New workflow
        </Button>
      </div>
      <div className="overview-feature">
        <div className="feature-copy">
          <span className="feature-label">
            <Workflow size={15} /> FROM INPUT TO OUTPUT
          </span>
          <h2>
            Describe a task.
            <br />
            Let an agent handle the workflow.
          </h2>
          <p>
            Agents create workflows, run them on a schedule and save
            observations for later tasks. You can edit every step.
          </p>
          <div className="feature-actions">
            <Button
              variant="dark"
              icon={ArrowUpRight}
              onClick={() => go("agents")}
            >
              Set up an agent
            </Button>
            <button className="text-button" onClick={assistant}>
              <Sparkles size={15} />
              Describe a workflow
            </button>
          </div>
          <span className="feature-footnote">
            <LockKeyhole size={12} />
            Cloud transfers are{" "}
            {data.settings.allowCloud ? "available with approval" : "disabled"}
          </span>
        </div>
        <div
          className="feature-diagram"
          aria-label="Files and APIs flow through AgentFlux into knowledge and results"
        >
          <svg
            className="diagram-lines"
            viewBox="0 0 560 300"
            preserveAspectRatio="none"
          >
            <path d="M100 78H170Q195 78 195 108V150H280M100 226H170Q195 226 195 198V150H280M300 150H350Q380 150 380 120V78H455M300 150H350Q380 150 380 180V226H455" />
          </svg>
          <div className="mini-node input-a">
            <IconBox icon={FolderOpen} color="blue" />
            <span>
              Files<small>PDF, CSV, DOCX …</small>
            </span>
            <span className="mini-port" />
          </div>
          <div className="mini-node input-b">
            <IconBox icon={Cable} color="orange" />
            <span>
              Data sources<small>APIs &amp; programs</small>
            </span>
            <span className="mini-port" />
          </div>
          <div className="flux-core">
            <Logo />
            <span>AgentFlux</span>
            <small>Import and process</small>
          </div>
          <div className="mini-node output-a">
            <IconBox icon={BrainCircuit} color="purple" />
            <span>
              AI model<small>Local or cloud</small>
            </span>
          </div>
          <div className="mini-node output-b">
            <IconBox icon={Database} color="green" />
            <span>
              Knowledge base<small>Stored locally</small>
            </span>
          </div>
          <span className="diagram-caption">LOCAL PROCESSING</span>
        </div>
      </div>
      <div className="overview-stats">
        {[
          {
            label: "Workflows",
            value: data.stats.workflows,
            icon: Workflow,
            go: "studio",
            detail: "saved workflows",
          },
          {
            label: "Connections",
            value: data.stats.connectors,
            icon: Plug,
            go: "connectors",
            detail: "configured sources",
          },
          {
            label: "Documents",
            value: data.stats.records,
            icon: Database,
            go: "data",
            detail: "in the knowledge base",
          },
          {
            label: "Runs",
            value: data.stats.runs,
            icon: History,
            go: "runs",
            detail: `${data.stats.completed} completed`,
          },
        ].map((s) => (
          <button
            key={s.label}
            className="stat"
            onClick={() => go(s.go as View)}
          >
            <div>
              <s.icon size={17} />
              <span>{s.label}</span>
              <ArrowUpRight size={14} />
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <small>{s.detail}</small>
          </button>
        ))}
      </div>
      <div className="overview-lower">
        <section className="workflow-section">
          <div className="section-heading">
            <h2>
              Workflows <span>{data.workflows.length}</span>
            </h2>
            <button className="text-button" onClick={() => go("studio")}>
              Open editor <ArrowRight size={14} />
            </button>
          </div>
          <div className="workflow-list">
            {data.workflows.map((w, i: number) => (
              <button
                className="workflow-row"
                key={w.id}
                onClick={() => openWorkflow(w)}
              >
                <IconBox
                  icon={i === 1 ? BrainCircuit : i === 2 ? Cable : Workflow}
                  color={i === 1 ? "purple" : i === 2 ? "blue" : "green"}
                />
                <span className="workflow-row-title">
                  <strong>{w.name}</strong>
                  <small>{w.description}</small>
                </span>
                <span className="workflow-row-meta">
                  {w.nodes.length} steps
                  <small>{w.schedule?.enabled ? "Scheduled" : "Manual"}</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </section>
        <section className="getting-started">
          <div className="section-heading">
            <h2>Getting started</h2>
            <Sparkles size={18} />
          </div>
          <p>The example workflow runs without a model.</p>
          {[
            {
              label: "Connect your data",
              detail: "Folders, APIs and programs",
              icon: Plug,
              view: "connectors",
              done: data.connectors.length > 3,
            },
            {
              label: "Add a model",
              detail: "Ollama, local or external APIs",
              icon: BrainCircuit,
              view: "models",
              done: data.providers.length > 0,
            },
            {
              label: "Run your first workflow",
              detail: "With synthetic sample data",
              icon: Play,
              view: "studio",
              done: data.stats.runs > 0,
            },
          ].map((s) => (
            <button
              key={s.view}
              onClick={() => go(s.view as View)}
              className="onboard-step"
            >
              <span className={cx("step-check", s.done && "done")}>
                {s.done ? <Check size={15} /> : <s.icon size={15} />}
              </span>
              <span>
                <strong>{s.label}</strong>
                <small>{s.detail}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>
      </div>
      <div className="page-bottom">
        <span>
          <Server size={14} />
          Data and execution on this instance
        </span>
        <span>
          Open Source · Apache 2.0 <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  );
}
