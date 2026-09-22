export const REVIEW_EDITOR_QUERY_KEY = "review-editor" as const;

export function reviewEditorKey(projectId: string) {
  return [REVIEW_EDITOR_QUERY_KEY, projectId] as const;
}