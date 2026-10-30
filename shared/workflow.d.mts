import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowContext,
  WorkflowIssue,
  SourceConfig,
  NodeConfig,
  NodeKind,
} from "./domain";
export const NODE_KINDS: NodeKind[];
export function sourceConfig(config?: NodeConfig): SourceConfig;
export function cleanWorkflow(workflow: WorkflowDefinition): WorkflowDefinition;
export function workflowKey(
  workflow: WorkflowDefinition | null | undefined,
): string;
export function canConnect(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  connection: {
    source?: string | null;
    target?: string | null;
    sourceHandle?: string | null;
  },
  ignoredEdgeId?: string,
): boolean;
export function workflowIssues(
  workflow: WorkflowDefinition,
  context?: WorkflowContext,
): WorkflowIssue[];
export function cloneWorkflow(
  workflow: WorkflowDefinition,
  name?: string,
): WorkflowDefinition;
export function arrangeWorkflow(
  workflow: WorkflowDefinition,
): WorkflowDefinition;
