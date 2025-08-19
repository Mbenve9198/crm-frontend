"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Tag } from "lucide-react";
import { apiClient } from "@/lib/api";

interface ListManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Set<string>;
  onComplete: () => void;
}

type ContactList = {
  name: string;
  count: number;
};

export function ListManagementDialog({
  open,
  onOpenChange,
  selectedContacts,
  onComplete
}: ListManagementDialogProps) {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [selectedList, setSelectedList] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');

  // Carica le liste esistenti quando il dialog si apre
  useEffect(() => {
    if (open) {
      loadLists();
    }
  }, [open]);

  // Quando si cambia da "aggiungi" a "rimuovi", disabilita "nuova lista"
  useEffect(() => {
    if (actionType === 'remove' && isCreatingNew) {
      setIsCreatingNew(false);
    }
  }, [actionType]);

  const loadLists = async () => {
    try {
      setIsLoadingLists(true);
      setError(null);
      
      const response = await apiClient.getContactLists();
      
      if (response.success && response.data) {
        setLists(response.data);
      } else {
        throw new Error(response.message || 'Errore nel caricamento delle liste');
      }
    } catch (error) {
      console.error('❌ Errore caricamento liste:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleListAction = async () => {
    const listName = isCreatingNew ? newListName.trim() : selectedList;
    
    if (!listName) {
      setError("Seleziona una lista esistente o inserisci il nome per una nuova");
      return;
    }

    if (selectedContacts.size === 0) {
      setError("Nessun contatto selezionato");
      return;
    }

    // Per la rimozione, non permettere la creazione di nuove liste
    if (actionType === 'remove' && isCreatingNew) {
      setError("Non puoi rimuovere contatti da una lista che non esiste");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      const contactIds = Array.from(selectedContacts);
      
      let response;
      if (actionType === 'add') {
        console.log(`📋 Aggiungendo ${contactIds.length} contatti alla lista "${listName}"`);
        response = await apiClient.addContactsToListBulk(contactIds, listName);
      } else {
        console.log(`📋 Rimuovendo ${contactIds.length} contatti dalla lista "${listName}"`);
        response = await apiClient.removeContactsFromListBulk(contactIds, listName);
      }
      
      if (response.success && response.data) {
        let message = `✅ Operazione completata!`;
        
        if (actionType === 'add') {
          const data = response.data as { addedCount: number; alreadyInList: number; totalProcessed: number; totalRequested: number; };
          if (data.addedCount > 0) {
            message += `\n• ${data.addedCount} contatti aggiunti alla lista "${listName}"`;
          }
          if (data.alreadyInList > 0) {
            message += `\n• ${data.alreadyInList} contatti erano già nella lista`;
          }
        } else {
          const data = response.data as { removedCount: number; notInList: number; totalProcessed: number; totalRequested: number; };
          if (data.removedCount > 0) {
            message += `\n• ${data.removedCount} contatti rimossi dalla lista "${listName}"`;
          }
          if (data.notInList > 0) {
            message += `\n• ${data.notInList} contatti non erano nella lista`;
          }
        }
        
        alert(message);
        
        // Chiudi il dialog e notifica il completamento
        onOpenChange(false);
        onComplete();
      } else {
        throw new Error(response.message || `Errore durante ${actionType === 'add' ? 'l\'aggiunta alla' : 'la rimozione dalla'} lista`);
      }
    } catch (error) {
      console.error(`❌ Errore ${actionType === 'add' ? 'aggiunta alla' : 'rimozione dalla'} lista:`, error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset del form
    setSelectedList("");
    setNewListName("");
    setIsCreatingNew(false);
    setActionType('add');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-600" />
            Gestione Liste
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Info contatti selezionati */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <Users className="h-4 w-4" />
              <span className="font-medium">
                {selectedContacts.size} contatto{selectedContacts.size !== 1 ? 'i' : ''} selezionato{selectedContacts.size !== 1 ? 'i' : ''}
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Verranno {actionType === 'add' ? 'aggiunti alla' : 'rimossi dalla'} lista selezionata
            </p>
          </div>

          {/* Scelta azione */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Azione da eseguire</label>
            <div className="flex gap-2">
              <Button
                variant={actionType === 'add' ? "default" : "outline"}
                size="sm"
                onClick={() => setActionType('add')}
                className="flex-1"
              >
                ➕ Aggiungi alla lista
              </Button>
              <Button
                variant={actionType === 'remove' ? "default" : "outline"}
                size="sm"
                onClick={() => setActionType('remove')}
                className="flex-1"
              >
                ➖ Rimuovi dalla lista
              </Button>
            </div>
          </div>

          {/* Toggle modalità */}
          <div className="flex gap-2">
            <Button
              variant={!isCreatingNew ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCreatingNew(false)}
              className="flex-1"
            >
              Lista Esistente
            </Button>
            <Button
              variant={isCreatingNew ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCreatingNew(true)}
              disabled={actionType === 'remove'}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuova Lista
            </Button>
          </div>

          {/* Selezione lista esistente */}
          {!isCreatingNew && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Seleziona Lista Esistente
              </label>
              
              {isLoadingLists ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Caricamento liste...</span>
                </div>
              ) : lists.length > 0 ? (
                <Select value={selectedList} onValueChange={setSelectedList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli una lista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((list) => (
                      <SelectItem key={list.name} value={list.name}>
                        <div className="flex items-center justify-between w-full">
                          <span>{list.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {list.count}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Nessuna lista esistente</p>
                  <p className="text-xs">Crea la tua prima lista!</p>
                </div>
              )}
            </div>
          )}

          {/* Creazione nuova lista */}
          {isCreatingNew && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Nome Nuova Lista
              </label>
              <Input
                placeholder="Es. Clienti VIP, Newsletter, etc."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-gray-500">
                Massimo 50 caratteri. La lista verrà creata automaticamente.
              </p>
            </div>
          )}

          {/* Errore */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Pulsanti azione */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              onClick={handleListAction}
              disabled={isProcessing || (!selectedList && !newListName.trim())}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Elaborando...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-2" />
                  {actionType === 'add' ? 'Aggiungi alla Lista' : 'Rimuovi dalla Lista'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 