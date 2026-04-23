export interface CoachingComment {
  _id: string;
  author: { _id: string; firstName: string; lastName: string };
  text: string;
  createdAt: string;
}

export type CallFlag = 'best-practice' | 'needs-review' | null;

export interface Call {
  _id: string;
  twilioCallSid: string;
  contact: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    source?: string;
  };
  initiatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  fromNumber: string;
  toNumber: string;
  status: CallStatus;
  direction: 'outbound-api' | 'inbound';
  duration: number;
  startTime?: string;
  endTime?: string;
  recordingUrl?: string;
  recordingSid?: string;
  recordingDuration?: number;
  price?: number;
  priceUnit: string;
  notes?: string;
  outcome?: CallOutcome;
  rating?: number;
  flag?: CallFlag;
  coachingComments?: CoachingComment[];
  errorCode?: string;
  errorMessage?: string;
  twilioData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  calculatedDuration: number;
}

export type CallStatus = 
  | 'initiated'
  | 'queued' 
  | 'ringing' 
  | 'in-progress' 
  | 'completed' 
  | 'busy' 
  | 'no-answer' 
  | 'failed' 
  | 'canceled';

export type CallOutcome =
  | 'interested'
  | 'not-interested'
  | 'callback'
  | 'voicemail'
  | 'wrong-number'
  | 'meeting-set'
  | 'sale-made'
  | 'no-answer'
  | 'not-logged';

export interface InitiateCallRequest {
  contactId: string;
  recordCall?: boolean;
}

export interface InitiateCallResponse {
  call: Call;
  twilioCallSid: string;
  status: CallStatus;
}

export interface UpdateCallRequest {
  notes?: string;
  outcome?: CallOutcome;
}

export interface CallStats {
  totalCalls: number;
  completedCalls: number;
  totalDuration: number;
  avgDuration: number;
  callsByStatus: CallStatus[];
  callsByOutcome: CallOutcome[];
}

export interface CallsResponse {
  data: Call[];
  count?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCalls: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RecordingResponse {
  recordingUrl: string;
  recordingSid: string;
  duration: number;
}

export interface CallOwnerAnalytics {
  ownerId: string;
  ownerName: string;
  totalCalls: number;
  completedCalls: number;
  answeredCalls: number;
  noAnswerCalls: number;
  busyCalls: number;
  failedCalls: number;
  answerRate: number;
  totalDuration: number;
  avgDuration: number;
  withRecording: number;
  outcomes: {
    interested: number;
    meetingSet: number;
    saleMade: number;
    notInterested: number;
    callback: number;
    voicemail: number;
  };
  coaching: {
    ratedCalls: number;
    avgRating: number | null;
    bestPractice: number;
    needsReview: number;
  };
  hourDistribution: number[];
}

export interface CallsAnalyticsData {
  owners: CallOwnerAnalytics[];
  daily: { _id: { date: string; owner: string }; calls: number; duration: number; completed: number }[];
} 