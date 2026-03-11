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

