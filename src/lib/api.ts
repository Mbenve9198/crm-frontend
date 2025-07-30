import { Contact, ContactsResponse, User, ApiResponse, ContactFilters } from '@/types/contact';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Recupera il token dal localStorage se disponibile
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Aggiungi il token di autenticazione se disponibile
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include i cookies per JWT
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Metodi per l'autenticazione
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Salva il token
    if (response.success && response.data?.token) {
      this.token = response.data.token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', response.data.token);
      }
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    // Rimuovi il token
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }

    return response;
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/me');
  }

  // Metodi per i contatti
  async getContacts(filters: ContactFilters = {}): Promise<ApiResponse<ContactsResponse['data']>> {
    const queryParams = new URLSearchParams();
    
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.list) queryParams.append('list', filters.list);
    if (filters.owner) queryParams.append('owner', filters.owner);
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());

    const endpoint = `/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<ContactsResponse['data']>(endpoint);
  }

  async getContact(id: string): Promise<ApiResponse<{ contact: Contact }>> {
    return this.request<{ contact: Contact }>(`/contacts/${id}`);
  }

  async createContact(contactData: Partial<Contact>): Promise<ApiResponse<{ contact: Contact }>> {
    return this.request<{ contact: Contact }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(id: string, contactData: Partial<Contact>): Promise<ApiResponse<{ contact: Contact }>> {
    return this.request<{ contact: Contact }>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(id: string): Promise<ApiResponse> {
    return this.request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  async addContactToList(contactId: string, listName: string): Promise<ApiResponse<{ contact: Contact }>> {
    return this.request<{ contact: Contact }>(`/contacts/lists/${listName}/contacts/${contactId}`, {
      method: 'POST',
    });
  }

  async removeContactFromList(contactId: string, listName: string): Promise<ApiResponse<{ contact: Contact }>> {
    return this.request<{ contact: Contact }>(`/contacts/lists/${listName}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // Metodi per la gestione utenti
  async getUsers(filters: {
    page?: number;
    limit?: number;
    role?: string;
    department?: string;
    isActive?: boolean;
    search?: string;
  } = {}): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<{ users: User[]; pagination: any }>(endpoint);
  }

  async getUsersForAssignment(): Promise<ApiResponse<{ users: User[] }>> {
    return this.request<{ users: User[] }>('/users/for-assignment');
  }

  async transferContacts(fromUserId: string, toUserId: string): Promise<ApiResponse> {
    return this.request(`/users/${fromUserId}/transfer-contacts/${toUserId}`, {
      method: 'POST',
    });
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.request('/users/stats');
  }

  async getContactStats(): Promise<ApiResponse<any>> {
    return this.request('/contacts/stats');
  }

  // Metodo per l'upload CSV
  async importCsvAnalyze(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('csvFile', file);

    // Per form-data non impostiamo Content-Type, il browser lo fa automaticamente
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/contacts/import-csv?phase=analyze`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    return response.json();
  }

  async importCsvExecute(
    file: File, 
    mapping: Record<string, string>, 
    duplicateStrategy: 'skip' | 'update' = 'skip'
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('duplicateStrategy', duplicateStrategy);

    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/contacts/import-csv?phase=import`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    return response.json();
  }

  // Metodo per impostare il token dall'esterno
  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // Metodo per ottenere il token corrente
  getToken(): string | null {
    return this.token;
  }
}

// Istanza singleton dell'API client
export const apiClient = new ApiClient(API_BASE_URL);

// Hook personalizzato per errori API comuni
export const handleApiError = (error: any) => {
  if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    // Token scaduto o non valido
    apiClient.setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  
  console.error('API Error:', error);
  return error.message || 'Errore sconosciuto';
};

export default apiClient; 