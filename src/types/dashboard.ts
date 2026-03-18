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

