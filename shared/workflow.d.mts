type Workflow = Record<string, any>;
export const NODE_KINDS: string[];
export function cleanWorkflow(workflow: Workflow): Workflow;
export function workflowKey(workflow: Workflow | null | undefined): string;
export function canConnect(nodes: any[], edges: any[], connection: any, ignoredEdgeId?: string): boolean;
export function workflowIssues(workflow: Workflow, context?: Workflow): { message: string; nodeId?: string }[];
export function cloneWorkflow(workflow: Workflow, name?: string): Workflow;
export function arrangeWorkflow(workflow: Workflow): Workflow;
