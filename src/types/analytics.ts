export type LeadSourceKey = string;

export type LeadSourceAnalytics = {
  totalLeads: number;
  qrCodeSent: number;
  freeTrialStarted: number;
  won: number;
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
  sources: Record<LeadSourceKey, LeadCohortSourceAnalytics>;
};

