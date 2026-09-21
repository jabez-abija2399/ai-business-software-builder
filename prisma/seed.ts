import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BUILD_TASK_TYPES = [
  "SCAFFOLD_PROJECT",
  "GENERATE_COMPONENTS",
  "GENERATE_PAGES",
  "GENERATE_API_ROUTES",
  "GENERATE_DATABASE",
  "GENERATE_TESTS",
  "GENERATE_STYLES",
  "INSTALL_DEPENDENCIES",
  "RUN_LINT",
  "RUN_TYPECHECK",
];

const QUALITY_TASK_TYPES = ["TESTS", "SECURITY", "ACCESSIBILITY", "PERFORMANCE"];

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash: hashedPassword,
    },
  });

  let org = await prisma.organization.findFirst({
    where: { name: "Demo Organization" },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Demo Organization",
        slug: "demo-org",
      },
    });
  }

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // ------------------------------------------------------------------
  // Demo project with a fully walked pipeline so every stage can be
  // viewed honestly. Every status below is a real persisted row.
  // ------------------------------------------------------------------
  let project = await prisma.project.findFirst({
    where: { name: "Demo App" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "Demo App",
        description: "A demo inventory management application built end-to-end by Fleet.",
        ownerId: user.id,
        organizationId: org.id,
        mode: "standard",
        environment: "DEVELOPMENT",
      },
    });

    // Captured at the narrowing point so `.map()` callbacks stay type-safe.
    const demoProjectId = project.id;

    // --- Blueprint ---------------------------------------------------
    const blueprint = await prisma.businessBlueprint.create({
      data: {
        projectId: project.id,
        version: 1,
        createdBy: user.id,
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: user.id,
        businessContextJson: {
          rawDescription:
            "An inventory management app for a small retail business that tracks stock levels, orders, suppliers and reorder alerts in real time.",
          industry: "retail",
          constraints: {},
        },
        goalsJson: [
          { goal: "Track stock levels in real time", priority: "MUST" },
          { goal: "Alert when stock is below reorder level", priority: "SHOULD" },
        ],
        personasJson: [
          {
            name: "Warehouse manager",
            role: "owner",
            description: "Manages stock and approves purchase orders.",
            goals: ["Keep stock above reorder levels", "See low-stock alerts"],
          },
        ],
        rolesJson: [
          { name: "OWNER", description: "Full access", permissions: ["read", "create", "update", "delete"] },
          { name: "EMPLOYEE", description: "View and update stock", permissions: ["read", "update"] },
        ],
        permissionsJson: [
          { resource: "stock_item", actions: ["create", "read", "update"], roles: ["OWNER", "EMPLOYEE"] },
          { resource: "supplier", actions: ["create", "read", "update", "delete"], roles: ["OWNER"] },
        ],
        featuresJson: [
          { name: "Stock tracking", description: "Track quantities per SKU with reorder levels.", priority: "MUST" },
          { name: "Reorder alerts", description: "Flag items below reorder level.", priority: "SHOULD" },
        ],
        entitiesJson: [
          {
            name: "StockItem",
            description: "A tracked product or SKU.",
            attributes: [
              { name: "sku", type: "string", required: true, unique: true },
              { name: "quantity", type: "integer", required: true },
            ],
          },
        ],
        workflowsJson: [
          {
            name: "Receive stock",
            trigger: "Delivery arrives",
            steps: [
              { name: "Scan SKU", actor: "employee" },
              { name: "Update quantity", actor: "employee" },
            ],
          },
        ],
        businessRulesJson: [
          { name: "Reorder threshold", condition: "quantity < reorder_level", action: "raise alert" },
        ],
        integrationsJson: [
          { name: "Email alerts", type: "email", direction: "outbound" },
        ],
        nfrJson: [
          { category: "performance", requirement: "Stock lookups under 500ms", target: "< 500ms" },
        ],
      },
    });

    await prisma.agentRun.create({
      data: {
        projectId: project.id,
        userId: user.id,
        taskType: "BLUEPRINT_ANALYSIS",
        agentType: "BLUEPRINT_ANALYST",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 3_600_000),
        completedAt: new Date(Date.now() - 3_590_000),
        outputArtifactIdsJson: [blueprint.id],
      },
    });

    // --- Design ------------------------------------------------------
    await prisma.designArtifact.create({
      data: {
        projectId: project.id,
        version: 1,
        status: "APPROVED",
        tokensJson: {
          color: { primary: "#2563eb", success: "#16a34a", danger: "#dc2626" },
          radius: "8px",
          font: "Inter",
        },
        componentsJson: [
          { name: "StockTable", description: "Table listing stock items with quantities." },
          { name: "ReorderBadge", description: "Badge shown when an item is below reorder level." },
        ],
        pagesJson: [
          { title: "Dashboard", path: "/", description: "Overview of stock health and alerts." },
          { title: "Stock Items", path: "/stock", description: "Browse and edit stock items." },
        ],
        statesJson: [
          { name: "Empty", description: "No stock items yet." },
          { name: "Low stock", description: "Items below reorder level highlighted." },
        ],
        responsiveRulesJson: [
          { name: "Mobile", rule: "Tables collapse to cards below 640px." },
        ],
      },
    });

    await prisma.agentRun.create({
      data: {
        projectId: project.id,
        userId: user.id,
        taskType: "DESIGN_GENERATION",
        agentType: "DESIGN_AGENT",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 3_000_000),
        completedAt: new Date(Date.now() - 2_940_000),
        inputArtifactVersion: blueprint.version,
      },
    });

    // --- Build -------------------------------------------------------
    await prisma.agentRun.createMany({
      data: BUILD_TASK_TYPES.map((taskType, index) => ({
        projectId: demoProjectId,
        userId: user.id,
        taskType,
        agentType: "CODE_GENERATOR",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 2_500_000 + index * 60_000),
        completedAt: new Date(Date.now() - 2_400_000 + index * 60_000),
        inputArtifactVersion: 1,
      })),
    });

    await prisma.projectArtifact.createMany({
      data: [
        { projectId: project.id, type: "SOURCE_FILE", version: 1, filePath: "src/app/page.tsx", contentRef: "demo:page.tsx", checksum: "page", createdBy: user.id },
        { projectId: project.id, type: "SOURCE_FILE", version: 1, filePath: "src/components/StockTable.tsx", contentRef: "demo:StockTable.tsx", checksum: "stocktable", createdBy: user.id },
        { projectId: project.id, type: "SCHEMA", version: 1, filePath: "prisma/schema.prisma", contentRef: "demo:schema.prisma", checksum: "schema", createdBy: user.id },
      ],
    });

    // --- Quality -----------------------------------------------------
    await prisma.agentRun.createMany({
      data: QUALITY_TASK_TYPES.map((taskType) => ({
        projectId: demoProjectId,
        userId: user.id,
        taskType,
        agentType: "QUALITY_CHECK",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 1_800_000),
        completedAt: new Date(Date.now() - 1_700_000),
      })),
    });

    await prisma.testRecord.createMany({
      data: [
        { projectId: project.id, testType: "TESTS", name: "Stock list renders", status: "PASSED", durationMs: 120, completedAt: new Date(Date.now() - 1_700_000) },
        { projectId: project.id, testType: "TESTS", name: "Reorder alert fires at threshold", status: "PASSED", durationMs: 95, completedAt: new Date(Date.now() - 1_700_000) },
        { projectId: project.id, testType: "TESTS", name: "Empty state shows guidance", status: "PASSED", durationMs: 60, completedAt: new Date(Date.now() - 1_700_000) },
        { projectId: project.id, testType: "SECURITY", name: "No secrets in source", status: "PASSED", durationMs: 210, completedAt: new Date(Date.now() - 1_700_000) },
        { projectId: project.id, testType: "ACCESSIBILITY", name: "Color contrast AA", status: "PASSED", durationMs: 80, completedAt: new Date(Date.now() - 1_700_000) },
        { projectId: project.id, testType: "PERFORMANCE", name: "Dashboard first load", status: "FAILED", durationMs: 1500, errorMessage: "First load exceeded 1s budget.", completedAt: new Date(Date.now() - 1_700_000) },
      ],
    });

    // --- Preview + Deploy -------------------------------------------
    await prisma.deployment.create({
      data: {
        projectId: project.id,
        environment: "preview",
        provider: "demo",
        status: "READY",
        deploymentUrl: null,
        completedAt: new Date(Date.now() - 900_000),
      },
    });

    await prisma.deployment.createMany({
      data: [
        {
          projectId: project.id,
          environment: "staging",
          provider: "demo",
          status: "READY",
          deploymentUrl: null,
          completedAt: new Date(Date.now() - 800_000),
        },
        {
          projectId: project.id,
          environment: "production",
          provider: "demo",
          status: "READY",
          deploymentUrl: null,
          completedAt: new Date(Date.now() - 700_000),
        },
      ],
    });

    console.log("Demo pipeline seeded for Demo App");
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });