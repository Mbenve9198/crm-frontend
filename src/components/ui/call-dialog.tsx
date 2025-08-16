"use client";

import React, { useState, useEffect } from "react";
import { Phone, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Call, CallOutcome, InitiateCallRequest } from "@/types/call";
import { Contact } from "@/types/contact";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

type CallState = 'idle' | 'initiating' | 'calling-you' | 'connecting-contact' | 'in-conversation' | 'finished' | 'error';

const outcomeLabels: Record<CallOutcome, string> = {
  'interested': 'Interessato',
  'not-interested': 'Non interessato',
  'callback': 'Da richiamare',
  'voicemail': 'Segreteria',
  'wrong-number': 'Numero sbagliato',
  'meeting-set': 'Appuntamento fissato',
  'sale-made': 'Vendita conclusa',
  'no-answer': 'Nessuna risposta',
};

interface CallDialogProps {
  contact: Contact;
  trigger: React.ReactNode;
  onCallComplete?: (call: Call) => void;
  // Props opzionali per controllo esterno
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CallDialog({ contact, trigger, onCallComplete, open, onOpenChange }: CallDialogProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Usa il controllo esterno se fornito, altrimenti quello interno
  const isOpen = open !== undefined ? open : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  const [callState, setCallState] = useState<CallState>('idle');
  const [callResult, setCallResult] = useState<Call | null>(null);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [waitingStartTime, setWaitingStartTime] = useState<number | null>(null);

  // Timer per gestire il progresso della chiamata
  useEffect(() => {
    if (callState === 'calling-you' && waitingStartTime) {
      const timeout1 = setTimeout(() => {
        setCallState('connecting-contact');
      }, 10000);
      return () => clearTimeout(timeout1);
    }
    
    if (callState === 'connecting-contact') {
      const timeout2 = setTimeout(() => {
        setCallState('in-conversation');
      }, 15000);
      return () => clearTimeout(timeout2);
    }
  }, [callState, waitingStartTime]);

  const handleInitiateCall = async () => {
    if (!contact.phone) {
      setErrorMessage('Il contatto non ha un numero di telefono');
      setCallState('error');
      return;
    }

    setCallState('initiating');
    setErrorMessage('');
    setCallResult(null);
    
    try {
      const request: InitiateCallRequest = {
        contactId: contact._id,
        recordCall: true,
      };

      const response = await apiClient.initiateCall(request);
      
      if (response.success && response.data) {
        setCallResult(response.data.call);
        setCallState('calling-you');
        setWaitingStartTime(Date.now());
        toast.success('Chiamata avviata! Ti stiamo chiamando...');
      } else {
        setErrorMessage(response.message || 'Errore nell\'avviare la chiamata');
        setCallState('error');

        if (response.message?.includes('Configurazione Twilio')) {
          toast.error('Twilio non configurato. Vai nelle Impostazioni per configurarlo.', {
            action: {
              label: 'Impostazioni',
              onClick: () => window.open('/settings', '_blank')
            }
          });
        }
      }
    } catch (error) {
      console.error('Errore nell\'iniziare la chiamata:', error);
      setErrorMessage('Errore di connessione al server');
      setCallState('error');
    }
  };

  const handleCallCompleted = () => {
    setCallState('finished');
  };

  const handleSaveResult = async () => {
    if (!outcome) {
      toast.error('Seleziona un esito per la chiamata');
      return;
    }

    if (!callResult) {
      toast.error('Nessuna chiamata da salvare');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.updateCall(callResult._id, {
        notes,
        outcome: outcome as CallOutcome,
      });

      toast.success('Esito chiamata salvato con successo');
      
      if (onCallComplete && callResult) {
        onCallComplete(callResult);
      }
      
      handleClose();
    } catch (error) {
      console.error('Errore nel salvare l\'esito:', error);
      toast.error('Errore nel salvare l\'esito della chiamata');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCallState('idle');
    setCallResult(null);
    setNotes('');
    setOutcome('');
    setErrorMessage('');
    setWaitingStartTime(null);
  };

  const renderContent = () => {
    switch (callState) {
      case 'idle':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <strong>Come funziona:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Ti chiameremo sul tuo telefono</li>
                <li>Quando rispondi, ti collegheremo al contatto</li>
                <li>Potrai parlare direttamente con {contact.name}</li>
                <li>Quando hai finito, inserisci l&apos;esito qui</li>
              </ol>
            </div>

            <Button 
              onClick={handleInitiateCall}
              disabled={!contact.phone}
              className="w-full"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Inizia chiamata
            </Button>

            {!contact.phone && (
              <p className="text-sm text-red-600 text-center">
                Il contatto non ha un numero di telefono configurato
              </p>
            )}
          </div>
        );

      case 'initiating':
        return (
          <div className="space-y-4 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-600">Avvio chiamata in corso...</p>
          </div>
        );

      case 'calling-you':
        return (
          <div className="space-y-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="animate-pulse w-8 h-8 bg-blue-600 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-blue-800 font-medium">
                Ti stiamo chiamando...
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Rispondi al telefono per iniziare la chiamata
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCallState('connecting-contact')}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ho risposto
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  setErrorMessage('Chiamata annullata dall\'utente');
                  setCallState('error');
                }}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annulla
              </Button>
            </div>
          </div>
        );

      case 'connecting-contact':
        return (
          <div className="space-y-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="animate-spin w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-yellow-800 font-medium">
                Collegamento al contatto...
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Stiamo chiamando {contact.name}
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCallState('in-conversation')}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Il contatto ha risposto
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCallState('finished')}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Non ha risposto
              </Button>
            </div>
          </div>
        );

      case 'in-conversation':
        return (
          <div className="space-y-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-green-600 rounded-full mx-auto mb-2">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-green-800 font-medium">
                Chiamata in corso con {contact.name}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Stai parlando con il contatto. Quando hai finito, clicca qui sotto.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleCallCompleted}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ho finito di parlare
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  setErrorMessage('Chiamata interrotta');
                  setCallState('finished');
                }}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Riattacca
              </Button>
            </div>
          </div>
        );

      case 'finished':
        return (
          <div className="space-y-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-800 font-medium">
                Chiamata completata!
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
                onClick={handleSaveResult}
                disabled={!outcome || isSaving}
                className="flex-1"
              >
                {isSaving ? 'Salvando...' : 'Salva Esito'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Chiudi
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-red-800 font-medium">Errore</p>
              <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
            </div>

            <Button
              onClick={() => setCallState('idle')}
              className="w-full"
            >
              Riprova
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Trigger solo se non controllato dall'esterno */}
      {open === undefined && (
        <div onClick={() => setIsOpen(true)}>
          {trigger}
        </div>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Chiama {contact.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {renderContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 