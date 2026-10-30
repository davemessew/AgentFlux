import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";
import { useRef, useState } from "react";
import type { WorkflowTemplate } from "../../../shared/domain";
import { Button, Empty, IconBox, PageHeading } from "../../components/ui";
import { api } from "../../lib/api";
import type { PageProps } from "../../lib/props";

export function TemplatePage({
  data,
  choose,
  create,
  importFile,
  assistant,
  act,
  refresh,
}: Omit<PageProps, "notify"> & {
  choose: (template: WorkflowTemplate) => void;
  create: () => void;
  importFile: (file: File) => void;
  assistant: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const templates = (data.templates || []).filter((t) =>
    `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page templates-page">
      <PageHeading
        title="Start workflow"
        description="Describe a task, choose a template or start with an empty canvas."
      >
        <Button icon={Upload} onClick={() => input.current?.click()}>
          Import JSON
        </Button>
        <Button icon={Plus} onClick={create}>
          Start blank
        </Button>
      </PageHeading>
      <input
        hidden
        type="file"
        accept=".json,application/json"
        ref={input}
        onChange={(e) => {
          if (e.target.files?.[0]) importFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <div className="workflow-prompt-entry">
        <div>
          <Sparkles size={25} />
          <h2>What needs doing?</h2>
          <p>
            Describe your source, processing and desired result. Your model will
            draft an editable workflow.
          </p>
        </div>
        <Button icon={ArrowRight} variant="primary" onClick={assistant}>
          Describe task
        </Button>
      </div>
      <div className="table-toolbar">
        <h2>
          Templates <span className="count-badge">{templates.length}</span>
        </h2>
        <div className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
          />
        </div>
      </div>
      <div className="template-list">
        {templates.map((template) => (
          <article className="template-row" key={template.id}>
            <IconBox
              icon={template.requiresModel ? BrainCircuit : Workflow}
              color={template.requiresModel ? "purple" : "green"}
              size="large"
            />
            <div>
              <span className="badge">{template.category}</span>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <small>
                {template.workflow.nodes.length} steps ·{" "}
                {template.requiresModel
                  ? "Model connection required"
                  : template.category === "No model needed"
                    ? "Ready to use"
                    : "Choose source in editor"}
              </small>
            </div>
            <Button icon={ArrowRight} onClick={() => choose(template)}>
              Use template
            </Button>
            {template.category === "Custom templates" && (
              <button
                className="icon-button"
                aria-label="Remove template"
                onClick={() =>
                  act("delete-template", async () => {
                    await api("/workflow-templates/" + template.id, {
                      method: "DELETE",
                    });
                    await refresh();
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            )}
          </article>
        ))}
      </div>
      {!templates.length && (
        <Empty
          icon={BookOpen}
          title="No matching template"
          description="Try another search term or create a workflow."
        />
      )}
    </div>
  );
}
