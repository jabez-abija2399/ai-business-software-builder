export const BLUEPRINT_EDITOR_QUERY_KEY = "blueprint-editor" as const;
export const BLUEPRINT_VERSION_QUERY_KEY = "blueprint-version" as const;

export function blueprintEditorKey(projectId: string) {
  return [BLUEPRINT_EDITOR_QUERY_KEY, projectId] as const;
}

export function blueprintVersionKey(projectId: string, version: number) {
  return [BLUEPRINT_VERSION_QUERY_KEY, projectId, version] as const;
}