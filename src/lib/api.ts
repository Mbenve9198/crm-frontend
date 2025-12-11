import { Contact, ContactsResponse, User, ApiResponse, ContactFilters, TablePreferences, TablePreferencesResponse, UpdateStatusRequest, StatusUpdateResponse, UpdateContactRequest } from '@/types/contact';
import { ActivitiesResponse, ActivityStatsResponse, ActivityResponse, CreateActivityRequest, UpdateActivityRequest, ActivityFilters } from '@/types/activity';
import { 
  Call, 
  InitiateCallRequest, 
  InitiateCallResponse, 
  UpdateCallRequest, 
  CallStats, 
  RecordingResponse 
} from '@/types/call';
import {
  TwilioSettings,
  TwilioConfigureRequest,
  TwilioVerifyResponse,
  TwilioTestCallRequest,
  TwilioTestCallResponse,
  WhatsAppTemplate,
  WhatsAppTemplateRequest,
  WhatsAppTemplateResponse
} from '@/types/twilio';
import {
  WhatsappSession,
  WhatsappCampaign,
  CreateSessionRequest,
  UpdateSessionRequest,
  TestMessageRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  PreviewCampaignRequest,
  SessionsResponse,
  SessionResponse,
  QrCodeApiResponse,
  SessionStatsApiResponse,
  CampaignsResponse,
  CampaignResponse,
  CampaignPreviewResponse,
  UploadAttachmentsResponse,
  CampaignFilters,
  UpdateMessageStatusResponse,
  UpdateMessageStatusRequest
} from '@/types/whatsapp';

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

export type CsvAnalysisResult = {
  headers: string[];          // Il backend restituisce "headers" non "columns"
  sampleRows: Record<string, string>[]; // Il backend restituisce "sampleRows" non "preview"
  availableFields: {
    fixed: string[];
    existingProperties: string[];
    newProperties: string;
  };
  mappingInstructions: Record<string, string>;
  dynamicPropertiesInfo: {
    existing: string[];
    count: number;
    usage: string;
  };
};

export type CsvImportResult = {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
};

