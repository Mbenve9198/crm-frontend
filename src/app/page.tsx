"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import ContactsTable from "@/components/ui/contacts-table";
import LoginForm from "@/components/ui/login-form";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { ContactDetailSidebar } from "@/components/ui/contact-detail-sidebar";
import { Loader2 } from "lucide-react";
import { Contact } from "@/types/contact";
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
  const {} = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1); // 🚀 Stato separato per evitare loop
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalContacts: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentLimit, setCurrentLimit] = useState(10);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(false);
  const [initialActivity, setInitialActivity] = useState<{ type: 'call' | 'whatsapp'; data?: object } | undefined>();
  const [searchQuery] = useState<string>("");

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

  // Carica contatti con paginazione server-side (ottimizzato per grandi dataset)
  const loadContacts = useCallback(async (listFilter: string | null = selectedList, searchQuery?: string) => {
    try {
      setIsLoadingContacts(true);
      setContactsError(null);
      
      console.log(`🔄 Caricamento contatti pagina ${currentPage}: lista ${listFilter || 'tutte'}, ricerca ${searchQuery || 'nessuna'}`);
      const response = await apiClient.getContacts({
        page: currentPage,
        limit: currentLimit, // 🚀 Usa paginazione vera invece di caricare tutto
        list: listFilter || undefined,
        search: searchQuery || undefined
      });
      
      if (response.success && response.data) {
        console.log('✅ Contatti caricati:', response.data.contacts.length);
        setContacts(response.data.contacts);
        // 🚀 Usa la paginazione dal backend invece di caricare tutto
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        throw new Error('Errore nel caricamento contatti');
      }
    } catch (error) {
      console.error('❌ Errore caricamento contatti:', error);
      setContactsError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsLoadingContacts(false);
    }
  }, [selectedList, currentPage, currentLimit]); // 🚀 Aggiornate dipendenze

  // Carica i contatti al mount e quando refreshKey cambia (solo dopo aver caricato le preferenze)
  useEffect(() => {
    if (preferencesLoaded) {
      loadContacts(selectedList, searchQuery);
    }
  }, [refreshKey, preferencesLoaded, selectedList, searchQuery, loadContacts]);

  // Ricerca manuale su richiesta (Enter o click)
  const performSearch = (query: string) => {
    console.log(`🔍 Ricerca manuale attivata per: "${query}"`);
    loadContacts(selectedList, query);
  };

  // 🚀 Gestione cambio pagina - server-side
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 🚀 Gestione cambio limite per pagina - server-side
  const handleLimitChange = (newLimit: number) => {
    setCurrentLimit(newLimit);
    setCurrentPage(1); // Torna alla prima pagina
  };

  // Gestione selezione lista dalla sidebar
  const handleListSelect = (listName: string | null) => {
    setSelectedList(listName);
    setCurrentPage(1); // Reset alla prima pagina quando si cambia lista
  };

  const handleEditContact = (contact: Contact) => {
    console.log('Edit contact:', contact);
    // TODO: Implementare modal di modifica
  };

  const handleDeleteContact = async (contactId: string) => {
    console.log('Delete contact:', contactId);
    // TODO: Implementare conferma eliminazione e chiamata API
    try {
      await apiClient.deleteContact(contactId);
      // Ricarica i contatti dopo eliminazione
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Errore eliminazione contatto:', error);
    }
  };

  const handleViewContact = (contact: Contact) => {
    console.log('View contact:', contact);
    // TODO: Implementare modal di visualizzazione
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactSidebarOpen(true);
  };

  const handleContactUpdate = (updatedContact: Contact) => {
    // Aggiorna il contatto nella lista
    setContacts(prev => prev.map(c => c._id === updatedContact._id ? updatedContact : c));
    setSelectedContact(updatedContact);
  };

  const handleCloseSidebar = () => {
    setIsContactSidebarOpen(false);
    setSelectedContact(null);
    setInitialActivity(undefined);
  };

  const handlePhoneAction = (contact: Contact, action: 'call' | 'whatsapp') => {
    // Imposta l'activity iniziale basata sull'azione
    if (action === 'call') {
      setInitialActivity({
        type: 'call',
        data: {}
      });
    } else if (action === 'whatsapp') {
      setInitialActivity({
        type: 'whatsapp',
        data: {}
      });
    }
    
    // Apri la sidebar del contatto
    setSelectedContact(contact);
    setIsContactSidebarOpen(true);
  };

  const handleImportComplete = () => {
    // Aggiorna la tabella contatti dopo l'importazione
    console.log('📥 Import CSV completato, ricarico contatti...');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar moderna */}
      <div className={`transition-all duration-300 ${
        isContactSidebarOpen ? 'blur-sm' : ''
      }`}>
        <ModernSidebar 
          onImportComplete={handleImportComplete}
          onListSelect={handleListSelect}
          selectedList={selectedList}
        />
      </div>

      {/* Main content con padding-left per la sidebar */}
      <main className={`pl-16 transition-all duration-300 ${
        isContactSidebarOpen ? 'blur-sm' : ''
      }`}>
        <div className="container mx-auto py-4 px-6">
          
          {/* Errore caricamento contatti */}
          {contactsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <span className="font-medium">Errore caricamento contatti:</span>
                <span>{contactsError}</span>
              </div>
              <button 
                onClick={() => loadContacts(selectedList, searchQuery)}
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
            searchQuery={searchQuery}
            onSearchSubmit={performSearch}
            onEditContact={handleEditContact}
            onDeleteContact={handleDeleteContact}
            onViewContact={handleViewContact}
            onContactClick={handleContactClick}
            onPhoneClick={handlePhoneAction}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
            onImportComplete={handleImportComplete}
          />
        </div>
      </main>

      {/* Sidebar dettaglio contatto */}
      <ContactDetailSidebar
        contact={selectedContact}
        isOpen={isContactSidebarOpen}
        onClose={handleCloseSidebar}
        onContactUpdate={handleContactUpdate}
        initialActivity={initialActivity}
      />
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
