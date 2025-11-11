'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { WhatsappCampaign, WhatsappSession, SESSION_STATUSES } from '@/types/whatsapp';

interface ChangeSessionDialogProps {
  campaign: WhatsappCampaign;
  sessions: WhatsappSession[];
  onSessionChanged?: (updatedCampaign: WhatsappCampaign) => void;
}

export function ChangeSessionDialog({ 
  campaign, 
  sessions, 
  onSessionChanged 
}: ChangeSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset quando si apre il dialog
  useEffect(() => {
    if (open) {
      setSelectedSessionId('');
      setError(null);
    }
  }, [open]);

  // Filtra solo sessioni attive e diverse da quella corrente
  const availableSessions = sessions.filter(
    s => s.status === 'connected' && s.sessionId !== campaign.whatsappSessionId
  );

  const handleChangeSession = async () => {
    if (!selectedSessionId) {
      setError('Seleziona una sessione');
      return;
    }

    setIsChanging(true);
    setError(null);

    try {
      const response = await apiClient.changeWhatsAppCampaignSession(
        campaign._id,
        selectedSessionId
      );

      if (response.success && response.data) {
        // Accesso corretto alla struttura: response.data contiene { data, changes }
        const { changes, data: campaignData } = response.data;
        
        toast.success('✅ Sessione cambiata con successo!', {
          description: `Da: ${changes.oldNumber}\nA: ${changes.newNumber}\nPending: ${changes.pendingMessages} messaggi`
        });

        // Chiama il callback con la campagna aggiornata
        if (onSessionChanged && campaignData) {
          onSessionChanged(campaignData);
        }

        setOpen(false);
      } else {
        throw new Error(response.message || 'Errore durante il cambio sessione');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      toast.error('❌ Errore cambio sessione', {
        description: errorMessage
      });
    } finally {
      setIsChanging(false);
    }
  };

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          title="Cambia numero WhatsApp"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Cambia Sessione
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Cambia Numero WhatsApp
          </DialogTitle>
          <DialogDescription>
            Cambia il numero WhatsApp usato per inviare i messaggi di questa campagna.
            I messaggi già inviati restano invariati.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Sessione corrente */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Sessione Attuale</span>
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {campaign.status === 'running' ? 'In Corso' : 'Attiva'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{campaign.whatsappNumber}</p>
              <p className="text-xs text-gray-500">ID: {campaign.whatsappSessionId}</p>
            </div>
          </div>

          {/* Selettore nuova sessione */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Nuova Sessione
            </label>
            
            {availableSessions.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Nessuna sessione disponibile</p>
                  <p className="text-xs mt-1">
                    Tutte le altre sessioni sono disconnesse o già in uso.
                    Connetti una nuova sessione per poter cambiare.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Seleziona nuova sessione --" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.map(session => (
                      <SelectItem key={session.sessionId} value={session.sessionId}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.phoneNumber}</span>
                          <span className="text-xs text-gray-500">({session.name})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Dettagli sessione selezionata */}
                {selectedSession && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">{selectedSession.name}</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Numero: {selectedSession.phoneNumber}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Status: {SESSION_STATUSES.find(s => s.value === selectedSession.status)?.label}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info importante */}
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">ℹ️ Cosa succede:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>I messaggi già inviati restano invariati</li>
                  <li>I messaggi pending useranno la nuova sessione</li>
                  <li>I follow-up programmati useranno la nuova sessione</li>
                  <li>La campagna continua senza interruzioni</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Errore */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Errore</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Azioni */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isChanging}
            >
              Annulla
            </Button>
            <Button
              onClick={handleChangeSession}
              disabled={!selectedSessionId || isChanging || availableSessions.length === 0}
              className="gap-2"
            >
              {isChanging ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cambio in corso...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Cambia Sessione
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