// Configurazione URL backend
const getRailwayBackendUrl = () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  
  console.log('🔧 API URL Debug:');
  console.log('  Raw backend URL:', backendUrl);
  
  if (backendUrl) {
    let finalUrl = backendUrl;
    
    // Aggiungi https:// se manca il protocollo
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
      console.log('  Added https protocol:', finalUrl);
    }
    
    // Se l'URL finisce già con /api, usalo così com'è
    if (finalUrl.endsWith('/api')) {
      console.log('  Final URL (already has /api):', finalUrl);
      return finalUrl;
    }
    // Altrimenti aggiungi /api
    finalUrl = `${finalUrl}/api`;
    console.log('  Final URL (added /api):', finalUrl);
    return finalUrl;
  }
  
  // Fallback per sviluppo locale
  console.log('  Using localhost fallback');
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getRailwayBackendUrl();

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

  // Metodo per ottenere l'URL base (per debug)
  public getBaseURL(): string {
    return this.baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    // Timeout più alto per endpoint lenti (WhatsApp sessions, generazione AI)
    let timeoutMs = 30000; // Default 30s
    if (endpoint.includes('/whatsapp-sessions')) {
      timeoutMs = 60000; // 60s per WhatsApp
    } else if (endpoint.includes('/call-script')) {
      timeoutMs = 120000; // 120s per generazione script AI (Claude può essere lento)
    }
    
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`🕐 Avvio richiesta con timeout ${timeoutMs}ms: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include i cookies per JWT
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`✅ Risposta ricevuta per: ${url}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`⏰ Timeout della richiesta (${timeoutMs}ms): ${url}`);
          throw new Error(`Timeout della richiesta dopo ${timeoutMs/1000} secondi`);
        }
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
      
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
    
    // Nuovi parametri per ordinamento
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);
    
    // Filtri per colonna - serializza come JSON
    if (filters.column_filters && Object.keys(filters.column_filters).length > 0) {
      params.append('column_filters', JSON.stringify(filters.column_filters));
    }

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

  async updateContact(id: string, contact: UpdateContactRequest): Promise<ApiResponse<Contact>> {
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

  async bulkChangeContactOwner(contactIds: string[], newOwnerId: string): Promise<ApiResponse<{
    requestedCount: number;
    updatedCount: number;
    newOwner: {
      id: string;
      name: string;
      email: string;
    };
    changedBy: {
      id: string;
      name: string;
      email: string;
    };
    changedAt: string;
  }>> {
    return this.request('/contacts/bulk-change-owner', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactIds, newOwnerId }),
    });
  }

  // Metodi per la gestione liste
  async getContactLists(): Promise<ApiResponse<Array<{ name: string; count: number }>>> {
    return this.request('/contacts/lists');
  }

  async addContactToList(contactId: string, listName: string): Promise<ApiResponse<Contact>> {
    return this.request(`/contacts/lists/${listName}/contacts/${contactId}`, {
      method: 'POST',
    });
  }

  async addContactsToListBulk(contactIds: string[], listName: string): Promise<ApiResponse<{
    addedCount: number;
    alreadyInList: number;
    totalProcessed: number;
    totalRequested: number;
  }>> {
    return this.request(`/contacts/lists/${listName}/bulk-add`, {
      method: 'POST',
      body: JSON.stringify({ contactIds }),
    });
  }

  async removeContactsFromListBulk(contactIds: string[], listName: string): Promise<ApiResponse<{
    removedCount: number;
    notInList: number;
    totalProcessed: number;
    totalRequested: number;
  }>> {
    return this.request(`/contacts/lists/${listName}/bulk-remove`, {
      method: 'POST',
      body: JSON.stringify({ contactIds }),
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

  async getUsersForAssignment(): Promise<ApiResponse<{ users: User[] }>> {
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

  // 🎤 Upload voice file su collezione separata
  async uploadVoiceFile(
    dataUrl: string,
    filename: string,
    size: number,
    duration?: number
  ): Promise<ApiResponse<{
    voiceFileId: string;
    filename: string;
    size: number;
    duration?: number;
    publicUrl: string;
  }>> {
    return this.request('/voice-files/upload', {
      method: 'POST',
      body: JSON.stringify({
        dataUrl,
        filename,
        size,
        duration
      })
    });
  }

  async importCsvExecute(
    file: File, 
    mapping: Record<string, string>, 
    duplicateStrategy: 'skip' | 'update' = 'skip',
    targetList?: string // 📋 NUOVO: Lista dove aggiungere tutti i contatti importati
  ): Promise<ApiResponse<CsvImportResult>> {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('duplicateStrategy', duplicateStrategy);
    
    // 📋 Aggiungi targetList se specificata
    if (targetList && targetList.trim()) {
      formData.append('targetList', targetList.trim());
    }

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

  // === METODI PER LE ACTIVITIES ===

  // Ottiene le activities di un contatto
  async getContactActivities(contactId: string, filters: ActivityFilters = {}): Promise<ActivitiesResponse> {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? 
      `/contacts/${contactId}/activities?${queryString}` : 
      `/contacts/${contactId}/activities`;
    
    return this.request(endpoint) as Promise<ActivitiesResponse>;
  }

  // Crea una nuova activity per un contatto
  async createActivity(contactId: string, activity: CreateActivityRequest): Promise<ActivityResponse> {
    return this.request(`/contacts/${contactId}/activities`, {
      method: 'POST',
      body: JSON.stringify(activity),
    }) as Promise<ActivityResponse>;
  }

  // Aggiorna un'activity esistente
  async updateActivity(activityId: string, updates: UpdateActivityRequest): Promise<ActivityResponse> {
    return this.request(`/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Promise<ActivityResponse>;
  }

  // Elimina un'activity
  async deleteActivity(activityId: string): Promise<ApiResponse<void>> {
    return this.request(`/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  // Ottiene le statistiche delle activities di un contatto
  async getContactActivityStats(contactId: string): Promise<ActivityStatsResponse> {
    return this.request(`/contacts/${contactId}/activities/stats`) as Promise<ActivityStatsResponse>;
  }

  // === METODI PER STATUS PIPELINE ===

  // Aggiorna lo status di un contatto
  async updateContactStatus(contactId: string, updates: UpdateStatusRequest): Promise<StatusUpdateResponse> {
    return this.request(`/contacts/${contactId}/status`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Promise<StatusUpdateResponse>;
  }

  // 📞 Genera script di chiamata personalizzato con AI
  // Se regenerate=true, forza una nuova generazione invece di usare la cache
  async generateCallScript(contactId: string, regenerate: boolean = false): Promise<ApiResponse<{
    script: string;
    contactId: string;
    contactName: string;
    generatedAt: string;
    hasCompleteReport: boolean;
    fromCache: boolean;
  }>> {
    const url = regenerate 
      ? `/contacts/${contactId}/call-script?regenerate=true`
      : `/contacts/${contactId}/call-script`;
    return this.request(url);
  }

  // === METODI PER LE CHIAMATE ===

  async initiateCall(request: InitiateCallRequest): Promise<ApiResponse<InitiateCallResponse>> {
    return this.request<InitiateCallResponse>('/calls/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  // Metodi getMyCalls e getCallsByContact rimossi - non servono più con il nuovo sistema semplificato

  async updateCall(callId: string, request: UpdateCallRequest): Promise<ApiResponse<Call>> {
    return this.request<Call>(`/calls/${callId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  // cancelCall rimosso - non serve più con il nuovo sistema semplificato

  async cleanupStuckCalls(options?: { thresholdMinutes?: number; allUsers?: boolean }): Promise<ApiResponse<{
    cleanedCount: number;
    thresholdMinutes: number;
    cleanedCalls: Array<{
      twilioCallSid: string;
      status: string;
      user: string;
      createdAt: string;
    }>;
  }>> {
    return this.request(`/calls/cleanup-stuck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
  }

  async getCallStats(params?: {
    period?: string;
    userId?: string;
    contactId?: string;
  }): Promise<ApiResponse<CallStats>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.append('period', params.period);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.contactId) searchParams.append('contactId', params.contactId);

    return this.request<CallStats>(`/calls/stats?${searchParams}`);
  }

  async getCallRecording(callId: string): Promise<ApiResponse<RecordingResponse>> {
    return this.request<RecordingResponse>(`/calls/${callId}/recording`);
  }

  // === METODI PER LE IMPOSTAZIONI TWILIO ===

  async getTwilioSettings(): Promise<ApiResponse<TwilioSettings>> {
    return this.request<TwilioSettings>('/settings/twilio');
  }

  async configureTwilio(request: TwilioConfigureRequest): Promise<ApiResponse<TwilioSettings>> {
    return this.request<TwilioSettings>('/settings/twilio/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async verifyTwilio(): Promise<ApiResponse<TwilioVerifyResponse>> {
    return this.request<TwilioVerifyResponse>('/settings/twilio/verify', {
      method: 'POST',
    });
  }

  async disableTwilio(): Promise<ApiResponse<TwilioSettings>> {
    return this.request<TwilioSettings>('/settings/twilio/disable', {
      method: 'POST',
    });
  }

  async testTwilioCall(request: TwilioTestCallRequest): Promise<ApiResponse<TwilioTestCallResponse>> {
    return this.request<TwilioTestCallResponse>('/settings/twilio/test-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  // === METODI PER I TEMPLATE WHATSAPP ===

  async getWhatsAppTemplate(): Promise<ApiResponse<WhatsAppTemplate>> {
    return this.request<WhatsAppTemplate>('/settings/whatsapp-template');
  }

  async updateWhatsAppTemplate(request: WhatsAppTemplateRequest): Promise<WhatsAppTemplateResponse> {
    return this.request<WhatsAppTemplate>('/settings/whatsapp-template', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }) as Promise<WhatsAppTemplateResponse>;
  }

  async compileWhatsAppTemplate(contactId: string): Promise<ApiResponse<{
    originalMessage: string;
    compiledMessage: string;
    variables: string[];
    replacementData: Record<string, string | number | boolean>;
    missingVariables: string[];
  }>> {
    return this.request('/settings/whatsapp-template/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    });
  }

  async getWhatsAppTemplateVariables(): Promise<ApiResponse<{
    fixed: Array<{ key: string; description: string }>;
    dynamic: Array<{ key: string; description: string }>;
  }>> {
    return this.request('/settings/whatsapp-template/variables');
  }

  // === METODI PER LE SESSIONI WHATSAPP ===

  async getWhatsAppSessions(): Promise<SessionsResponse> {
    return this.request<{ sessions: WhatsappSession[] }>('/whatsapp-sessions');
  }

  async getWhatsAppSession(sessionId: string): Promise<SessionResponse> {
    return this.request<WhatsappSession>(`/whatsapp-sessions/${sessionId}`);
  }

  async createWhatsAppSession(request: CreateSessionRequest): Promise<SessionResponse> {
    return this.request<WhatsappSession>('/whatsapp-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async updateWhatsAppSession(sessionId: string, request: UpdateSessionRequest): Promise<SessionResponse> {
    return this.request<WhatsappSession>(`/whatsapp-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async disconnectWhatsAppSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/whatsapp-sessions/${sessionId}/disconnect`, {
      method: 'POST',
    });
  }

  async reconnectWhatsAppSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/whatsapp-sessions/${sessionId}/reconnect`, {
      method: 'POST',
    });
  }

  async deleteWhatsAppSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/whatsapp-sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getWhatsAppSessionQrCode(sessionId: string): Promise<QrCodeApiResponse> {
    return this.request(`/whatsapp-sessions/${sessionId}/qr`);
  }

  async getWhatsAppSessionStats(sessionId: string): Promise<SessionStatsApiResponse> {
    return this.request(`/whatsapp-sessions/${sessionId}/stats`);
  }

  async sendWhatsAppTestMessage(sessionId: string, request: TestMessageRequest): Promise<ApiResponse<{ messageId: string; sentAt: string }>> {
    return this.request(`/whatsapp-sessions/${sessionId}/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  // === METODI PER LE CAMPAGNE WHATSAPP ===

  async getWhatsAppCampaigns(filters?: CampaignFilters): Promise<CampaignsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/whatsapp-campaigns?${queryString}` : '/whatsapp-campaigns';
    
    return this.request(url);
  }

  async getWhatsAppCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>(`/whatsapp-campaigns/${campaignId}`);
  }

  async createWhatsAppCampaign(request: CreateCampaignRequest): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>('/whatsapp-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async updateWhatsAppCampaign(campaignId: string, request: UpdateCampaignRequest): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>(`/whatsapp-campaigns/${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async previewWhatsAppCampaign(request: PreviewCampaignRequest): Promise<CampaignPreviewResponse> {
    return this.request('/whatsapp-campaigns/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  async uploadCampaignAttachments(campaignId: string, files: FileList, caption?: string): Promise<UploadAttachmentsResponse> {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    
    if (caption) {
      formData.append('caption', caption);
    }

    return this.request(`/whatsapp-campaigns/${campaignId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  }

  async startWhatsAppCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>(`/whatsapp-campaigns/${campaignId}/start`, {
      method: 'POST',
    });
  }

  async pauseWhatsAppCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>(`/whatsapp-campaigns/${campaignId}/pause`, {
      method: 'POST',
    });
  }

  async resumeWhatsAppCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>(`/whatsapp-campaigns/${campaignId}/resume`, {
      method: 'POST',
    });
  }

  async cancelWhatsAppCampaign(campaignId: string): Promise<CampaignResponse> {
    return this.request<WhatsappCampaign>(`/whatsapp-campaigns/${campaignId}/cancel`, {
      method: 'POST',
    });
  }

  async deleteWhatsAppCampaign(campaignId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/whatsapp-campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 🔄 Cambia la sessione WhatsApp di una campagna (anche se in corso)
   */
  async changeWhatsAppCampaignSession(
    campaignId: string, 
    newWhatsappSessionId: string
  ): Promise<ApiResponse<{
    data: WhatsappCampaign;
    changes: {
      oldSessionId: string;
      oldNumber: string;
      newSessionId: string;
      newNumber: string;
      campaignStatus: string;
      pendingMessages: number;
      sentMessages: number;
    };
  }>> {
    return this.request(`/whatsapp-campaigns/${campaignId}/change-session`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newWhatsappSessionId }),
    });
  }

  /**
   * Aggiorna lo status di un messaggio specifico in una campagna
   */
  async updateMessageStatus(campaignId: string, messageId: string, request: UpdateMessageStatusRequest): Promise<ApiResponse<UpdateMessageStatusResponse>> {
    return this.request<UpdateMessageStatusResponse>(`/whatsapp-campaigns/${campaignId}/messages/${messageId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
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