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
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserCheck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { User } from "@/types/contact";

interface OwnerChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Set<string>;
  contactsCount: number;
  onComplete: () => void;
}

export function OwnerChangeDialog({
  open,
  onOpenChange,
  selectedContacts,
  contactsCount,
  onComplete
}: OwnerChangeDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica gli utenti quando il dialog si apre
  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);
      
      const response = await apiClient.getUsersForAssignment();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.message || 'Errore nel caricamento degli utenti');
      }
    } catch (error) {
      console.error('❌ Errore caricamento utenti:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleChangeOwner = async () => {
    if (!selectedOwnerId) {
      setError("Seleziona un nuovo proprietario");
      return;
    }

    if (selectedContacts.size === 0) {
      setError("Nessun contatto selezionato");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      const contactIds = Array.from(selectedContacts);
      console.log(`👤 Cambiando owner di ${contactIds.length} contatti a utente ${selectedOwnerId}`);
      
      // Per ora implemento la chiamata API per cambio owner bulk
      // Nota: Questa API potrebbe non esistere ancora nel backend
      const response = await apiClient.changeContactsOwnerBulk(contactIds, selectedOwnerId);
      
      if (response.success && response.data) {
        const { updatedCount, skippedCount, newOwner } = response.data;
        
        let message = `✅ Operazione completata!`;
        if (updatedCount > 0) {
          message += `\n• ${updatedCount} contatti assegnati a ${newOwner.firstName} ${newOwner.lastName}`;
        }
        if (skippedCount > 0) {
          message += `\n• ${skippedCount} contatti saltati (permessi insufficienti)`;
        }
        
        alert(message);
        
        // Chiudi il dialog e notifica il completamento
        onOpenChange(false);
        onComplete();
      } else {
        throw new Error(response.message || 'Errore durante il cambio proprietario');
      }
    } catch (error) {
      console.error('❌ Errore cambio owner:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset del form
    setSelectedOwnerId("");
    setError(null);
  };

  const selectedUser = users.find(user => user._id === selectedOwnerId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Cambia Proprietario
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
              Verrà cambiato il proprietario per tutti i contatti selezionati
            </p>
          </div>

          {/* Selezione nuovo proprietario */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Seleziona Nuovo Proprietario
            </label>
            
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Caricamento utenti...</span>
              </div>
            ) : users.length > 0 ? (
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Scegli un utente..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="secondary" className="text-xs">
                            {user.role}
                          </Badge>
                          {user.currentContactsCount !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {user.currentContactsCount} contatti
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Nessun utente disponibile</p>
              </div>
            )}
          </div>

          {/* Anteprima selezione */}
          {selectedUser && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium">Nuovo proprietario selezionato:</span>
              </div>
              <div className="mt-1 text-sm text-green-700">
                <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                <p className="text-xs">{selectedUser.email} • {selectedUser.role}</p>
              </div>
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
              onClick={handleChangeOwner}
              disabled={isProcessing || !selectedOwnerId}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Elaborando...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Cambia Proprietario
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 