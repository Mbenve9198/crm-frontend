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
    licenseKey?: string; // Licenza OpenWA specifica per questa sessione
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
export type CampaignPriority = 'alta' | 'media' | 'bassa';
export type AttachmentType = 'image' | 'audio' | 'video' | 'document' | 'voice'; // 🎤 Aggiunto voice
export type CampaignMode = 'standard' | 'autopilot'; // 🤖 NUOVO: Mode campagna

export interface CampaignAttachment {
  type: AttachmentType;
  filename: string;
  url: string;
  voiceFileId?: string; // 🎤 ID VoiceFile collezione separata (per type='voice')
  size?: number;
  duration?: number; // 🎤 Durata vocali
  caption?: string;
}

export interface CampaignTiming {
  schedule: {
    startTime: string; // HH:MM - fascia oraria di inizio
    endTime: string;   // HH:MM - fascia oraria di fine  
    timezone: string;  // timezone (default: Europe/Rome)
    daysOfWeek?: string[]; // giorni della settimana (opzionale)
  };
}

// 🤖 Configurazione Autopilot
export interface AutopilotConfig {
  // Impostazioni Claude per generazione messaggi
  claudeSettings?: {
    tone?: string; // es. "professionale e amichevole"
    maxLength?: number; // max caratteri (default: 280)
    focusPoint?: string; // es. "visibilità su Google"
    cta?: string; // es. "chiedere se sono interessati a migliorare"
  };
  // Keyword per ricerca Serper (es. "ristorante italiano", "pizzeria")
  searchKeyword?: string;
  // Se true, usa la keyword dal contatto (properties.keyword) se disponibile
  useContactKeyword?: boolean;
  // Campi necessari nei contatti per autopilot
  requiredContactFields?: {
    nameField?: string; // es. "name" - Nome del ristorante
    addressField?: string; // es. "properties.Indirizzo" - Indirizzo per geocoding
    cityField?: string; // es. "properties.Città" - Città per geocoding
    latField?: string; // es. "properties.latitude" - Opzionale
    lngField?: string; // es. "properties.longitude" - Opzionale
    keywordField?: string; // es. "properties.keyword" - Opzionale
    reviewsField?: string; // es. "properties.Recensioni" - Recensioni attuali
    ratingField?: string; // es. "properties.Rating" - Rating attuale
  };
  // Salva i dati di analisi nel contatto dopo l'invio
  saveAnalysisToContact?: boolean;
}

// 🤖 Dati autopilot salvati nei messaggi
export interface AutopilotMessageData {
  competitors: Array<{
    rank: number;
    name: string;
    rating: number;
    reviews: number;
    address: string;
  }>;
  userRank: number | string; // Può essere numero o "Fuori Top 20"
  userReviews: number;
  userRating: number;
  generatedByAI: boolean;
  aiModel: string; // es. "claude-3-5-sonnet-20241022"
  generatedAt: string;
  messageValidation: {
    score: number;
    issues: string[];
  };
}

export interface CampaignContactFilters {
  status?: string[];
  properties?: Record<string, unknown>;
  
  // Nuovi filtri di esclusione
  excludeContacts?: string[]; // ID dei contatti da escludere
  excludeFromCampaigns?: string[]; // ID delle campagne da cui escludere contatti
  excludeContactedWithinDays?: number; // Giorni - escludi contatti contattati negli ultimi X giorni via WhatsApp
}

export interface MessageQueueItem {
  _id: string;
  contactId: string;
  phoneNumber: string;
  compiledMessage: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'no_whatsapp' | 'replied' | 'not_interested';
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  messageId?: string;
  errorMessage?: string;
  retryCount: number;
  
  // Proprietà per sequenze di follow-up
  sequenceId?: string;
  sequenceIndex?: number;
  followUpScheduledFor?: string;
  hasReceivedResponse?: boolean;
  responseReceivedAt?: string;
  condition?: 'no_response' | 'always';
  
  // 🤖 NUOVO: Dati autopilot
  autopilotData?: AutopilotMessageData;
}

