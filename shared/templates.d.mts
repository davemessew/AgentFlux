export const BUILTIN_TEMPLATES: {
  id: string;
  name: string;
  description: string;
  category: string;
  requiresModel: boolean;
  workflow: Record<string, any>;
}[];
export const BLOCK_PRESETS: {
  id: string;
  kind: string;
  label: string;
  description: string;
  config: Record<string, any>;
}[];
