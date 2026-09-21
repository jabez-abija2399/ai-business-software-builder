import type { ReactNode } from "react";
import type { BlueprintSections } from "../types";
import {
  BLUEPRINT_SECTIONS,
  sectionHasContent,
  type SectionKey,
} from "../lib/sections";
import { BlueprintSection, SectionField, SectionItem, SectionItemField } from "./blueprint-section";

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOr = (v: unknown, fallback = "Not specified"): string =>
  typeof v === "string" && v.trim().length > 0 ? v : fallback;
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const arr = (v: unknown): Array<Record<string, unknown>> =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>) : [];

function EmptyNote() {
  return <p className="text-[13px] text-muted-foreground">No information provided yet.</p>;
}

function ContextSection({ context }: { context: Record<string, unknown> | null }) {
  if (!context) return <EmptyNote />;
  const fields: { label: string; value: string }[] = [];
  const strings = [
    ["industry", "Industry"],
    ["type", "Business type"],
    ["size", "Size"],
    ["currentProcess", "Current process"],
  ] as const;
  for (const [key, label] of strings) {
    const v = context[key];
    if (typeof v === "string" && v.trim().length > 0) fields.push({ label, value: v });
  }
  const painPoints = list(context.painPoints);
  const goals = list(context.goals);
  if (fields.length === 0 && painPoints.length === 0 && goals.length === 0) {
    return <EmptyNote />;
  }
  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <SectionField key={f.label} label={f.label} value={f.value} />
      ))}
      {painPoints.length > 0 && (
        <div className="text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Pain points: </span>
          {painPoints.join(" · ")}
        </div>
      )}
      {goals.length > 0 && (
        <div className="text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Context goals: </span>
          {goals.join(" · ")}
        </div>
      )}
    </div>
  );
}

function PianoScore({ priority }: { priority: unknown }) {
  const p = str(priority).toUpperCase();
  return (
    <span
      className="rounded-full bg-accent px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
      aria-label={`Priority ${p}`}
    >
      {p || "?"}
    </span>
  );
}

function FeaturesSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <SectionItem key={i} title={strOr(f.name)} badges={[{ label: strOr(f.priority, "SHOULD"), tone: "accent" }]}>
          <SectionField label="Description" value={strOr(f.description)} />
          {arr(f.requirements).length > 0 && (
            <div className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Requirements</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {list(f.requirements).map((r, j) => (
                  <li key={j}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </SectionItem>
      ))}
    </div>
  );
}

