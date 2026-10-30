import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BrainCircuit,
  Code2,
  Database,
  FileText,
  FolderOpen,
  GitBranch,
  Globe2,
  History,
  LayoutDashboard,
  Play,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import type { NodeConfig, NodeKind } from "../../shared/domain";

export type View =
  | "overview"
  | "studio"
  | "data"
  | "connectors"
  | "models"
  | "runs"
  | "settings"
  | "templates"
  | "agents";

export const nav: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "agents", label: "Agents", icon: BrainCircuit },
  { id: "templates", label: "Templates", icon: BookOpen },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "studio", label: "Workflow editor", icon: Workflow },
  { id: "data", label: "Knowledge base", icon: Database },
  { id: "connectors", label: "Connections", icon: Plug },
  { id: "models", label: "Models", icon: BrainCircuit },
  { id: "runs", label: "Runs", icon: History },
];

export const kinds: Record<
  NodeKind,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
    default: NodeConfig;
    tag: string;
  }
> = {
  agent: {
    label: "Agent",
    description: "Work with tasks, knowledge and skills",
    icon: Sparkles,
    color: "purple",
    default: { agentId: "", prompt: "", skillIds: [], useMemory: true },
    tag: "AGENT",
  },
  trigger: {
    label: "Start",
    description: "Trigger a workflow",
    icon: Play,
    color: "green",
    default: {},
    tag: "START",
  },
  source: {
    label: "Data source",
    description: "Files, APIs and programs",
    icon: FolderOpen,
    color: "blue",
    default: { connectorId: "inbox" },
    tag: "DATA SOURCE",
  },
  redact: {
    label: "Redact",
    description: "Replace sensitive information",
    icon: ShieldCheck,
    color: "mint",
    default: {},
    tag: "REDACTION",
  },
  transform: {
    label: "Transform",
    description: "Clean data and map fields",
    icon: SlidersHorizontal,
    color: "orange",
    default: { operation: "clean" },
    tag: "PROCESSING",
  },
  condition: {
    label: "Condition",
    description: "Choose the next step",
    icon: GitBranch,
    color: "orange",
    default: { field: "content", operator: "contains", value: "" },
    tag: "LOGIC",
  },
  model: {
    label: "AI model",
    description: "Process data with your model",
    icon: BrainCircuit,
    color: "purple",
    default: { prompt: "Write an accurate summary with sources." },
    tag: "AI MODEL",
  },
  store: {
    label: "Save",
    description: "Save to the knowledge base",
    icon: Database,
    color: "green",
    default: {},
    tag: "OUTPUT",
  },
  output: {
    label: "Output",
    description: "View results in the run",
    icon: FileText,
    color: "blue",
    default: {},
    tag: "OUTPUT",
  },
};

export const connectorTypes: Record<
  string,
  { label: string; icon: LucideIcon; color: string; detail: string }
> = {
  folder: {
    label: "Local folder",
    icon: FolderOpen,
    color: "blue",
    detail: "Import files automatically",
  },
  http: {
    label: "HTTP / REST API",
    icon: Globe2,
    color: "purple",
    detail: "Internal and external services",
  },
  program: {
    label: "Local program",
    icon: Terminal,
    color: "orange",
    detail: "Connect existing tools",
  },
  text: {
    label: "Text & JSON",
    icon: Code2,
    color: "mint",
    detail: "Paste data directly",
  },
};
