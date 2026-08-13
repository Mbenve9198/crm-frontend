import { apiClient } from '@/lib/api';
import type { ApiResponse, Contact, ContactStatus } from '@/types/contact';
import type { Call, CallOutcome } from '@/types/call';
import type { ColdCallScript, DialerQueueData, DialerQueueParams } from '@/types/dialer';

export async function getDialerQueue(
  params: DialerQueueParams = {}
): Promise<ApiResponse<DialerQueueData>> {
  const sp = new URLSearchParams();
  if (params.list) sp.append('list', params.list);
  if (params.status) sp.append('status', params.status);
  if (params.city) sp.append('city', params.city);
  if (params.limit != null) sp.append('limit', String(params.limit));
  if (params.offset != null) sp.append('offset', String(params.offset));
  if (params.owner) sp.append('owner', params.owner);
  const qs = sp.toString();
  return apiClient.request<DialerQueueData>(`/dialer/queue${qs ? `?${qs}` : ''}`);
}

export async function getColdCallScript(
  contactId: string
): Promise<ApiResponse<ColdCallScript>> {
  return apiClient.request<ColdCallScript>(`/dialer/contacts/${contactId}/script`);
}

export interface DialerWrapUpPayload {
  contactId: string;
  callId?: string;
  outcome: CallOutcome;
  status?: ContactStatus;
  notes?: string;
  callbackAt?: string | null;
  callbackNote?: string | null;
  mrr?: number;
}

export async function wrapUpDialer(
  payload: DialerWrapUpPayload
): Promise<ApiResponse<{ contact: Contact; call: Call | null }>> {
  try {
    return await apiClient.request(`/dialer/wrap-up`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (payload.callId && /chiamata non trovata/i.test(msg)) {
      const withoutCall: DialerWrapUpPayload = { ...payload };
      delete withoutCall.callId;
      return apiClient.request(`/dialer/wrap-up`, {
        method: 'POST',
        body: JSON.stringify(withoutCall),
      });
    }
    throw err;
  }
}
