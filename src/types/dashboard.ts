import { ContactStatus } from '@/types/contact';

export type DashboardListItem = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status: ContactStatus;
  source?: string;
  mrr?: number;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string | null;
  activitiesCount?: number;
  properties?: {
    callbackAt?: string | null;
    callbackNote?: string | null;
    [key: string]: unknown;
  };
};

export type DashboardKpis = {
  total: number;
  notTouched: number;
  freeTrialStarted: number;
  qrCodeSent: number;
  interested: number;
  won: number;
  lost: number;
  pipelinePotentialEur: number;
  callbackOverdue: number;
  callbackToday: number;
  callbackNext7Days: number;
  callbackNoDate: number;
};

export type DashboardData = {
  ownerId: string;
  kpis: DashboardKpis;
  lists: {
    notTouched: DashboardListItem[];
    callback: DashboardListItem[];
    freeTrial: DashboardListItem[];
    qrFollowUp: DashboardListItem[];
  };
};

