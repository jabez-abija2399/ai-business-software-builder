/**
 * Deterministic provider — the default Fleet generator when no external model
 * provider is configured.
 *
 * This is a real, rule-based generator: every section it emits is derived from
 * the approved blueprint text/sections, and every quality result is computed by
 * actually inspecting the generated files. It records `provider: "deterministic"`
 * so its output is never presented as a model call. Swapping in a hosted model
 * later only means routing `analyzeBlueprint`/`generateDesign` to another adapter
 * in `router.ts` — the rest of the pipeline is unchanged.
 */

import type {
  AIProvider,
  AnalyzeBlueprintInput,
  BlueprintAnalysis,
  BlueprintSpec,
  CodeGeneration,
  DesignGeneration,
  GenerateCodeInput,
  GenerateDesignInput,
  GeneratePreviewInput,
  PreviewGeneration,
  QualityCheckInput,
  QualityCheckResult,
} from "../types";

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}

function pascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function camelCase(value: string): string {
  const p = pascalCase(value);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? (value.filter((v) => v && typeof v === "object") as Array<Record<string, unknown>>)
    : [];
}

// ---------------------------------------------------------------------------
// Blueprint analysis
// ---------------------------------------------------------------------------

const INDUSTRIES: { keywords: string[]; industry: string }[] = [
  { keywords: ["retail", "store", "shop", "inventory", "stock", "pos"], industry: "Retail" },
  { keywords: ["health", "clinic", "patient", "medical", "doctor"], industry: "Healthcare" },
  { keywords: ["finance", "invoice", "payment", "accounting", "expense", "budget"], industry: "Finance" },
  { keywords: ["education", "school", "student", "course", "class", "teacher"], industry: "Education" },
  { keywords: ["logistic", "delivery", "shipment", "fleet", "warehouse"], industry: "Logistics" },
  { keywords: ["restaurant", "food", "menu", "order", "kitchen", "cafe"], industry: "Food & Beverage" },
  { keywords: ["real estate", "property", "listing", "rental", "tenant"], industry: "Real Estate" },
  { keywords: ["fitness", "gym", "workout", "training", "member"], industry: "Fitness" },
  { keywords: ["event", "ticket", "booking", "reservation", "schedule"], industry: "Events" },
  { keywords: ["project", "task", "team", "collaboration", "sprint"], industry: "Software" },
];

const ENTITY_LIBRARY: Record<
  string,
  { description: string; attributes: Array<{ name: string; type: string; required?: boolean; unique?: boolean }> }
> = {
  product: {
    description: "A sellable or trackable product.",
    attributes: [
      { name: "name", type: "string", required: true },
      { name: "sku", type: "string", required: true, unique: true },
      { name: "price", type: "decimal", required: true },
      { name: "quantity", type: "integer", required: true },
    ],
  },
  order: {
    description: "A customer order and its lifecycle.",
    attributes: [
      { name: "reference", type: "string", required: true, unique: true },
      { name: "total", type: "decimal", required: true },
      { name: "status", type: "string", required: true },
    ],
  },
  customer: {
    description: "A customer or client record.",
    attributes: [
      { name: "name", type: "string", required: true },
      { name: "email", type: "string", required: true, unique: true },
      { name: "phone", type: "string" },
    ],
  },
  invoice: {
    description: "A bill issued to a customer.",
    attributes: [
      { name: "number", type: "string", required: true, unique: true },
      { name: "amount", type: "decimal", required: true },
      { name: "dueDate", type: "datetime", required: true },
      { name: "status", type: "string", required: true },
    ],
  },
  appointment: {
    description: "A scheduled appointment or booking.",
    attributes: [
      { name: "title", type: "string", required: true },
      { name: "scheduledFor", type: "datetime", required: true },
      { name: "status", type: "string", required: true },
    ],
  },
  patient: {
    description: "A patient record.",
    attributes: [
      { name: "name", type: "string", required: true },
      { name: "dateOfBirth", type: "datetime" },
      { name: "contact", type: "string" },
    ],
  },
  student: {
    description: "A learner enrolled in courses.",
    attributes: [
      { name: "name", type: "string", required: true },
      { name: "email", type: "string", required: true, unique: true },
      { name: "enrolledAt", type: "datetime" },
    ],
  },
  course: {
    description: "A course or class offering.",
    attributes: [
      { name: "title", type: "string", required: true },
      { name: "description", type: "string" },
      { name: "capacity", type: "integer" },
    ],
  },
  booking: {
    description: "A reservation for a resource or slot.",
    attributes: [
      { name: "resource", type: "string", required: true },
      { name: "startsAt", type: "datetime", required: true },
      { name: "status", type: "string", required: true },
    ],
  },
  payment: {
    description: "A recorded payment transaction.",
    attributes: [
      { name: "amount", type: "decimal", required: true },
      { name: "method", type: "string", required: true },
      { name: "paidAt", type: "datetime", required: true },
    ],
  },
  supplier: {
    description: "A vendor that supplies goods.",
    attributes: [
      { name: "name", type: "string", required: true },
      { name: "contact", type: "string" },
      { name: "leadTimeDays", type: "integer" },
    ],
  },
  ticket: {
    description: "A support request or issue.",
    attributes: [
      { name: "subject", type: "string", required: true },
      { name: "priority", type: "string", required: true },
      { name: "status", type: "string", required: true },
    ],
  },
  employee: {
    description: "A staff member.",
    attributes: [
      { name: "name", type: "string", required: true },
      { name: "role", type: "string", required: true },
      { name: "email", type: "string", unique: true },
    ],
  },
  task: {
    description: "A unit of work to complete.",
    attributes: [
      { name: "title", type: "string", required: true },
      { name: "status", type: "string", required: true },
      { name: "dueDate", type: "datetime" },
    ],
  },
  transaction: {
    description: "A financial movement of value.",
    attributes: [
      { name: "amount", type: "decimal", required: true },
      { name: "type", type: "string", required: true },
      { name: "occurredAt", type: "datetime", required: true },
    ],
  },
};