function EntitySection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-2">
      {items.map((e, i) => (
        <SectionItem key={i} title={strOr(e.name)}>
          <SectionField label="Description" value={strOr(e.description)} />
          {arr(e.attributes).length > 0 && (
            <div className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Attributes</span>
              <ul className="mt-1 space-y-1">
                {arr(e.attributes).map((a, j) => (
                  <SectionItemField
                    key={j}
                    name={strOr(a.name)}
                    type={strOr(a.type)}
                    required={a.required === true}
                    unique={a.unique === true}
                  />
                ))}
              </ul>
            </div>
          )}
          {arr(e.relationships).length > 0 && (
            <div className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Relationships</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {arr(e.relationships).map((r, j) => (
                  <li key={j}>
                    {strOr(r.type)} → {strOr(r.target)}
                    {str(r.description) && ` — ${str(r.description)}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionItem>
      ))}
    </div>
  );
}

function WorkflowSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-2">
      {items.map((w, i) => (
        <SectionItem key={i} title={strOr(w.name)} badges={[{ label: strOr(w.trigger, "Trigger"), tone: "muted" }]}>
          <SectionField label="Description" value={strOr(w.description)} />
          {arr(w.steps).length > 0 && (
            <ol className="mt-1 space-y-1">
              {arr(w.steps).map((s, j) => (
                <li key={j} className="flex items-baseline gap-2 text-[13px] text-muted-foreground">
                  <span className="font-medium text-foreground">{j + 1}.</span>
                  <span>
                    {strOr(s.name)}
                    {str(s.description) && ` — ${str(s.description)}`}
                    {str(s.actor) && <span className="text-muted-foreground/80"> (by {str(s.actor)})</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SectionItem>
      ))}
    </div>
  );
}

function RuleSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <SectionItem key={i} title={strOr(r.name)}>
          <SectionField label="Condition" value={strOr(r.condition)} />
          <SectionField label="Action" value={strOr(r.action)} />
          {str(r.description) && <SectionField label="Description" value={str(r.description)} />}
        </SectionItem>
      ))}
    </div>
  );
}

function IntegrationSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-2">
      {items.map((i, idx) => (
        <SectionItem
          key={idx}
          title={strOr(i.name)}
          badges={[{ label: strOr(i.direction, "integration"), tone: "accent" }]}
        >
          <SectionField label="Type" value={strOr(i.type)} />
          <SectionField label="Description" value={strOr(i.description)} />
        </SectionItem>
      ))}
    </div>
  );
}

function NfrSection({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-2">
      {items.map((n, i) => (
        <SectionItem key={i} title={strOr(n.requirement)} badges={[{ label: strOr(n.category), tone: "muted" }]}>
          {str(n.metric) && <SectionField label="Metric" value={str(n.metric)} />}
          {str(n.target) && <SectionField label="Target" value={str(n.target)} />}
        </SectionItem>
      ))}
    </div>
  );
}

function RolesPermissionsSection({
  roles,
  permissions,
}: {
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
}) {
  if (roles.length === 0 && permissions.length === 0) return <EmptyNote />;
  return (
    <div className="space-y-4">
      {roles.length > 0 && (
        <div className="space-y-2">
          {roles.map((r, i) => (
            <SectionItem key={i} title={strOr(r.name)}>
              <SectionField label="Description" value={strOr(r.description)} />
              {list(r.permissions).length > 0 && (
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium text-foreground">Permissions: </span>
                  {list(r.permissions).join(" · ")}
                </p>
              )}
            </SectionItem>
          ))}
        </div>
      )}
      {permissions.length > 0 && (
        <div className="space-y-2">
          {permissions.map((p, i) => (
            <SectionItem
              key={i}
              title={strOr(p.resource)}
              badges={[{ label: `${Array.isArray(p.roles) ? p.roles.length : 0} roles`, tone: "muted" }]}
            >
              <p className="text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">Actions: </span>
                {list(p.actions).join(" · ") || "—"}
              </p>
            </SectionItem>
          ))}
        </div>
      )}
    </div>
  );
}

const RENDERERS: Partial<Record<SectionKey, (sections: BlueprintSections) => ReactNode>> = {
  businessContext: (s) => <ContextSection context={s.businessContext} />,
  goals: (s) => (
    <div className="space-y-2">
      {s.goals.length === 0 && <EmptyNote />}
      {s.goals.map((g, i) => (
        <SectionItem key={i} title={strOr(g.goal)} badges={[{ label: strOr(g.priority, "SHOULD"), tone: "accent" }]}>
          {str(g.description) && <SectionField label="Description" value={str(g.description)} />}
        </SectionItem>
      ))}
    </div>
  ),
  personas: (s) => (
    <div className="space-y-2">
      {s.personas.length === 0 && <EmptyNote />}
      {s.personas.map((p, i) => (
        <SectionItem key={i} title={strOr(p.name)} badges={[{ label: strOr(p.role, "role"), tone: "muted" }]}>
          <SectionField label="Description" value={strOr(p.description)} />
          {list(p.goals).length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Goals: </span>
              {list(p.goals).join(" · ")}
            </p>
          )}
        </SectionItem>
      ))}
    </div>
  ),
  rolesPermissions: (s) => <RolesPermissionsSection roles={s.roles} permissions={s.permissions} />,
  features: (s) => <FeaturesSection items={s.features} />,
  entities: (s) => <EntitySection items={s.entities} />,
  workflows: (s) => <WorkflowSection items={s.workflows} />,
  businessRules: (s) => <RuleSection items={s.businessRules} />,
  integrations: (s) => <IntegrationSection items={s.integrations} />,
  nfrs: (s) => <NfrSection items={s.nfrs} />,
  notes: (s) =>
    s.notes && s.notes.trim().length > 0 ? (
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{s.notes}</p>
    ) : (
      <EmptyNote />
    ),
};

/**
 * Full readable specification rendered from the persisted blueprint fields —
 * never raw JSON, never fabricated content (A5.5/A5.6/A5.7).
 */
export function BlueprintSections({ sections }: { sections: BlueprintSections }) {
  return (
    <div>
      {BLUEPRINT_SECTIONS.map((meta, i) => (
        <BlueprintSection
          key={meta.key}
          id={meta.id}
          title={meta.title}
          description={meta.description}
          status={sectionHasContent(meta.key, sections) ? "defined" : "missing"}
          defaultOpen={
            meta.key === "businessContext" ||
            meta.key === "goals" ||
            meta.key === "personas" ||
            meta.key === "businessRules" ||
            meta.key === "integrations" ||
            meta.key === "nfrs" ||
            i === 0
          }
        >
          {RENDERERS[meta.key]?.(sections)}
        </BlueprintSection>
      ))}
    </div>
  );
}