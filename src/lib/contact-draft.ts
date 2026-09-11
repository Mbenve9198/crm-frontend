import type { Contact } from '../types/contact';

/** Only input events create edits; server-derived properties never become dirty. */
export type ContactDraftEdits = Partial<Pick<Contact, 'name' | 'email' | 'phone' | 'lists'>> & {
  propertyUpdates?: Contact['properties'];
};

export function applyContactEdits(fresh: Contact, edits: ContactDraftEdits): Contact {
  const { propertyUpdates, ...fields } = edits;
  return { ...fresh, ...fields, properties: { ...fresh.properties, ...propertyUpdates } };
}

/** Acknowledging an older save must preserve edits made while it was in flight. */
export function acknowledgeContactEdits(current: ContactDraftEdits, sent: ContactDraftEdits,
  currentRevision: number, sentRevision: number): ContactDraftEdits {
  if (currentRevision !== sentRevision) return current;
  const remaining = { ...current };
  for (const key of ['name', 'email', 'phone', 'lists'] as const) {
    if (key in sent && current[key] === sent[key]) delete remaining[key];
  }
  remaining.propertyUpdates = Object.fromEntries(Object.entries(current.propertyUpdates || {})
    .filter(([key, value]) => !(key in (sent.propertyUpdates || {})) || value !== sent.propertyUpdates?.[key]));
  return remaining;
}