export interface CampaignStats {
  totalContacts: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  repliesReceived: number;
  errors: number;
  noWhatsapp: number;
  // ✅ Nuove statistiche per gestione manuale
  replied: number;
  notInterested: number;
  replyRate: number; // Percentuale (replied + notInterested) / messagesSent
  conversionRate: number; // Percentuale replied / messagesSent
}

export interface WhatsappCampaign {
  _id: string;
  name: string;
  description?: string;
  whatsappSessionId: string;
  whatsappNumber: string;
  targetList: string;
  contactFilters?: CampaignContactFilters;
  mode: CampaignMode; // 🤖 NUOVO: 'standard' o 'autopilot'
  autopilotConfig?: AutopilotConfig; // 🤖 NUOVO: Configurazione autopilot
  messageTemplate: string;
  templateVariables: string[];
  messageSequences?: MessageSequence[];  // ✅ Aggiunto supporto per sequenze
  attachments: CampaignAttachment[];
  priority: CampaignPriority; // ✅ Nuovo sistema priorità
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

// Tipi per sequenze di messaggi
export interface MessageSequence {
  id: string;
  messageTemplate: string;
  delayMinutes: number; // Minuti di attesa prima di inviare questo messaggio
  condition: 'no_response' | 'always'; // Condizione per inviare il messaggio
  isActive: boolean;
  templateVariables?: string[]; // ✅ Aggiunto supporto per variabili template
  // 🎤 NUOVO: Supporto allegato audio/vocale
  attachment?: {
    type: 'voice' | 'image' | 'video' | 'document';
    filename: string;
    url: string;
    voiceFileId?: string; // 🎤 ID VoiceFile collezione
    size?: number;
    duration?: number; // Durata in secondi (per audio)
    caption?: string;
  };
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  whatsappSessionId: string;
  targetList: string;
  contactFilters?: CampaignContactFilters;
  mode?: CampaignMode; // 🤖 NUOVO: 'standard' o 'autopilot' (default: 'standard')
  autopilotConfig?: AutopilotConfig; // 🤖 NUOVO: Config autopilot (richiesto se mode='autopilot')
  messageTemplate: string; // Primo messaggio (opzionale se c'è vocale o se mode='autopilot')
  attachments?: CampaignAttachment[]; // 🎤 NUOVO: Attachments inclusi vocali per messaggio principale
  messageSequences?: MessageSequence[]; // Messaggi di follow-up
  priority: CampaignPriority; // ✅ Sistema priorità invece di timing manuale
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
  priority?: CampaignPriority; // ✅ Sistema priorità
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
  sessions?: never; // Marker per evitare interface vuota
}
export interface SessionResponse extends ApiResponse<WhatsappSession> {
  session?: never; // Marker per evitare interface vuota
}
export interface QrCodeApiResponse extends ApiResponse<QrCodeResponse> {
  qrCode?: never; // Marker per evitare interface vuota
}
export interface SessionStatsApiResponse extends ApiResponse<SessionStatsResponse> {
  stats?: never; // Marker per evitare interface vuota
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
  campaigns?: never; // Marker per evitare interface vuota
}

export interface CampaignResponse extends ApiResponse<WhatsappCampaign> {
  campaign?: never; // Marker per evitare interface vuota
}
export interface CampaignPreviewResponse extends ApiResponse<CampaignPreview> {
  preview?: never; // Marker per evitare interface vuota
}

export interface UploadAttachmentsResponse extends ApiResponse<{
  attachments: CampaignAttachment[];
  totalAttachments: number;
}> {
  attachments?: never; // Marker per evitare interface vuota
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
    startTime: string;
    endTime: string;
    timezone: string;
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
    licenseKey?: string; // Licenza OpenWA per questa sessione
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

export interface UpdateMessageStatusResponse {
  messageId: string;
  contactId: string;
  phoneNumber: string;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
  stats: CampaignStats;
}

export interface UpdateMessageStatusRequest {
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied' | 'not_interested';
  additionalData?: {
    messageId?: string;
    errorMessage?: string;
  };
} 