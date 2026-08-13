"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { Call, CallOutcome, InitiateCallRequest } from "@/types/call";
import { ContactStatus } from "@/types/contact";
import { ColdCallDiscoveryQuestion, DialerContact } from "@/types/dialer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DiscoveryNotes,
  formatDialerNotes,
} from "@/components/dialer/script-panel";
import { DialerCallbackPicker } from "@/components/dialer/callback-picker";
import { wrapUpDialer } from "@/lib/dialer-api";
import { buildCallbackIso, nextCallbackDateTime } from "@/lib/callback-schedule";
import { toast } from "sonner";
import {
  CheckCircle,
  Loader2,
  Phone,
  SkipForward,
  XCircle,
} from "lucide-react";

type CallState =
  | "idle"
  | "initiating"
  | "calling-you"
  | "connecting-contact"
  | "in-conversation"
  | "wrap"
  | "error";

type CallbackPolicy = "required" | "optional" | "clear";

const DIALER_OUTCOMES: {
  value: CallOutcome;
  label: string;
  statusHint?: ContactStatus;
  callback: CallbackPolicy;
}[] = [
  { value: "free-trial-sold", label: "Trial accettato", statusHint: "free trial iniziato", callback: "clear" },
  { value: "callback", label: "Da richiamare", statusHint: "da richiamare", callback: "required" },
  { value: "first-call", label: "Prima call / contattato", statusHint: "contattato", callback: "clear" },
  { value: "no-answer", label: "Nessuna risposta", statusHint: "da richiamare", callback: "optional" },
  { value: "voicemail", label: "Segreteria", statusHint: "da richiamare", callback: "optional" },
  { value: "not-interested", label: "Non interessato", statusHint: "lost before free trial", callback: "clear" },
  { value: "follow-up", label: "Follow-up fissato", statusHint: "da richiamare", callback: "required" },
];

