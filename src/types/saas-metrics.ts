export interface SparklinePoint {
  month: string;
  mrr: number;
  customers: number;
}

export interface SaasOverview {
  currentMrr: number;
  prevMrr: number;
  currentCustomers: number;
  prevCustomers: number;
  trials: number;
  prevTrials: number;
  growth: number;
  prevGrowth: number;
  newMrr: number;
  prevNewMrr: number;
  churnMrr: number;
  prevChurnMrr: number;
  sparkline: SparklinePoint[];
}

export interface MrrMonthSnapshot {
  month: string;
  snapshotDate: string;
  newMrr: number;
  reactivationMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  voluntaryChurnMrr: number;
  delinquentChurnMrr: number;
  existingMrr: number;
  totalMrr: number;
  totalCustomers: number;
  newCustomers: number;
  reactivatedCustomers: number;
  churnedCustomers: number;
  planBreakdown: PlanBreakdownItem[];
}

export interface MrrOverviewData {
  months: MrrMonthSnapshot[];
}

export interface PlanBreakdownItem {
  planName: string;
  customers: number;
  mrr: number;
  percentage?: number;
}

export interface PlansData {
  plans: PlanBreakdownItem[];
  totalMrr: number;
  totalCustomers: number;
}

export interface PlanTrendSeries {
  planName: string;
  data: { month: string; mrr: number; customers: number }[];
}

export interface PlansTrendData {
  months: string[];
  series: PlanTrendSeries[];
}

export interface PlanContactItem {
  _id: string;
  name: string;
  email: string;
  mrr: number;
  planName: string;
  status: string;
}

export interface PlanFromContactsBucket {
  key: string;
  label: string;
  customers: number;
  mrr: number;
  arr: number;
  arpu: number;
  percentage: number;
  contacts: PlanContactItem[];
}

export interface PlansFromContactsData {
  plans: PlanFromContactsBucket[];
  totalMrr: number;
  totalCustomers: number;
}

export interface SaasCustomer {
  _id: string;
  name: string;
  email: string;
  planDesc: string;
  planName: string;
  billingLabel: string;
  mrr: number;
  status: string;
  activityType: string;
  activityDelta: number;
  activityDate: string | null;
  subscriptionStartDate: string | null;
}

export interface CustomersListData {
  customers: SaasCustomer[];
  totalMrr: number;
  totalCustomers: number;
}
