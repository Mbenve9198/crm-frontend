import { Contact, ContactStatus } from '@/types/contact';

export const DIALER_DEFAULT_LIST = 'Cold Call - Vicini Clienti';

export const DIALER_ROLES = ['agent', 'manager', 'admin'] as const;

export function canUseDialer(role?: string | null): boolean {
  return !!role && (DIALER_ROLES as readonly string[]).includes(role);
}

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

export type DialerNearbyClientStats = {
  restaurantId?: string | null;
  name?: string | null;
  city?: string | null;
  initialReviewCount?: number | null;
  currentReviewCount?: number | null;
  reviewsGained?: number | null;
  monthsActive?: number | null;
  avgReviewsPerMonth?: number | null;
  rating?: number | null;
  startedAt?: string | null;
  syncedAt?: string | null;
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
  competitorsAhead?: DialerCompetitorAhead[] | null;
  nearbyClient?: DialerNearbyClient | null;
  nearbyClientStats?: DialerNearbyClientStats | null;
  nearbyProof?: string | null;
  address?: string | null;
  city?: string | null;
  category?: string | null;
  placeId?: string | null;
  hook?: string | null;
  generatedAt?: string | null;
};

export type DialerContact = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status: ContactStatus;
  lists?: string[];
  source?: string;
  owner?: Contact['owner'];
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

export type ColdCallObjectionBranch = {
  id: string;
  label: string;
  line: string;
  needsCovers?: boolean;
};

export type ColdCallObjection = {
  id?: string;
  short?: string;
  trigger: string;
  line: string;
  branches?: ColdCallObjectionBranch[];
};

export type ColdCallDiscoveryQuestion = {
  id: string;
  label: string;
  line: string;
  mode?: 'ask' | 'confirm';
  knownFact?: string;
  inputType?: 'text' | 'number';
  placeholder?: string;
  drivesProjections?: boolean;
  followUpIfPaper?: string;
};

export type ColdCallValueBlock = {
  needsCovers?: boolean;
  lines: string[];
};

export type ColdCallTrialStep = {
  id: string;
  title: string;
  line: string;
};

export type ColdCallTrialBlock = {
  needsCovers?: boolean;
  steps: ColdCallTrialStep[];
};

export type ColdCallScript = {
  contactId: string;
  contactName: string;
  opening: string;
  hook: string;
  discovery: ColdCallDiscoveryQuestion[];
  value: string;
  valueBlock?: ColdCallValueBlock;
  busy: string;
  gate: string;
  trial: string;
  trialBlock?: ColdCallTrialBlock;
  objections: ColdCallObjection[];
  cardSummary: DialerCardSummary;
  hasVisibilityCard: boolean;
  listHint?: string;
  projectionHints?: {
    reviews?: number | null;
    rating?: number | null;
    keyword?: string | null;
    nearbyName?: string | null;
  };
};

export function resolveDialerCardView(
  contact: DialerContact | null,
  script: ColdCallScript | null
): { summary: DialerCardSummary | null; hasVisibilityCard: boolean } {
  const summary = script?.cardSummary || contact?.cardSummary || null;
  const hasVisibilityCard =
    script?.hasVisibilityCard ?? contact?.hasVisibilityCard ?? summary?.hasVisibilityCard ?? false;
  return { summary, hasVisibilityCard };
}
