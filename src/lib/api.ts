import { Contact, ContactsResponse, User, ApiResponse, ContactFilters, TablePreferences, TablePreferencesResponse, ContactList } from '@/types/contact';

// Tipi per statistiche e paginazione
type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type UserStats = {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  recentRegistrations: number;
};

type ContactStats = {
  totalContacts: number;
  contactsThisMonth: number;
  contactsByOwner: Record<string, number>;
  contactsByList: Record<string, number>;
};

type CsvAnalysisResult = {
  headers: string[];          // Il backend restituisce "headers" non "columns"
  sampleRows: Record<string, string>[]; // Il backend restituisce "sampleRows" non "preview"
  availableFields: {
    existing: string[];
    properties: string;
  };
};

type CsvImportResult = {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Recupera il token dal localStorage se disponibile
    this.reloadTokenFromStorage();
  }

  // Metodo per ricaricare il token dal localStorage
  private reloadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          console.log('🔄 ApiClient: Ricaricando token da localStorage');
          this.token = storedToken;
        } else {
          console.log('📭 ApiClient: Nessun token trovato in localStorage');
        }
      } catch (error) {
        console.error('❌ Errore leggendo localStorage:', error);
      }
    }
  }

  // Metodo pubblico per forzare il reload del token
  public refreshTokenFromStorage() {
    this.reloadTokenFromStorage();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se non abbiamo il token, prova a ricaricarlo dal localStorage
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

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
    console.log('🔐 ApiClient.login: Avvio login...');
    
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Debug dettagliato della risposta
    console.log('📋 Risposta login completa:', response);
    console.log('📋 response.success:', response.success);
    console.log('📋 response.token (livello principale):', response.token);
    console.log('📋 response.data:', response.data);
    
    if (response.data) {
      console.log('📋 response.data.user:', response.data.user);
      console.log('📋 response.data.token (dovrebbe essere undefined):', response.data.token);
    }

    // CORREZIONE: Il token è in response.token, NON in response.data.token!
    const token = response.token; // Il backend restituisce token al livello principale
    console.log('🎯 Token dal livello corretto:', token ? token.substring(0, 20) + '...' : 'UNDEFINED');

    // Salva il token con verifica dettagliata
    if (response.success && token) {
      console.log('💾 ApiClient.login: Salvando token...');
      console.log('Token da salvare (type):', typeof token);
      console.log('Token da salvare (length):', token?.length);
      
      if (typeof token === 'string' && token.length > 0) {
        console.log('Token da salvare:', token.substring(0, 20) + '...');
        
        // Salva in memoria
        this.token = token;
        console.log('✅ Token salvato in memoria apiClient');
        
        // Salva in localStorage con verifica
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('auth_token', token);
            console.log('✅ Token salvato in localStorage');
            
            // Verifica immediata che sia stato salvato
            const verificaToken = localStorage.getItem('auth_token');
            if (verificaToken === token) {
              console.log('✅ Verifica localStorage: Token salvato correttamente');
            } else {
              console.error('❌ Verifica localStorage: Token NON salvato correttamente!');
              console.error('Atteso:', token.substring(0, 20) + '...');
              console.error('Trovato:', verificaToken ? verificaToken.substring(0, 20) + '...' : 'NULL');
            }
          } catch (error) {
            console.error('❌ Errore salvando in localStorage:', error);
          }
        }
      } else {
        console.error('❌ Token non valido: tipo =', typeof token, ', length =', token?.length);
      }
    } else {
      console.log('❌ ApiClient.login: Nessun token nella risposta');
      console.log('   - response.success:', response.success);
      console.log('   - response.token:', response.token);
      console.log('   - response.data:', response.data);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Rimuovi sempre il token anche se la chiamata fallisce
      this.setToken(null);
    }

    return { success: true };
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/me');
  }

  async updateMe(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Metodi per la gestione contatti
  async getContacts(filters: ContactFilters = {}): Promise<ContactsResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.list) params.append('list', filters.list);
    if (filters.owner) params.append('owner', filters.owner);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/contacts?${queryString}` : '/contacts';
    
    return this.request(endpoint) as Promise<ContactsResponse>;
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request(`/contacts/${id}`);
  }

  async createContact(contact: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return this.request('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async updateContact(id: string, contact: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return this.request(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contact),
    });
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return this.request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteContactsBulk(contactIds: string[]): Promise<ApiResponse<{
    deletedCount: number;
    requestedCount: number;
    unauthorizedCount: number;
    unauthorizedContacts: string[];
    hasMoreUnauthorized: boolean;
  }>> {
    return this.request('/contacts/bulk', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactIds }),
    });
  }

  // Metodi per la gestione liste
  async addContactToList(contactId: string, listName: string): Promise<ApiResponse<Contact>> {
    return this.request(`/contacts/lists/${listName}/contacts/${contactId}`, {
      method: 'POST',
    });
  }

  async removeContactFromList(contactId: string, listName: string): Promise<ApiResponse<Contact>> {
    return this.request(`/contacts/lists/${listName}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // Metodi per la gestione utenti
  async getUsers(filters: { role?: string; department?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<{
    users: User[];
    pagination: PaginationData;
  }>> {
    const params = new URLSearchParams();
    
    if (filters.role) params.append('role', filters.role);
    if (filters.department) params.append('department', filters.department);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    
    return this.request(endpoint);
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string, user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUsersForAssignment(): Promise<ApiResponse<User[]>> {
    return this.request('/users/for-assignment');
  }

  async transferContacts(fromUserId: string, toUserId: string): Promise<ApiResponse<{ transferred: number }>> {
    return this.request(`/users/${fromUserId}/transfer-contacts/${toUserId}`, {
      method: 'POST',
    });
  }

  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.request('/users/stats');
  }

  async getContactStats(): Promise<ApiResponse<ContactStats>> {
    return this.request('/contacts/stats');
  }

  async getDynamicProperties(): Promise<ApiResponse<{ properties: string[]; count: number; lastUpdated: string }>> {
    return this.request('/contacts/dynamic-properties');
  }

  // Metodo per l'upload CSV con debug migliorato
  async importCsvAnalyze(file: File): Promise<ApiResponse<CsvAnalysisResult>> {
    const formData = new FormData();
    formData.append('csvFile', file);

    // Se non abbiamo il token, prova a ricaricarlo
    if (!this.token) {
      console.log('🔄 Token mancante, ricarico da localStorage...');
      this.reloadTokenFromStorage();
    }

    // Debug logging
    console.log('=== CSV Upload Debug ===');
    console.log('File:', file.name, file.size, file.type);
    console.log('Token presente:', !!this.token);
    console.log('Token (primi 20 caratteri):', this.token ? this.token.substring(0, 20) + '...' : 'N/A');
    console.log('API URL:', `${this.baseURL}/contacts/import-csv?phase=analyze`);

    // Headers per multipart/form-data (NO Content-Type manual)
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('Authorization header aggiunto');
    } else {
      console.error('ERRORE: Token mancante dopo reload!');
      throw new Error('Token di autenticazione mancante');
    }

    try {
      const response = await fetch(`${this.baseURL}/contacts/import-csv?phase=analyze`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        if (response.status === 401) {
          console.error('ERRORE 401: Token non valido o scaduto');
          throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('CSV upload error:', error);
      throw error;
    }
  }

  async importCsvExecute(
    file: File, 
    mapping: Record<string, string>, 
    duplicateStrategy: 'skip' | 'update' = 'skip'
  ): Promise<ApiResponse<CsvImportResult>> {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('duplicateStrategy', duplicateStrategy);

    // Se non abbiamo il token, prova a ricaricarlo
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

    // Headers per multipart/form-data
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    } else {
      throw new Error('Token di autenticazione mancante');
    }

    try {
      const response = await fetch(`${this.baseURL}/contacts/import-csv?phase=import`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('CSV import error:', error);
      throw error;
    }
  }

  // Test di connettività per debug
  async testAuth(): Promise<ApiResponse<{ authenticated: boolean; user?: User }>> {
    console.log('=== Test Auth Debug ===');
    
    // Se non abbiamo il token, prova a ricaricarlo
    if (!this.token) {
      console.log('🔄 Test Auth: Token mancante, ricarico da localStorage...');
      this.reloadTokenFromStorage();
    }
    
    console.log('Token presente:', !!this.token);
    console.log('API URL:', `${this.baseURL}/auth/me`);
    
    try {
      const response = await this.getMe();
      console.log('Test auth risultato:', response);
      return { 
        success: true, 
        data: { 
          authenticated: !!response.data, 
          user: response.data?.user 
        } 
      };
    } catch (error) {
      console.error('Test auth fallito:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test auth failed' 
      };
    }
  }

  // Metodo per impostare il token dall'esterno
  setToken(token: string | null) {
    console.log('🔧 ApiClient.setToken chiamato');
    
    this.token = token;
    
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem('auth_token', token);
          console.log('💾 Token impostato e salvato in localStorage');
        } else {
          localStorage.removeItem('auth_token');
          console.log('🗑️ Token rimosso da localStorage');
        }
      } catch (error) {
        console.error('❌ Errore setToken localStorage:', error);
      }
    }
  }

  // Metodo per ottenere il token corrente
  getToken(): string | null {
    return this.token;
  }

  // === PREFERENZE TABELLA ===

  // Ottiene le preferenze di visualizzazione tabella dell'utente corrente
  async getTablePreferences(): Promise<TablePreferencesResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se non abbiamo il token, prova a ricaricarlo dal localStorage
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

    // Aggiungi il token di autenticazione se disponibile
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/users/me/table-preferences`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Aggiorna le preferenze di visualizzazione tabella dell'utente corrente
  async updateTablePreferences(tablePreferences: TablePreferences): Promise<TablePreferencesResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se non abbiamo il token, prova a ricaricarlo dal localStorage
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

    // Aggiungi il token di autenticazione se disponibile
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/users/me/table-preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ tablePreferences }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // === GESTIONE LISTE CONTATTI ===

  // Ottiene tutte le liste di contatti disponibili con conteggio
  async getContactLists(): Promise<ApiResponse<ContactList[]>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se non abbiamo il token, prova a ricaricarlo dal localStorage
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

    // Aggiungi il token di autenticazione se disponibile
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/contacts/lists`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Crea una nuova lista
  async createContactList(listName: string): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se non abbiamo il token, prova a ricaricarlo dal localStorage
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

    // Aggiungi il token di autenticazione se disponibile
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/contacts/lists`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ listName }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Aggiunge contatti a una lista
  async addContactsToList(contactIds: string[], listName: string): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Se non abbiamo il token, prova a ricaricarlo dal localStorage
    if (!this.token) {
      this.reloadTokenFromStorage();
    }

    // Aggiungi il token di autenticazione se disponibile
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/contacts/lists/${encodeURIComponent(listName)}/bulk-add`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contactIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token di autenticazione non valido o scaduto. Effettua nuovamente il login.');
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }
  }

// Istanza singleton dell'API client
export const apiClient = new ApiClient(API_BASE_URL);

// Hook personalizzato per errori API comuni
export const handleApiError = (error: unknown) => {
  if ((error instanceof Error && error.message?.includes('401')) || 
      (error instanceof Error && error.message?.includes('Unauthorized'))) {
    // Token scaduto o non valido
    apiClient.setToken(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  
  console.error('API Error:', error);
  return error instanceof Error ? error.message : 'Errore sconosciuto';
};

export default apiClient; 