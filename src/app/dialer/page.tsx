"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialerQueueList } from "@/components/dialer/queue-list";
import { VisibilityCardSummary } from "@/components/dialer/visibility-card-summary";
import {
  DialerScriptPanel,
  DialerScriptQuickBar,
  DiscoveryNotes,
} from "@/components/dialer/script-panel";
import { DialerCallDock } from "@/components/dialer/call-dock";
import { getColdCallScript, getDialerQueue } from "@/lib/dialer-api";
import {
  ColdCallScript,
  DIALER_DEFAULT_LIST,
  DialerContact,
  canUseDialer,
  resolveDialerCardView,
} from "@/types/dialer";
import { getAllStatuses, getStatusLabel } from "@/lib/status-utils";
import { toast } from "sonner";
import { Headphones, Loader2, MapPin, Pause, Play, RefreshCw } from "lucide-react";

export default function DialerPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const dialerOk = canUseDialer(user?.role);

  const [statusFilter, setStatusFilter] = useState("da contattare");
  const [contacts, setContacts] = useState<DialerContact[]>([]);
  const [total, setTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [script, setScript] = useState<ColdCallScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const scriptRequestId = useRef(0);

  const [discoveryNotes, setDiscoveryNotes] = useState<DiscoveryNotes>({});
  const [callActive, setCallActive] = useState(false);
  /** Sessione power: dopo Start le chiamate partono in automatico una dopo l’altra. */
  const [powerSession, setPowerSession] = useState(false);
  const [autoDialNonce, setAutoDialNonce] = useState(0);

  const selectedContact = useMemo(
    () => contacts.find((c) => c._id === selectedId) || null,
    [contacts, selectedId]
  );

  const { summary: cardSummary, hasVisibilityCard } = resolveDialerCardView(
    selectedContact,
    script
  );

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const res = await getDialerQueue({
        list: DIALER_DEFAULT_LIST,
        status: statusFilter,
        limit: 100,
        offset: 0,
      });
      if (res.success && res.data) {
        const list = res.data.contacts || [];
        setContacts(list);
        setTotal(res.data.total || 0);
        setSelectedId((prev) => {
          if (prev && list.some((c) => c._id === prev)) return prev;
          return list[0]?._id || null;
        });
      } else {
        setQueueError(res.message || "Errore nel caricamento della coda");
        setContacts([]);
        setTotal(0);
        setSelectedId(null);
        setScript(null);
      }
    } catch (e: unknown) {
      setQueueError(e instanceof Error ? e.message : "Errore nel caricamento della coda");
      setContacts([]);
      setTotal(0);
      setSelectedId(null);
      setScript(null);
    } finally {
      setQueueLoading(false);
    }
  }, [statusFilter]);

  const loadScript = useCallback(async (contactId: string) => {
    const reqId = ++scriptRequestId.current;
    setScriptLoading(true);
    setScriptError(null);
    setScript(null);
    try {
      const res = await getColdCallScript(contactId);
      if (reqId !== scriptRequestId.current) return;
      if (res.success && res.data) {
        setScript(res.data);
      } else {
        setScriptError(res.message || "Errore nel caricamento dello script");
      }
    } catch (e: unknown) {
      if (reqId !== scriptRequestId.current) return;
      setScriptError(e instanceof Error ? e.message : "Errore nel caricamento dello script");
    } finally {
      if (reqId === scriptRequestId.current) setScriptLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && dialerOk) loadQueue();
  }, [isAuthenticated, dialerOk, loadQueue]);

  useEffect(() => {
    if (selectedId) {
      setDiscoveryNotes({});
      loadScript(selectedId);
    } else {
      setScript(null);
      setScriptError(null);
      setDiscoveryNotes({});
    }
  }, [selectedId, loadScript]);

  const selectContact = (contact: DialerContact) => {
    if (callActive) return;
    setSelectedId(contact._id);
  };

  const handleDiscoveryNoteChange = (questionId: string, value: string) => {
    setDiscoveryNotes((prev) => ({ ...prev, [questionId]: value }));
  };

  const advanceToNext = useCallback(() => {
    if (!selectedId || contacts.length === 0) return;
    if (contacts.length === 1) {
      toast.message("Fine coda", { description: "Nessun altro contatto." });
      return;
    }
    const idx = contacts.findIndex((c) => c._id === selectedId);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % contacts.length;
    setSelectedId(contacts[nextIdx]._id);
  }, [contacts, selectedId]);

  const handleSkip = () => {
    if (callActive) return;
    advanceToNext();
  };

  const startPowerSession = () => {
    if (contacts.length === 0) {
      toast.error("Nessun contatto in coda");
      return;
    }
    if (!selectedId && contacts[0]) setSelectedId(contacts[0]._id);
    setPowerSession(true);
    setAutoDialNonce((n) => n + 1);
    toast.success("Sessione avviata", {
      description: "Le chiamate partono in automatico. Salva → passa al prossimo.",
    });
  };

  const pausePowerSession = () => {
    setPowerSession(false);
    toast.message("Sessione in pausa", {
      description: "La chiamata in corso continua; il prossimo non parte da solo.",
    });
  };

  const handleCallComplete = async () => {
    setCallActive(false);
    const currentId = selectedId;
    let preferredNext: string | null = null;
    if (currentId && contacts.length > 0) {
      const idx = contacts.findIndex((c) => c._id === currentId);
      const withoutCurrent = contacts.filter((c) => c._id !== currentId);
      preferredNext =
        withoutCurrent[idx]?._id || withoutCurrent[0]?._id || null;
    }
    await loadQueue();
    if (preferredNext) {
      setSelectedId(preferredNext);
    } else if (powerSession) {
      setPowerSession(false);
      toast.message("Coda finita", { description: "Sessione in pausa." });
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white">
          <AlertTitle>Accesso richiesto</AlertTitle>
          <AlertDescription>Accedi per usare il Power Dialer.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dialerOk) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernSidebar />
        <main className="flex min-h-screen items-center justify-center pl-16">
          <Alert className="max-w-md bg-white">
            <AlertTitle>Accesso negato</AlertTitle>
            <AlertDescription>
              Il Power Dialer è disponibile per agent, manager e admin.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const statusOptions = [
    { value: "da contattare", label: "Da contattare" },
    { value: "all", label: "Tutti gli status" },
    ...getAllStatuses()
      .filter((s) => s !== "da contattare")
      .map((s) => ({ value: s, label: getStatusLabel(s) })),
  ];

  const mapsUrl = cardSummary?.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${cardSummary.placeId}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="pl-16">
        <div className="flex h-screen flex-col">
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Headphones className="h-5 w-5 text-blue-600" />
                  Power Dialer
                </h1>
                <p className="text-xs text-gray-500">
                  {DIALER_DEFAULT_LIST}
                  {user ? ` · ${user.firstName}` : ""}
                  {powerSession ? " · sessione attiva (auto-dial)" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  disabled={callActive || powerSession}
                >
                  <SelectTrigger className="w-[180px] bg-white h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadQueue}
                  disabled={queueLoading || callActive}
                >
                  <RefreshCw className={`mr-1.5 h-4 w-4 ${queueLoading ? "animate-spin" : ""}`} />
                  Aggiorna
                </Button>
                {powerSession ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pausePowerSession}
                    className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  >
                    <Pause className="mr-1.5 h-4 w-4" />
                    Pausa
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={startPowerSession}
                    disabled={queueLoading || contacts.length === 0 || callActive}
                  >
                    <Play className="mr-1.5 h-4 w-4" />
                    Start
                  </Button>
                )}
              </div>
            </div>
          </div>

          {queueError && (
            <div className="shrink-0 px-4 pt-3">
              <Alert variant="destructive" className="bg-white">
                <AlertTitle>Errore coda</AlertTitle>
                <AlertDescription>{queueError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Layout: coda | script (hero) | scheda compatta */}
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
            <section className="flex min-h-0 flex-col border-r border-gray-200 bg-white p-3">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Coda · {total}
              </h2>
              <DialerQueueList
                contacts={contacts}
                selectedId={selectedId}
                isLoading={queueLoading}
                total={total}
                disabled={callActive}
                onSelect={selectContact}
              />
            </section>

            <section className="flex min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {!selectedContact ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
                    {queueLoading
                      ? "Caricamento…"
                      : contacts.length === 0
                        ? "Nessun contatto in coda."
                        : "Seleziona un contatto."}
                  </div>
                ) : (
                  <div className="mx-auto max-w-2xl space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedContact.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {getStatusLabel(selectedContact.status)}
                          {cardSummary?.city ? ` · ${cardSummary.city}` : ""}
                          {cardSummary?.category ? ` · ${cardSummary.category}` : ""}
                        </p>
                      </div>
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Maps
                        </a>
                      )}
                    </div>
                    <DialerScriptPanel
                      script={script}
                      isLoading={scriptLoading}
                      error={scriptError}
                      discoveryNotes={discoveryNotes}
                      onDiscoveryNoteChange={handleDiscoveryNoteChange}
                      agentName={user?.firstName || null}
                    />
                  </div>
                )}
              </div>

              {selectedContact && script && !scriptLoading && !scriptError && (
                <DialerScriptQuickBar
                  script={script}
                  discoveryNotes={discoveryNotes}
                  agentName={user?.firstName || null}
                />
              )}

              {selectedContact && (
                <DialerCallDock
                  contact={selectedContact}
                  disabled={queueLoading}
                  autoDial={powerSession}
                  autoDialNonce={autoDialNonce}
                  discovery={script?.discovery}
                  discoveryNotes={discoveryNotes}
                  currentReviews={
                    script?.cardSummary?.reviews ??
                    script?.projectionHints?.reviews ??
                    selectedContact.cardSummary?.reviews ??
                    null
                  }
                  onSkip={handleSkip}
                  onComplete={handleCallComplete}
                  onBusyChange={setCallActive}
                  onClearDiscoveryNotes={() => setDiscoveryNotes({})}
                />
              )}
            </section>

            <section className="hidden min-h-0 flex-col border-l border-gray-200 bg-white p-3 lg:flex">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Scheda (slot script)
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <VisibilityCardSummary
                  summary={cardSummary}
                  hasVisibilityCard={hasVisibilityCard}
                />
                <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
                  Start: le chiamate partono una dopo l’altra. Salva esito → passa al prossimo e
                  richiama subito. Pausa ferma l’auto-dial. Obiezioni one-tap sotto lo script
                  (tasti 1–9).
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
