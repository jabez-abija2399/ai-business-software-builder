export const PREVIEW_EDITOR_QUERY_KEY = "preview-editor" as const;

export function previewEditorKey(projectId: string) {
  return [PREVIEW_EDITOR_QUERY_KEY, projectId] as const;
}