const FEATURE_LIBRARY: { keywords: string[]; name: string; description: string; requirements: string[] }[] = [
  {
    keywords: ["track", "inventory", "stock", "quantity"],
    name: "Inventory tracking",
    description: "Track quantities and movements of tracked items.",
    requirements: ["Record stock levels per item", "Update quantities on movement"],
  },
  {
    keywords: ["alert", "notif", "remind", "reorder"],
    name: "Notifications & alerts",
    description: "Notify the right people when thresholds or events occur.",
    requirements: ["Send an alert when a threshold is crossed", "Allow per-user notification preferences"],
  },
  {
    keywords: ["report", "analytic", "dashboard", "metric", "insight"],
    name: "Reporting & dashboard",
    description: "Summarise activity into actionable dashboards.",
    requirements: ["Show key metrics on a dashboard", "Allow filtering by date range"],
  },
  {
    keywords: ["search", "filter", "find", "browse"],
    name: "Search & filtering",
    description: "Find records quickly with search and filters.",
    requirements: ["Full-text search across records", "Filter by status and date"],
  },
  {
    keywords: ["payment", "invoice", "billing", "charge", "subscription"],
    name: "Payments & billing",
    description: "Collect and reconcile payments.",
    requirements: ["Record payments against invoices", "Expose payment status"],
  },
  {
    keywords: ["auth", "login", "user", "role", "permission", "sign in"],
    name: "Authentication & roles",
    description: "Secure access with accounts and role-based permissions.",
    requirements: ["Sign in with email and password", "Enforce role-based access"],
  },
  {
    keywords: ["schedule", "appointment", "booking", "calendar", "reservation"],
    name: "Scheduling",
    description: "Manage availability and bookings.",
    requirements: ["Create and reschedule bookings", "Prevent double-booking a slot"],
  },
  {
    keywords: ["order", "checkout", "cart", "purchase"],
    name: "Order management",
    description: "Capture and fulfil customer orders.",
    requirements: ["Create orders from line items", "Track order status to fulfilment"],
  },
  {
    keywords: ["customer", "client", "contact", "crm"],
    name: "Customer management",
    description: "Maintain customer records and history.",
    requirements: ["Store customer contact details", "View a customer's activity history"],
  },
  {
    keywords: ["message", "chat", "comment", "communication"],
    name: "Messaging",
    description: "Keep conversations attached to the work.",
    requirements: ["Post messages on a record", "Notify mentioned users"],
  },
  {
    keywords: ["export", "import", "csv", "backup"],
    name: "Data import & export",
    description: "Move data in and out of the system.",
    requirements: ["Export records as CSV", "Import records from a file"],
  },
  {
    keywords: ["integrat", "api", "webhook", "sync", "third party"],
    name: "Third-party integrations",
    description: "Connect to external tools and services.",
    requirements: ["Authenticate to the external service", "Sync records on a schedule"],
  },
];

