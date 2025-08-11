"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/ui/login-form";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Contact, User, ContactStatus } from "@/types/contact";
import { apiClient } from "@/lib/api";
import { getPipelineStatuses, getStatusLabel, getStatusColor, formatMRR } from "@/lib/status-utils";
import { ContactDetailSidebar } from "@/components/ui/contact-detail-sidebar";
import { Users, Euro, TrendingUp } from "lucide-react";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Caricamento pipeline...</p>
      </div>
    </div>
  );
}

// Componente Card Contatto con Drag & Drop
function ContactCard({ 
  contact, 
  onMove, 
  onClick 
}: { 
  contact: Contact; 
  onMove: (id: string, status: ContactStatus) => void; 
  onClick: (contact: Contact) => void;
}) {
  return (
    <Card 
      className="cursor-pointer bg-white hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-blue-200 group active:scale-95"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('contact-id', contact._id);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.6';
        e.currentTarget.style.transform = 'rotate(2deg)';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'rotate(0deg)';
      }}
      onClick={() => onClick(contact)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm text-gray-900 truncate flex-1 pr-2">{contact.name}</h4>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(contact.status)}`} />
        </div>
        
        <p className="text-xs text-gray-600 mb-2 truncate">{contact.email}</p>
        
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-green-600">
            {formatMRR(contact.mrr)}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[60px]">
            {contact.owner.firstName}
          </div>
        </div>
        
        <div className="text-xs text-gray-400">
          {new Date(contact.updatedAt).toLocaleDateString('it-IT')}
        </div>

        {/* Indicatore drag */}
        <div className="mt-2 text-center">
          <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <span className="text-blue-500">⋮⋮</span>
            <span>Trascina per spostare</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<ContactStatus | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedOwner]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carica contatti
      const contactsResponse = await apiClient.getContacts({
        page: 1,
        limit: 1000,
        owner: selectedOwner !== "all" ? selectedOwner : undefined
      });

      if (contactsResponse.success) {
        const pipelineContacts = contactsResponse.data.contacts.filter(contact => 
          getPipelineStatuses().includes(contact.status)
        );
        setContacts(pipelineContacts);
      }

      // Carica utenti
      if (users.length === 0) {
        const usersResponse = await apiClient.getUsersForAssignment();
        if (usersResponse.success && usersResponse.data && usersResponse.data.users) {
          setUsers(usersResponse.data.users);
        }
      }
    } catch (error) {
      console.error('Errore caricamento pipeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const contactsByStatus = getPipelineStatuses().reduce((acc, status) => {
    acc[status] = contacts.filter(contact => contact.status === status);
    return acc;
  }, {} as Record<ContactStatus, Contact[]>);

  const getColumnStats = (status: ContactStatus) => {
    const statusContacts = contactsByStatus[status] || [];
    const totalMRR = statusContacts.reduce((sum, contact) => sum + (contact.mrr || 0), 0);
    return { count: statusContacts.length, totalMRR };
  };

  const totalStats = getPipelineStatuses().reduce((acc, status) => {
    const stats = getColumnStats(status);
    acc.count += stats.count;
    acc.totalMRR += stats.totalMRR;
    return acc;
  }, { count: 0, totalMRR: 0 });

  // Gestione sidebar contatto
  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactSidebarOpen(true);
  };

  const handleContactUpdate = (updatedContact: Contact) => {
    // Aggiorna il contatto nella lista
    setContacts(prev => prev.map(c => 
      c._id === updatedContact._id ? updatedContact : c
    ));
    setSelectedContact(updatedContact);
  };

  const handleCloseSidebar = () => {
    setIsContactSidebarOpen(false);
    setSelectedContact(null);
  };

  // Drag & Drop per spostare contatti
  const handleContactMove = async (contactId: string, newStatus: ContactStatus) => {
    try {
      const contact = contacts.find(c => c._id === contactId);
      if (!contact || contact.status === newStatus) return;

      // Aggiorna subito l'UI per feedback immediato
      setContacts(prev => prev.map(c => 
        c._id === contactId ? { ...c, status: newStatus } : c
      ));

      // Chiama API per salvare il cambio
      const response = await apiClient.updateContactStatus(contactId, {
        status: newStatus,
        mrr: contact.mrr || (newStatus === 'interessato' ? 0 : undefined)
      });

      if (!response.success) {
        // Se fallisce, rollback
        setContacts(prev => prev.map(c => 
          c._id === contactId ? { ...c, status: contact.status } : c
        ));
        alert('Errore durante lo spostamento del contatto');
      }
    } catch (error) {
      console.error('Errore spostamento contatto:', error);
      // Rollback in caso di errore
      loadData();
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar moderna */}
      <div className={`transition-all duration-300 ${
        isContactSidebarOpen ? 'blur-sm' : ''
      }`}>
        <ModernSidebar />
      </div>

      {/* Main content con padding-left per la sidebar */}
      <main className={`pl-16 transition-all duration-300 ${
        isContactSidebarOpen ? 'blur-sm' : ''
      }`}>
        <div className="container mx-auto py-8 px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Pipeline Vendite</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-medium">Proprietario:</label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Opportunità</p>
                      <p className="text-2xl font-bold">{totalStats.count}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">MRR Totale</p>
                      <p className="text-2xl font-bold text-green-600">{formatMRR(totalStats.totalMRR)}</p>
                    </div>
                    <Euro className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">MRR Medio</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {totalStats.count > 0 ? formatMRR(totalStats.totalMRR / totalStats.count) : '€0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {getPipelineStatuses().map((status) => {
              const statusContacts = contactsByStatus[status] || [];
              const stats = getColumnStats(status);
              
              return (
                <div key={status}>
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                    <h3 className="font-semibold">{getStatusLabel(status)}</h3>
                    <p className="text-sm">{stats.count} • {formatMRR(stats.totalMRR)}</p>
                  </div>

                  <div 
                    className={`min-h-[400px] p-3 space-y-3 rounded-b-lg transition-all duration-200 ${
                      dragOverColumn === status 
                        ? 'bg-blue-50 border-2 border-dashed border-blue-300' 
                        : 'bg-gray-100'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColumn(status);
                    }}
                    onDragLeave={(e) => {
                      // Solo se lasciamo completamente la colonna
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      const contactId = e.dataTransfer.getData('contact-id');
                      if (contactId) {
                        handleContactMove(contactId, status);
                      }
                    }}
                  >
                    {statusContacts.map((contact) => (
                      <ContactCard 
                        key={contact._id} 
                        contact={contact} 
                        onMove={handleContactMove}
                        onClick={handleContactClick}
                      />
                    ))}
                    
                    {statusContacts.length === 0 && (
                      <div className={`text-center py-8 transition-all duration-200 ${
                        dragOverColumn === status 
                          ? 'text-blue-600 font-medium' 
                          : 'text-gray-500'
                      }`}>
                        <p className="text-sm">
                          {dragOverColumn === status 
                            ? '📎 Rilascia qui il contatto' 
                            : 'Nessuna opportunità'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Contact Detail Sidebar */}
      {selectedContact && (
        <ContactDetailSidebar
          contact={selectedContact}
          isOpen={isContactSidebarOpen}
          onClose={handleCloseSidebar}
          onContactUpdate={handleContactUpdate}
        />
      )}
    </div>
  );
}

export default function Pipeline() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginForm />;
  return <PipelinePage />;
} 