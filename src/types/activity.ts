import { User } from './contact';

export type ActivityType = 'email' | 'call' | 'whatsapp' | 'instagram_dm' | 'status_change';

export type CallOutcome = 'interested' | 'not-interested' | 'callback' | 'voicemail' | 'wrong-number' | 'meeting-set' | 'sale-made' | 'no-answer' | 'busy';
export type ActivityStatus = 'completed' | 'pending' | 'failed';
export type ActivityPriority = 'low' | 'medium' | 'high';

export interface ActivityData {
  // Per le chiamate
  callOutcome?: CallOutcome;
  callDuration?: number; // in secondi
  recordingUrl?: string;
  recordingSid?: string;
  recordingDuration?: number; // in secondi
  
  // Per WhatsApp e Instagram DM
  messageText?: string;
  
  // Per le email
  emailSubject?: string;
  
  // Per i cambi di stato
  statusChange?: {
    oldStatus: string;
    newStatus: string;
    mrr?: number;
  };
  
  // Allegati comuni
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
}

export interface Activity {
  _id: string;
  contact: string; // Contact ID
  type: ActivityType;
  title: string;
  description?: string;
  data?: ActivityData;
  createdBy: User;
  status: ActivityStatus;
  priority: ActivityPriority;
  createdAt: string;
  updatedAt: string;
  
  // Virtuals dal backend
  typeDisplay?: string;
  typeIcon?: string;
}

export interface ActivityStats {
  totalActivities: number;
  lastActivity?: Activity;
  byType: Array<{
    _id: ActivityType;
    count: number;
    lastActivity: string;
  }>;
  contact: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface CreateActivityRequest {
  type: ActivityType;
  title?: string; // Opzionale, viene generato automaticamente
  description?: string;
  data?: ActivityData;
}

export interface UpdateActivityRequest {
  title?: string;
  description?: string;
  data?: Partial<ActivityData>;
  status?: ActivityStatus;
  priority?: ActivityPriority;
}

export interface ActivityFilters {
  type?: ActivityType;
  page?: number;
  limit?: number;
}

export interface ActivitiesResponse {
  success: boolean;
  data: {
    activities: Activity[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
}

export interface ActivityStatsResponse {
  success: boolean;
  data: ActivityStats;
  message?: string;
}

export interface ActivityResponse {
  success: boolean;
  data: Activity;
  message?: string;
} 