'use client';

import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, Clock, User, Volume2, VolumeX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { toast } from 'sonner';
import { Contact } from '@/types/contact';
import { Call, CallStatus, CallOutcome, InitiateCallRequest, UpdateCallRequest } from '@/types/call';
import { apiClient } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface CallDialogProps {
  contact: Contact;
  trigger?: React.ReactNode;
  onCallComplete?: (call: Call) => void;
}

const statusColors: Record<CallStatus, string> = {
  'queued': 'bg-yellow-100 text-yellow-800',
  'ringing': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-green-100 text-green-800',
  'completed': 'bg-gray-100 text-gray-800',
  'busy': 'bg-red-100 text-red-800',
  'no-answer': 'bg-orange-100 text-orange-800',
  'failed': 'bg-red-100 text-red-800',
  'canceled': 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<CallStatus, string> = {
  'queued': 'In coda',
  'ringing': 'Squilla',
  'in-progress': 'In corso',
  'completed': 'Completata',
  'busy': 'Occupato',
  'no-answer': 'Nessuna risposta',
  'failed': 'Fallita',
  'canceled': 'Annullata',
};

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
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [recordCall, setRecordCall] = useState(true);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Carica chiamate recenti quando si apre il dialog
  useEffect(() => {
    if (isOpen) {
      loadRecentCalls();
    }
  }, [isOpen, contact._id]);

  // Polling per aggiornare lo stato della chiamata corrente
  useEffect(() => {
    if (!currentCall || ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(currentCall.status)) {
      return;
    }

    let pollCount = 0;
    const maxPolls = 20; // Massimo 60 secondi di polling (20 * 3 secondi)

    const pollInterval = setInterval(async () => {
      pollCount++;
      
      // Se abbiamo superato il limite, ferma il polling e considera la chiamata fallita
      if (pollCount >= maxPolls) {
        console.warn('Timeout polling chiamata, considerata fallita');
        setCurrentCall(prev => prev ? { ...prev, status: 'failed' as CallStatus } : null);
        clearInterval(pollInterval);
        return;
      }

      try {
        const response = await apiClient.getMyCalls({ limit: 1 });
        // Backend ritorna { success: true, data: [calls], pagination: {...} }
        // Quindi response.data è direttamente l'array di chiamate
        if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const latestCall = response.data[0];
          if (latestCall.twilioCallSid === currentCall.twilioCallSid) {
            setCurrentCall(latestCall);
            
            // Se la chiamata è terminata, aggiorna la lista
            if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(latestCall.status)) {
              loadRecentCalls();
              if (onCallComplete) {
                onCallComplete(latestCall);
              }
            }
          }
        }
      } catch (error) {
        console.error('Errore nel polling stato chiamata:', error);
      }
    }, 3000); // Controlla ogni 3 secondi

    return () => clearInterval(pollInterval);
  }, [currentCall]);

  const loadRecentCalls = async () => {
    try {
      const response = await apiClient.getCallsByContact(contact._id, { limit: 5 });
      // Backend ritorna { success: true, data: [calls], count: number }
      // Quindi response.data è direttamente l'array di chiamate
      if (response.success && response.data && Array.isArray(response.data)) {
        setRecentCalls(response.data);
      }
    } catch (error) {
      console.error('Errore nel caricare le chiamate:', error);
    }
  };

  const handleInitiateCall = async () => {
    if (!contact.phone) {
      toast.error('Il contatto non ha un numero di telefono');
      return;
    }

    setIsInitiating(true);
    try {
      const request: InitiateCallRequest = {
        contactId: contact._id,
        recordCall,
      };

      const response = await apiClient.initiateCall(request);
      if (response.success && response.data) {
        setCurrentCall(response.data.call);
        toast.success('Chiamata iniziata con successo!');
      } else {
        if (response.message?.includes('Configurazione Twilio')) {
          toast.error('Twilio non configurato. Vai nelle Impostazioni per configurarlo.', {
            action: {
              label: 'Impostazioni',
              onClick: () => window.open('/settings', '_blank')
            }
          });
        } else if (response.message?.includes('chiamata in corso')) {
          // Gestisce l'errore di chiamata già in corso
          toast.error(response.message, {
            action: {
              label: 'Mostra chiamata attiva',
              onClick: () => {
                // Carica la chiamata attiva
                if ((response as any).activeCall) {
                  loadRecentCalls();
                }
              }
            }
          });
        } else {
          toast.error(response.message || 'Errore nell\'iniziare la chiamata');
        }
      }
    } catch (error) {
      console.error('Errore nell\'iniziare la chiamata:', error);
      
      // Se è un errore 409 (conflitto), significa chiamata già in corso
      if ((error as any)?.message?.includes('409')) {
        toast.error('Hai già una chiamata in corso. Termina quella prima di iniziarne una nuova.');
      } else {
        toast.error('Errore nell\'iniziare la chiamata');
      }
    } finally {
      setIsInitiating(false);
    }
  };

  const handleUpdateCall = async () => {
    if (!currentCall) return;

    setIsUpdating(true);
    try {
      const request: UpdateCallRequest = {};
      if (notes.trim()) request.notes = notes.trim();
      if (outcome) request.outcome = outcome as CallOutcome;

      const response = await apiClient.updateCall(currentCall._id, request);
      if (response.success && response.data) {
        setCurrentCall(response.data);
        toast.success('Chiamata aggiornata con successo');
        setNotes('');
        setOutcome('');
        loadRecentCalls();
      } else {
        toast.error(response.message || 'Errore nell\'aggiornare la chiamata');
      }
    } catch (error) {
      console.error('Errore nell\'aggiornare la chiamata:', error);
      toast.error('Errore nell\'aggiornare la chiamata');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const canUpdate = currentCall && ['completed', 'busy', 'no-answer', 'failed'].includes(currentCall.status);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

          {/* Chiamata corrente */}
          {currentCall ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Stato chiamata:</span>
                <Badge className={statusColors[currentCall.status]}>
                  {statusLabels[currentCall.status]}
                </Badge>
              </div>

              {currentCall.duration > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Durata:</span>
                  <span className="text-sm font-mono">{formatDuration(currentCall.duration)}</span>
                </div>
              )}

              {currentCall.recordingUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Registrazione:</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(currentCall.recordingUrl, '_blank')}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Ascolta
                  </Button>
                </div>
              )}

              {/* Pulsante per annullare chiamata in corso */}
              {['queued', 'ringing'].includes(currentCall.status) && (
                <div className="pt-3 border-t">
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await apiClient.cancelCall(currentCall._id);
                        if (response.success) {
                          setCurrentCall(prev => prev ? { ...prev, status: 'canceled' as CallStatus } : null);
                          toast.success('Chiamata annullata con successo');
                          loadRecentCalls();
                        } else {
                          toast.error('Errore nell\'annullare la chiamata');
                        }
                      } catch (error) {
                        console.error('Errore nell\'annullare la chiamata:', error);
                        // Fallback: aggiorna solo localmente
                        setCurrentCall(prev => prev ? { ...prev, status: 'canceled' as CallStatus } : null);
                        toast.info('Chiamata annullata localmente');
                      }
                    }}
                    className="w-full"
                  >
                    Annulla chiamata
                  </Button>
                </div>
              )}

              {/* Form per aggiornare la chiamata */}
              {canUpdate && (
                <div className="space-y-3 pt-3 border-t">
                  <div>
                    <label className="text-sm font-medium">Outcome</label>
                    <Select value={outcome} onValueChange={(value) => setOutcome(value as CallOutcome | '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona outcome..." />
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
                    <label className="text-sm font-medium">Note</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Aggiungi note sulla chiamata..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleUpdateCall}
                    disabled={isUpdating}
                    className="w-full"
                  >
                    {isUpdating ? 'Aggiornamento...' : 'Salva aggiornamenti'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Form per iniziare una nuova chiamata */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Registra chiamata:</span>
                <Button
                  variant={recordCall ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecordCall(!recordCall)}
                >
                  {recordCall ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>

              <Button 
                onClick={handleInitiateCall}
                disabled={isInitiating || !contact.phone}
                className="w-full"
                size="lg"
              >
                {isInitiating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Iniziando chiamata...
                  </>
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
          )}

          {/* Chiamate recenti */}
          {recentCalls.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Chiamate recenti</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {recentCalls.map((call) => (
                  <div key={call._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[call.status]}>
                        {statusLabels[call.status]}
                      </Badge>
                      {call.duration > 0 && (
                        <span className="text-xs text-gray-600">
                          {formatDuration(call.duration)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(call.createdAt), { 
                        addSuffix: true, 
                        locale: it 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 