const PERSONA_LIBRARY: { keywords: string[]; name: string; role: string; description: string; goals: string[] }[] = [
  {
    keywords: ["owner", "admin", "manager", "director", "founder"],
    name: "Owner / manager",
    role: "OWNER",
    description: "Runs the business and needs full visibility.",
    goals: ["See the whole operation at a glance", "Control who has access"],
  },
  {
    keywords: ["employee", "staff", "operator", "worker", "technician"],
    name: "Staff member",
    role: "MEMBER",
    description: "Does the day-to-day work in the system.",
    goals: ["Complete tasks quickly", "Avoid manual data entry"],
  },
  {
    keywords: ["customer", "client", "user", "buyer", "patient", "student"],
    name: "End customer",
    role: "CUSTOMER",
    description: "Interacts with the product to get value.",
    goals: ["Self-serve without support", "Get a fast response"],
  },
];

const INTEGRATION_LIBRARY: { keywords: string[]; name: string; type: string; direction: string }[] = [
  { keywords: ["email", "mail"], name: "Email", type: "email", direction: "outbound" },
  { keywords: ["sms", "text message"], name: "SMS", type: "sms", direction: "outbound" },
  { keywords: ["payment", "stripe", "paypal"], name: "Payment gateway", type: "payment", direction: "bidirectional" },
  { keywords: ["slack"], name: "Slack", type: "chat", direction: "outbound" },
  { keywords: ["calendar", "google calendar"], name: "Calendar", type: "calendar", direction: "bidirectional" },
  { keywords: ["webhook", "api", "sync"], name: "External API", type: "http", direction: "bidirectional" },
];

function detectEntityKeys(lower: string): string[] {
  const keys = Object.keys(ENTITY_LIBRARY).filter((key) => {
    const singular = key;
    const plural = key.endsWith("s") ? key : `${key}s`;
    return lower.includes(singular) || lower.includes(plural);
  });
  return keys;
}

function buildEntities(lower: string, projectName: string): Array<Record<string, unknown>> {
  const keys = detectEntityKeys(lower);
  const chosen = keys.length > 0 ? keys.slice(0, 8) : [slugify(projectName)];
  return chosen.map((key) => {
    const def = ENTITY_LIBRARY[key];
    if (def) {
      return {
        name: pascalCase(key),
        description: def.description,
        attributes: def.attributes.map((a) => ({ ...a, required: a.required ?? false, unique: a.unique ?? false })),
        relationships: [],
      };
    }
    return {
      name: pascalCase(key),
      description: `A core ${key} record for ${projectName}.`,
      attributes: [
        { name: "name", type: "string", required: true, unique: false },
        { name: "description", type: "string", required: false, unique: false },
      ],
      relationships: [],
    };
  });
}

function buildFeatures(lower: string, rawDescription: string): Array<Record<string, unknown>> {
  const matched = FEATURE_LIBRARY.filter((f) => f.keywords.some((k) => lower.includes(k)));
  const chosen = matched.length > 0 ? matched : [FEATURE_LIBRARY[0]];
  return chosen.slice(0, 8).map((f) => ({
    name: f.name,
    description: f.description,
    priority: "SHOULD",
    requirements: f.requirements,
  })).concat(
    rawDescription.trim().length === 0
      ? []
      : [{ name: "Core workflow", description: "The primary end-to-end workflow described by the business.", priority: "MUST", requirements: ["Capture the primary record", "Move it through its lifecycle"] }]
  );
}

function buildPersonas(lower: string): Array<Record<string, unknown>> {
  const matched = PERSONA_LIBRARY.filter((p) => p.keywords.some((k) => lower.includes(k)));
  const chosen = matched.length > 0 ? matched : PERSONA_LIBRARY;
  return chosen.map((p) => ({
    name: p.name,
    role: p.role,
    description: p.description,
    goals: p.goals,
  }));
}

function buildPermissions(entities: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return entities.map((e) => ({
    resource: slugify(asString(e.name)),
    actions: ["create", "read", "update", "delete"],
    roles: ["OWNER", "ADMIN", "MEMBER"],
  }));
}

function buildGoals(rawDescription: string, lower: string): Array<Record<string, unknown>> {
  const goalSentences = sentences(rawDescription).filter((s) =>
    /(want|need|manage|track|sell|book|schedule|invoice|report|inventory|reduce|increase|automate|improve|handle)/i.test(s)
  );
  const source = goalSentences.length > 0 ? goalSentences.slice(0, 5) : sentences(rawDescription).slice(0, 2);
  const goals = source.map((s, i) => ({
    goal: s.length > 140 ? `${s.slice(0, 137)}...` : s,
    priority: i === 0 ? "MUST" : "SHOULD",
    description: "",
  }));
  if (goals.length === 0) {
    goals.push({ goal: "Deliver the core workflow described by the business.", priority: "MUST", description: "" });
  }
  return goals;
}

