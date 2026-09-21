export const DESIGN_EDITOR_QUERY_KEY = "design-editor" as const;

export function designEditorKey(projectId: string) {
  return [DESIGN_EDITOR_QUERY_KEY, projectId] as const;
}