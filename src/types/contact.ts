export type Contact = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  lists: string[];
  properties: Record<string, string | number | boolean>;
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
  };
};

export type TablePreferencesResponse = {
  success: boolean;
  data: {
    tablePreferences: TablePreferences;
  };
};

export type ContactFilters = {
  search?: string;
  list?: string;
  owner?: string;
  page?: number;
  limit?: number;
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