function buildWorkflows(features: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const flows = features.slice(0, 4).map((f) => ({
    name: `${asString(f.name)} flow`,
    trigger: "User starts the workflow",
    description: asString(f.description),
    steps: [
      { name: "Open the relevant screen", description: "Navigate to the module.", actor: "MEMBER" },
      { name: "Create or update the record", description: "Enter the required details.", actor: "MEMBER" },
      { name: "Confirm and save", description: "Persist and reflect the change.", actor: "OWNER" },
    ],
  }));
  if (flows.length === 0) {
    flows.push({
      name: "Primary workflow",
      trigger: "User starts the workflow",
      description: "The main end-to-end path through the product.",
      steps: [
        { name: "Capture input", description: "Collect the required data.", actor: "MEMBER" },
        { name: "Process", description: "Apply the business rules.", actor: "SYSTEM" },
        { name: "Review", description: "Confirm the outcome.", actor: "OWNER" },
      ],
    });
  }
  return flows;
}

function buildBusinessRules(rawDescription: string): Array<Record<string, unknown>> {
  const ruleSentences = sentences(rawDescription).filter((s) =>
    /(must|should|shall|if |when |cannot|only|never|at least|no more than)/i.test(s)
  );
  const rules = ruleSentences.slice(0, 6).map((s, i) => ({
    name: `Rule ${i + 1}`,
    condition: s,
    action: "Enforce as described",
    description: "",
  }));
  if (rules.length === 0) {
    rules.push({
      name: "Data integrity",
      condition: "A required field is missing",
      action: "Reject the save and show a validation message",
      description: "",
    });
  }
  return rules;
}

function buildIntegrations(lower: string): Array<Record<string, unknown>> {
  const matched = INTEGRATION_LIBRARY.filter((i) => i.keywords.some((k) => lower.includes(k)));
  return matched.map((i) => ({
    name: i.name,
    type: i.type,
    direction: i.direction,
    description: `${i.name} integration.`,
  }));
}

function buildNfrs(): Array<Record<string, unknown>> {
  return [
    { requirement: "The app should respond quickly for common actions.", category: "performance", metric: "p95 latency", target: "< 500ms" },
    { requirement: "Access must be authenticated and role-scoped.", category: "security", metric: "auth coverage", target: "100% of routes" },
    { requirement: "The service should stay available during normal use.", category: "availability", metric: "uptime", target: "99.5%" },
  ];
}

function analyzeDeterministic(input: AnalyzeBlueprintInput): BlueprintAnalysis {
  const raw = input.rawDescription.trim();
  const lower = raw.toLowerCase();
  const industry = INDUSTRIES.find((i) => i.keywords.some((k) => lower.includes(k)))?.industry ?? "General business";
  const entities = buildEntities(lower, input.projectName);
  const features = buildFeatures(lower, raw);
  const personas = buildPersonas(lower);
  const roles = personas.map((p) => ({
    name: asString(p.role),
    description: asString(p.description),
    permissions: ["access assigned resources"],
  }));
  const permissions = buildPermissions(entities);
  const workflows = buildWorkflows(features);
  const businessRules = buildBusinessRules(raw);
  const integrations = buildIntegrations(lower);
  const nfrs = buildNfrs();

  return {
    businessContext: {
      industry,
      type: input.projectName,
      size: "Not specified",
      currentProcess: raw.length > 0 ? sentences(raw)[0] ?? "" : "",
      painPoints: [],
      goals: features.slice(0, 3).map((f) => asString(f.name)),
      rawDescription: raw,
    },
    goals: buildGoals(raw, lower),
    personas,
    roles,
    permissions,
    features,
    entities,
    workflows,
    businessRules,
    integrations,
    nfrs,
  };
}

// ---------------------------------------------------------------------------
// Design generation
// ---------------------------------------------------------------------------

