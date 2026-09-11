import type { Contact, UpdateContactRequest } from '../types/contact';

/** Keep fields the user edited while refreshing the rest of the contact. */
export function mergeFreshContact(draft: Contact | null, base: Contact | null, fresh: Contact): Contact {
  if (!draft || !base || draft._id !== fresh._id) return fresh;
  return {
    ...fresh,
    name: draft.name !== base.name ? draft.name : fresh.name,
    email: draft.email !== base.email ? draft.email : fresh.email,
    phone: draft.phone !== base.phone ? draft.phone : fresh.phone,
    lists: draft.lists !== base.lists ? draft.lists : fresh.lists,
    properties: { ...fresh.properties, ...changedProperties(draft, base) },
  };
}

function changedProperties(draft: Contact, base: Contact | null) {
  return Object.fromEntries(Object.entries(draft.properties || {}).filter(
    ([key, value]) => value !== base?.properties?.[key]
  ));
}

export function contactDraftUpdate(draft: Contact, base: Contact | null): UpdateContactRequest {
  return {
    ...(draft.name !== base?.name ? { name: draft.name } : {}),
    ...(draft.email !== base?.email ? { email: draft.email } : {}),
    ...(draft.phone !== base?.phone ? { phone: draft.phone } : {}),
    ...(draft.lists !== base?.lists ? { lists: draft.lists } : {}),
    propertyUpdates: changedProperties(draft, base),
  };
}
