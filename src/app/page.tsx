"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ContactsTable from "@/components/ui/contacts-table";
import LoginForm from "@/components/ui/login-form";
import { CsvImportDialog } from "@/components/ui/csv-import";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, User, Upload } from "lucide-react";
import { Contact } from "@/types/contact";

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

  const handleEditContact = (contact: Contact) => {
    console.log('Edit contact:', contact);
    // TODO: Implementare modal di modifica
  };

  const handleDeleteContact = (contactId: string) => {
    console.log('Delete contact:', contactId);
    // TODO: Implementare conferma eliminazione
  };

  const handleViewContact = (contact: Contact) => {
    console.log('View contact:', contact);
    // TODO: Implementare modal di visualizzazione
  };

  const handleImportComplete = () => {
    // Aggiorna la tabella contatti dopo l'importazione
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MenuChatCRM</h1>
              <p className="text-sm text-gray-600">Gestione Contatti</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Info utente */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {user?.role}
                </span>
              </div>
              
              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto py-8">
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
        
        <ContactsTable
          key={refreshKey}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
          onViewContact={handleViewContact}
        />
      </main>
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
