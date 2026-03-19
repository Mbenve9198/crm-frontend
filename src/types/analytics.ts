export type LeadSourceKey = string;

export type LeadSourceAnalytics = {
  totalLeads: number;
  qrCodeSent: number;
  freeTrialStarted: number;
  won: number;
  // Legacy: il backend storico somma "lost before/after" in questo campo
  lost: number;
  mrrWon: number;
  mrrFreeTrial: number;
};

export type LeadAnalyticsData = {
  period: {
    from: string;
    to: string;
  };
  sources: Record<LeadSourceKey, LeadSourceAnalytics>;
};

export type WonContact = {
  id: string;
  name: string;
  email: string;
  mrr?: number;
  source: string;
  wonAt: string;
};

export type WonContactsAnalyticsData = {
  source: string;
  period: {
    from: string;
    to: string;
  };
  contacts: WonContact[];
};

export type LeadCohortContact = {
  id: string;
  name: string;
  email: string;
  mrr: number | null;
  source: string;
  cohortStartAt: string;
  reactivatedAt?: string;
  previousActivityAt?: string | null;
};

export type LeadFunnelStepContact = {
  id: string;
  name: string;
  email: string;
  mrr: number | null;
  source: string;
  enteredAt: string | null;
};

export type LeadCohortSourceAnalytics = {
  cohort: {
    created: { count: number; contacts: LeadCohortContact[] };
    reactivated: { count: number; contacts: LeadCohortContact[] };
    total: { count: number };
  };
  steps: {
    notTouched: { count: number; contacts: LeadFunnelStepContact[] };
    qrCodeSent: { count: number; contacts: LeadFunnelStepContact[] };
    freeTrialStarted: { count: number; contacts: LeadFunnelStepContact[] };
    won: { count: number; contacts: LeadFunnelStepContact[] };
  };
};

export type LeadCohortFunnelAnalyticsData = {
  period: {
    from: string;
    to: string;
  };
  silenceDaysThreshold: number;
  outcomeWindowDays: number;
  sources: Record<LeadSourceKey, LeadCohortSourceAnalytics>;
};

// Owner Performance Analytics

export type OwnerSourceBreakdown = {
  cohort: number;
  notTouched: number;
  qrCodeSent: number;
  freeTrialStarted: number;
  won: number;
  lostBFT: number;
  lostAFT: number;
  mrrWon: number;
};

export type NotTouchedContact = {
  id: string;
  name: string;
  email: string;
  source: string;
  createdAt: string;
};

export type StalledContact = {
  id: string;
  name: string;
  email: string;
  source: string;
  status: string;
  owner: string | null;
  lastActivityAt: string;
};

export type LostContact = {
  id: string;
  name: string;
  email: string;
  source: string;
};

export type OwnerPerformanceRow = {
  ownerId: string;
  ownerName: string;
  cohort: number;
  notTouched: number;
  pctNotTouched: number;
  avgFirstTouchDays: number | null;
  qrCodeSent: number;
  convToQR: number;
  freeTrialStarted: number;
  convQRtoFT: number;
  won: number;
  convFTtoWon: number;
  lostBFT: number;
  lostAFT: number;
  stalled: number;
  mrrWon: number;
  avgSalesCycleDays: number | null;
  trends: {
    pctNotTouched: number | null;
    convToQR: number | null;
    convFTtoWon: number | null;
  };
  bySource: Record<string, OwnerSourceBreakdown>;
  notTouchedContacts: NotTouchedContact[];
  stalledContacts: StalledContact[];
  lostBFTContacts: LostContact[];
  lostAFTContacts: LostContact[];
};

export type OwnerPerformanceData = {
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
  owners: OwnerPerformanceRow[];
};

