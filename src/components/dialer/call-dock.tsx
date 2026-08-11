"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import { Call, CallOutcome, InitiateCallRequest } from "@/types/call";
import { ContactStatus } from "@/types/contact";
import { ColdCallDiscoveryQuestion, DialerContact } from "@/types/dialer";
import { getAllStatuses, getStatusLabel } from "@/lib/status-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DiscoveryNotes,
  formatDialerNotes,
} from "@/components/dialer/script-panel";
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

const DIALER_OUTCOMES: { value: CallOutcome; label: string; statusHint?: ContactStatus }[] = [
  { value: "free-trial-sold", label: "Trial accettato", statusHint: "free trial iniziato" },
  { value: "callback", label: "Da richiamare", statusHint: "da richiamare" },
  { value: "first-call", label: "Prima call / contattato", statusHint: "contattato" },
  { value: "no-answer", label: "Nessuna risposta", statusHint: "da richiamare" },
  { value: "voicemail", label: "Segreteria", statusHint: "da richiamare" },
  { value: "not-interested", label: "Non interessato", statusHint: "lost before free trial" },
  { value: "follow-up", label: "Follow-up fissato", statusHint: "da richiamare" },
];

interface DialerCallDockProps {
  contact: DialerContact;
  disabled?: boolean;
  discovery?: ColdCallDiscoveryQuestion[];
  discoveryNotes: DiscoveryNotes;
  currentReviews?: number | null;
  onSkip: () => void;
  onComplete: () => void;
  onBusyChange?: (busy: boolean) => void;
  onClearDiscoveryNotes?: () => void;
}

export function DialerCallDock({
  contact,
  disabled,
  discovery,
  discoveryNotes,
  currentReviews,
  onSkip,
  onComplete,
  onBusyChange,
  onClearDiscoveryNotes,
}: DialerCallDockProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callResult, setCallResult] = useState<Call | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [waitingStartTime, setWaitingStartTime] = useState<number | null>(null);

  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [status, setStatus] = useState<ContactStatus>(contact.status);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const contactIdRef = useRef(contact._id);

  // Reset dock when switching contact (not mid-call)
  useEffect(() => {
    if (callState !== "idle" && callState !== "wrap" && callState !== "error") return;
    if (contactIdRef.current === contact._id) {
      setStatus(contact.status);
      return;
    }
    contactIdRef.current = contact._id;
    setCallState("idle");
    setCallResult(null);
    setOutcome("");
    setNotes("");
    setErrorMessage("");
    setStatus(contact.status);
  }, [contact._id, contact.status, callState]);

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

  const handleInitiate = async () => {
    if (!contact.phone) {
      toast.error("Nessun numero di telefono");
      return;
    }
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
      }
    } catch {
      setErrorMessage("Errore di connessione");
      setCallState("error");
    }
  };

  const handleOutcomePick = (value: CallOutcome) => {
    setOutcome(value);
    const hint = DIALER_OUTCOMES.find((o) => o.value === value)?.statusHint;
    if (hint) setStatus(hint);
  };

  const answeredDiscovery = (discovery || []).filter(
    (q) => (discoveryNotes[q.id] || "").trim()
  );

  const handleSaveAndNext = useCallback(async () => {
    if (!outcome) {
      toast.error("Seleziona un esito");
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
      if (callResult) {
        await apiClient.updateCall(callResult._id, {
          notes: mergedNotes || undefined,
          outcome,
        });
      }
      if (status !== contact.status) {
        await apiClient.updateContactStatus(contact._id, { status });
      }
      toast.success("Salvato");
      setCallState("idle");
      setCallResult(null);
      setOutcome("");
      setNotes("");
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
    contact.status,
    contact._id,
    contact.cardSummary?.reviews,
    currentReviews,
    discovery,
    discoveryNotes,
    onComplete,
    onClearDiscoveryNotes,
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
            <p className="truncate text-xs text-gray-500">{contact.phone || "Nessun numero"}</p>
          </div>
          <Button variant="outline" onClick={onSkip} disabled={disabled || busy}>
            <SkipForward className="mr-1.5 h-4 w-4" />
            Salta
          </Button>
          <Button onClick={handleInitiate} disabled={disabled || !contact.phone} size="lg">
            <Phone className="mr-1.5 h-4 w-4" />
            Chiama
          </Button>
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

          {answeredDiscovery.length > 0 && (
            <div className="rounded-md border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
              <p className="font-semibold text-amber-800">Qualificazione (dallo script)</p>
              <ul className="mt-1.5 space-y-0.5">
                {answeredDiscovery.map((q) => (
                  <li key={q.id}>
                    <span className="font-medium">{q.label}:</span>{" "}
                    {discoveryNotes[q.id]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Status contatto</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContactStatus)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllStatuses().map((s) => (
                    <SelectItem key={s} value={s}>
                      {getStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Note extra (DM, fascia, WhatsApp…)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aggiungi ciò che non sta nelle Q…"
                className="min-h-[42px] resize-none bg-white"
                rows={2}
              />
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={handleSaveAndNext} disabled={isSaving || !outcome}>
            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Salva tutto e prossimo
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
