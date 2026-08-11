"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { CallDialog } from "@/components/ui/call-dialog";
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
import { DialerScriptPanel } from "@/components/dialer/script-panel";
import { getColdCallScript, getDialerQueue } from "@/lib/dialer-api";
import {
  ColdCallScript,
  DIALER_DEFAULT_LIST,
  DialerContact,
  resolveDialerCardView,
} from "@/types/dialer";
import { Call } from "@/types/call";
import { getAllStatuses, getStatusLabel } from "@/lib/status-utils";
import { toast } from "sonner";
import {
  Headphones,
  Loader2,
  Phone,
  RefreshCw,
  SkipForward,
} from "lucide-react";

const DIALER_ROLES = new Set(["agent", "manager", "admin"]);

export default function DialerPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const canUseDialer = !!user && DIALER_ROLES.has(user.role);

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

  const [callOpen, setCallOpen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

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
    if (isAuthenticated && canUseDialer) loadQueue();
  }, [isAuthenticated, canUseDialer, loadQueue]);

  useEffect(() => {
    if (selectedId) loadScript(selectedId);
    else {
      setScript(null);
      setScriptError(null);
    }
  }, [selectedId, loadScript]);

  const selectContact = (contact: DialerContact) => {
    if (callOpen) return;
    setSelectedId(contact._id);
  };

  const advanceToNext = useCallback(() => {
    if (!selectedId || contacts.length === 0) return;
    if (contacts.length === 1) {
      toast.message("Fine coda", { description: "Nessun altro contatto da chiamare." });
      return;
    }
    const idx = contacts.findIndex((c) => c._id === selectedId);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % contacts.length;
    setSelectedId(contacts[nextIdx]._id);
  }, [contacts, selectedId]);

  const handleCallComplete = async (_call: Call) => {
    setCallOpen(false);
    const currentId = selectedId;
    let preferredNext: string | null = null;
    if (autoAdvance && currentId && contacts.length > 0) {
      const idx = contacts.findIndex((c) => c._id === currentId);
      const withoutCurrent = contacts.filter((c) => c._id !== currentId);
      preferredNext =
        withoutCurrent[idx] ? withoutCurrent[idx]._id : withoutCurrent[0]?._id || null;
    }
    await loadQueue();
    if (preferredNext) setSelectedId(preferredNext);
  };

  const handleChiama = () => {
    if (!selectedContact?.phone) {
      toast.error("Questo contatto non ha un numero di telefono");
      return;
    }
    setCallOpen(true);
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

  if (!canUseDialer) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="pl-16">
        <div className="flex h-screen flex-col">
          <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <Headphones className="h-5 w-5 text-blue-600" />
                  Power Dialer
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  Lista: {DIALER_DEFAULT_LIST}
                  {user ? ` · ${user.firstName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  disabled={callOpen}
                >
                  <SelectTrigger className="w-[200px] bg-white">
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
                <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Avanza dopo chiamata
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadQueue}
                  disabled={queueLoading || callOpen}
                >
                  <RefreshCw className={`mr-1.5 h-4 w-4 ${queueLoading ? "animate-spin" : ""}`} />
                  Aggiorna
                </Button>
              </div>
            </div>
          </div>

          {queueError && (
            <div className="shrink-0 px-6 pt-4">
              <Alert variant="destructive" className="bg-white">
                <AlertTitle>Errore coda</AlertTitle>
                <AlertDescription>{queueError}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[280px_1fr_360px]">
            <section className="flex min-h-0 flex-col border-r border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Coda
              </h2>
              <DialerQueueList
                contacts={contacts}
                selectedId={selectedId}
                isLoading={queueLoading}
                total={total}
                disabled={callOpen}
                onSelect={selectContact}
              />
            </section>

            <section className="flex min-h-0 flex-col overflow-y-auto p-6">
              {!selectedContact ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
                  {queueLoading
                    ? "Caricamento coda…"
                    : contacts.length === 0
                      ? "Nessun contatto in coda per i filtri selezionati."
                      : "Seleziona un contatto dalla coda per iniziare."}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-xl space-y-5">
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedContact.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                          <Phone className="h-4 w-4" />
                          {selectedContact.phone || "Nessun numero"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {getStatusLabel(selectedContact.status)}
                          {selectedContact.owner
                            ? ` · ${selectedContact.owner.firstName} ${selectedContact.owner.lastName}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleChiama} disabled={!selectedContact.phone || callOpen}>
                          <Phone className="mr-1.5 h-4 w-4" />
                          Chiama
                        </Button>
                        <Button variant="outline" onClick={advanceToNext} disabled={callOpen}>
                          <SkipForward className="mr-1.5 h-4 w-4" />
                          Salta
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">
                      Scheda visibilità
                    </h3>
                    <VisibilityCardSummary
                      summary={cardSummary}
                      hasVisibilityCard={hasVisibilityCard}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="flex min-h-0 flex-col border-l border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Script cold call
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DialerScriptPanel
                  script={script}
                  isLoading={scriptLoading}
                  error={scriptError}
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {selectedContact && (
        <CallDialog
          contact={{
            _id: selectedContact._id,
            name: selectedContact.name,
            phone: selectedContact.phone,
          }}
          trigger={<span className="hidden" />}
          open={callOpen}
          onOpenChange={setCallOpen}
          onCallComplete={handleCallComplete}
        />
      )}
    </div>
  );
}
