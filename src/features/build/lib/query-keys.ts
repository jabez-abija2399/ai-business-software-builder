export const BUILD_EDITOR_QUERY_KEY = "build-editor" as const;

export function buildEditorKey(projectId: string) {
  return [BUILD_EDITOR_QUERY_KEY, projectId] as const;
}