"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ContactsTable from "@/components/ui/contacts-table";
import LoginForm from "@/components/ui/login-form";
import { CsvImportDialog } from "@/components/ui/csv-import";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { ContactDetailSidebar } from "@/components/ui/contact-detail-sidebar";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, User, Upload } from "lucide-react";
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
  const { user, logout } = useAuth();
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
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(false);

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

  // Carica i contatti dal database
  const loadContacts = async (page: number = 1, limit: number = 10, listFilter: string | null = selectedList) => {
    try {
      setIsLoadingContacts(true);
      setContactsError(null);
      
      console.log(`🔄 Caricamento contatti: pagina ${page}, limite ${limit}, lista ${listFilter || 'tutte'}`);
      const response = await apiClient.getContacts({
        page,
        limit,
        list: listFilter || undefined
      });
      
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
  };

  // Carica i contatti al mount e quando refreshKey cambia (solo dopo aver caricato le preferenze)
  useEffect(() => {
    if (preferencesLoaded) {
      loadContacts(pagination.currentPage, currentLimit, selectedList);
    }
  }, [refreshKey, preferencesLoaded, pagination.currentPage, currentLimit, selectedList]);

  // Gestione cambio pagina
  const handlePageChange = (newPage: number) => {
    loadContacts(newPage, currentLimit, selectedList);
  };

  // Gestione cambio limite per pagina
  const handleLimitChange = (newLimit: number) => {
    setCurrentLimit(newLimit);
    loadContacts(1, newLimit, selectedList); // Torna alla prima pagina con il nuovo limite
  };

  // Gestione selezione lista dalla sidebar
  const handleListSelect = (listName: string | null) => {
    setSelectedList(listName);
    // Reset alla prima pagina quando si cambia lista
    setPagination(prev => ({ ...prev, currentPage: 1 }));
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
  };

  const handleImportComplete = () => {
    // Aggiorna la tabella contatti dopo l'importazione
    console.log('📥 Import CSV completato, ricarico contatti...');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar moderna */}
      <ModernSidebar 
        onImportComplete={handleImportComplete}
        onListSelect={handleListSelect}
        selectedList={selectedList}
      />

      {/* Main content con padding-left per la sidebar */}
      <main className="pl-16 transition-all duration-300">
        <div className="container mx-auto py-8 px-6">
          <div className="mb-8">
            <div className="flex items-center justify-end">
              {/* Pulsante Importa CSV per desktop */}
              <div className="hidden lg:block">
                <CsvImportDialog onImportComplete={handleImportComplete}>
                  <Button className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Importa CSV
                  </Button>
                </CsvImportDialog>
              </div>
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
                onClick={() => loadContacts(pagination.currentPage, currentLimit)}
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
            onContactClick={handleContactClick}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </div>
      </main>

      {/* Sidebar dettaglio contatto */}
      <ContactDetailSidebar
        contact={selectedContact}
        isOpen={isContactSidebarOpen}
        onClose={handleCloseSidebar}
        onContactUpdate={handleContactUpdate}
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
