export const CODE_EDITOR_QUERY_KEY = "code-editor" as const;

export function codeEditorKey(projectId: string) {
  return [CODE_EDITOR_QUERY_KEY, projectId] as const;
}