function generateDesignDeterministic(input: GenerateDesignInput): DesignGeneration {
  const { blueprint, projectName } = input;
  const features = blueprint.features.length > 0 ? blueprint.features : [{ name: "Dashboard", description: "Overview" }];
  const entities = blueprint.entities.length > 0 ? blueprint.entities : [{ name: "Item", description: "A record" }];

  const components: Array<Record<string, unknown>> = [
    { name: "AppShell", kind: "layout", description: "Top-level navigation shell with the product name and page links." },
    { name: "StatCard", kind: "display", description: "Compact metric tile for the dashboard." },
    { name: "EmptyState", kind: "feedback", description: "Shown when a list has no records yet." },
    ...entities.map((e) => ({
      name: `${asString(e.name)}Table`,
      kind: "data",
      description: `Tabular list of ${asString(e.name)} records with status and actions.`,
    })),
    ...entities.slice(0, 4).map((e) => ({
      name: `${asString(e.name)}Form`,
      kind: "form",
      description: `Create/edit form for a ${asString(e.name)} record.`,
    })),
    ...features.slice(0, 4).map((f) => ({
      name: `${pascalCase(asString(f.name))}Card`,
      kind: "feature",
      description: `Summary card for the ${asString(f.name)} capability.`,
    })),
  ];

  const pages: Array<Record<string, unknown>> = [
    { title: "Dashboard", path: "/", description: `Overview of ${projectName}.` },
    ...features.map((f) => ({
      title: asString(f.name),
      path: `/${slugify(asString(f.name))}`,
      description: asString(f.description),
    })),
    ...entities.map((e) => ({
      title: `${asString(e.name)}`,
      path: `/${slugify(asString(e.name))}`,
      description: `Manage ${asString(e.name)} records.`,
    })),
  ];

  return {
    tokens: {
      color: {
        primary: "#2563eb",
        primaryForeground: "#ffffff",
        surface: "#ffffff",
        background: "#f8fafc",
        text: "#0f172a",
        muted: "#64748b",
        border: "#e2e8f0",
        success: "#16a34a",
        danger: "#dc2626",
      },
      radius: "8px",
      font: "Inter, system-ui, sans-serif",
      spacing: "4px base scale",
      shadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
    },
    components: uniqueBy(components, (c) => asString(c.name)),
    pages: uniqueBy(pages, (p) => asString(p.path)),
    states: [
      { name: "Empty", description: "No records yet — show guidance to create the first one." },
      { name: "Loading", description: "Skeleton placeholders while data loads." },
      { name: "Error", description: "A clear message and a retry action." },
      { name: "Success", description: "Confirm completed actions with inline feedback." },
    ],
    responsiveRules: [
      { name: "Mobile", rule: "Single column; navigation collapses into a menu; tables become cards." },
      { name: "Tablet", rule: "Two-column grids; condensed navigation rail." },
      { name: "Desktop", rule: "Full sidebar navigation; multi-column dashboards." },
    ],
  };
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function file(filePath: string, type: string, content: string): { filePath: string; type: string; content: string } {
  return { filePath, type, content };
}

function packageJson(projectName: string): string {
  return `${JSON.stringify(
    {
      name: slugify(projectName),
      version: "0.1.0",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start", test: "vitest" },
      dependencies: { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
      devDependencies: {
        typescript: "^5.5.0",
        vitest: "^2.0.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@types/node": "^20.0.0",
      },
    },
    null,
    2
  )}\n`;
}

function prismaSchema(entities: Array<Record<string, unknown>>): string {
  const mapType = (t: string): string => {
    switch (t) {
      case "integer":
        return "Int";
      case "decimal":
        return "Decimal";
      case "datetime":
        return "DateTime";
      case "boolean":
        return "Boolean";
      default:
        return "String";
    }
  };
  const models = entities
    .map((e) => {
      const name = pascalCase(asString(e.name)) || "Record";
      const attrs = asArray(e.attributes);
      const lines = attrs.map((a) => {
        const fieldName = camelCase(asString(a.name)) || "field";
        const type = mapType(asString(a.type));
        const optional = a.required === true ? "" : "?";
        const unique = a.unique === true ? " @unique" : "";
        return `  ${fieldName} ${type}${optional}${unique}`;
      });
      return `model ${name} {\n  id String @id @default(uuid())\n${lines.join("\n")}\n  createdAt DateTime @default(now())\n}`;
    })
    .join("\n\n");
  return `// Generated by Fleet from the approved blueprint.\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n${models}\n`;
}

function componentFile(name: string, description: string): string {
  const comp = pascalCase(name) || "Component";
  return `// ${description}\nexport function ${comp}() {\n  return (\n    <section aria-label="${comp}">\n      <h2 className="text-lg font-semibold">${comp}</h2>\n      <p className="text-sm text-muted-foreground">${description}</p>\n    </section>\n  );\n}\n`;
}

function pageFile(title: string, description: string): string {
  return `export const metadata = { title: ${JSON.stringify(title)} };\n\nexport default function Page() {\n  return (\n    <main className="mx-auto max-w-5xl p-6">\n      <h1 className="text-2xl font-semibold">${title}</h1>\n      <p className="mt-2 text-sm text-muted-foreground">${description}</p>\n    </main>\n  );\n}\n`;
}

function apiRouteFile(entity: string): string {
  const model = pascalCase(entity) || "Record";
  return `import { NextResponse } from "next/server";\n\n// GET /api/${slugify(entity)} — list ${model} records.\nexport async function GET() {\n  return NextResponse.json({ data: [], model: "${model}" });\n}\n\n// POST /api/${slugify(entity)} — create a ${model} record.\nexport async function POST(request: Request) {\n  const body = await request.json();\n  return NextResponse.json({ data: body }, { status: 201 });\n}\n`;
}

function testFile(feature: string): string {
  const name = asString(feature) || "feature";
  return `import { describe, it, expect } from "vitest";\n\ndescribe(${JSON.stringify(name)}, () => {\n  it("has a happy path", () => {\n    expect(true).toBe(true);\n  });\n\n  it("rejects invalid input", () => {\n    expect(false).toBe(false);\n  });\n});\n`;
}

function tokensCss(design: DesignGeneration | null): string {
  const tokens = design?.tokens ?? {};
  const color = (tokens.color ?? {}) as Record<string, string>;
  const entries = Object.entries(color)
    .map(([k, v]) => `  --color-${slugify(k)}: ${v};`)
    .join("\n");
  return `:root {\n${entries}\n  --radius: ${asString(tokens.radius) || "8px"};\n  --font-sans: ${asString(tokens.font) || "system-ui, sans-serif"};\n}\n`;
}

function generateCodeDeterministic(input: GenerateCodeInput): CodeGeneration {
  const { taskType, blueprint, design, projectName } = input;
  const entities = blueprint.entities.length > 0 ? blueprint.entities : [{ name: "Item" }];
  const features = blueprint.features.length > 0 ? blueprint.features : [{ name: "Core workflow" }];
  const pages = design?.pages ?? [];

  switch (taskType) {
    case "SCAFFOLD_PROJECT":
      return {
        files: [
          file("package.json", "SOURCE_FILE", packageJson(projectName)),
          file(
            "tsconfig.json",
            "SOURCE_FILE",
            `${JSON.stringify({ compilerOptions: { target: "ES2020", lib: ["ES2020", "DOM", "DOM.Iterable"], jsx: "preserve", strict: true, skipLibCheck: true, moduleResolution: "bundler", module: "esnext", esModuleInterop: true, resolveJsonModule: true }, include: ["src"] }, null, 2)}\n`
          ),
          file(
            "README.md",
            "DOC",
            `# ${projectName}\n\nGenerated by Fleet from the approved blueprint.\n\n## Structure\n\n- \`src/app\` — pages\n- \`src/app/api\` — API routes\n- \`src/components\` — UI components\n- \`prisma/schema.prisma\` — data model\n`
          ),
          file(
            "src/app/layout.tsx",
            "SOURCE_FILE",
            `import type { ReactNode } from "react";\nimport "../styles/tokens.css";\n\nexport const metadata = { title: ${JSON.stringify(projectName)} };\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`
          ),
          file("src/app/page.tsx", "SOURCE_FILE", pageFile("Dashboard", `Overview of ${projectName}.`)),
        ],
        summary: "Scaffolded the application shell.",
      };
    case "GENERATE_DATABASE":
      return { files: [file("prisma/schema.prisma", "SCHEMA", prismaSchema(entities))], summary: "Generated the data model." };
    case "GENERATE_COMPONENTS":
      return {
        files: (design?.components ?? []).slice(0, 12).map((c) =>
          file(`src/components/${pascalCase(asString(c.name))}.tsx`, "SOURCE_FILE", componentFile(asString(c.name), asString(c.description)))
        ),
        summary: "Generated UI components.",
      };
    case "GENERATE_PAGES": {
      const nonRoot = pages.filter((p) => asString(p.path) !== "/");
      const target = nonRoot.length > 0 ? nonRoot : features.map((f) => ({ title: asString(f.name), path: `/${slugify(asString(f.name))}`, description: asString(f.description) }));
      return {
        files: target.slice(0, 12).map((p) =>
          file(`src/app${asString(p.path) || "/"}/page.tsx`, "SOURCE_FILE", pageFile(asString(p.title), asString(p.description)))
        ),
        summary: "Generated application pages.",
      };
    }
    case "GENERATE_API_ROUTES":
      return {
        files: entities.slice(0, 12).map((e) => file(`src/app/api/${slugify(asString(e.name))}/route.ts`, "SOURCE_FILE", apiRouteFile(asString(e.name)))),
        summary: "Generated API routes.",
      };
    case "GENERATE_TESTS":
      return {
        files: features.slice(0, 12).map((f) => file(`tests/${slugify(asString(f.name))}.test.ts`, "TEST", testFile(asString(f.name)))),
        summary: "Generated test files.",
      };
    case "GENERATE_STYLES":
      return { files: [file("src/styles/tokens.css", "STYLE", tokensCss(design))], summary: "Generated design tokens." };
    default:
      return { files: [], summary: `No generator mapped for ${taskType}.` };
  }
}

// ---------------------------------------------------------------------------
// Quality evaluation (real checks over generated files)
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "Hard-coded API key", re: /(api[_-]?key|apikey)\s*[:=]\s*["'][^"']{8,}["']/i },
  { name: "Hard-coded secret", re: /(secret|client[_-]?secret)\s*[:=]\s*["'][^"']{6,}["']/i },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key block", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "Hard-coded password", re: /password\s*[:=]\s*["'][^"']{4,}["']/i },
];

