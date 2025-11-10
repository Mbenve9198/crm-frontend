"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  onClick 
}: { 
  contact: Contact; 
  onClick: (contact: Contact) => void;
}) {
  return (
    <Card 
      className="cursor-pointer bg-gradient-to-br from-white to-gray-50 hover:from-white hover:to-blue-50 
                 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 
                 hover:border-blue-300 group active:scale-95 transform hover:scale-[1.01] 
                 backdrop-blur-sm relative overflow-hidden"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('contact-id', contact._id);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.8';
        e.currentTarget.style.transform = 'rotate(3deg) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(0, 0, 0, 0.4)';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
        e.currentTarget.style.boxShadow = '';
      }}
      onClick={() => onClick(contact)}
    >
      {/* Effetto glow ridotto */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
      
      <CardContent className="relative z-10 p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 pr-1 group-hover:text-blue-900 transition-colors">
            {contact.name}
          </h4>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(contact.status)} shadow-sm animate-pulse`} />
        </div>
        
        <p className="text-xs text-gray-600 mb-2 truncate">{contact.email}</p>
        
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {formatMRR(contact.mrr)}
          </div>
          <div className="text-xs text-gray-600 truncate max-w-[60px]">
            {contact.owner.firstName}
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          {new Date(contact.updatedAt).toLocaleDateString('it-IT')}
        </div>

        {/* Indicatore drag compatto */}
        <div className="mt-2 text-center">
          <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-1 bg-gray-100/60 rounded-full py-1 px-2 backdrop-blur-sm">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-0.5 h-0.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-0.5 h-0.5 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span className="text-xs">Trascina</span>
          </div>
        </div>

        {/* Effetto shimmer leggero */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-500 ease-in-out"></div>
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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Carica contatti (solo quelli in pipeline) - FILTRO LATO SERVER per performance
      const contactsResponse = await apiClient.getContacts({
        page: 1,
        limit: 1000, // Limite ragionevole - filtrato lato server
        owner: selectedOwner !== "all" ? selectedOwner : undefined,
        column_filters: {
          Status: {
            type: 'value',
            values: getPipelineStatuses() // Filtra solo status pipeline
          }
        }
      });

      if (contactsResponse.success) {
        // I contatti sono già filtrati lato server
        setContacts(contactsResponse.data.contacts);
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
  }, [selectedOwner, users.length]); // Aggiungo loadData alle dipendenze

  useEffect(() => {
    loadData();
  }, [loadData]); // Aggiungo loadData alle dipendenze

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
        <div className="container mx-auto py-8 px-6 pipeline-container">
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

          <div className="grid grid-cols-5 gap-8">
            {getPipelineStatuses().map((status, index) => {
              const statusContacts = contactsByStatus[status] || [];
              const stats = getColumnStats(status);
              
              // Gradients dinamici per ogni fase - coerenti con la tabella
              const gradientMap = {
                'interessato': 'from-blue-500 via-blue-600 to-blue-700',
                'qr code inviato': 'from-purple-500 via-purple-600 to-purple-700', 
                'free trial iniziato': 'from-emerald-500 via-emerald-600 to-emerald-700',
                'won': 'from-green-600 via-green-700 to-green-800',
                'lost': 'from-gray-500 via-gray-600 to-gray-700'
              };
              
              const gradient = gradientMap[status as keyof typeof gradientMap] || 'from-slate-500 to-slate-600';
              
              return (
                <div 
                  key={status}
                  className="group"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: 'slideInUp 0.6s ease-out forwards'
                  }}
                >
                  {/* Header della colonna con gradiente e ombra 3D */}
                  <div className={`relative p-6 bg-gradient-to-br ${gradient} text-white rounded-t-2xl shadow-2xl transform transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-t-2xl"></div>
                    <div className="relative z-10">
                      <h3 className="font-bold text-lg mb-2 tracking-wide">{getStatusLabel(status)}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                          {stats.count} contatti
                        </span>
                        <span className="text-sm font-bold">
                          {formatMRR(stats.totalMRR)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Effetto shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000 ease-in-out"></div>
                  </div>

                  {/* Area drop con design moderno */}
                  <div 
                    className={`min-h-[600px] p-3 space-y-3 rounded-b-2xl shadow-xl transition-all duration-300 transform ${
                      dragOverColumn === status 
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-400 scale-[1.01] shadow-2xl' 
                        : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:shadow-lg'
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
                        onClick={handleContactClick}
                      />
                    ))}
                    
                    {statusContacts.length === 0 && (
                      <div className={`text-center py-12 transition-all duration-300 transform ${
                        dragOverColumn === status 
                          ? 'scale-105 text-blue-600 font-bold' 
                          : 'text-gray-400'
                      }`}>
                        {dragOverColumn === status ? (
                          <div className="space-y-3">
                            <div className="text-3xl animate-bounce">📎</div>
                            <p className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              Rilascia qui il contatto
                            </p>
                            <div className="flex justify-center gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-2xl opacity-50">💼</div>
                            <p className="text-sm font-medium">Nessuna opportunità</p>
                            <p className="text-xs opacity-75">Trascina qui i contatti</p>
                          </div>
                        )}
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

// CSS Animations
const pipelineStyles = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }
    50% {
      box-shadow: 0 0 40px rgba(59, 130, 246, 0.8);
    }
  }
  
  .pipeline-container {
    animation: slideInUp 0.6s ease-out;
  }
`;

// Inietta gli stili
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = pipelineStyles;
  document.head.appendChild(styleElement);
}

export default function Pipeline() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginForm />;
  return <PipelinePage />;
} 