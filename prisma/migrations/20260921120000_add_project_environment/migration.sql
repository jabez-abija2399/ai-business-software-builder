-- AlterTable
ALTER TABLE "projects" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'DEVELOPMENT';

-- CreateIndex
CREATE INDEX "projects_environment_idx" ON "projects"("environment");
