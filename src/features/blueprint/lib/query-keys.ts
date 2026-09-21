export const BLUEPRINT_EDITOR_QUERY_KEY = "blueprint-editor" as const;

export function blueprintEditorKey(projectId: string) {
  return [BLUEPRINT_EDITOR_QUERY_KEY, projectId] as const;
}