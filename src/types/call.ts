export interface Call {
  _id: string;
  twilioCallSid: string;
  contact: {
    _id: string;
    name: string;
    phone: string;
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
  | 'no-answer';

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