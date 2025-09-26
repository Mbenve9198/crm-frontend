"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api";
import { User } from "@/types/contact";
import { toast } from "sonner";

interface BulkChangeOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Set<string>;
  onComplete: () => void;
}

export function BulkChangeOwnerDialog({
  open,
  onOpenChange,
  selectedContacts,
  onComplete
}: BulkChangeOwnerDialogProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica gli utenti disponibili
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
      if (response.success && response.data?.users) {
        setAvailableUsers(response.data.users);
      } else {
        throw new Error('Errore nel caricamento degli utenti');
      }
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      setError('Errore nel caricamento degli utenti disponibili');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleChangeOwner = async () => {
    if (!selectedUserId) {
      setError("Seleziona un nuovo proprietario");
      return;
    }

    if (selectedContacts.size === 0) {
      setError("Nessun contatto selezionato");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const contactIds = Array.from(selectedContacts);
      const selectedUser = availableUsers.find(u => u._id === selectedUserId);
      
      console.log(`👤 Cambio owner per ${contactIds.length} contatti → ${selectedUser?.firstName} ${selectedUser?.lastName}`);
      
      const response = await apiClient.bulkChangeContactOwner(contactIds, selectedUserId);
      
      if (response.success && response.data) {
        const { updatedCount, requestedCount, newOwner } = response.data;
        
        let message = `✅ Proprietario cambiato per ${updatedCount} contatti`;
        if (updatedCount !== requestedCount) {
          message += `\n⚠️ ${requestedCount - updatedCount} contatti non sono stati modificati (permessi insufficienti)`;
        }
        message += `\n👤 Nuovo proprietario: ${newOwner.name}`;
        
        toast.success("Proprietario cambiato con successo!", {
          description: `${updatedCount} contatti assegnati a ${newOwner.name}`
        });
        
        // Chiudi il dialog e notifica il completamento
        handleClose();
        onComplete();
      } else {
        throw new Error(response.message || 'Errore durante il cambio proprietario');
      }
    } catch (error) {
      console.error('❌ Errore cambio owner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(`Errore: ${errorMessage}`);
      toast.error("Errore nel cambio proprietario", {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    setError(null);
    onOpenChange(false);
  };

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
              Verrà assegnato un nuovo proprietario
            </p>
          </div>

          {/* Selezione nuovo proprietario */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Nuovo Proprietario
            </label>
            
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 p-3 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Caricamento utenti...</span>
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="p-3 text-gray-500 text-sm">
                Nessun utente disponibile
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona nuovo proprietario..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({user.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Messaggio di errore */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button
            onClick={handleChangeOwner}
            disabled={isLoading || !selectedUserId || isLoadingUsers}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cambiando...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Cambia Proprietario
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 