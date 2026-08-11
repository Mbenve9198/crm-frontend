"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
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
import {
  ColdCallScript,
  DIALER_DEFAULT_LIST,
  DialerContact,
} from "@/types/dialer";
import { Call } from "@/types/call";
import { Contact, ContactStatus } from "@/types/contact";
import { getAllStatuses, getStatusLabel } from "@/lib/status-utils";
import { toast } from "sonner";
import {
  Headphones,
  Loader2,
  Phone,
  RefreshCw,
  SkipForward,
} from "lucide-react";

function toCallContact(contact: DialerContact): Contact {
  return {
    _id: contact._id,
    name: contact.name,
    email: contact.email || "",
    phone: contact.phone,
    lists: contact.lists || [],
    properties: {},
    status: (contact.status as ContactStatus) || "da contattare",
    owner: contact.owner
      ? {
          _id: contact.owner._id,
          firstName: contact.owner.firstName,
          lastName: contact.owner.lastName,
          email: contact.owner.email || "",
          role: contact.owner.role || "agent",
        }
      : {
          _id: "",
          firstName: "",
          lastName: "",
          email: "",
          role: "agent",
        },
    createdBy: {
      _id: "",
      firstName: "",
      lastName: "",
      email: "",
    },
    createdAt: contact.createdAt || "",
    updatedAt: contact.updatedAt || "",
  };
}

export default function DialerPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [statusFilter, setStatusFilter] = useState("da contattare");
  const [contacts, setContacts] = useState<DialerContact[]>([]);
  const [total, setTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [script, setScript] = useState<ColdCallScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const [callOpen, setCallOpen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const selectedContact = useMemo(
    () => contacts.find((c) => c._id === selectedId) || null,
    [contacts, selectedId]
  );

  const cardSummary = script?.cardSummary || selectedContact?.cardSummary;
  const hasVisibilityCard =
    script?.hasVisibilityCard ?? selectedContact?.hasVisibilityCard ?? false;

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const res = await apiClient.getDialerQueue({
        list: DIALER_DEFAULT_LIST,
        status: statusFilter,
        limit: 100,
        offset: 0,
      });
      if (res.success && res.data) {
        setContacts(res.data.contacts || []);
        setTotal(res.data.total || 0);
        setSelectedId((prev) => {
          const list = res.data?.contacts || [];
          if (prev && list.some((c) => c._id === prev)) return prev;
          return list[0]?._id || null;
        });
      } else {
        setQueueError(res.message || "Errore nel caricamento della coda");
        setContacts([]);
        setTotal(0);
      }
    } catch (e: unknown) {
      setQueueError(e instanceof Error ? e.message : "Errore nel caricamento della coda");
      setContacts([]);
      setTotal(0);
    } finally {
      setQueueLoading(false);
    }
  }, [statusFilter]);

  const loadScript = useCallback(async (contactId: string) => {
    setScriptLoading(true);
    setScriptError(null);
    setScript(null);
    try {
      const res = await apiClient.getColdCallScript(contactId);
      if (res.success && res.data) {
        setScript(res.data);
      } else {
        setScriptError(res.message || "Errore nel caricamento dello script");
      }
    } catch (e: unknown) {
      setScriptError(e instanceof Error ? e.message : "Errore nel caricamento dello script");
    } finally {
      setScriptLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadQueue();
  }, [isAuthenticated, loadQueue]);

  useEffect(() => {
    if (selectedId) loadScript(selectedId);
    else {
      setScript(null);
      setScriptError(null);
    }
  }, [selectedId, loadScript]);

  const selectContact = (contact: DialerContact) => {
    setSelectedId(contact._id);
  };

  const advanceToNext = useCallback(() => {
    if (!selectedId || contacts.length === 0) return;
    const idx = contacts.findIndex((c) => c._id === selectedId);
    const next = contacts[idx + 1] || contacts[0];
    if (next && next._id !== selectedId) {
      setSelectedId(next._id);
    } else if (idx === contacts.length - 1 && contacts.length > 1) {
      setSelectedId(contacts[0]._id);
    } else {
      toast.message("Fine coda", { description: "Nessun altro contatto da chiamare." });
    }
  }, [contacts, selectedId]);

  const handleSkip = () => {
    advanceToNext();
  };

  const handleCallComplete = (_call: Call) => {
    setCallOpen(false);
    toast.success("Chiamata completata");
    if (autoAdvance) {
      advanceToNext();
    }
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
          {/* Header */}
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                <Button variant="outline" size="sm" onClick={loadQueue} disabled={queueLoading}>
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

          {/* 3-column layout */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[280px_1fr_360px]">
            {/* Left: queue */}
            <section className="flex min-h-0 flex-col border-r border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Coda
              </h2>
              <DialerQueueList
                contacts={contacts}
                selectedId={selectedId}
                isLoading={queueLoading}
                total={total}
                onSelect={selectContact}
              />
            </section>

            {/* Center: active contact */}
            <section className="flex min-h-0 flex-col overflow-y-auto p-6">
              {!selectedContact ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
                  {queueLoading
                    ? "Caricamento coda…"
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
                          {getStatusLabel(selectedContact.status as ContactStatus)}
                          {selectedContact.owner
                            ? ` · ${selectedContact.owner.firstName} ${selectedContact.owner.lastName}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleChiama} disabled={!selectedContact.phone}>
                          <Phone className="mr-1.5 h-4 w-4" />
                          Chiama
                        </Button>
                        <Button variant="outline" onClick={handleSkip}>
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

            {/* Right: script */}
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
          contact={toCallContact(selectedContact)}
          trigger={<span className="hidden" />}
          open={callOpen}
          onOpenChange={setCallOpen}
          onCallComplete={handleCallComplete}
        />
      )}
    </div>
  );
}
