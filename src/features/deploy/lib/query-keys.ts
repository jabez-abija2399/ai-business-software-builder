export const DEPLOY_EDITOR_QUERY_KEY = "deploy-editor" as const;

export function deployEditorKey(projectId: string) {
  return [DEPLOY_EDITOR_QUERY_KEY, projectId] as const;
}