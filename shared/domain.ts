import type { Edge, Node } from "@xyflow/react";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | undefined };
export type SourceMode = "connector" | "inline" | "library";
export type NodeKind =
  | "trigger"
  | "source"
  | "transform"
  | "condition"
  | "redact"
  | "model"
  | "agent"
  | "store"
  | "output";
export interface NodeConfig {
  mode?: SourceMode | "batch" | "per-record";
  connectorId?: string;
  text?: string;
  query?: string;
  limit?: number;
  input?: string;
  operation?: string;
  field?: string;
  operator?: string;
  value?: string | number | boolean;
  mapping?: string | Record<string, string>;
  direction?: "asc" | "desc";
  providerId?: string;
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  title?: string;
  agentId?: string;
  skillIds?: string[];
  useMemory?: boolean;
  outputFormat?: "tasks" | "text";
  responsePath?: string;
}
export type SourceConfig =
  | { mode: "connector"; connectorId: string }
  | { mode: "inline"; text: string }
  | { mode: "library"; query?: string; limit?: number };
export type NodeDefinition =
  | { kind: "source"; config: SourceConfig }
  | { kind: Exclude<NodeKind, "source">; config: NodeConfig };
export type NodeData = {
  kind: NodeKind;
  label: string;
  config: NodeConfig;
  subtitle?: string;
  runStatus?: string;
  durationMs?: number;
  outputCount?: number;
  needsConfig?: boolean;
} & Record<string, unknown>;
export type WorkflowNode = Node<NodeData, "flux">;
export type WorkflowEdge = Edge;
export interface Policy {
  allowCloud: boolean;
  redactCloud?: boolean;
}
export interface Schedule {
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt?: string | null;
}
export interface Delivery {
  directory: string;
  formats: ("json" | "csv" | "md")[];
}
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  policy: Policy;
  schedule: Schedule;
  incremental?: boolean;
  delivery?: Delivery | null;
  updatedAt?: string;
  lastScheduleError?: string | null;
  agentId?: string;
  planRevision?: number;
}
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  requiresModel?: boolean;
  builtin?: boolean;
  workflow: WorkflowDefinition;
}
export interface BlockPreset {
  id?: string;
  kind: NodeKind;
  label: string;
  description?: string;
  config: NodeConfig;
}
export interface RecordItem {
  id?: string;
  title: string;
  content: string;
  source: string;
  classification?: string;
  metadata?: Record<string, Json | undefined>;
  createdAt?: string;
  hash?: string;
}
export interface ConnectorConfig {
  path?: string;
  sheet?: string;
  headerRow?: number;
  text?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  responsePath?: string;
  programId?: string;
}
export type ConnectorDefinition =
  | {
      type: "folder";
      config: { path: string; sheet?: string; headerRow?: number };
    }
  | { type: "text"; config: { text: string } }
  | {
      type: "http";
      config: {
        url: string;
        method: "GET" | "POST";
        headers?: Record<string, string>;
        responsePath?: string;
      };
    }
  | { type: "program"; config: { programId: string } };
export interface Connector {
  id: string;
  name: string;
  description?: string;
  type: "folder" | "text" | "http" | "program";
  config: ConnectorConfig;
  hasSecret?: boolean;
  secret?: string;
  createdAt?: string;
}
export interface Provider {
  id: string;
  name: string;
  type: "ollama" | "openai";
  scope: "local" | "cloud";
  baseUrl: string;
  model: string;
  hasKey?: boolean;
  apiKey?: string;
}
export interface Settings {
  id?: string;
  allowCloud: boolean;
  redactCloud: boolean;
  programsEnabled: boolean;
  retentionDays: number;
  redactionTerms: string[];
  transcription?: TranscriptionSettings;
}
export interface TranscriptionSettings {
  baseUrl: string;
  model: string;
  scope: "local" | "cloud";
  hasKey?: boolean;
  apiKey?: string;
}
export interface Step {
  nodeId: string;
  label: string;
  kind: NodeKind;
  status: string;
  inputCount: number;
  outputCount: number;
  startedAt: string;
  durationMs: number;
  preview: Pick<RecordItem, "title" | "content" | "source">[];
  detail?: string;
  error?: string;
}
export interface DeliveryResult {
  status: string;
  directory?: string;
  files: string[];
  reused?: boolean;
}
export interface Run {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  phase?: string;
  trigger: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  steps: Step[];
  recordCount: number;
  outputCount?: number;
  inputCount?: number;
  skippedCount?: number;
  error?: string;
  delivery?: DeliveryResult;
  revision?: string;
  cancellationNote?: string;
}
export interface RunResult {
  id: string;
  records: RecordItem[];
  totalCount: number;
  truncated: boolean;
  delivery?: DeliveryResult;
}
export interface Question {
  id: string;
  question: string;
}
export interface Agent {
  id?: string;
  name: string;
  objective: string;
  providerId: string;
  connectorIds: string[];
  skillIds: string[];
  intervalMinutes: number;
  enabled: boolean;
  policy: Policy;
  useMemory: boolean;
  useKnowledgeBase: boolean;
  learn: boolean;
  createSkills: boolean;
  maxSteps: number;
  status?: string;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastError?: string;
  lastLearningError?: string;
  lastWorkflowId?: string;
  lastRunId?: string;
  planWorkflowId?: string;
  planRevision?: number;
  pendingQuestions?: Question[];
  delivery?: Delivery | null;
  incremental?: boolean;
  resultMode?: "tasks" | "text";
}
export interface Skill {
  id?: string;
  name: string;
  description?: string;
  instructions: string;
  status: string;
  version?: number;
  agentId?: string;
  sourceRunId?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Learning {
  id: string;
  title: string;
  content: string;
  status: string;
  agentId?: string;
  agentName?: string;
  sourceRunId?: string;
  createdAt?: string;
}
export interface AgentState {
  agents: (Agent & { id: string })[];
  skills: (Skill & { id: string })[];
  learnings: Learning[];
}
export interface Bootstrap extends AgentState {
  workflows: WorkflowDefinition[];
  connectors: Connector[];
  providers: Provider[];
  settings: Settings;
  runs: Run[];
  templates: WorkflowTemplate[];
  stats: {
    records: number;
    connectors: number;
    workflows: number;
    runs: number;
    completed: number;
  };
  capabilities: {
    formats: string[];
    inbox: string;
    outbox: string;
    outputRoots: string[];
    programs: { id: string; name: string }[];
    programError?: string | null;
    container: boolean;
    modelDefaults: { ollama: string; openai: string };
  };
}
export interface WorkflowContext {
  connectors?: Connector[];
  providers?: Provider[];
  agents?: Agent[];
  skills?: Skill[];
  settings?: Partial<Settings>;
}
export interface WorkflowIssue {
  message: string;
  nodeId?: string;
}
