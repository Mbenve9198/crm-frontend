"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Mail, Phone, MessageCircle, Instagram, Clock, ArrowRight, User as UserIcon, Edit, Trash2, Save, XCircle, Users } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Contact, ContactStatus, User, UpdateContactRequest } from "@/types/contact";
import { Activity, ActivityType, CreateActivityRequest, CallOutcome } from "@/types/activity";
import { apiClient } from "@/lib/api";
import { getAllStatuses, getStatusLabel, isPipelineStatus, getStatusColor } from "@/lib/status-utils";
import { CallDialog } from "./call-dialog";

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingMRR, setPendingMRR] = useState<number | undefined>();
  const [showMRRInput, setShowMRRInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{description?: string; callOutcome?: CallOutcome}>({});

  // Stato per gestire gli owner disponibili
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingOwner, setIsUpdatingOwner] = useState(false);

  // Stato per nuova activity
  const [newActivity, setNewActivity] = useState<CreateActivityRequest>({
    type: 'email',
    description: '',
    data: {}
  });

  // Funzioni per modificare ed eliminare attività
  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity._id);
    setEditingData({
      description: activity.description || '',
      callOutcome: activity.data?.callOutcome
    });
  };

  const handleSaveActivity = async (activityId: string) => {
    try {
      await apiClient.updateActivity(activityId, editingData);
      setEditingActivity(null);
      setEditingData({});
      await loadActivities(); // Ricarica le attività
    } catch (error) {
      console.error('Errore nel salvare l\'attività:', error);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) {
      return;
    }

    try {
      await apiClient.deleteActivity(activityId);
      await loadActivities(); // Ricarica le attività
    } catch (error) {
      console.error('Errore nell\'eliminare l\'attività:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setEditingData({});
  };

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
        setPendingStatus(null);
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

    // Se il nuovo status richiede MRR
    if (isPipelineStatus(newStatus)) {
      // Se non abbiamo MRR O se stiamo entrando in pipeline per la prima volta
      if (!contact.mrr || !isPipelineStatus(contact.status)) {
        setPendingStatus(newStatus); // Memorizza il nuovo status desiderato
        setShowMRRInput(true);
        setPendingMRR(contact.mrr || 0); // Usa l'MRR esistente o 0
        return;
      }
    }

    // Altrimenti procedi direttamente (ha già MRR o non serve)
    handleStatusChange(newStatus, contact.mrr || pendingMRR);
  };

  const onMRRConfirm = () => {
    if (!contact || pendingMRR === undefined) return;
    
    const newStatus = pendingStatus || contact.status; // Usa il nuovo status desiderato o quello attuale
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
    
    // Reset ore per confronto accurato dei giorni
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const time = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (activityDate.getTime() === today.getTime()) {
      return `Oggi alle ${time}`;
    } else if (activityDate.getTime() === yesterday.getTime()) {
      return `Ieri alle ${time}`;
    } else {
      // Calcola i giorni di differenza per date più vecchie
      const diffTime = today.getTime() - activityDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7 && diffDays > 1) {
        return `${diffDays} giorni fa alle ${time}`;
      }
      
      const dateStr = date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined
      });
      
      return `${dateStr} alle ${time}`;
    }
  };

  // Funzione per caricare gli utenti disponibili
  const loadAvailableUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const response = await apiClient.getUsersForAssignment();
      
      if (response.success && response.data) {
        setAvailableUsers(response.data.users);
      }
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Funzione per aggiornare l'owner del contatto
  const handleOwnerChange = async (newOwnerId: string) => {
    if (!contact || !editedContact || newOwnerId === contact.owner._id) return;

    try {
      setIsUpdatingOwner(true);
      const response = await apiClient.updateContact(contact._id, {
        owner: newOwnerId
      });

      if (response.success && response.data) {
        // Aggiorna il contatto nel componente padre
        onContactUpdate(response.data);
        // Aggiorna lo stato locale
        setEditedContact(response.data);
        console.log('✅ Owner aggiornato con successo');
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento owner:', error);
      // Ripristina lo stato precedente in caso di errore
      if (contact) {
        setEditedContact({ ...contact });
      }
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // Carica gli utenti quando il componente si monta
  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
    }
  }, [isOpen, loadAvailableUsers]);

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
            <div className="flex items-center gap-2">
              {contact.phone && (
                <CallDialog 
                  contact={contact}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Chiama
                    </Button>
                  }
                  onCallComplete={loadActivities}
                />
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Status Select */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex items-center gap-2">
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
                        setPendingStatus(null);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-green-600">
                      €{contact.mrr || 0}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setPendingMRR(contact.mrr || 0);
                        setShowMRRInput(true);
                      }}
                      title="Modifica MRR"
                    >
                      ✏️
                    </Button>
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
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      <Users className="inline h-4 w-4 mr-1" />
                      Proprietario
                    </label>
                    <Select 
                      value={editedContact.owner._id} 
                      onValueChange={handleOwnerChange}
                      disabled={isUpdatingOwner || isLoadingUsers}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona proprietario..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span>Caricamento...</span>
                            </div>
                          </SelectItem>
                        ) : (
                          availableUsers.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>{user.firstName} {user.lastName}</span>
                                <span className="text-xs text-gray-500">({user.role})</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {isUpdatingOwner && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                        Aggiornamento in corso...
                      </div>
                    )}
                  </div>

                  {/* Proprietà dinamiche */}
                  {contact.properties && Object.keys(contact.properties).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Proprietà Aggiuntive</h4>
                      <div className="space-y-3">
                        {Object.entries(contact.properties).map(([key]) => (
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
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {activity.type}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditActivity(activity)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteActivity(activity._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <h5 className="text-sm text-gray-700 mb-1">{activity.title}</h5>
                          
                          {editingActivity === activity._id ? (
                            <div className="space-y-3 mt-2">
                              <div>
                                <label className="text-xs text-gray-500">Descrizione:</label>
                                <Textarea
                                  value={editingData.description || ''}
                                  onChange={(e) => setEditingData({...editingData, description: e.target.value})}
                                  className="text-sm"
                                  rows={2}
                                />
                              </div>
                              
                              {activity.type === 'call' && (
                                <div>
                                  <label className="text-xs text-gray-500">Esito chiamata:</label>
                                  <Select 
                                    value={editingData.callOutcome || ''} 
                                    onValueChange={(value) => setEditingData({...editingData, callOutcome: value as CallOutcome})}
                                  >
                                    <SelectTrigger className="text-sm">
                                      <SelectValue placeholder="Seleziona esito" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="interested">Interessato</SelectItem>
                                      <SelectItem value="not-interested">Non interessato</SelectItem>
                                      <SelectItem value="callback">Da richiamare</SelectItem>
                                      <SelectItem value="voicemail">Segreteria</SelectItem>
                                      <SelectItem value="wrong-number">Numero sbagliato</SelectItem>
                                      <SelectItem value="meeting-set">Appuntamento fissato</SelectItem>
                                      <SelectItem value="sale-made">Vendita conclusa</SelectItem>
                                      <SelectItem value="no-answer">Nessuna risposta</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveActivity(activity._id)}
                                  className="flex-1"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Salva
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  className="flex-1"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Annulla
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
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
                              
                              {activity.data?.recordingSid && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray-500 mb-2">Registrazione chiamata:</p>
                                  <audio 
                                    controls 
                                    className="w-full h-8" 
                                    preload="metadata"
                                    style={{ maxWidth: '100%' }}
                                  >
                                    <source src={`https://crm-backend-8gwn.onrender.com/api/calls/recording/${activity.data.recordingSid}`} type="audio/wav" />
                                    Il tuo browser non supporta l&apos;elemento audio.
                                  </audio>
                                  {activity.data?.recordingDuration && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Durata: {Math.floor(activity.data.recordingDuration / 60)}:{(activity.data.recordingDuration % 60).toString().padStart(2, '0')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
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