import type { Bootstrap, NodeConfig, WorkflowNode } from "../../shared/domain";
import type { View } from "../app/definitions";
export type Notify = (message: string, error?: boolean) => void;
export type Act = <T>(
  key: string,
  action: () => Promise<T>,
) => Promise<T | undefined>;
export interface PageProps {
  data: Bootstrap;
  act: Act;
  refresh: () => Promise<Bootstrap>;
  notify: Notify;
}
export interface NodeFieldsProps {
  node: WorkflowNode;
  data: Bootstrap;
  update: (patch: Partial<NodeConfig>) => void;
}
export type Go = (view: View) => void;
