import { ContactStatus } from '@/types/contact';

export const DIALER_DEFAULT_LIST = 'Cold Call - Vicini Clienti';

export type DialerCompetitorAhead = {
  name: string;
  rank?: number | null;
  rating?: number | null;
  reviews?: number | null;
};

export type DialerNearbyClient = {
  name: string;
  distM?: number | null;
};

export type DialerCardSummary = {
  hasVisibilityCard?: boolean;
  name?: string | null;
  keyword?: string | null;
  rank?: number | null;
  rating?: number | null;
  reviews?: number | null;
  velocityPerMonth?: number | null;
  competitorAhead?: DialerCompetitorAhead | null;
  nearbyClient?: DialerNearbyClient | null;
  address?: string | null;
  city?: string | null;
  category?: string | null;
  placeId?: string | null;
  hook?: string | null;
  generatedAt?: string | null;
};

export type DialerContactOwner = {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: 'admin' | 'manager' | 'agent' | 'viewer';
};

export type DialerContact = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status: ContactStatus | string;
  lists?: string[];
  source?: string;
  owner?: DialerContactOwner;
  properties?: Record<string, unknown>;
  visibilityCard?: unknown;
  cardSummary: DialerCardSummary;
  hasVisibilityCard: boolean;
  scriptReady?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

export type DialerQueueParams = {
  list?: string;
  status?: string;
  limit?: number;
  offset?: number;
  owner?: string;
};

export type DialerQueueData = {
  contacts: DialerContact[];
  total: number;
  list: string;
  status: string;
  limit: number;
  offset: number;
};

export type ColdCallObjection = {
  trigger: string;
  line: string;
};

export type ColdCallScript = {
  contactId: string;
  contactName: string;
  opening: string;
  hook: string;
  busy: string;
  gate: string;
  trial: string;
  objections: ColdCallObjection[];
  cardSummary: DialerCardSummary;
  hasVisibilityCard: boolean;
  listHint?: string;
};