function wrapUpMrrForStatus(status: ContactStatus): number | undefined {
  switch (status) {
    case "interessato":
    case "qr code inviato":
    case "free trial iniziato":
    case "won":
    case "lost before free trial":
    case "lost after free trial":
      return 0;
    case "da contattare":
    case "contattato":
    case "da richiamare":
    case "ghosted/bad timing":
    case "bad_data":
    case "non_qualificato":
    case "do_not_contact":
      return undefined;
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

interface DialerCallDockProps {
  contact: DialerContact;
  disabled?: boolean;
  /** Sessione power attiva: avvia in automatico la chiamata su ogni contatto. */
  autoDial?: boolean;
  /** Incrementa a ogni Start sessione per ri-armare l’auto-dial sul contatto corrente. */
  autoDialNonce?: number;
  discovery?: ColdCallDiscoveryQuestion[];
  discoveryNotes: DiscoveryNotes;
  notes: string;
  onNotesChange: (value: string) => void;
  currentReviews?: number | null;
  onSkip: () => void;
  onComplete: () => void;
  /** Troppi skip senza numero: pausa sessione. */
  onSessionStall?: () => void;
  onBusyChange?: (busy: boolean) => void;
  onClearDiscoveryNotes?: () => void;
}

export function DialerCallDock({
  contact,
  disabled,
  autoDial = false,
  autoDialNonce = 0,
  discovery,
  discoveryNotes,
  notes,
  onNotesChange,
  currentReviews,
  onSkip,
  onComplete,
  onSessionStall,
  onBusyChange,
  onClearDiscoveryNotes,
}: DialerCallDockProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callResult, setCallResult] = useState<Call | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [waitingStartTime, setWaitingStartTime] = useState<number | null>(null);

  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [status, setStatus] = useState<ContactStatus>(contact.status);
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("10:00");
  const [isSaving, setIsSaving] = useState(false);

  const contactIdRef = useRef(contact._id);
  const dialInFlightRef = useRef(false);
  const lastAutoDialKeyRef = useRef<string | null>(null);
  const consecutiveNoPhoneRef = useRef(0);
  const onSkipRef = useRef(onSkip);
  const onSessionStallRef = useRef(onSessionStall);
  onSkipRef.current = onSkip;
  onSessionStallRef.current = onSessionStall;

  useEffect(() => {
    consecutiveNoPhoneRef.current = 0;
  }, [autoDialNonce]);

  // Reset dock when switching contact (not mid-call)
  useEffect(() => {
    if (callState !== "idle" && callState !== "wrap" && callState !== "error") return;
    if (contactIdRef.current === contact._id) {
      setStatus(contact.status);
      return;
    }
    contactIdRef.current = contact._id;
    dialInFlightRef.current = false;
    setCallState("idle");
    setCallResult(null);
    setOutcome("");
    setCallbackDate("");
    setCallbackTime("10:00");
    setErrorMessage("");
    setStatus(contact.status);
  }, [contact._id, contact.status, callState]);

  useEffect(() => {
    if (callState === "idle" || callState === "error" || callState === "wrap") {
      dialInFlightRef.current = false;
    }
  }, [callState]);

  useEffect(() => {
    if (callState === "calling-you" && waitingStartTime) {
      const t = setTimeout(() => setCallState("connecting-contact"), 10000);
      return () => clearTimeout(t);
    }
    if (callState === "connecting-contact") {
      const t = setTimeout(() => setCallState("in-conversation"), 15000);
      return () => clearTimeout(t);
    }
  }, [callState, waitingStartTime]);

  const handleInitiate = useCallback(async () => {
    if (!contact.phone) {
      toast.error("Nessun numero di telefono");
      return;
    }
    if (dialInFlightRef.current) return;
    dialInFlightRef.current = true;
    setCallState("initiating");
    setErrorMessage("");
    try {
      const request: InitiateCallRequest = { contactId: contact._id, recordCall: true };
      const response = await apiClient.initiateCall(request);
      if (response.success && response.data) {
        setCallResult(response.data.call);
        setCallState("calling-you");
        setWaitingStartTime(Date.now());
        toast.success("Ti stiamo chiamando…");
      } else {
        setErrorMessage(response.message || "Errore avvio chiamata");
        setCallState("error");
        dialInFlightRef.current = false;
      }
    } catch {
      setErrorMessage("Errore di connessione");
      setCallState("error");
      dialInFlightRef.current = false;
    }
  }, [contact._id, contact.phone]);

  // Power session: appena idle su un contatto (o Start), parte la chiamata.
  useEffect(() => {
    if (!autoDial || disabled) return;
    if (callState !== "idle") return;

    const dialKey = `${autoDialNonce}:${contact._id}`;
    if (lastAutoDialKeyRef.current === dialKey) return;

    if (!contact.phone) {
      const t = setTimeout(() => {
        if (lastAutoDialKeyRef.current === dialKey) return;
        lastAutoDialKeyRef.current = dialKey;
        consecutiveNoPhoneRef.current += 1;
        toast.message("Senza numero — salto", { description: contact.name });
        if (consecutiveNoPhoneRef.current >= 8) {
          onSessionStallRef.current?.();
          return;
        }
        onSkipRef.current();
      }, 350);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (lastAutoDialKeyRef.current === dialKey) return;
      lastAutoDialKeyRef.current = dialKey;
      consecutiveNoPhoneRef.current = 0;
      void handleInitiate();
    }, 450);
    return () => clearTimeout(t);
  }, [
    autoDial,
    autoDialNonce,
    callState,
    contact._id,
    contact.phone,
    contact.name,
    disabled,
    handleInitiate,
  ]);

  const handleOutcomePick = (value: CallOutcome) => {
    setOutcome(value);
    const meta = DIALER_OUTCOMES.find((o) => o.value === value);
    if (meta?.statusHint) setStatus(meta.statusHint);
    if (meta?.callback === "clear") {
      setCallbackDate("");
      setCallbackTime("10:00");
    } else if ((meta?.callback === "required" || meta?.callback === "optional") && !callbackDate) {
      const slot = nextCallbackDateTime();
      setCallbackDate(slot.dateStr);
      setCallbackTime(slot.timeStr);
    }
  };

  const callbackPolicy: CallbackPolicy =
    DIALER_OUTCOMES.find((o) => o.value === outcome)?.callback ?? "clear";
  const showCallbackPicker = callbackPolicy === "required" || callbackPolicy === "optional";
  const callbackRequired = callbackPolicy === "required";

  const handleSaveAndNext = useCallback(async () => {
    if (!outcome) {
      toast.error("Seleziona un esito");
      return;
    }
    if (callbackRequired && !callbackDate) {
      toast.error("Fissa data e ora del richiamo");
      return;
    }
    setIsSaving(true);
    try {
      const mergedNotes = formatDialerNotes(
        discovery,
        discoveryNotes,
        notes,
        currentReviews ??
          contact.cardSummary?.reviews ??
          null
      );

      let callbackAt: string | null = null;
      let callbackNote: string | null = null;
      if (callbackPolicy === "required" || (callbackPolicy === "optional" && callbackDate)) {
        callbackAt = buildCallbackIso(callbackDate, callbackTime);
        callbackNote = (notes.trim() || mergedNotes.trim() || "Richiamo fissato dal dialer").slice(0, 300);
      }

      await wrapUpDialer({
        contactId: contact._id,
        callId: callResult?._id,
        outcome,
        status,
        notes: mergedNotes || undefined,
        callbackAt,
        callbackNote,
        mrr: wrapUpMrrForStatus(status),
      });

      toast.success("Salvato");
      setCallState("idle");
      setCallResult(null);
      setOutcome("");
      setCallbackDate("");
      setCallbackTime("10:00");
      onNotesChange("");
      onClearDiscoveryNotes?.();
      onComplete();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setIsSaving(false);
    }
  }, [
    outcome,
    callResult,
    notes,
    status,
    contact._id,
    contact.cardSummary?.reviews,
    currentReviews,
    discovery,
    discoveryNotes,
    callbackDate,
    callbackTime,
    callbackPolicy,
    callbackRequired,
    onComplete,
    onClearDiscoveryNotes,
    onNotesChange,
  ]);

  const busy = callState !== "idle" && callState !== "wrap" && callState !== "error";

  useEffect(() => {
    onBusyChange?.(busy || callState === "wrap");
  }, [busy, callState, onBusyChange]);

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      {callState === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
            <p className="truncate text-xs text-gray-500">
              {autoDial
                ? "Sessione attiva — la chiamata parte da sola…"
                : contact.phone || "Nessun numero"}
            </p>
          </div>
          <Button variant="outline" onClick={onSkip} disabled={disabled || busy}>
            <SkipForward className="mr-1.5 h-4 w-4" />
            Salta
          </Button>
          {!autoDial ? (
            <Button onClick={handleInitiate} disabled={disabled || !contact.phone} size="lg">
              <Phone className="mr-1.5 h-4 w-4" />
              Chiama
            </Button>
          ) : (
            <Button onClick={handleInitiate} disabled={disabled || !contact.phone} size="lg" variant="secondary">
              <Phone className="mr-1.5 h-4 w-4" />
              Chiama ora
            </Button>
          )}
        </div>
      )}

      {callState === "initiating" && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Avvio chiamata…
        </div>
      )}

      {callState === "calling-you" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-800">Ti stiamo chiamando — rispondi al telefono</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCallState("connecting-contact")}>
              <CheckCircle className="mr-1.5 h-4 w-4" /> Ho risposto
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setErrorMessage("Chiamata annullata");
                setCallState("error");
              }}
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Annulla
            </Button>
          </div>
        </div>
      )}

      {callState === "connecting-contact" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-800">Collegamento a {contact.name}…</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCallState("in-conversation")}>
              Ha risposto
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setCallState("wrap")}>
              Non ha risposto
            </Button>
          </div>
        </div>
      )}

      {callState === "in-conversation" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-800">In conversazione con {contact.name}</p>
          <Button className="w-full" onClick={() => setCallState("wrap")}>
            Fine chiamata → esito
          </Button>
        </div>
      )}

      {callState === "wrap" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">Chiudi la call</p>
          <div className="flex flex-wrap gap-1.5">
            {DIALER_OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleOutcomePick(o.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                  outcome === o.value
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {showCallbackPicker && (
            <DialerCallbackPicker
              dateStr={callbackDate}
              timeStr={callbackTime}
              disabled={isSaving}
              onDateChange={setCallbackDate}
              onTimeChange={setCallbackTime}
            />
          )}

          <div className="lg:hidden">
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Note per dopo: DM, fascia, WhatsApp…"
              className="min-h-[42px] resize-none bg-white"
              rows={2}
            />
          </div>

          <Button className="w-full" size="lg" onClick={handleSaveAndNext} disabled={isSaving || !outcome}>
            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {autoDial ? "Salva e chiama prossimo" : "Salva e prossimo"}
          </Button>
        </div>
      )}

      {callState === "error" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-sm text-red-700">{errorMessage || "Errore chiamata"}</p>
          <Button variant="outline" onClick={() => setCallState("idle")}>
            Riprova
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Salta
          </Button>
        </div>
      )}
    </div>
  );
}
