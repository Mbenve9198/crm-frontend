"use client";

import React, { useState, useEffect } from "react";
import { X, Edit, Save, Cancel, Plus, Mail, Phone, MessageCircle, Instagram, Clock, User as UserIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Contact, User } from "@/types/contact";
import { Activity, ActivityType, CreateActivityRequest, CallOutcome } from "@/types/activity";
import { apiClient } from "@/lib/api";

interface ContactDetailSidebarProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onContactUpdate: (contact: Contact) => void;
}

export function ContactDetailSidebar({ contact, isOpen, onClose, onContactUpdate }: ContactDetailSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Stato per nuova activity
  const [newActivity, setNewActivity] = useState<CreateActivityRequest>({
    type: 'email',
    title: '',
    description: '',
    data: {}
  });

  // Carica activities quando cambia il contatto
  useEffect(() => {
    if (contact && isOpen) {
      loadActivities();
      setEditedContact({ ...contact });
    }
  }, [contact, isOpen]);

  const loadActivities = async () => {
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
  };

  const handleSaveContact = async () => {
    if (!editedContact) return;

    try {
      setIsSaving(true);
      const response = await apiClient.updateContact(editedContact._id, {
        name: editedContact.name,
        email: editedContact.email,
        phone: editedContact.phone,
        lists: editedContact.lists,
        properties: editedContact.properties
      });

      if (response.success) {
        onContactUpdate(response.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Errore aggiornamento contatto:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContact(contact ? { ...contact } : null);
    setIsEditing(false);
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
          title: '',
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
      instagram_dm: Instagram
    };
    return iconMap[type] || Mail;
  };

  const getActivityColor = (type: ActivityType) => {
    const colorMap = {
      email: 'bg-blue-100 text-blue-800',
      call: 'bg-green-100 text-green-800',
      whatsapp: 'bg-emerald-100 text-emerald-800',
      instagram_dm: 'bg-purple-100 text-purple-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Oggi';
    if (diffDays === 2) return 'Ieri';
    if (diffDays <= 7) return `${diffDays} giorni fa`;
    
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  };

  if (!isOpen || !contact) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Dettaglio Contatto</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{contact.name}</h3>
              <p className="text-sm text-gray-600">{contact.email}</p>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Sezione dati contatto */}
          <div className="p-6 border-b">
            <h4 className="font-semibold mb-4">Informazioni</h4>
            
            {isEditing && editedContact ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <Input
                    value={editedContact.name}
                    onChange={(e) => setEditedContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    value={editedContact.email || ''}
                    onChange={(e) => setEditedContact(prev => prev ? { ...prev, email: e.target.value } : null)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefono</label>
                  <Input
                    value={editedContact.phone || ''}
                    onChange={(e) => setEditedContact(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveContact} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <Cancel className="h-4 w-4 mr-2" />
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Email</span>
                  <p className="text-sm font-medium">{contact.email || 'Non specificata'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Telefono</span>
                  <p className="text-sm font-medium">{contact.phone || 'Non specificato'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Proprietario</span>
                  <p className="text-sm font-medium">
                    {contact.owner.firstName} {contact.owner.lastName}
                  </p>
                </div>
                {contact.lists.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Liste</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contact.lists.map((list, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {list}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sezione Activities */}
          <div className="p-6">
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

                  <Input
                    placeholder="Titolo activity..."
                    value={newActivity.title}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                  />

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
                      onChange={(e) => setNewActivity(prev => ({ 
                        ...prev, 
                        data: { ...prev.data, messageText: e.target.value }
                      }))}
                    />
                  )}

                  <Textarea
                    placeholder="Note aggiuntive..."
                    value={newActivity.description || ''}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
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
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">{activity.title}</h5>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(activity.createdAt)}
                            </span>
                          </div>
                          
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          )}
                          
                          {activity.data?.messageText && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              "{activity.data.messageText}"
                            </div>
                          )}
                          
                          {activity.data?.callOutcome && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Esito: {activity.data.callOutcome}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {activity.createdBy.firstName} {activity.createdBy.lastName}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
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
    </>
  );
} 