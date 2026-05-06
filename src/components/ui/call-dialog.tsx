"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Phone, AlertCircle, CheckCircle, XCircle, GripHorizontal } from "lucide-react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Call, CallOutcome, InitiateCallRequest } from "@/types/call";
import { Contact } from "@/types/contact";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

type CallState = 'idle' | 'initiating' | 'calling-you' | 'connecting-contact' | 'in-conversation' | 'finished' | 'error';

const outcomeLabels: Record<Exclude<CallOutcome, 'not-logged'>, string> = {
  // Nuovi esiti
  'first-call': 'Prima chiamata',
  'follow-up': 'Follow-up',
  'callback': 'Da richiamare',
  'voicemail': 'Segreteria',
  'no-answer': 'Nessuna risposta',
  'free-trial-sold': 'Free trial venduto',
  'deal-closed': 'Chiusura deal',
  // Legacy (solo display per chiamate vecchie)
  'interested': 'Interessato',
  'not-interested': 'Non interessato',
  'wrong-number': 'Numero sbagliato',
  'meeting-set': 'Appuntamento fissato',
  'sale-made': 'Vendita conclusa',
};

const newOutcomes: Exclude<CallOutcome, 'not-logged'>[] = [
  'first-call', 'follow-up', 'callback', 'voicemail', 'no-answer', 'free-trial-sold', 'deal-closed',
];

export interface CallDialogHandle {
  close: () => Promise<void>;
}

