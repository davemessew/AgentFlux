import type { WorkflowDefinition } from "../../shared/domain";
import { cleanWorkflow, NODE_KINDS } from "../../shared/workflow.mjs";

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function parseWorkflow(value: unknown): WorkflowDefinition {
  if (
    !object(value) ||
    typeof value.name !== "string" ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    value.nodes.length > 40 ||
    value.edges.length > 100
  )
    throw new Error("This file does not contain a valid workflow.");
  for (const node of value.nodes) {
    if (
      !object(node) ||
      typeof node.id !== "string" ||
      !object(node.position) ||
      !Number.isFinite(node.position.x) ||
      !Number.isFinite(node.position.y) ||
      !object(node.data) ||
      typeof node.data.kind !== "string" ||
      !(NODE_KINDS as readonly string[]).includes(node.data.kind) ||
      typeof node.data.label !== "string" ||
      !object(node.data.config)
    )
      throw new Error("A workflow step is malformed.");
    const config = node.data.config;
    const numbers = new Set(["limit", "temperature", "maxTokens"]);
    const booleans = new Set(["useMemory"]);
    for (const [key, field] of Object.entries(config)) {
      if (field === undefined) continue;
      if (
        numbers.has(key)
          ? typeof field !== "number" || !Number.isFinite(field)
          : booleans.has(key)
            ? typeof field !== "boolean"
            : key === "skillIds"
              ? !Array.isArray(field) ||
                field.some((item) => typeof item !== "string")
              : key === "mapping"
                ? typeof field !== "string" &&
                  (!object(field) ||
                    Object.values(field).some(
                      (item) => typeof item !== "string",
                    ))
                : key === "value"
                  ? !["string", "number", "boolean"].includes(typeof field)
                  : typeof field !== "string"
      )
        throw new Error(`Invalid configuration field: ${key}.`);
    }
  }
  for (const edge of value.edges)
    if (
      !object(edge) ||
      typeof edge.id !== "string" ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string"
    )
      throw new Error("A workflow connection is malformed.");
  if (
    (value.policy != null && !object(value.policy)) ||
    (value.schedule != null && !object(value.schedule))
  )
    throw new Error("Invalid workflow settings.");
  if (
    value.delivery != null &&
    (!object(value.delivery) ||
      typeof value.delivery.directory !== "string" ||
      !Array.isArray(value.delivery.formats) ||
      value.delivery.formats.some(
        (format) => !["json", "csv", "md"].includes(format),
      ))
  )
    throw new Error("Invalid report destination.");
  return cleanWorkflow(value as unknown as WorkflowDefinition);
}
