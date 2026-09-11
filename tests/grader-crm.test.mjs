import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasGraderContext, resolveWaEngagementStatus } from '../src/lib/wa-engagement.ts';
import { acknowledgeContactEdits, applyContactEdits } from '../src/lib/contact-draft.ts';

describe('grader CRM presentation', () => {
  it('recognizes grader data on contacts with a historical source', () => {
    assert.equal(hasGraderContext({ source: 'smartlead', properties: { graderLeadId: 'lead-1' } }), true);
    assert.equal(hasGraderContext({ source: 'manual' }), false);
  });
  it('keeps the form draft while showing new bookings and messages from the server', () => {
    const base = { _id: 'c1', name: 'Ristorante', email: '', phone: '+390000000000', lists: [], properties: { firstName: 'Elisa', lastName: 'Rossi' } };
    const edits = { propertyUpdates: { firstName: 'Elisabetta' } };
    const fresh = { ...base, status: 'da richiamare', properties: { ...base.properties, callRequested: true, callbackAt: '2026-09-15T08:00:00Z', waLeadMessageCount: 1 } };
    const merged = applyContactEdits(fresh, edits);
    assert.equal(merged.status, 'da richiamare');
    assert.equal(merged.properties.firstName, 'Elisabetta');
    assert.equal(merged.properties.waLeadMessageCount, 1);
    assert.deepEqual(edits, { propertyUpdates: { firstName: 'Elisabetta' } });
  });
  it('keeps a surname typed while the first-name save is in flight', () => {
    const sent = { propertyUpdates: { firstName: 'Elisabetta' } };
    const typing = { propertyUpdates: { firstName: 'Elisabetta', lastName: 'Bianchi' } };
    const saved = { _id: 'c1', properties: { firstName: 'Elisabetta', lastName: 'Rossi', contactName: 'Elisabetta Rossi' } };
    const remaining = acknowledgeContactEdits(typing, sent, 2, 1);
    const merged = applyContactEdits(saved, remaining);
    assert.equal(merged.properties.firstName, 'Elisabetta');
    assert.equal(merged.properties.lastName, 'Bianchi');
    assert.deepEqual(remaining, typing);
  });
  it('preserves reverting a value while an earlier save is in flight', () => {
    const firstSave = { propertyUpdates: { firstName: 'Elisabetta' } };
    const secondSave = { propertyUpdates: { firstName: 'Elisa' } };
    const afterFirst = acknowledgeContactEdits(secondSave, firstSave, 2, 1);
    assert.deepEqual(afterFirst, secondSave);
    assert.equal(applyContactEdits({ properties: firstSave.propertyUpdates }, afterFirst).properties.firstName, 'Elisa');
    const afterSecond = acknowledgeContactEdits(afterFirst, secondSave, 2, 2);
    assert.deepEqual(afterSecond, { propertyUpdates: {} });
    assert.equal(applyContactEdits({ properties: secondSave.propertyUpdates }, afterSecond).properties.firstName, 'Elisa');
  });
  it('does not turn a server-computed full name into a subsequent property write', () => {
    const firstSave = { propertyUpdates: { firstName: 'Elisabetta' } };
    const secondSave = { propertyUpdates: { firstName: 'Elisabetta', lastName: 'Bianchi' } };
    const afterFirst = acknowledgeContactEdits(secondSave, firstSave, 2, 1);
    const draft1 = applyContactEdits({ properties: { contactName: 'Elisabetta Rossi' } }, afterFirst);
    assert.equal(draft1.properties.lastName, 'Bianchi');
    const afterSecond = acknowledgeContactEdits(afterFirst, secondSave, 2, 2);
    const draft2 = applyContactEdits({ properties: { contactName: 'Elisabetta Bianchi' } }, afterSecond);
    assert.equal(draft2.properties.contactName, 'Elisabetta Bianchi');
    assert.deepEqual(afterSecond, { propertyUpdates: {} });
  });
  it('preserves a newer edit even when its value matches an earlier queued save', () => {
    const current = { propertyUpdates: { firstName: 'Elisa' } };
    const remaining = acknowledgeContactEdits(current, { propertyUpdates: { firstName: 'Elisa' } }, 4, 2);
    assert.deepEqual(remaining, current);
    assert.equal(applyContactEdits({ properties: { firstName: 'Elisabetta' } }, remaining).properties.firstName, 'Elisa');
  });
  it('distinguishes outbound, automatic replies and a human reply', () => {
    const outbound = { role: 'agent' };
    const autoresponder = { role: 'lead', metadata: { isAutoresponder: true } };
    assert.equal(resolveWaEngagementStatus(undefined, [outbound]), 'outbound_only');
    assert.equal(resolveWaEngagementStatus(undefined, [outbound, autoresponder]), 'autoresponder_only');
    assert.equal(resolveWaEngagementStatus(undefined, [outbound, autoresponder, { role: 'lead' }]), 'engaged');
  });
});