interface CallDialogProps {
  contact: Contact;
  trigger: React.ReactNode;
  onCallComplete?: (call: Call) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CallDialog = forwardRef<CallDialogHandle, CallDialogProps>(function CallDialog({ contact, trigger, onCallComplete, open, onOpenChange }, ref) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const [callState, setCallState] = useState<CallState>('idle');
  const [callResult, setCallResult] = useState<Call | null>(null);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [waitingStartTime, setWaitingStartTime] = useState<number | null>(null);

  // Posizione finestra flottante
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Posizione iniziale: centro dello schermo
  useEffect(() => {
    if (isOpen && !initialized) {
      setPosition({
        x: (window.innerWidth - 360) / 2,
        y: (window.innerHeight - 480) / 2,
      });
      setInitialized(true);
    }
    if (!isOpen) setInitialized(false);
  }, [isOpen, initialized]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 360, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Timer progressione chiamata
  useEffect(() => {
    if (callState === 'calling-you' && waitingStartTime) {
      const t = setTimeout(() => setCallState('connecting-contact'), 10000);
      return () => clearTimeout(t);
    }
    if (callState === 'connecting-contact') {
      const t = setTimeout(() => setCallState('in-conversation'), 15000);
      return () => clearTimeout(t);
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
      const request: InitiateCallRequest = { contactId: contact._id, recordCall: true };
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
          toast.error('Twilio non configurato. Contatta l\'amministratore.');
        }
      }
    } catch {
      setErrorMessage('Errore di connessione al server');
      setCallState('error');
    }
  };

  const handleSaveResult = async (outcomeOverride?: CallOutcome) => {
    const finalOutcome = outcomeOverride ?? (outcome as CallOutcome);
    if (!finalOutcome) {
      toast.error('Seleziona un esito per la chiamata');
      return;
    }
    if (!callResult) return;

    setIsSaving(true);
    try {
      await apiClient.updateCall(callResult._id, {
        notes: outcomeOverride ? undefined : notes,
        outcome: finalOutcome,
      });
      if (finalOutcome !== 'not-logged') {
        toast.success('Esito chiamata salvato con successo');
      }
      if (onCallComplete && callResult) onCallComplete(callResult);
    } catch {
      toast.error('Errore nel salvare l\'esito della chiamata');
    } finally {
      setIsSaving(false);
    }
  };

  // Salva la chiamata come not-logged se l'utente naviga via dalla pagina durante una chiamata attiva.
  // Usa fetch con keepalive:true perché è l'unico modo per completare una richiesta HTTP
  // durante l'evento beforeunload (navigator.sendBeacon non supporta header custom per il Bearer token).
  useEffect(() => {
    const handleBeforeUnload = () => {
      const callActive = callResult && callState !== 'idle' && callState !== 'error' && callState !== 'finished' && outcome === '';
      if (!callActive) return;

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
      fetch(`${baseUrl}/api/calls/${callResult._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ outcome: 'not-logged' }),
        keepalive: true,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [callState, callResult, outcome]);

  // Chiusura: se la chiamata era in corso salva come not-logged
  const handleClose = async () => {
    const callWasInitiated = callResult && callState !== 'idle' && callState !== 'error';
    const outcomeAlreadySaved = callState === 'idle';

    if (callWasInitiated && !outcomeAlreadySaved && outcome === '') {
      await handleSaveResult('not-logged');
    }

    setIsOpen(false);
    setCallState('idle');
    setCallResult(null);
    setNotes('');
    setOutcome('');
    setErrorMessage('');
    setWaitingStartTime(null);
  };

  useImperativeHandle(ref, () => ({ close: handleClose }));

  const handleSaveAndClose = async () => {
    await handleSaveResult();
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
            <Button onClick={handleInitiateCall} disabled={!contact.phone} className="w-full" size="lg">
              <Phone className="h-4 w-4 mr-2" />
              Inizia chiamata
            </Button>
            {!contact.phone && (
              <p className="text-sm text-red-600 text-center">Il contatto non ha un numero di telefono configurato</p>
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
              <p className="text-sm text-blue-800 font-medium">Ti stiamo chiamando...</p>
              <p className="text-xs text-blue-600 mt-1">Rispondi al telefono per iniziare la chiamata</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCallState('connecting-contact')} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Ho risposto
              </Button>
              <Button variant="destructive" onClick={() => { setErrorMessage('Chiamata annullata dall\'utente'); setCallState('error'); }} className="flex-1">
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
              <p className="text-sm text-yellow-800 font-medium">Collegamento al contatto...</p>
              <p className="text-xs text-yellow-600 mt-1">Stiamo chiamando {contact.name}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCallState('in-conversation')} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Il contatto ha risposto
              </Button>
              <Button variant="outline" onClick={() => setCallState('finished')} className="flex-1">
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
              <p className="text-sm text-green-800 font-medium">Chiamata in corso con {contact.name}</p>
              <p className="text-xs text-green-600 mt-1">Quando hai finito, clicca qui sotto.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCallState('finished')} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Ho finito di parlare
              </Button>
              <Button variant="destructive" onClick={() => setCallState('finished')} className="flex-1">
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
              <p className="text-sm text-green-800 font-medium">Chiamata completata!</p>
              <p className="text-xs text-green-600 mt-1">Inserisci l&apos;esito della conversazione</p>
            </div>
            <div>
              <label className="text-sm font-medium">Esito chiamata *</label>
              <Select value={outcome} onValueChange={(value) => setOutcome(value as CallOutcome)}>
                <SelectTrigger>
                  <SelectValue placeholder="Come è andata la chiamata?" />
                </SelectTrigger>
                <SelectContent>
                  {newOutcomes.map((value) => (
                    <SelectItem key={value} value={value}>{outcomeLabels[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Note (opzionale)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aggiungi note sulla conversazione..." rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveAndClose} disabled={!outcome || isSaving} className="w-full">
                {isSaving ? 'Salvando...' : 'Salva Esito'}
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
            <Button onClick={() => setCallState('idle')} className="w-full">Riprova</Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {open === undefined && (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      )}

      {isOpen && initialized && (
        <div
          ref={windowRef}
          style={{ left: position.x, top: position.y }}
          className="fixed z-50 w-[360px] bg-white rounded-xl shadow-2xl border border-gray-200 select-none"
        >
          {/* Barra del titolo — drag handle */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-xl border-b border-gray-200 cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
          >
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-800">Chiama {contact.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-4 w-4 text-gray-400" />
              {callState !== 'finished' && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Contenuto */}
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
});
