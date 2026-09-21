-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."_RequirementFeature" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_RequirementFeature_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "taskType" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "input_artifact_version" INTEGER,
    "output_artifact_ids_json" JSONB,
    "provider" TEXT,
    "model" TEXT,
    "token_usage" JSONB,
    "estimated_cost" DOUBLE PRECISION,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_tasks" (
    "id" UUID NOT NULL,
    "agent_run_id" UUID NOT NULL,
    "parent_task_id" UUID,
    "task_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dependencies_json" JSONB,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."approvals" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "agent_run_id" UUID,
    "action_type" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details_json" JSONB,
    "impact_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."architecture_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "stack_json" JSONB,
    "layers_json" JSONB,
    "modules_json" JSONB,
    "api_plan_json" JSONB,
    "data_plan_json" JSONB,
    "security_plan_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "architecture_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "project_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "changes_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_blueprints" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "business_context_json" JSONB,
    "goals_json" JSONB,
    "personas_json" JSONB,
    "roles_json" JSONB,
    "permissions_json" JSONB,
    "features_json" JSONB,
    "entities_json" JSONB,
    "workflows_json" JSONB,
    "business_rules_json" JSONB,
    "integrations_json" JSONB,
    "nfr_json" JSONB,
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "business_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."decisions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "decision_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "context" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "alternatives_json" JSONB,
    "consequences_json" JSONB,
    "affected_areas_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deployments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "commit_ref" TEXT,
    "deployment_url" TEXT,
    "healthStatus" TEXT,
    "health_checked_at" TIMESTAMP(3),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."design_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "tokens_json" JSONB,
    "components_json" JSONB,
    "pages_json" JSONB,
    "states_json" JSONB,
    "responsive_rules_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."known_issues" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "issue_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reproduction_steps" TEXT,
    "expected_behavior" TEXT,
    "actual_behavior" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "affected_features_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "known_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_artifacts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "agent_task_id" UUID,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "content_ref" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_features" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "blueprint_id" UUID,
    "feature_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'MUST',
    "description" TEXT,
    "requirement_ids_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_integrations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "config_metadata_json" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_versions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version_number" TEXT NOT NULL,
    "summary" TEXT,
    "blueprint_version" INTEGER,
    "design_version" INTEGER,
    "architecture_version" INTEGER,
    "source_ref" TEXT,
    "changelog_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'BUSINESS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."requirements" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "blueprint_id" UUID,
    "requirement_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MUST',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "acceptance_criteria_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."test_records" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "requirement_id" UUID,
    "feature_id" UUID,
    "testType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "command_ref" TEXT,
    "evidence_ref" TEXT,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "test_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_records" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "feature_id" UUID,
    "requirement_id" UUID,
    "verification_type" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "evidence" JSONB,
    "issues_json" JSONB,
    "verified_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "_RequirementFeature_B_index" ON "public"."_RequirementFeature"("B" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider" ASC, "provider_account_id" ASC);

-- CreateIndex
CREATE INDEX "agent_runs_agentType_idx" ON "public"."agent_runs"("agentType" ASC);

-- CreateIndex
CREATE INDEX "agent_runs_created_at_idx" ON "public"."agent_runs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "agent_runs_project_id_idx" ON "public"."agent_runs"("project_id" ASC);

-- CreateIndex
CREATE INDEX "agent_runs_status_idx" ON "public"."agent_runs"("status" ASC);

-- CreateIndex
CREATE INDEX "agent_runs_user_id_idx" ON "public"."agent_runs"("user_id" ASC);

-- CreateIndex
CREATE INDEX "agent_tasks_agent_run_id_idx" ON "public"."agent_tasks"("agent_run_id" ASC);

-- CreateIndex
CREATE INDEX "agent_tasks_riskLevel_idx" ON "public"."agent_tasks"("riskLevel" ASC);

-- CreateIndex
CREATE INDEX "agent_tasks_status_idx" ON "public"."agent_tasks"("status" ASC);

