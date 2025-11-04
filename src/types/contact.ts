export type ContactStatus = 'da contattare' | 'contattato' | 'da richiamare' | 'interessato' | 'non interessato' | 'qr code inviato' | 'free trial iniziato' | 'won' | 'lost';

export type ContactSource = 'manual' | 'csv_import' | 'inbound_rank_checker' | 'inbound_form' | 'inbound_api';

export type RankCheckerData = {
  placeId?: string;
  keyword?: string;
  ranking?: {
    mainRank?: number | string;
    competitorsAhead?: number;
    estimatedLostCustomers?: number;
    totalResultsFound?: number;
    strategicResults?: Record<string, unknown>[];
    fullResults?: Record<string, unknown>;
  };
  restaurantData?: {
    address?: string;
    rating?: number;
    reviewCount?: number;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  };
  hasDigitalMenu?: boolean;
  willingToAdoptMenu?: boolean;
  dailyCovers?: number;
  estimatedMonthlyReviews?: number;
  qualifiedAt?: string;
  leadCapturedAt?: string;
};

export type Contact = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  lists: string[];
  properties: Record<string, string | number | boolean>;
  status: ContactStatus;
  mrr?: number;
  source?: ContactSource;
  rankCheckerData?: RankCheckerData;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'manager' | 'agent' | 'viewer';
  };
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
};

// Tipo specifico per l'aggiornamento del contatto
export type UpdateContactRequest = {
  name?: string;
  email?: string;
  phone?: string;
  lists?: string[];
  properties?: Record<string, string | number | boolean>;
  status?: ContactStatus;
  mrr?: number;
  owner?: string; // Owner come ID stringa per l'aggiornamento
};

export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  department?: string;
  phone?: string;
  isActive: boolean;
  stats: {
    totalContacts: number;
    contactsThisMonth: number;
    lastLogin?: string;
    loginCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type TablePreferences = {
  contacts: {
    visibleColumns: string[];
    pageSize: number;
    // Aggiunge supporto per filtri e ordinamento salvati
    columnFilters?: Record<string, ColumnFilter>;
    sorting?: SortingState;
  };
};

export type TablePreferencesResponse = {
  success: boolean;
  data: {
    tablePreferences: TablePreferences;
  };
};

// Nuovi tipi per il sistema di filtri avanzato
export type FilterCondition = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'is_empty'
  | 'is_not_empty';

export type ColumnFilter = {
  type: 'value' | 'condition';
  values?: string[]; // Per filtro per valore
  condition?: {
    type: FilterCondition;
    value?: string | number;
    values?: string[]; // Per condizioni IN/NOT_IN
  };
};

export type SortDirection = 'asc' | 'desc';

export type SortingState = {
  column: string;
  direction: SortDirection;
};

export type ContactFilters = {
  search?: string;
  list?: string;
  owner?: string;
  page?: number;
  limit?: number;
  // Nuovi parametri per filtri avanzati e ordinamento
  sort_by?: string;
  sort_direction?: SortDirection;
  column_filters?: Record<string, ColumnFilter>;
};

export type ContactsResponse = {
  success: boolean;
  data: {
    contacts: Contact[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalContacts: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  token?: string; // Il token può essere al livello principale per il login
};

export interface UpdateStatusRequest {
  status: ContactStatus;
  mrr?: number;
}

export interface StatusUpdateResponse {
  success: boolean;
  data: Contact;
  message?: string;
} 