import { ApiResponse } from './contact';

// Tipi per Sessioni WhatsApp
export interface WhatsappSession {
  _id: string;
  sessionId: string;
  name: string;
  phoneNumber: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'qr_ready' | 'error';
  qrCode?: string;
  qrGeneratedAt?: string;
  connectionInfo?: {
    browserVersion?: string;
    waVersion?: string;
    platform?: string;
    connectedAt?: string;
    lastSeen?: string;
  };
  stats: {
    messagesSent: number;
    messagesReceived: number;
    activeCampaigns: number;
    lastMessageAt?: string;
  };
  config: {
    useChrome: boolean;
    headless: boolean;
    autoRefresh: boolean;
    qrTimeout: number;
    authTimeout: number;
  };
  eventLogs: Array<{
    event: string;
    data: Record<string, unknown>;
    timestamp: string;
  }>;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lastActivity?: string;
  clientConnected?: boolean;
  isExpired?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  name: string;
  sessionId: string;
}

export interface UpdateSessionRequest {
  name?: string;
  config?: Partial<WhatsappSession['config']>;
}

export interface TestMessageRequest {
  phoneNumber: string;
  message: string;
}

export interface QrCodeResponse {
  qrCode: string;
  generatedAt: string;
  expiresAt: string;
}

export interface SessionStatsResponse {
  session: WhatsappSession['stats'];
  campaigns: {
    total: number;
    draft: number;
    scheduled: number;
    running: number;
    paused: number;
    completed: number;
    cancelled: number;
    totalMessagesSent: number;
    totalReplies: number;
  };
  connection: {
    status: WhatsappSession['status'];
    connectedAt?: string;
    lastActivity?: string;
    isActive: boolean;
    isExpired: boolean;
  };
}

// Tipi per Campagne WhatsApp
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
export type AttachmentType = 'image' | 'audio' | 'video' | 'document';

export interface CampaignAttachment {
  type: AttachmentType;
  filename: string;
  url: string;
  size?: number;
  caption?: string;
}

export interface CampaignTiming {
  intervalBetweenMessages: number; // secondi
  messagesPerHour: number;
  schedule?: {
    startTime?: string; // HH:MM
    endTime?: string;   // HH:MM
    timezone?: string;
    daysOfWeek?: string[];
  };
}

export interface CampaignContactFilters {
  status?: string[];
  properties?: Record<string, unknown>;
}

export interface MessageQueueItem {
  contactId: string;
  phoneNumber: string;
  compiledMessage: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  messageId?: string;
  errorMessage?: string;
  retryCount: number;
}

export interface CampaignStats {
  totalContacts: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  repliesReceived: number;
  errors: number;
}

export interface WhatsappCampaign {
  _id: string;
  name: string;
  description?: string;
  whatsappSessionId: string;
  whatsappNumber: string;
  targetList: string;
  contactFilters?: CampaignContactFilters;
  messageTemplate: string;
  templateVariables: string[];
  attachments: CampaignAttachment[];
  timing: CampaignTiming;
  status: CampaignStatus;
  stats: CampaignStats;
  messageQueue: MessageQueueItem[];
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
  };
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  scheduledStartAt?: string;
  actualStartedAt?: string;
  completedAt?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lastModifiedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  whatsappSessionId: string;
  targetList: string;
  contactFilters?: CampaignContactFilters;
  messageTemplate: string;
  timing: CampaignTiming;
  scheduledStartAt?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  whatsappSessionId?: string;
  targetList?: string;
  contactFilters?: CampaignContactFilters;
  messageTemplate?: string;
  timing?: CampaignTiming;
  scheduledStartAt?: string;
}

export interface PreviewCampaignRequest {
  targetList: string;
  contactFilters?: CampaignContactFilters;
  messageTemplate: string;
  limit?: number;
}

export interface CampaignPreview {
  totalContacts: number;
  templateVariables: string[];
  preview: Array<{
    contact: {
      _id: string;
      name: string;
      phone: string;
      email?: string;
      properties?: Record<string, unknown>;
    };
    compiledMessage: string;
  }>;
}

// Responses API
export interface SessionsResponse extends ApiResponse<{ sessions: WhatsappSession[] }> {
  // Estende ApiResponse con sessions
}
export interface SessionResponse extends ApiResponse<WhatsappSession> {
  // Estende ApiResponse con WhatsappSession
}
export interface QrCodeApiResponse extends ApiResponse<QrCodeResponse> {
  // Estende ApiResponse con QrCodeResponse
}
export interface SessionStatsApiResponse extends ApiResponse<SessionStatsResponse> {
  // Estende ApiResponse con SessionStatsResponse
}

export interface CampaignsResponse extends ApiResponse<{
  campaigns: WhatsappCampaign[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCampaigns: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  // Estende ApiResponse con campaigns e pagination
}

export interface CampaignResponse extends ApiResponse<WhatsappCampaign> {
  // Estende ApiResponse con WhatsappCampaign
}
export interface CampaignPreviewResponse extends ApiResponse<CampaignPreview> {
  // Estende ApiResponse con CampaignPreview
}

export interface UploadAttachmentsResponse extends ApiResponse<{
  attachments: CampaignAttachment[];
  totalAttachments: number;
}> {
  // Estende ApiResponse con attachments
}

// Filtri per le query
export interface CampaignFilters {
  status?: CampaignStatus;
  page?: number;
  limit?: number;
}

// Utility types
export interface CampaignFormData extends Omit<CreateCampaignRequest, 'timing'> {
  timing: {
    intervalBetweenMessages: number;
    messagesPerHour: number;
    enableSchedule: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    daysOfWeek?: string[];
  };
}

export interface SessionFormData {
  name: string;
  sessionId: string;
  config?: {
    useChrome?: boolean;
    headless?: boolean;
    autoRefresh?: boolean;
    qrTimeout?: number;
    authTimeout?: number;
  };
}

// Enums per i select
export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Bozza' },
  { value: 'scheduled', label: 'Programmata' },
  { value: 'running', label: 'In Esecuzione' },
  { value: 'paused', label: 'Pausata' },
  { value: 'completed', label: 'Completata' },
  { value: 'cancelled', label: 'Cancellata' }
] as const;

export const SESSION_STATUSES = [
  { value: 'disconnected', label: 'Disconnessa' },
  { value: 'connecting', label: 'Connessione...' },
  { value: 'qr_ready', label: 'QR Pronto' },
  { value: 'authenticated', label: 'Autenticata' },
  { value: 'connected', label: 'Connessa' },
  { value: 'error', label: 'Errore' }
] as const;

export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Lunedì' },
  { value: 'tuesday', label: 'Martedì' },
  { value: 'wednesday', label: 'Mercoledì' },
  { value: 'thursday', label: 'Giovedì' },
  { value: 'friday', label: 'Venerdì' },
  { value: 'saturday', label: 'Sabato' },
  { value: 'sunday', label: 'Domenica' }
] as const;

export const ATTACHMENT_TYPES = [
  { value: 'image', label: 'Immagine', accept: 'image/*' },
  { value: 'audio', label: 'Audio', accept: 'audio/*' },
  { value: 'video', label: 'Video', accept: 'video/*' },
  { value: 'document', label: 'Documento', accept: '.pdf,.doc,.docx,.txt' }
] as const; 