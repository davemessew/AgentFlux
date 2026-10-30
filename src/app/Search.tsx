import { ArrowUpRight, ChevronRight, Search, Workflow } from "lucide-react";
import { useState } from "react";
import type { Bootstrap, WorkflowDefinition as WF } from "../../shared/domain";
import { Modal } from "../components/ui";
import type { Go } from "../lib/props";
import { nav } from "./definitions";

export function SearchModal({
  data,
  close,
  choose,
  go,
}: {
  data: Bootstrap;
  close: () => void;
  choose: (workflow: WF) => void;
  go: Go;
}) {
  const [q, setQ] = useState("");
  return (
    <Modal title="Search AgentFlux" onClose={close}>
      <div className="search-field large">
        <Search size={20} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search workflows and sections …"
        />
      </div>
      <div className="search-results">
        {data.workflows
          .filter((w) => w.name.toLowerCase().includes(q.toLowerCase()))
          .map((w) => (
            <button key={w.id} onClick={() => choose(w)}>
              <Workflow size={17} />
              <span>
                {w.name}
                <small>Workflow · {w.nodes.length} steps</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        {nav
          .filter((n) => n.label.toLowerCase().includes(q.toLowerCase()))
          .map((n) => (
            <button key={n.id} onClick={() => go(n.id)}>
              <n.icon size={17} />
              <span>{n.label}</span>
              <ChevronRight size={16} />
            </button>
          ))}
      </div>
    </Modal>
  );
}
