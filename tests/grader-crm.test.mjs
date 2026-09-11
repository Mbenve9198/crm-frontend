import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasGraderContext, resolveWaEngagementStatus } from '../src/lib/wa-engagement.ts';
import { mergeFreshContact, contactDraftUpdate } from '../src/lib/contact-draft.ts';

describe('grader CRM presentation', () => {
  it('recognizes grader data on contacts with a historical source', () => {
    assert.equal(hasGraderContext({ source: 'smartlead', properties: { graderLeadId: 'lead-1' } }), true);
    assert.equal(hasGraderContext({ source: 'manual' }), false);
  });
  it('keeps the form draft while showing new bookings and messages from the server', () => {
    const base = { _id: 'c1', name: 'Ristorante', email: '', phone: '+390000000000', lists: [], properties: { firstName: 'Elisa', lastName: 'Rossi' } };
    const draft = { ...base, properties: { ...base.properties, firstName: 'Elisabetta' } };
    const fresh = { ...base, status: 'da richiamare', properties: { ...base.properties, callRequested: true, callbackAt: '2026-09-15T08:00:00Z', waLeadMessageCount: 1 } };
    const merged = mergeFreshContact(draft, base, fresh);
    assert.equal(merged.status, 'da richiamare');
    assert.equal(merged.properties.firstName, 'Elisabetta');
    assert.equal(merged.properties.waLeadMessageCount, 1);
    assert.deepEqual(contactDraftUpdate(merged, fresh), { propertyUpdates: { firstName: 'Elisabetta' } });
  });
  it('does not carry another contact’s draft across selection changes', () => {
    const fresh = { _id: 'c2', name: 'Secondo' };
    assert.equal(mergeFreshContact({ _id: 'c1' }, { _id: 'c1' }, fresh), fresh);
  });
  it('distinguishes outbound, automatic replies and a human reply', () => {
    const outbound = { role: 'agent' };
    const autoresponder = { role: 'lead', metadata: { isAutoresponder: true } };
    assert.equal(resolveWaEngagementStatus(undefined, [outbound]), 'outbound_only');
    assert.equal(resolveWaEngagementStatus(undefined, [outbound, autoresponder]), 'autoresponder_only');
    assert.equal(resolveWaEngagementStatus(undefined, [outbound, autoresponder, { role: 'lead' }]), 'engaged');
  });
});
