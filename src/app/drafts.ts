import { parseWorkflow } from "../lib/workflow";
import type { WorkflowDefinition as WF } from "../../shared/domain";

export function lastWorkflowId() {
  try {
    return localStorage.getItem("agentflux:last-workflow");
  } catch {
    return null;
  }
}

export function restoreDraft(w: WF | null): WF | null {
  try {
    const id = w?.id || localStorage.getItem("agentflux:last-workflow");
    const raw = id && localStorage.getItem("agentflux:draft:" + id);
    return raw ? parseWorkflow(JSON.parse(raw)) : w;
  } catch {
    return w;
  }
}

export function initialWorkflow(workflows: WF[]): WF | null {
  try {
    const id = lastWorkflowId();
    const draft = id && localStorage.getItem("agentflux:draft:" + id);
    if (draft) {
      const value = parseWorkflow(JSON.parse(draft));
      if (
        value.id === id &&
        Array.isArray(value.nodes) &&
        Array.isArray(value.edges)
      )
        return value;
    }
    return (
      workflows.find((w) => w.id === id) ||
      workflows.find((w) => w.id === "document-flow") ||
      workflows[0] ||
      null
    );
  } catch {
    return workflows[0] || null;
  }
}
