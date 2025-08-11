'use client';

import React, { useState } from 'react';
import { Phone, PhoneCall, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { toast } from 'sonner';
import { Contact } from '@/types/contact';
import { Call, CallOutcome, InitiateCallRequest } from '@/types/call';
import { apiClient } from '@/lib/api';

interface CallDialogProps {
  contact: Contact;
  trigger?: React.ReactNode;
  onCallComplete?: (call: Call) => void;
}

const outcomeLabels: Record<CallOutcome, string> = {
  'interested': 'Interessato',
  'not-interested': 'Non interessato',
  'callback': 'Da richiamare',
  'voicemail': 'Segreteria',
  'wrong-number': 'Numero sbagliato',
  'meeting-set': 'Appuntamento fissato',
  'sale-made': 'Vendita conclusa',
};

export function CallDialog({ contact, trigger, onCallComplete }: CallDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [callResult, setCallResult] = useState<Call | null>(null);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleInitiateCall = async () => {
    if (!contact.phone) {
      toast.error('Il contatto non ha un numero di telefono');
      return;
    }

    setIsInitiating(true);
    setCallResult(null);
    
    try {
      const request: InitiateCallRequest = {
        contactId: contact._id,
        recordCall: true,
      };

      const response = await apiClient.initiateCall(request);
      
      if (response.success && response.data) {
        toast.success('Chiamata avviata! Gestisci la conversazione dal tuo telefono.');
        setCallResult(response.data.call);
      } else {
        if (response.message?.includes('Configurazione Twilio')) {
          toast.error('Twilio non configurato. Vai nelle Impostazioni per configurarlo.', {
            action: {
              label: 'Impostazioni',
              onClick: () => window.open('/settings', '_blank')
            }
          });
        } else {
          toast.error(response.message || 'Errore nell\'iniziare la chiamata');
        }
      }
    } catch (error) {
      console.error('Errore nell\'iniziare la chiamata:', error);
      toast.error('Errore nell\'iniziare la chiamata');
    } finally {
      setIsInitiating(false);
    }
  };

  const handleSaveResult = async () => {
    if (!callResult || !outcome) {
      toast.error('Seleziona un esito per la chiamata');
      return;
    }

    setIsSaving(true);
    try {
      const updateRequest = {
        outcome: outcome as CallOutcome,
        ...(notes.trim() && { notes: notes.trim() })
      };

      const response = await apiClient.updateCall(callResult._id, updateRequest);
      
             if (response.success && response.data) {
         toast.success('Esito chiamata salvato');
         if (onCallComplete) {
           onCallComplete(response.data);
         }
        
        // Reset e chiudi
        setCallResult(null);
        setNotes('');
        setOutcome('');
        setIsOpen(false);
      } else {
        toast.error('Errore nel salvare l\'esito');
      }
    } catch (error) {
      console.error('Errore nel salvare l\'esito:', error);
      toast.error('Errore nel salvare l\'esito');
    } finally {
      setIsSaving(false);
    }
  };

  const resetDialog = () => {
    setCallResult(null);
    setNotes('');
    setOutcome('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Chiama
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Chiamata - {contact.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informazioni contatto */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-8 w-8 text-gray-500" />
            <div>
              <p className="font-medium">{contact.name}</p>
              <p className="text-sm text-gray-600">{contact.phone || 'Nessun numero'}</p>
            </div>
          </div>

          {!callResult ? (
            /* Form per iniziare la chiamata */
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-600">
                Clicca per avviare la chiamata. Riceverai una chiamata sul tuo telefono che ti collegherà al contatto.
              </div>

              <Button 
                onClick={handleInitiateCall}
                disabled={isInitiating || !contact.phone}
                className="w-full"
                size="lg"
              >
                {isInitiating ? (
                  'Avvio chiamata...'
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Inizia chiamata
                  </>
                )}
              </Button>

              {!contact.phone && (
                <p className="text-sm text-red-600 text-center">
                  Il contatto non ha un numero di telefono configurato
                </p>
              )}
            </div>
          ) : (
            /* Form per l'esito della chiamata */
            <div className="space-y-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  Chiamata avviata! 
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Inserisci l&apos;esito della conversazione qui sotto
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Esito chiamata *</label>
                <Select value={outcome} onValueChange={(value) => setOutcome(value as CallOutcome)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Come è andata la chiamata?" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(outcomeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Note (opzionale)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Aggiungi note sulla conversazione..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={resetDialog}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={handleSaveResult}
                  disabled={isSaving || !outcome}
                  className="flex-1"
                >
                  {isSaving ? 'Salvataggio...' : 'Salva esito'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 