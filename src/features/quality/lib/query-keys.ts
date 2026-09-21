export const QUALITY_EDITOR_QUERY_KEY = "quality-editor" as const;

export function qualityEditorKey(projectId: string) {
  return [QUALITY_EDITOR_QUERY_KEY, projectId] as const;
}