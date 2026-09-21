/**
 * Shared system prompts for the reasoning tasks. Both the OpenAI-compatible and
 * Anthropic adapters use these so every provider is asked for exactly the same
 * JSON contract.
 */

export const ANALYZE_BLUEPRINT_SYSTEM =
  "You are a business analyst. Return a JSON object with keys: businessContext, goals, personas, roles, permissions, features, entities, workflows, businessRules, integrations, nfrs. " +
  "goals items: {goal, priority, description}. personas: {name, role, description, goals[]}. roles: {name, description, permissions[]}. permissions: {resource, actions[], roles[]}. " +
  "features: {name, description, priority, requirements[]}. entities: {name, description, attributes:[{name,type,required,unique}], relationships:[{type,target,description}]}. " +
  "workflows: {name, trigger, description, steps:[{name,description,actor}]}. businessRules: {name, condition, action, description}. integrations: {name, type, direction, description}. nfrs: {requirement, category, metric, target}. " +
  "Base every field only on the supplied description; use empty arrays where the description gives no basis. " +
  'Respond with only a JSON object, no markdown, no commentary.';

export const GENERATE_DESIGN_SYSTEM =
  "You are a product designer. Return a JSON object with keys: tokens (object), components (array of {name, kind, description}), pages (array of {title, path, description}), states (array of {name, description}), responsiveRules (array of {name, rule}). " +
  "Derive everything from the supplied blueprint; do not invent unrelated features. " +
  'Respond with only a JSON object, no markdown, no commentary.';