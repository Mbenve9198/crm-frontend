"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import ContactsTable from "@/components/ui/contacts-table";
import LoginForm from "@/components/ui/login-form";
import { CrmSidebar } from "@/components/ui/crm-sidebar";
import { BulkActionsBanner } from "@/components/ui/bulk-actions-banner";
import { CsvImportDialog } from "@/components/ui/csv-import";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { Contact, ContactList } from "@/types/contact";
import { apiClient } from "@/lib/api";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Caricamento MenuChatCRM...</p>
      </div>
    </div>
  );
}

function Dashboard() {
  // Rimuoviamo la destructuring vuota che può causare errori React #185
  useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalContacts: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentLimit, setCurrentLimit] = useState(10);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [availableLists, setAvailableLists] = useState<ContactList[]>([]);

  // Carica le preferenze utente per pageSize all'avvio
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        console.log('🔍 Caricamento preferenze utente per pageSize...');
        const response = await apiClient.getTablePreferences();
        
        if (response.success && response.data?.tablePreferences?.contacts?.pageSize) {
          const savedPageSize = response.data.tablePreferences.contacts.pageSize;
          console.log('✅ PageSize salvato caricato:', savedPageSize);
          setCurrentLimit(savedPageSize);
        }
      } catch (error) {
        console.error('❌ Errore nel caricamento preferenze pageSize:', error);
        // In caso di errore, mantieni il valore di default (10)
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadUserPreferences();
  }, []); // Carica solo una volta al montaggio

  // Carica le liste disponibili
  useEffect(() => {
    const loadAvailableLists = async () => {
      try {
        console.log('🔍 Caricamento liste disponibili...');
        const response = await apiClient.getContactLists();
        
        if (response.success && response.data) {
          console.log('✅ Liste disponibili caricate:', response.data);
          setAvailableLists(response.data);
        }
      } catch (error) {
        console.error('❌ Errore nel caricamento liste disponibili:', error);
        // Fallback: usa una lista vuota per evitare che l'app si blocchi
        setAvailableLists([]);
        // Non mostrare l'errore all'utente per questo endpoint non critico
      }
    };

    loadAvailableLists();
  }, [refreshKey]); // Ricarica quando refreshKey cambia

  // Carica i contatti dal database
  const loadContacts = useCallback(async (page: number = 1, limit: number = 10, list?: string) => {
    try {
      setIsLoadingContacts(true);
      setContactsError(null);
      
      const filters: { page: number; limit: number; list?: string } = { page, limit };
      if (list && list.trim() !== '') {
        filters.list = list;
      }
      
      console.log(`🔄 Caricamento contatti: pagina ${page}, limite ${limit}, lista: "${list || 'tutte'}"`);
      const response = await apiClient.getContacts(filters);
      
      if (response.success && response.data) {
        console.log('✅ Contatti caricati:', response.data.contacts.length);
        setContacts(response.data.contacts);
        setPagination(response.data.pagination);
      } else {
        throw new Error('Errore nel caricamento contatti');
      }
    } catch (error) {
      console.error('❌ Errore caricamento contatti:', error);
      setContactsError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  // Carica i contatti al mount e quando refreshKey/selectedList cambia (solo dopo aver caricato le preferenze)
  useEffect(() => {
    if (preferencesLoaded) {
      loadContacts(1, currentLimit, selectedList); // Sempre pagina 1 per refresh/filtri
    }
  }, [loadContacts, refreshKey, preferencesLoaded, currentLimit, selectedList]);

  // Gestione cambio pagina
  const handlePageChange = useCallback((newPage: number) => {
    loadContacts(newPage, currentLimit, selectedList);
  }, [loadContacts, currentLimit, selectedList]);

  // Gestione cambio limite per pagina
  const handleLimitChange = useCallback((newLimit: number) => {
    setCurrentLimit(newLimit);
    loadContacts(1, newLimit, selectedList); // Torna alla prima pagina con il nuovo limite
  }, [loadContacts, selectedList]);

  // Gestione selezione lista dalla sidebar
  const handleListSelect = (listName: string) => {
    setSelectedList(listName);
    // Il reload dei contatti viene gestito dall'useEffect
  };

  const handleEditContact = useCallback((contact: Contact) => {
    console.log('Edit contact:', contact);
    // TODO: Implementare modal di modifica
  }, []);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    console.log('Delete contact:', contactId);
    // TODO: Implementare conferma eliminazione e chiamata API
    try {
      await apiClient.deleteContact(contactId);
      // Ricarica i contatti dopo eliminazione
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Errore eliminazione contatto:', error);
    }
  }, []);

  const handleViewContact = useCallback((contact: Contact) => {
    console.log('View contact:', contact);
    // TODO: Implementare modal di visualizzazione
  }, []);

  const handleImportComplete = () => {
    // Aggiorna la tabella contatti dopo l'importazione
    console.log('📥 Import CSV completato, ricarico contatti...');
    setRefreshKey(prev => prev + 1);
  };

  // Gestione bulk actions
  const handleBulkActionComplete = () => {
    // Ricarica contatti e liste dopo un'azione bulk
    console.log('✅ Azione bulk completata, ricarico dati...');
    setSelectedContactIds([]);
    setRefreshKey(prev => prev + 1);
  };

  const handleClearSelection = () => {
    setSelectedContactIds([]);
  };

  const handleContactsSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedContactIds(selectedIds);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-neutral-800 overflow-hidden">
      {/* Bulk Actions Banner */}
      <BulkActionsBanner
        selectedContactIds={selectedContactIds}
        onClear={handleClearSelection}
        onActionComplete={handleBulkActionComplete}
        availableLists={availableLists}
      />

      {/* Sidebar */}
      <CrmSidebar 
        onListSelect={handleListSelect}
        selectedList={selectedList}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-neutral-900">
        {/* Header semplificato */}
        <div className="border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedList ? `Lista: ${selectedList}` : 'Tutti i Contatti'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pagination.totalContacts} contatti totali
          </p>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Gestione Contatti
              </h2>
              <p className="text-gray-600">
                Sistema completo per la gestione dei contatti con ownership e proprietà dinamiche
              </p>
            </div>
            
            {/* Pulsante Importa CSV */}
            <CsvImportDialog onImportComplete={handleImportComplete}>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importa CSV
              </Button>
            </CsvImportDialog>
          </div>
        </div>
        
        {/* Errore caricamento contatti */}
        {contactsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-medium">Errore caricamento contatti:</span>
              <span>{contactsError}</span>
            </div>
            <button 
              onClick={() => loadContacts(pagination.currentPage, currentLimit, selectedList)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Riprova
            </button>
          </div>
        )}
        
        <ContactsTable
          key={refreshKey}
          contacts={contacts}
          isLoading={isLoadingContacts}
          pagination={pagination}
          currentLimit={currentLimit}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
          onViewContact={handleViewContact}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onRefresh={() => setRefreshKey(prev => prev + 1)}
          onSelectionChange={handleContactsSelectionChange}
          selectedContactIds={selectedContactIds}
        />
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  // Mostra loading durante la verifica dell'autenticazione
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Se non autenticato, mostra il form di login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Se autenticato, mostra la dashboard
  return <Dashboard />;
}
