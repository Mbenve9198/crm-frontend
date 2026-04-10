"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Input } from "./input";
import { Button } from "./button";
import { Loader2, Search, RefreshCw, CheckCircle2, AlertTriangle, Link2, X, CreditCard } from "lucide-react";
import apiClient from "@/lib/api";
import { fmtEur } from "./saas-metrics-shared";
import type { UnmatchedStripeCustomer } from "@/types/saas-metrics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = "idle" | "loading" | "results" | "done";

interface CrmSearchResult {
  _id: string;
  name: string;
  email: string;
  status: string;
}

export function StripeReconcileDialog({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [unmatched, setUnmatched] = useState<UnmatchedStripeCustomer[]>([]);
  const [totalStripe, setTotalStripe] = useState(0);
  const [totalLinked, setTotalLinked] = useState(0);
  const [linkedCount, setLinkedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Per-row search state
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, CrmSearchResult[]>>({});
  const [searchLoading, setSearchLoading] = useState<Record<string, boolean>>({});
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("idle");
      setUnmatched([]);
      setError(null);
      setLinkedCount(0);
      setSearchQueries({});
      setSearchResults({});
      setSearchLoading({});
    }
  }, [open]);

  const startSync = async () => {
    setStep("loading");
    setError(null);
    try {
      const res = await apiClient.getUnmatchedStripeCustomers();
      if (res.success && res.data) {
        setUnmatched(res.data.unmatched);
        setTotalStripe(res.data.totalStripe);
        setTotalLinked(res.data.totalLinked);
        setStep(res.data.unmatched.length === 0 ? "done" : "results");
      } else {
        setError("Errore nel caricamento dei dati Stripe");
        setStep("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
      setStep("idle");
    }
  };

  const searchCrmContacts = useCallback(async (stripeId: string, query: string) => {
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [stripeId]: [] }));
      return;
    }
    setSearchLoading(prev => ({ ...prev, [stripeId]: true }));
    try {
      const res = await apiClient.getContacts({ search: query, limit: 5 });
      if (res.success && res.data) {
        const contacts = (res.data as unknown as { contacts: CrmSearchResult[] }).contacts || [];
        setSearchResults(prev => ({ ...prev, [stripeId]: contacts }));
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(prev => ({ ...prev, [stripeId]: false }));
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (const [stripeId, query] of Object.entries(searchQueries)) {
      const t = setTimeout(() => searchCrmContacts(stripeId, query), 350);
      timers.push(t);
    }
    return () => timers.forEach(clearTimeout);
  }, [searchQueries, searchCrmContacts]);

  const linkContact = async (contactId: string, stripeCustomerId: string) => {
    setLinkingId(stripeCustomerId);
    try {
      const res = await apiClient.stripeLinkCustomer(contactId, stripeCustomerId);
      if (res.success) {
        setUnmatched(prev => prev.filter(u => u.stripeCustomerId !== stripeCustomerId));
        setLinkedCount(prev => prev + 1);
        setSearchQueries(prev => { const n = { ...prev }; delete n[stripeCustomerId]; return n; });
        setSearchResults(prev => { const n = { ...prev }; delete n[stripeCustomerId]; return n; });
      }
    } catch (e) {
      console.error("Link error:", e);
    } finally {
      setLinkingId(null);
    }
  };

  const handleClose = () => {
    if (linkedCount > 0) onComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-600" />
            Riconciliazione Stripe
          </DialogTitle>
        </DialogHeader>

        {/* Step: Idle */}
        {step === "idle" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Confronta i clienti attivi su Stripe con i lead del CRM
                per trovare quelli non ancora collegati.
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 justify-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            <Button onClick={startSync} className="bg-teal-600 hover:bg-teal-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Avvia sync con Stripe
            </Button>
          </div>
        )}

        {/* Step: Loading */}
        {step === "loading" && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
            <p className="text-sm text-gray-500">Recupero subscription attive da Stripe...</p>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>{unmatched.length}</strong> client{unmatched.length !== 1 ? "i" : "e"} Stripe
                  su <strong>{totalStripe}</strong> totali non ha{unmatched.length !== 1 ? "nno" : ""} un lead CRM collegato.
                  {linkedCount > 0 && (
                    <span className="text-teal-700 font-medium"> ({linkedCount} collegat{linkedCount !== 1 ? "i" : "o"} in questa sessione)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Unmatched list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {unmatched.map(u => (
                <div key={u.stripeCustomerId} className="border rounded-lg p-4 space-y-3">
                  {/* Stripe customer info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email || "Nessuna email"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmtEur(u.mrr)}/mo</p>
                      <p className="text-xs text-gray-400">{u.planName}</p>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Cerca lead CRM per nome o email..."
                      value={searchQueries[u.stripeCustomerId] || ""}
                      onChange={e => setSearchQueries(prev => ({ ...prev, [u.stripeCustomerId]: e.target.value }))}
                      className="pl-8 h-8 text-sm"
                    />
                    {searchLoading[u.stripeCustomerId] && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />
                    )}
                  </div>

                  {/* Search results */}
                  {(searchResults[u.stripeCustomerId]?.length ?? 0) > 0 && (
                    <div className="border rounded bg-gray-50 divide-y">
                      {searchResults[u.stripeCustomerId].map(contact => (
                        <div key={contact._id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 truncate">{contact.name || contact.email}</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                            disabled={linkingId === u.stripeCustomerId}
                            onClick={() => linkContact(contact._id, u.stripeCustomerId)}
                          >
                            {linkingId === u.stripeCustomerId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Link2 className="w-3 h-3 mr-1" />
                                Collega
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQueries[u.stripeCustomerId]?.length >= 2 &&
                    !searchLoading[u.stripeCustomerId] &&
                    searchResults[u.stripeCustomerId]?.length === 0 && (
                    <p className="text-xs text-gray-400 italic px-1">Nessun lead trovato</p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            {unmatched.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Tutti i clienti Stripe sono ora collegati!</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Done (all matched from the start) */}
        {step === "done" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto" />
            <div>
              <p className="text-base font-medium text-gray-900">Tutto sincronizzato!</p>
              <p className="text-sm text-gray-500 mt-1">
                Tutti i <strong>{totalStripe}</strong> clienti Stripe attivi sono collegati a un lead CRM.
              </p>
            </div>
            <Button onClick={handleClose} variant="outline">Chiudi</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
