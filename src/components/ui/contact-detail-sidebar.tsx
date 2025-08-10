"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Mail, Phone, MessageCircle, Instagram, Clock, ArrowRight, User as UserIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Contact, User, ContactStatus } from "@/types/contact";
import { Activity, ActivityType, CreateActivityRequest, CallOutcome } from "@/types/activity";
import { apiClient } from "@/lib/api";
import { getAllStatuses, getStatusLabel, isPipelineStatus, getStatusColor } from "@/lib/status-utils";

interface ContactDetailSidebarProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onContactUpdate: (contact: Contact) => void;
  initialActivity?: {
    type: ActivityType;
    data?: object;
  };
}

export function ContactDetailSidebar({ contact, isOpen, onClose, onContactUpdate, initialActivity }: ContactDetailSidebarProps) {
  const [editedContact, setEditedContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingMRR, setPendingMRR] = useState<number | undefined>();
  const [showMRRInput, setShowMRRInput] = useState(false);

  // Stato per nuova activity
  const [newActivity, setNewActivity] = useState<CreateActivityRequest>({
    type: 'email',
    description: '',
    data: {}
  });

  const loadActivities = useCallback(async () => {
    if (!contact) return;
    
    try {
      setIsLoadingActivities(true);
      const response = await apiClient.getContactActivities(contact._id, { limit: 50 });
      
      if (response.success) {
        setActivities(response.data.activities);
      }
    } catch (error) {
      console.error('Errore caricamento activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [contact]);

  // Carica activities quando cambia il contatto
  useEffect(() => {
    if (contact && isOpen) {
      loadActivities();
      setEditedContact({ ...contact });
      
      // Se c'è un'activity iniziale, apri il form e precompilalo
      if (initialActivity) {
        setShowAddActivity(true);
        setNewActivity({
          type: initialActivity.type,
          description: '',
          data: initialActivity.data || {}
        });
      }
    }
  }, [contact, isOpen, loadActivities, initialActivity]);

  const handleSaveContact = async () => {
    if (!editedContact || !contact) return;

    try {
      setIsSaving(true);
      const response = await apiClient.updateContact(editedContact._id, {
        name: editedContact.name,
        email: editedContact.email,
        phone: editedContact.phone,
        lists: editedContact.lists,
        properties: editedContact.properties
      });

      if (response.success && response.data) {
        onContactUpdate(response.data);
        setEditedContact(response.data);
      }
    } catch (error) {
      console.error('Errore aggiornamento contatto:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetChanges = () => {
    setEditedContact(contact ? { ...contact } : null);
  };

  const handleStatusChange = async (newStatus: ContactStatus, mrr?: number) => {
    if (!contact) return;

    try {
      setIsUpdatingStatus(true);

      const response = await apiClient.updateContactStatus(contact._id, {
        status: newStatus,
        mrr
      });

      if (response.success && response.data) {
        // Aggiorna il contatto locale
        setEditedContact(response.data);
        onContactUpdate(response.data);
        
        // Ricarica le activities per mostrare quella nuova
        loadActivities();
        
        // Reset stati temporanei
        setShowMRRInput(false);
        setPendingMRR(undefined);
      }
    } catch (error) {
      console.error('Errore aggiornamento status:', error);
      alert('Errore durante l\'aggiornamento dello status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const onStatusSelectChange = (newStatus: ContactStatus) => {
    if (!contact || newStatus === contact.status) return;

    // Se il nuovo status richiede MRR e non ce l'abbiamo
    if (isPipelineStatus(newStatus) && !contact.mrr && !pendingMRR) {
      setShowMRRInput(true);
      setPendingMRR(0);
      return;
    }

    // Altrimenti procedi direttamente
    handleStatusChange(newStatus, contact.mrr || pendingMRR);
  };

  const onMRRConfirm = () => {
    if (!contact || pendingMRR === undefined) return;
    
    const newStatus = contact.status; // In questo caso stiamo solo aggiornando MRR
    handleStatusChange(newStatus, pendingMRR);
  };

  const handleAddActivity = async () => {
    if (!contact) return;

    try {
      const response = await apiClient.createActivity(contact._id, newActivity);
      
      if (response.success) {
        setActivities(prev => [response.data, ...prev]);
        setShowAddActivity(false);
        setNewActivity({
          type: 'email',
          description: '',
          data: {}
        });
      }
    } catch (error) {
      console.error('Errore creazione activity:', error);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    const iconMap = {
      email: Mail,
      call: Phone,
      whatsapp: MessageCircle,
      instagram_dm: Instagram,
      status_change: ArrowRight
    };
    return iconMap[type] || Mail;
  };

  const getActivityColor = (type: ActivityType) => {
    const colorMap = {
      email: 'bg-blue-100 text-blue-800',
      call: 'bg-green-100 text-green-800',
      whatsapp: 'bg-emerald-100 text-emerald-800',
      instagram_dm: 'bg-purple-100 text-purple-800',
      status_change: 'bg-orange-100 text-orange-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const time = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (diffDays === 1) return `Oggi alle ${time}`;
    if (diffDays === 2) return `Ieri alle ${time}`;
    if (diffDays <= 7) return `${diffDays} giorni fa alle ${time}`;
    
    const dateStr = date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    });
    
    return `${dateStr} alle ${time}`;
  };

  if (!isOpen || !contact) return null;

  return (
    <>
      {/* Sidebar con animazione moderna */}
      <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 transition-all duration-300 ease-out ${
        isOpen ? 'w-[80vw] translate-x-0' : 'w-0 translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{contact.name}</h2>
                <p className="text-sm text-gray-600">{contact.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Status Select */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(contact.status)}`} />
                <Select 
                  value={contact.status} 
                  onValueChange={onStatusSelectChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllStatuses().map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                          {getStatusLabel(status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* MRR Display/Edit */}
            {(isPipelineStatus(contact.status) || showMRRInput) && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">MRR:</span>
                {showMRRInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="€"
                      value={pendingMRR || ''}
                      onChange={(e) => setPendingMRR(Number(e.target.value))}
                      className="w-20 h-8"
                      min="0"
                    />
                    <Button size="sm" onClick={onMRRConfirm} disabled={isUpdatingStatus}>
                      ✓
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setShowMRRInput(false);
                        setPendingMRR(undefined);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-green-600">
                    €{contact.mrr || 0}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content - Layout a due colonne */}
        <div className="flex-1 flex overflow-hidden">
          {/* Colonna sinistra - Proprietà contatto */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Proprietà</h3>
              
              {editedContact && (
                <div className="space-y-4">
                  {/* Proprietà base */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Nome</label>
                    <Input
                      value={editedContact.name}
                      onChange={(e) => setEditedContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                      onBlur={() => handleSaveContact()}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                    <Input
                      type="email"
                      value={editedContact.email || ''}
                      onChange={(e) => setEditedContact(prev => prev ? { ...prev, email: e.target.value } : null)}
                      onBlur={() => handleSaveContact()}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Telefono</label>
                    <Input
                      value={editedContact.phone || ''}
                      onChange={(e) => setEditedContact(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      onBlur={() => handleSaveContact()}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Proprietario</label>
                    <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      {contact.owner.firstName} {contact.owner.lastName}
                    </div>
                  </div>

                  {/* Proprietà dinamiche */}
                  {contact.properties && Object.keys(contact.properties).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Proprietà Aggiuntive</h4>
                      <div className="space-y-3">
                        {Object.entries(contact.properties).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-700 block mb-1 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <Input
                              value={String(editedContact.properties?.[key] || '')}
                              onChange={(e) => setEditedContact(prev => prev ? {
                                ...prev,
                                properties: { ...prev.properties, [key]: e.target.value }
                              } : null)}
                              onBlur={() => handleSaveContact()}
                              placeholder={`Inserisci ${key.replace(/_/g, ' ')}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liste */}
                  {contact.lists.length > 0 && (
                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-gray-700 block mb-2">Liste</label>
                      <div className="flex flex-wrap gap-1">
                        {contact.lists.map((list, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {list}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" onClick={handleResetChanges} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Colonna destra - Activities */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Cronologia Activities</h4>
              <Button 
                size="sm" 
                onClick={() => setShowAddActivity(!showAddActivity)}
                variant={showAddActivity ? "outline" : "default"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Activity
              </Button>
            </div>

            {/* Form nuova activity */}
            {showAddActivity && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="space-y-3">
                  <Select 
                    value={newActivity.type} 
                    onValueChange={(value: ActivityType) => setNewActivity(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="call">📞 Chiamata</SelectItem>
                      <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      <SelectItem value="instagram_dm">📱 DM Instagram</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Il titolo viene generato automaticamente dal server */}

                  {newActivity.type === 'call' && (
                    <Select 
                      value={newActivity.data?.callOutcome || ''} 
                      onValueChange={(value: CallOutcome) => 
                        setNewActivity(prev => ({ 
                          ...prev, 
                          data: { ...prev.data, callOutcome: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Esito chiamata..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="success">✅ Successo</SelectItem>
                        <SelectItem value="no_answer">❌ Nessuna risposta</SelectItem>
                        <SelectItem value="busy">📞 Occupato</SelectItem>
                        <SelectItem value="voicemail">📨 Segreteria</SelectItem>
                        <SelectItem value="callback_requested">🔄 Richiamata</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {(newActivity.type === 'whatsapp' || newActivity.type === 'instagram_dm') && (
                                      <Textarea
                    placeholder="Testo del messaggio..."
                    value={newActivity.data?.messageText || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewActivity(prev => ({ 
                      ...prev, 
                      data: { ...prev.data, messageText: e.target.value }
                    }))}
                  />
                  )}

                  <Textarea
                    placeholder="Note aggiuntive..."
                    value={newActivity.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                  />

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddActivity}>
                      Aggiungi Activity
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAddActivity(false)}>
                      Annulla
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista activities */}
            {isLoadingActivities ? (
              <div className="text-center py-8 text-gray-500">
                Caricamento activities...
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <div key={activity._id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {formatDateTime(activity.createdAt)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                          </div>
                          <h5 className="text-sm text-gray-700 mb-1">{activity.title}</h5>
                          
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          
                          {activity.data?.messageText && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              &ldquo;{activity.data.messageText}&rdquo;
                            </div>
                          )}
                          
                          {activity.data?.callOutcome && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Esito: {activity.data.callOutcome}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              di {activity.createdBy.firstName} {activity.createdBy.lastName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Nessuna activity presente</p>
                <p className="text-sm">Aggiungi la prima interazione con questo contatto</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 