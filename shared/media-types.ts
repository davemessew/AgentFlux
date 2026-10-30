import type { WorkflowDefinition } from "./domain";
export interface VideoStep {
  at: number;
  label: string;
  description: string;
  kind: string;
}
export interface VideoResult {
  status: "questions" | "ready";
  summary: string;
  questions?: string[];
  workflow?: WorkflowDefinition;
  steps?: VideoStep[];
  duration: number;
  frameCount: number;
}
export interface MediaJob {
  configuration?: { connectorIds: string[]; useKnowledgeBase: boolean };
  id: string;
  fileName: string;
  status: string;
  createdAt: string;
  finishedAt?: string;
  error?: string;
  duration?: number;
  audioStatus?: string;
  segment?: number;
  budget: {
    calls: number;
    tokens: number;
    maxCalls: number;
    maxTokens: number;
  };
  coverage?: {
    completed: number;
    total: number;
    coveredSeconds: number;
    frameCount: number;
    candidateFrames: number;
    duration: number;
  };
  result?: VideoResult;
}