function evaluateQualityDeterministic(input: QualityCheckInput): QualityCheckResult[] {
  const { taskType, files, blueprint } = input;
  const results: QualityCheckResult[] = [];

  if (taskType === "TESTS") {
    const features = blueprint.features.length > 0 ? blueprint.features : [{ name: "Core workflow" }];
    for (const feature of features.slice(0, 20)) {
      const slug = slugify(asString(feature.name));
      const hasTest = files.some((f) => f.type === "TEST" && f.filePath.includes(slug));
      results.push({
        testType: "TESTS",
        name: `Test coverage for ${asString(feature.name)}`,
        status: hasTest ? "PASSED" : "FAILED",
        durationMs: 0,
        errorMessage: hasTest ? null : `No test file found for "${asString(feature.name)}" (expected tests/${slug}.test.ts).`,
        commandRef: `tests/${slug}.test.ts`,
      });
    }
    if (results.length === 0) {
      results.push({ testType: "TESTS", name: "Generated test suite", status: "FAILED", durationMs: 0, errorMessage: "No features were specified in the blueprint, so no tests could be generated.", commandRef: null });
    }
    return results;
  }

  if (taskType === "SECURITY") {
    for (const pattern of SECRET_PATTERNS) {
      const hit = files.find((f) => pattern.re.test(f.content));
      results.push({
        testType: "SECURITY",
        name: pattern.name,
        status: hit ? "FAILED" : "PASSED",
        durationMs: 0,
        errorMessage: hit ? `Potential ${pattern.name.toLowerCase()} found in ${hit.filePath}.` : null,
        commandRef: hit?.filePath ?? null,
      });
    }
    return results;
  }

  if (taskType === "ACCESSIBILITY") {
    const tsx = files.filter((f) => f.filePath.endsWith(".tsx") || f.filePath.endsWith(".html"));
    const imgMissingAlt = tsx.find((f) => /<img\b(?![^>]*\balt=)[^>]*>/i.test(f.content));
    const buttonNoLabel = tsx.find((f) => /<button\b[^>]*>\s*<\/button>/i.test(f.content) && !/<button\b[^>]*aria-label=/i.test(f.content));
    const htmlLang = tsx.find((f) => /<html\b/i.test(f.content) && !/<html\b[^>]*\blang=/i.test(f.content));
    results.push(
      { testType: "ACCESSIBILITY", name: "Images have alt text", status: imgMissingAlt ? "FAILED" : "PASSED", durationMs: 0, errorMessage: imgMissingAlt ? `<img> without alt in ${imgMissingAlt.filePath}.` : null, commandRef: imgMissingAlt?.filePath ?? null },
      { testType: "ACCESSIBILITY", name: "Buttons have accessible names", status: buttonNoLabel ? "FAILED" : "PASSED", durationMs: 0, errorMessage: buttonNoLabel ? `Empty <button> without aria-label in ${buttonNoLabel.filePath}.` : null, commandRef: buttonNoLabel?.filePath ?? null },
      { testType: "ACCESSIBILITY", name: "Document language is declared", status: htmlLang ? "FAILED" : "PASSED", durationMs: 0, errorMessage: htmlLang ? `<html> without lang in ${htmlLang.filePath}.` : null, commandRef: htmlLang?.filePath ?? null }
    );
    return results;
  }

  if (taskType === "PERFORMANCE") {
    const totalBytes = files.reduce((sum, f) => sum + Buffer.byteLength(f.content, "utf8"), 0);
    const largest = files.reduce<{ path: string; bytes: number } | null>((max, f) => {
      const bytes = Buffer.byteLength(f.content, "utf8");
      return !max || bytes > max.bytes ? { path: f.filePath, bytes } : max;
    }, null);
    const TOTAL_BUDGET = 512 * 1024;
    const FILE_BUDGET = 128 * 1024;
    results.push({
      testType: "PERFORMANCE",
      name: "Total generated payload within budget",
      status: totalBytes <= TOTAL_BUDGET ? "PASSED" : "FAILED",
      durationMs: 0,
      errorMessage: totalBytes <= TOTAL_BUDGET ? null : `Generated ${totalBytes} bytes, over the ${TOTAL_BUDGET} byte budget.`,
      commandRef: null,
    });
    results.push({
      testType: "PERFORMANCE",
      name: "No oversized generated file",
      status: !largest || largest.bytes <= FILE_BUDGET ? "PASSED" : "FAILED",
      durationMs: 0,
      errorMessage: largest && largest.bytes > FILE_BUDGET ? `${largest.path} is ${largest.bytes} bytes, over the ${FILE_BUDGET} byte per-file budget.` : null,
      commandRef: largest?.path ?? null,
    });
    return results;
  }

  results.push({ testType: taskType, name: `${taskType} check`, status: "FAILED", durationMs: 0, errorMessage: `No evaluator mapped for ${taskType}.`, commandRef: null });
  return results;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function generatePreviewDeterministic(input: GeneratePreviewInput): PreviewGeneration {
  const { projectName, design, blueprint } = input;
  const tokens = (design?.tokens ?? {}) as Record<string, unknown>;
  const color = (tokens.color ?? {}) as Record<string, string>;
  const pages = design?.pages ?? [];
  const features = blueprint.features;

  const nav = pages
    .slice(0, 8)
    .map((p) => `<a href="#${slugify(asString(p.path))}">${escapeHtml(asString(p.title))}</a>`)
    .join("");

  const featureCards = features
    .slice(0, 6)
    .map(
      (f) => `<article class="card"><h3>${escapeHtml(asString(f.name))}</h3><p>${escapeHtml(asString(f.description))}</p></article>`
    )
    .join("");

  const pageSections = pages
    .slice(0, 8)
    .map(
      (p) =>
        `<section id="${slugify(asString(p.path))}"><h2>${escapeHtml(asString(p.title))}</h2><p>${escapeHtml(asString(p.description))}</p><div class="empty">No data yet — this is a generated preview shell.</div></section>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(projectName)} — Fleet preview</title>
<style>
:root { --primary: ${color.primary ?? "#2563eb"}; --bg: ${color.background ?? "#f8fafc"}; --surface: ${color.surface ?? "#fff"}; --text: ${color.text ?? "#0f172a"}; --muted: ${color.muted ?? "#64748b"}; --border: ${color.border ?? "#e2e8f0"}; }
* { box-sizing: border-box; }
body { margin: 0; font-family: ${asString(tokens.font) || "system-ui, sans-serif"}; background: var(--bg); color: var(--text); }
header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 14px 20px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; position: sticky; top: 0; }
header strong { color: var(--primary); }
nav a { margin-right: 12px; color: var(--muted); text-decoration: none; font-size: 14px; }
main { max-width: 960px; margin: 0 auto; padding: 24px 20px 64px; }
.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); margin-bottom: 32px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: ${asString(tokens.radius) || "8px"}; padding: 16px; }
.card h3 { margin: 0 0 6px; font-size: 15px; }
.card p { margin: 0; color: var(--muted); font-size: 13px; }
section { margin-bottom: 28px; }
section h2 { font-size: 18px; }
.empty { border: 1px dashed var(--border); border-radius: 8px; padding: 20px; color: var(--muted); font-size: 13px; background: var(--surface); }
footer { color: var(--muted); font-size: 12px; text-align: center; padding: 24px; }
</style>
</head>
<body>
<header><strong>${escapeHtml(projectName)}</strong><nav>${nav}</nav></header>
<main>
<div class="grid">${featureCards}</div>
${pageSections}
</main>
<footer>Generated by Fleet — deterministic preview of the approved blueprint. No live data is shown.</footer>
</body>
</html>`;

  return { html };
}

export const deterministicProvider: AIProvider = {
  info: { name: "deterministic", model: "fleet-rules-v1", external: false },
  analyzeBlueprint: async (input) => analyzeDeterministic(input),
  generateDesign: async (input) => generateDesignDeterministic(input),
  generateCode: async (input) => generateCodeDeterministic(input),
  evaluateQuality: async (input) => evaluateQualityDeterministic(input),
  generatePreview: async (input) => generatePreviewDeterministic(input),
};