-- CreateIndex
CREATE INDEX "approvals_project_id_idx" ON "public"."approvals"("project_id" ASC);

-- CreateIndex
CREATE INDEX "approvals_requested_by_idx" ON "public"."approvals"("requested_by" ASC);

-- CreateIndex
CREATE INDEX "approvals_riskLevel_idx" ON "public"."approvals"("riskLevel" ASC);

-- CreateIndex
CREATE INDEX "approvals_status_idx" ON "public"."approvals"("status" ASC);

-- CreateIndex
CREATE INDEX "architecture_artifacts_project_id_idx" ON "public"."architecture_artifacts"("project_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "architecture_artifacts_project_id_version_key" ON "public"."architecture_artifacts"("project_id" ASC, "version" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "public"."audit_logs"("entity_type" ASC, "entity_id" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_project_id_idx" ON "public"."audit_logs"("project_id" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id" ASC);

-- CreateIndex
CREATE INDEX "business_blueprints_created_at_idx" ON "public"."business_blueprints"("created_at" ASC);

-- CreateIndex
CREATE INDEX "business_blueprints_project_id_idx" ON "public"."business_blueprints"("project_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "business_blueprints_project_id_version_key" ON "public"."business_blueprints"("project_id" ASC, "version" ASC);

-- CreateIndex
CREATE INDEX "business_blueprints_status_idx" ON "public"."business_blueprints"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "decisions_project_id_decision_key_key" ON "public"."decisions"("project_id" ASC, "decision_key" ASC);

-- CreateIndex
CREATE INDEX "decisions_project_id_idx" ON "public"."decisions"("project_id" ASC);

-- CreateIndex
CREATE INDEX "decisions_status_idx" ON "public"."decisions"("status" ASC);

-- CreateIndex
CREATE INDEX "deployments_created_at_idx" ON "public"."deployments"("created_at" ASC);

-- CreateIndex
CREATE INDEX "deployments_environment_idx" ON "public"."deployments"("environment" ASC);

-- CreateIndex
CREATE INDEX "deployments_project_id_idx" ON "public"."deployments"("project_id" ASC);

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "public"."deployments"("status" ASC);

-- CreateIndex
CREATE INDEX "design_artifacts_project_id_idx" ON "public"."design_artifacts"("project_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "design_artifacts_project_id_version_key" ON "public"."design_artifacts"("project_id" ASC, "version" ASC);

-- CreateIndex
CREATE INDEX "known_issues_project_id_idx" ON "public"."known_issues"("project_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "known_issues_project_id_issue_key_key" ON "public"."known_issues"("project_id" ASC, "issue_key" ASC);

-- CreateIndex
CREATE INDEX "known_issues_severity_idx" ON "public"."known_issues"("severity" ASC);

-- CreateIndex
CREATE INDEX "known_issues_status_idx" ON "public"."known_issues"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "public"."organization_members"("organization_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "public"."organization_members"("user_id" ASC);

-- CreateIndex
CREATE INDEX "organizations_created_at_idx" ON "public"."organizations"("created_at" ASC);

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "public"."organizations"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "public"."organizations"("slug" ASC);

-- CreateIndex
CREATE INDEX "project_artifacts_agent_task_id_idx" ON "public"."project_artifacts"("agent_task_id" ASC);

-- CreateIndex
CREATE INDEX "project_artifacts_project_id_idx" ON "public"."project_artifacts"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_artifacts_type_idx" ON "public"."project_artifacts"("type" ASC);

-- CreateIndex
CREATE INDEX "project_features_priority_idx" ON "public"."project_features"("priority" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "project_features_project_id_feature_key_key" ON "public"."project_features"("project_id" ASC, "feature_key" ASC);

-- CreateIndex
CREATE INDEX "project_features_project_id_idx" ON "public"."project_features"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_features_status_idx" ON "public"."project_features"("status" ASC);

-- CreateIndex
CREATE INDEX "project_integrations_project_id_idx" ON "public"."project_integrations"("project_id" ASC);

-- CreateIndex
CREATE INDEX "project_integrations_provider_idx" ON "public"."project_integrations"("provider" ASC);

-- CreateIndex
CREATE INDEX "project_versions_created_at_idx" ON "public"."project_versions"("created_at" ASC);

-- CreateIndex
CREATE INDEX "project_versions_project_id_idx" ON "public"."project_versions"("project_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_project_id_version_number_key" ON "public"."project_versions"("project_id" ASC, "version_number" ASC);

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "public"."projects"("created_at" ASC);

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "public"."projects"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "projects_organization_id_idx" ON "public"."projects"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "projects_owner_id_idx" ON "public"."projects"("owner_id" ASC);

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "public"."projects"("status" ASC);

-- CreateIndex
CREATE INDEX "requirements_category_idx" ON "public"."requirements"("category" ASC);

-- CreateIndex
CREATE INDEX "requirements_priority_idx" ON "public"."requirements"("priority" ASC);

-- CreateIndex
CREATE INDEX "requirements_project_id_idx" ON "public"."requirements"("project_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "requirements_project_id_requirement_key_key" ON "public"."requirements"("project_id" ASC, "requirement_key" ASC);

-- CreateIndex
CREATE INDEX "requirements_status_idx" ON "public"."requirements"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token" ASC);

-- CreateIndex
CREATE INDEX "test_records_feature_id_idx" ON "public"."test_records"("feature_id" ASC);

-- CreateIndex
CREATE INDEX "test_records_project_id_idx" ON "public"."test_records"("project_id" ASC);

-- CreateIndex
CREATE INDEX "test_records_requirement_id_idx" ON "public"."test_records"("requirement_id" ASC);

-- CreateIndex
CREATE INDEX "test_records_status_idx" ON "public"."test_records"("status" ASC);

-- CreateIndex
CREATE INDEX "test_records_testType_idx" ON "public"."test_records"("testType" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "verification_records_feature_id_idx" ON "public"."verification_records"("feature_id" ASC);

-- CreateIndex
CREATE INDEX "verification_records_project_id_idx" ON "public"."verification_records"("project_id" ASC);

-- CreateIndex
CREATE INDEX "verification_records_result_idx" ON "public"."verification_records"("result" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token" ASC);

-- AddForeignKey
ALTER TABLE "public"."_RequirementFeature" ADD CONSTRAINT "_RequirementFeature_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."project_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_RequirementFeature" ADD CONSTRAINT "_RequirementFeature_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_runs" ADD CONSTRAINT "agent_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_runs" ADD CONSTRAINT "agent_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_tasks" ADD CONSTRAINT "agent_tasks_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_tasks" ADD CONSTRAINT "agent_tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."approvals" ADD CONSTRAINT "approvals_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."approvals" ADD CONSTRAINT "approvals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."architecture_artifacts" ADD CONSTRAINT "architecture_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_blueprints" ADD CONSTRAINT "business_blueprints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."decisions" ADD CONSTRAINT "decisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployments" ADD CONSTRAINT "deployments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."design_artifacts" ADD CONSTRAINT "design_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."known_issues" ADD CONSTRAINT "known_issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_artifacts" ADD CONSTRAINT "project_artifacts_agent_task_id_fkey" FOREIGN KEY ("agent_task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_artifacts" ADD CONSTRAINT "project_artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_features" ADD CONSTRAINT "project_features_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "public"."business_blueprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_features" ADD CONSTRAINT "project_features_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_integrations" ADD CONSTRAINT "project_integrations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_versions" ADD CONSTRAINT "project_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."requirements" ADD CONSTRAINT "requirements_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "public"."business_blueprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."requirements" ADD CONSTRAINT "requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_records" ADD CONSTRAINT "test_records_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."project_features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_records" ADD CONSTRAINT "test_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_records" ADD CONSTRAINT "test_records_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."verification_records" ADD CONSTRAINT "verification_records_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."project_features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."verification_records" ADD CONSTRAINT "verification_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."verification_records" ADD CONSTRAINT "verification_records_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
