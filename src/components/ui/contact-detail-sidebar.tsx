"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Plus, Mail, Phone, MessageCircle, Instagram, Clock, ArrowRight, User as UserIcon, Edit, Trash2, Save, XCircle, Users, CalendarClock, StickyNote, Bot, ExternalLink, CreditCard, RefreshCw, ExternalLink as LinkIcon, Search, Loader2, Link } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Contact, ContactStatus, ContactSource, User, StripeInvoice } from "@/types/contact";
import { Activity, ActivityType, CreateActivityRequest, CallOutcome } from "@/types/activity";
import { apiClient } from "@/lib/api";
import { getAllStatuses, getStatusLabel, isPipelineStatus, getStatusColor } from "@/lib/status-utils";
import { CallDialog, CallDialogHandle } from "./call-dialog";
import { CallScriptDialog } from "./call-script-dialog";
import { CallbackDialog } from "./callback-dialog";

interface ContactDetailSidebarProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onContactUpdate: (contact: Contact) => void;
  initialActivity?: {
    type: ActivityType;
    data?: object;
  };
}

const STRIPE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Attivo", color: "bg-emerald-100 text-emerald-800" },
  trialing: { label: "Trial", color: "bg-blue-100 text-blue-800" },
  past_due: { label: "Pagamento in ritardo", color: "bg-amber-100 text-amber-800" },
  canceled: { label: "Cancellato", color: "bg-red-100 text-red-800" },
  incomplete: { label: "Incompleto", color: "bg-gray-100 text-gray-600" },
  unpaid: { label: "Non pagato", color: "bg-red-100 text-red-700" },
  paused: { label: "In pausa", color: "bg-gray-100 text-gray-600" },
};

function StripeSection({ contact, onContactUpdate }: { contact: Contact; onContactUpdate: (c: Contact) => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);
  const [showManualLink, setShowManualLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; name: string; description: string | null; created: string; subscription: { status: string; plan: string; productName: string | null } | null }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const sd = contact.stripeData;
  const hasData = !!sd?.subscriptionId;

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      setShowManualLink(false);
      const res = await apiClient.stripeSyncContact(contact._id);
      if (res.success && res.data) {
        onContactUpdate(res.data);
        const synced = res.data.stripeData?.subscriptionId;
        if (synced) {
          setSyncMessage({ type: "success", text: "Abbonamento sincronizzato!" });
        } else {
          setSyncMessage({ type: "warning", text: "Nessun abbonamento trovato per questa email." });
          setShowManualLink(true);
        }
      } else {
        setSyncMessage({ type: "error", text: (res as { message?: string }).message || "Errore nella sincronizzazione" });
      }
    } catch (err) {
      console.error("Stripe sync error:", err);
      setSyncMessage({ type: "error", text: err instanceof Error ? err.message : "Errore di connessione" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await apiClient.stripeSearchCustomers(q);
        if (res.success && res.data) setSearchResults(res.data);
      } catch (err) {
        console.error("Stripe search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleLink = async (stripeCustomerId: string) => {
    try {
      setIsLinking(true);
      const res = await apiClient.stripeLinkCustomer(contact._id, stripeCustomerId);
      if (res.success && res.data) {
        onContactUpdate(res.data);
        setShowManualLink(false);
        setSearchQuery("");
        setSearchResults([]);
        setSyncMessage({ type: "success", text: "Cliente Stripe collegato!" });
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (err) {
      console.error("Stripe link error:", err);
      setSyncMessage({ type: "error", text: err instanceof Error ? err.message : "Errore nel collegamento" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Sei sicuro di voler scollegare questo abbonamento Stripe?")) return;
    try {
      setIsSyncing(true);
      const res = await apiClient.stripeUnlinkCustomer(contact._id);
      if (res.success && res.data) {
        onContactUpdate(res.data);
        setShowInvoices(false);
        setInvoices([]);
        setSyncMessage({ type: "success", text: "Abbonamento scollegato." });
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (err) {
      console.error("Stripe unlink error:", err);
      setSyncMessage({ type: "error", text: err instanceof Error ? err.message : "Errore nello scollegamento" });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadInvoices = async () => {
    if (showInvoices) { setShowInvoices(false); return; }
    try {
      setLoadingInvoices(true);
      const res = await apiClient.stripeGetInvoices(contact._id);
      if (res.success && res.data) setInvoices(res.data);
      setShowInvoices(true);
    } catch (err) {
      console.error("Invoice load error:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const statusInfo = sd?.subscriptionStatus ? STRIPE_STATUS_LABELS[sd.subscriptionStatus] : null;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-indigo-600" />
          <h4 className="font-medium text-gray-900">Stripe</h4>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <button
              onClick={handleUnlink}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              <XCircle className="h-3 w-3" />
              Scollega
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sync..." : "Sincronizza"}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`rounded-md px-3 py-2 text-xs mb-2 ${
          syncMessage.type === "success" ? "bg-emerald-50 text-emerald-700" :
          syncMessage.type === "warning" ? "bg-amber-50 text-amber-700" :
          "bg-red-50 text-red-700"
        }`}>
          {syncMessage.text}
        </div>
      )}

      {!hasData ? (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 text-center">Nessun abbonamento Stripe collegato.</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              {isSyncing ? "Ricerca..." : "Cerca automatica"}
            </button>
            <span className="text-xs text-gray-300">|</span>
            <button
              onClick={() => { setShowManualLink(v => !v); setSyncMessage(null); }}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Collega manualmente
            </button>
          </div>
          {showManualLink && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Cerca per nome o email Stripe..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {isSearching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto border rounded-md bg-white divide-y">
                  {searchResults.map(c => {
                    const sub = c.subscription;
                    const statusColors: Record<string, string> = {
                      active: "text-emerald-700 bg-emerald-50",
                      trialing: "text-blue-700 bg-blue-50",
                      past_due: "text-amber-700 bg-amber-50",
                      canceled: "text-red-600 bg-red-50",
                    };
                    const statusLabels: Record<string, string> = {
                      active: "Attivo", trialing: "Trial", past_due: "Scaduto",
                      canceled: "Cancellato", paused: "In pausa",
                    };
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleLink(c.id)}
                        disabled={isLinking}
                        className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{c.name || "—"}</p>
                            {c.description && c.description !== c.name && (
                              <p className="text-[11px] text-gray-600 truncate">{c.description}</p>
                            )}
                            <p className="text-[11px] text-gray-400 truncate">{c.email || "no email"}</p>
                            {sub ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[sub.status] || "text-gray-600 bg-gray-100"}`}>
                                  {statusLabels[sub.status] || sub.status}
                                </span>
                                <span className="text-[11px] text-gray-700 font-medium">{sub.plan}</span>
                                {sub.productName && <span className="text-[10px] text-gray-400 truncate">· {sub.productName}</span>}
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-400 mt-0.5">Nessun abbonamento</p>
                            )}
                          </div>
                          <Link className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-1">Nessun cliente trovato</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-indigo-50/50 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Stato</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo?.color || "bg-gray-100 text-gray-600"}`}>
              {statusInfo?.label || sd?.subscriptionStatus || "—"}
            </span>
          </div>
          {sd?.planName && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Piano</span>
              <span className="text-sm font-medium text-gray-900">{sd.planName}</span>
            </div>
          )}
          {sd?.planInterval && (() => {
            const count = sd.planIntervalCount || 1;
            const labels: Record<string, string> = {
              year: count === 1 ? "Annuale" : `Ogni ${count} anni`,
              month: count === 1 ? "Mensile" : count === 2 ? "Bimestrale" : count === 3 ? "Trimestrale" : count === 4 ? "Quadrimestrale" : count === 6 ? "Semestrale" : `Ogni ${count} mesi`,
              week: count === 1 ? "Settimanale" : `Ogni ${count} settimane`,
              day: count === 1 ? "Giornaliera" : `Ogni ${count} giorni`,
            };
            return (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Fatturazione</span>
                <span className="text-xs text-gray-900">{labels[sd.planInterval] || sd.planInterval}</span>
              </div>
            );
          })()}
          {typeof sd?.mrrFromStripe === "number" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">MRR</span>
                <span className="text-sm font-bold text-emerald-700">€{sd.mrrFromStripe.toLocaleString("it-IT")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">ARR</span>
                <span className="text-sm font-semibold text-emerald-600">€{(sd.mrrFromStripe * 12).toLocaleString("it-IT")}</span>
              </div>
            </>
          )}
          {sd?.subscriptionStartDate && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Inizio</span>
              <span className="text-xs text-gray-900">
                {new Date(sd.subscriptionStartDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          )}
          {sd?.currentPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Prossimo rinnovo</span>
              <span className="text-xs text-gray-900">
                {new Date(sd.currentPeriodEnd).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          )}
          {sd?.paymentMethodBrand && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Pagamento</span>
              <span className="text-xs text-gray-900 capitalize">{sd.paymentMethodBrand} •••• {sd.paymentMethodLast4}</span>
            </div>
          )}
          {sd?.lastPaymentDate && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Ultimo pagamento</span>
              <span className="text-xs text-gray-900">
                €{sd.lastPaymentAmount} — {new Date(sd.lastPaymentDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
              </span>
            </div>
          )}
          {sd?.syncedAt && (
            <p className="text-[10px] text-gray-400 pt-1 border-t">
              Ultimo sync: {new Date(sd.syncedAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          <button
            onClick={loadInvoices}
            disabled={loadingInvoices}
            className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
          >
            {loadingInvoices ? "Caricamento..." : showInvoices ? "Nascondi fatture" : "Vedi fatture"}
          </button>

          {showInvoices && invoices.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                  <div>
                    <span className="font-medium text-gray-900">€{inv.amount}</span>
                    <span className="text-gray-400 ml-1.5">
                      {new Date(inv.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {inv.status === "paid" ? "Pagata" : inv.status}
                    </span>
                    {inv.invoiceUrl && (
                      <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showInvoices && invoices.length === 0 && (
            <p className="text-xs text-gray-400 text-center">Nessuna fattura trovata.</p>
          )}
        </div>
      )}
    </div>
  );
}

function BonificoSection({ contact, onContactUpdate }: { contact: Contact; onContactUpdate: (c: Contact) => void }) {
  const props = contact.properties || {};
  const hasData = props.paymentMethod === 'bonifico_bancario';
  const mrr = props.manualMrr as number | undefined;
  const plan = props.manualPlanName as string | undefined;
  const startDate = props.manualSubscriptionStart as string | undefined;
  const renewalDate = props.manualRenewalDate as string | undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    planName: plan || '',
    mrr: mrr?.toString() || '',
    startDate: startDate || '',
    renewalDate: renewalDate || '',
  });

  useEffect(() => {
    setFormData({
      planName: (props.manualPlanName as string) || '',
      mrr: (props.manualMrr as number)?.toString() || '',
      startDate: (props.manualSubscriptionStart as string) || '',
      renewalDate: (props.manualRenewalDate as string) || '',
    });
  }, [contact._id, props.manualPlanName, props.manualMrr, props.manualSubscriptionStart, props.manualRenewalDate]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const mrrVal = parseFloat(formData.mrr);
      const newProps: Record<string, string | number | boolean> = {
        ...contact.properties,
        paymentMethod: 'bonifico_bancario',
      };
      if (formData.planName) newProps.manualPlanName = formData.planName;
      if (!isNaN(mrrVal)) newProps.manualMrr = mrrVal;
      if (formData.startDate) newProps.manualSubscriptionStart = formData.startDate;
      if (formData.renewalDate) newProps.manualRenewalDate = formData.renewalDate;
      const res = await apiClient.updateContact(contact._id, {
        properties: newProps,
      });
      if (res.success && res.data) {
        onContactUpdate(res.data);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Errore salvataggio bonifico:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Rimuovere il pagamento con bonifico bancario?")) return;
    setIsSaving(true);
    try {
      const newProps = { ...contact.properties };
      delete newProps.paymentMethod;
      delete newProps.manualPlanName;
      delete newProps.manualMrr;
      delete newProps.manualSubscriptionStart;
      delete newProps.manualRenewalDate;
      const res = await apiClient.updateContact(contact._id, { properties: newProps });
      if (res.success && res.data) {
        onContactUpdate(res.data);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Errore rimozione bonifico:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const BankIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 8h20" />
      <path d="M6 12h4" />
    </svg>
  );

  if (!hasData && !isEditing) {
    return (
      <div className="border-t pt-4">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg py-2.5 transition-colors"
        >
          <BankIcon />
          Aggiungi pagamento con bonifico
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <BankIcon />
          <h4 className="font-medium text-gray-900">Bonifico Bancario</h4>
        </div>
        <div className="bg-amber-50/50 rounded-lg p-3 space-y-2.5">
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Piano</label>
            <select
              value={formData.planName}
              onChange={e => setFormData(f => ({ ...f, planName: e.target.value }))}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Seleziona piano...</option>
              <option value="Menuchat Mensile">Menuchat Mensile</option>
              <option value="Menuchat Trimestrale">Menuchat Trimestrale</option>
              <option value="Menuchat Quadrimestrale">Menuchat Quadrimestrale</option>
              <option value="Menuchat Semestrale">Menuchat Semestrale</option>
              <option value="Menuchat Annuale">Menuchat Annuale</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">MRR (€/mese)</label>
            <input
              type="number"
              step="0.01"
              value={formData.mrr}
              onChange={e => setFormData(f => ({ ...f, mrr: e.target.value }))}
              placeholder="es. 107.50"
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Data inizio</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Prossimo rinnovo</label>
            <input
              type="date"
              value={formData.renewalDate}
              onChange={e => setFormData(f => ({ ...f, renewalDate: e.target.value }))}
              className="w-full text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md py-1.5 disabled:opacity-50"
            >
              {isSaving ? "Salvataggio..." : "Salva"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Annulla
            </button>
            {hasData && (
              <button
                onClick={handleRemove}
                disabled={isSaving}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
              >
                Rimuovi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const mrrVal = typeof mrr === "number" ? mrr : 0;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BankIcon />
          <h4 className="font-medium text-gray-900">Bonifico Bancario</h4>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
        >
          Modifica
        </button>
      </div>
      <div className="bg-amber-50/50 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Stato</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
            Attivo
          </span>
        </div>
        {plan && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Piano</span>
            <span className="text-sm font-medium text-gray-900">{plan}</span>
          </div>
        )}
        {mrrVal > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">MRR</span>
              <span className="text-sm font-bold text-emerald-700">€{mrrVal.toLocaleString("it-IT")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">ARR</span>
              <span className="text-sm font-semibold text-emerald-600">€{(mrrVal * 12).toLocaleString("it-IT")}</span>
            </div>
          </>
        )}
        {startDate && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Inizio</span>
            <span className="text-xs text-gray-900">
              {new Date(startDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        )}
        {renewalDate && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Prossimo rinnovo</span>
            <span className="text-xs text-gray-900">
              {new Date(renewalDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Metodo</span>
          <span className="text-xs text-gray-900">Bonifico bancario</span>
        </div>
      </div>
    </div>
  );
}

const BUBBLE_PREVIEW = 220;

function AiAgentActivity({ description }: { description: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const extractSection = (label: string): string | null => {
    const re = new RegExp(
      `${label}[^:\\n]*:\\s*\\n?([\\s\\S]*?)(?=\\n\\s*\\n(?:Email inviata|Risposta cliente|Ragionamento AI)[^:\\n]*:|$)`,
      'i'
    );
    const m = description.match(re);
    if (!m) return null;
    const txt = m[1].replace(/^\s*"|"\s*$/g, '').trim();
    return txt || null;
  };

  const emailText = extractSection('Email inviata');
  const replyText = extractSection('Risposta cliente');
  const reasoningText = extractSection('Ragionamento AI');

  if (!emailText && !replyText) {
    return <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{description}</p>;
  }

  const bubbles: { label: string; text: string; side: 'noi' | 'cliente' | 'meta' }[] = [];
  if (emailText) bubbles.push({ label: 'Noi', text: emailText, side: 'noi' });
  if (replyText) bubbles.push({ label: 'Cliente', text: replyText, side: 'cliente' });
  if (reasoningText) bubbles.push({ label: 'AI', text: reasoningText, side: 'meta' });

  return (
    <div className="mt-2 space-y-2">
      {bubbles.map((b, i) => {
        if (b.side === 'meta') {
          return (
            <div key={i} className="flex items-start gap-1.5 px-1">
              <span className="text-[10px] font-medium text-violet-400 mt-0.5 shrink-0">AI</span>
              <p className="text-[11px] text-violet-500 italic leading-relaxed">{b.text}</p>
            </div>
          );
        }
        const isNoi = b.side === 'noi';
        const isLong = b.text.length > BUBBLE_PREVIEW;
        const isExpanded = expanded.has(i);
        const displayText = isLong && !isExpanded ? b.text.slice(0, BUBBLE_PREVIEW) + '…' : b.text;
        return (
          <div key={i} className={`flex flex-col gap-0.5 ${isNoi ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-gray-400 px-1">{isNoi ? 'Noi' : 'Cliente'}</span>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                isNoi ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}
            >
              {displayText}
              {isLong && (
                <button
                  onClick={() => toggle(i)}
                  className={`block mt-1 text-[11px] underline opacity-70 hover:opacity-100 ${isNoi ? 'text-violet-200' : 'text-gray-500'}`}
                >
                  {isExpanded ? 'Mostra meno' : 'Leggi tutto'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContactDetailSidebar({ contact, isOpen, onClose, onContactUpdate, initialActivity }: ContactDetailSidebarProps) {
  const [editedContact, setEditedContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingMRR, setPendingMRR] = useState<number | undefined>();
  const [pendingCloseDate, setPendingCloseDate] = useState<string>("");
  const [showMRRInput, setShowMRRInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);
  const [pendingActualCloseDate, setPendingActualCloseDate] = useState<string>("");
  const [showActualCloseDateInput, setShowActualCloseDateInput] = useState(false);
  const [isUpdatingActualCloseDate, setIsUpdatingActualCloseDate] = useState(false);

  // Conversazione WhatsApp da menu landing (Claude Managed Agents)
  const [landingConversation, setLandingConversation] = useState<Array<{ role: string; content: string; timestamp: string; channel?: string }>>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{description?: string; callOutcome?: CallOutcome}>({});

  const callDialogRef = useRef<CallDialogHandle>(null);

  const handleSidebarClose = async () => {
    await callDialogRef.current?.close();
    onClose();
  };

  // Stato per gestire gli owner disponibili
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingOwner, setIsUpdatingOwner] = useState(false);

  // Stato per il dialog callback/richiamo
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [isDeletingCallback, setIsDeletingCallback] = useState(false);

  const handleDeleteCallback = async () => {
    if (!contact) return;
    try {
      setIsDeletingCallback(true);
      const res = await apiClient.updateContactCallback(contact._id, { callbackAt: null, callbackNote: null });
      if (res.success && res.data) {
        onContactUpdate(res.data);
        setEditedContact(res.data);
      }
    } catch (err) {
      console.error('Errore cancellazione richiamo:', err);
    } finally {
      setIsDeletingCallback(false);
    }
  };

  // Stato per conversazioni AI Agent
  const [agentConversations, setAgentConversations] = useState<Array<{
    _id: string;
    status: string;
    stage: string;
    channel: string;
    agentIdentity: { name: string; surname: string };
    messages: Array<{ role: string; content: string; channel: string; createdAt: string }>;
    metrics: { messagesCount: number; agentMessagesCount: number; humanInterventions: number };
    context: { nextAction?: string };
    updatedAt: string;
  }>>([]);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  // Stato per nuova activity
  const [newActivity, setNewActivity] = useState<CreateActivityRequest>({
    type: 'email',
    description: '',
    data: {}
  });

  // Funzioni per modificare ed eliminare attività
  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity._id);
    setEditingData({
      description: activity.description || '',
      callOutcome: activity.data?.callOutcome
    });
  };

  const handleSaveActivity = async (activityId: string) => {
    try {
      await apiClient.updateActivity(activityId, editingData);
      setEditingActivity(null);
      setEditingData({});
      await loadActivities(); // Ricarica le attività
    } catch (error) {
      console.error('Errore nel salvare l\'attività:', error);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) {
      return;
    }

    try {
      await apiClient.deleteActivity(activityId);
      await loadActivities(); // Ricarica le attività
    } catch (error) {
      console.error('Errore nell\'eliminare l\'attività:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingActivity(null);
    setEditingData({});
  };

  const loadActivities = useCallback(async () => {
    if (!contact) return;
    
    try {
      setIsLoadingActivities(true);
      const response = await apiClient.getContactActivities(contact._id, { limit: 50 });
      
      if (response.success) {
        setActivities(response.data.activities);
      }
    } catch (error) {
      console.error('Errore caricamento activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [contact]);

  const loadLandingConversation = useCallback(async () => {
    if (!contact?.properties?.agentSessionId) return;
    try {
      setIsLoadingConversation(true);
      const sessionId = contact.properties.agentSessionId as string;
      const res = await fetch(
        `https://menuchat-backend.onrender.com/api/menu-landing/conversation/${sessionId}`
      );
      const data = await res.json();
      if (data.success && data.messages) {
        setLandingConversation(data.messages);
      }
    } catch {
      // Endpoint potrebbe non essere disponibile
    } finally {
      setIsLoadingConversation(false);
    }
  }, [contact]);

  const loadAgentConversations = useCallback(async () => {
    if (!contact) return;
    try {
      setIsLoadingAgent(true);
      const res = await apiClient.request<{ data: typeof agentConversations; total: number }>(
        `/agent/conversations?contactId=${contact._id}&status=all&limit=10`
      );
      if (res.success && res.data) {
        setAgentConversations(res.data.data || []);
      }
    } catch {
      // Agent endpoint potrebbe non esistere ancora
    } finally {
      setIsLoadingAgent(false);
    }
  }, [contact]);

  // Carica activities quando cambia il contatto
  useEffect(() => {
    if (contact && isOpen) {
      loadActivities();
      loadAgentConversations();
      loadLandingConversation();
      setEditedContact({ ...contact });
      
      // Se c'è un'activity iniziale, apri il form e precompilalo
      if (initialActivity) {
        setShowAddActivity(true);
        setNewActivity({
          type: initialActivity.type,
          description: '',
          data: initialActivity.data || {}
        });
      }
    }
  }, [contact, isOpen, loadActivities, initialActivity]);

  const handleSaveContact = async () => {
    if (!editedContact || !contact) return;

    try {
      const response = await apiClient.updateContact(editedContact._id, {
        name: editedContact.name,
        email: editedContact.email,
        phone: editedContact.phone,
        lists: editedContact.lists,
        properties: editedContact.properties
      });

      if (response.success && response.data) {
        onContactUpdate(response.data);
        setEditedContact(response.data);
      }
    } catch (error) {
      console.error('Errore aggiornamento contatto:', error);
    }
  };

  const handleResetChanges = () => {
    setEditedContact(contact ? { ...contact } : null);
  };

  const handleStatusChange = async (newStatus: ContactStatus, mrr?: number, closeDate?: string) => {
    if (!contact) return;

    try {
      setIsUpdatingStatus(true);

      const payload: { status: ContactStatus; mrr?: number; closeDate?: string | null } = {
        status: newStatus,
        mrr
      };
      if (closeDate !== undefined) {
        payload.closeDate = closeDate || null;
      }

      const response = await apiClient.updateContactStatus(contact._id, payload);

      if (response.success && response.data) {
        setEditedContact(response.data);
        onContactUpdate(response.data);
        loadActivities();
        
        setShowMRRInput(false);
        setPendingMRR(undefined);
        setPendingCloseDate("");
        setPendingStatus(null);
      }
    } catch (error) {
      console.error('Errore aggiornamento status:', error);
      alert('Errore durante l\'aggiornamento dello status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleActualCloseDateSave = async () => {
    if (!contact) return;
    try {
      setIsUpdatingActualCloseDate(true);
      const isoDate = pendingActualCloseDate ? new Date(pendingActualCloseDate + "T12:00:00").toISOString() : null;
      const response = await apiClient.updateActualCloseDate(contact._id, isoDate);
      if (response.success && response.data) {
        onContactUpdate(response.data);
      }
      setShowActualCloseDateInput(false);
    } catch (error) {
      console.error('Errore aggiornamento data chiusura effettiva:', error);
      alert('Errore durante l\'aggiornamento della data di chiusura effettiva');
    } finally {
      setIsUpdatingActualCloseDate(false);
    }
  };

  const closeDateStatuses: ContactStatus[] = ['qr code inviato', 'free trial iniziato'];

  const onStatusSelectChange = (newStatus: ContactStatus) => {
    if (!contact || newStatus === contact.status) return;

    // Sempre mostrare il form MRR + closeDate quando si entra in QR o FT
    if (closeDateStatuses.includes(newStatus)) {
      setPendingStatus(newStatus);
      setShowMRRInput(true);
      setPendingMRR(contact.mrr || 0);
      // Pre-fill closeDate: usa quella esistente o +25gg da oggi
      if (contact.properties?.closeDate) {
        setPendingCloseDate(new Date(String(contact.properties.closeDate)).toISOString().slice(0, 10));
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 25);
        setPendingCloseDate(d.toISOString().slice(0, 10));
      }
      return;
    }

    // Per altri status pipeline, mostrare form MRR solo se manca
    if (isPipelineStatus(newStatus)) {
      if (!contact.mrr || !isPipelineStatus(contact.status)) {
        setPendingStatus(newStatus);
        setShowMRRInput(true);
        setPendingMRR(contact.mrr || 0);
        setPendingCloseDate("");
        return;
      }
    }

    handleStatusChange(newStatus, contact.mrr || pendingMRR);
  };

  const onMRRConfirm = () => {
    if (!contact || pendingMRR === undefined) return;
    
    const newStatus = pendingStatus || contact.status;
    const closeDateISO = pendingCloseDate ? new Date(pendingCloseDate + "T23:59:59").toISOString() : undefined;
    handleStatusChange(newStatus, pendingMRR, closeDateISO);
  };

  const handleAddActivity = async () => {
    if (!contact) return;

    try {
      const response = await apiClient.createActivity(contact._id, newActivity);
      
      if (response.success) {
        setActivities(prev => [response.data, ...prev]);
        setShowAddActivity(false);
        setNewActivity({
          type: 'email',
          description: '',
          data: {}
        });
      }
    } catch (error) {
      console.error('Errore creazione activity:', error);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    const iconMap = {
      email: Mail,
      call: Phone,
      whatsapp: MessageCircle,
      instagram_dm: Instagram,
      status_change: ArrowRight,
      note: StickyNote,
      ai_agent: Bot
    };
    return iconMap[type] || Mail;
  };

  const getActivityColor = (type: ActivityType) => {
    const colorMap = {
      email: 'bg-blue-100 text-blue-800',
      call: 'bg-green-100 text-green-800',
      whatsapp: 'bg-emerald-100 text-emerald-800',
      instagram_dm: 'bg-purple-100 text-purple-800',
      status_change: 'bg-orange-100 text-orange-800',
      note: 'bg-yellow-100 text-yellow-800',
      ai_agent: 'bg-violet-100 text-violet-800'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };


  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset ore per confronto accurato dei giorni
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const time = date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (activityDate.getTime() === today.getTime()) {
      return `Oggi alle ${time}`;
    } else if (activityDate.getTime() === yesterday.getTime()) {
      return `Ieri alle ${time}`;
    } else {
      // Calcola i giorni di differenza per date più vecchie
      const diffTime = today.getTime() - activityDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7 && diffDays > 1) {
        return `${diffDays} giorni fa alle ${time}`;
      }
      
      const dateStr = date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined
      });
      
      return `${dateStr} alle ${time}`;
    }
  };

  // Funzione per caricare gli utenti disponibili
  const loadAvailableUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const response = await apiClient.getUsersForAssignment();
      
      if (response.success && response.data) {
        setAvailableUsers(response.data.users);
      }
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const [isUpdatingSource, setIsUpdatingSource] = useState(false);

  const handleSourceChange = async (newSource: ContactSource) => {
    if (!contact || !editedContact || newSource === contact.source) return;
    try {
      setIsUpdatingSource(true);
      const response = await apiClient.updateContact(contact._id, { source: newSource });
      if (response.success && response.data) {
        onContactUpdate(response.data);
        setEditedContact(response.data);
      }
    } catch (error) {
      console.error('Errore aggiornamento sorgente:', error);
      if (contact) setEditedContact({ ...contact });
    } finally {
      setIsUpdatingSource(false);
    }
  };

  // Funzione per aggiornare l'owner del contatto
  const handleOwnerChange = async (newOwnerId: string) => {
    if (!contact || !editedContact || newOwnerId === contact.owner?._id) return;

    try {
      setIsUpdatingOwner(true);
      const response = await apiClient.updateContact(contact._id, {
        owner: newOwnerId
      });

      if (response.success && response.data) {
        // Aggiorna il contatto nel componente padre
        onContactUpdate(response.data);
        // Aggiorna lo stato locale
        setEditedContact(response.data);
        console.log('✅ Owner aggiornato con successo');
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento owner:', error);
      // Ripristina lo stato precedente in caso di errore
      if (contact) {
        setEditedContact({ ...contact });
      }
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // Carica gli utenti quando il componente si monta
  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
    }
  }, [isOpen, loadAvailableUsers]);

  if (!isOpen || !contact) return null;

  return (
    <>
      {/* Sidebar con animazione moderna */}
      <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 transition-all duration-300 ease-out ${
        isOpen ? 'w-[80vw] translate-x-0' : 'w-0 translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{contact.name}</h2>
                  {(() => {
                    const sourceBadges: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
                      'inbound_menu_landing': { label: 'Google Ads', emoji: '📱', bg: 'bg-blue-100', text: 'text-blue-800' },
                      'inbound_social_proof': { label: 'Social Proof', emoji: '🎬', bg: 'bg-pink-100', text: 'text-pink-800' },
                      'inbound_prova_gratuita': { label: 'Prova Gratuita', emoji: '🚀', bg: 'bg-green-100', text: 'text-green-800' },
                      'inbound_qr_recensioni': { label: 'QR Recensioni', emoji: '⭐', bg: 'bg-red-100', text: 'text-red-800' },
                      'inbound_rank_checker': { label: 'Rank Checker', emoji: '🎯', bg: 'bg-teal-100', text: 'text-teal-800' },
                    };
                    const badge = contact.source ? sourceBadges[contact.source] : undefined;
                    return badge ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.emoji} {badge.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="text-sm text-gray-600">{contact.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {contact.phone && (
                <CallDialog
                  ref={callDialogRef}
                  contact={contact}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Chiama
                    </Button>
                  }
                  onCallComplete={loadActivities}
                />
              )}
              <Button variant="ghost" size="sm" onClick={handleSidebarClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Status Select */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex items-center gap-2">
                <Select 
                  value={contact.status} 
                  onValueChange={onStatusSelectChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllStatuses().map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                          {getStatusLabel(status)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Bottone Script Chiamata - per tutti i contatti inbound */}
                {contact.source?.startsWith('inbound_') && (
                  <CallScriptDialog contact={contact} />
                )}
              </div>
            </div>
            
            {/* MRR + Close Date Display/Edit */}
            {(isPipelineStatus(contact.status) || showMRRInput) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">MRR:</span>
                  {showMRRInput ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="number"
                        placeholder="€"
                        value={pendingMRR || ''}
                        onChange={(e) => setPendingMRR(Number(e.target.value))}
                        className="w-20 h-8"
                        min="0"
                      />
                      {(closeDateStatuses.includes(pendingStatus as ContactStatus) || (!pendingStatus && closeDateStatuses.includes(contact.status as ContactStatus))) && (
                        <>
                          <span className="text-sm font-medium text-gray-700">Close date:</span>
                          <Input
                            type="date"
                            value={pendingCloseDate}
                            onChange={(e) => setPendingCloseDate(e.target.value)}
                            className="w-36 h-8"
                          />
                        </>
                      )}
                      <Button size="sm" onClick={onMRRConfirm} disabled={isUpdatingStatus}>
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowMRRInput(false);
                          setPendingMRR(undefined);
                          setPendingCloseDate("");
                          setPendingStatus(null);
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-green-600">
                        €{contact.mrr || 0}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setPendingMRR(contact.mrr || 0);
                          setPendingStatus(null);
                          if (contact.properties?.closeDate) {
                            setPendingCloseDate(new Date(String(contact.properties.closeDate)).toISOString().slice(0, 10));
                          } else {
                            setPendingCloseDate("");
                          }
                          setShowMRRInput(true);
                        }}
                        title="Modifica MRR"
                      >
                        ✏️
                      </Button>
                    </div>
                  )}
                </div>

                {/* Close Date display for QR/FT contacts */}
                {!showMRRInput && ['qr code inviato', 'free trial iniziato'].includes(contact.status) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Close date:</span>
                    <span className="text-sm text-gray-600">
                      {contact.properties?.closeDate
                        ? new Date(String(contact.properties.closeDate)).toLocaleDateString("it-IT")
                        : "Non impostata"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setPendingMRR(contact.mrr || 0);
                        setPendingCloseDate(
                          contact.properties?.closeDate
                            ? new Date(String(contact.properties.closeDate)).toISOString().slice(0, 10)
                            : ""
                        );
                        setPendingStatus(null);
                        setShowMRRInput(true);
                      }}
                      title="Modifica close date"
                    >
                      ✏️
                    </Button>
                  </div>
                )}

                {/* Actual Close Date per contatti won */}
                {contact.status === 'won' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Chiusura effettiva:</span>
                    {showActualCloseDateInput ? (
                      <>
                        <Input
                          type="date"
                          value={pendingActualCloseDate}
                          onChange={(e) => setPendingActualCloseDate(e.target.value)}
                          className="w-36 h-8"
                        />
                        <Button size="sm" onClick={handleActualCloseDateSave} disabled={isUpdatingActualCloseDate}>
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowActualCloseDateInput(false)}
                        >
                          ✕
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-600">
                          {contact.properties?.actualCloseDate
                            ? new Date(String(contact.properties.actualCloseDate)).toLocaleDateString("it-IT")
                            : "Non impostata"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setPendingActualCloseDate(
                              contact.properties?.actualCloseDate
                                ? new Date(String(contact.properties.actualCloseDate)).toISOString().slice(0, 10)
                                : ""
                            );
                            setShowActualCloseDateInput(true);
                          }}
                          title="Modifica data chiusura effettiva"
                        >
                          ✏️
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content - Layout a due colonne */}
        <div className="flex-1 flex overflow-hidden">
          {/* Colonna sinistra - Proprietà contatto */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Proprietà</h3>
              
              {editedContact && (
                <div className="space-y-4">
                  {/* Proprietà base */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Nome</label>
                    <Input
                      value={editedContact.name}
                      onChange={(e) => setEditedContact(prev => prev ? { ...prev, name: e.target.value } : null)}
                      onBlur={() => handleSaveContact()}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                    <Input
                      type="email"
                      value={editedContact.email || ''}
                      onChange={(e) => setEditedContact(prev => prev ? { ...prev, email: e.target.value } : null)}
                      onBlur={() => handleSaveContact()}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Telefono</label>
                    <Input
                      value={editedContact.phone || ''}
                      onChange={(e) => setEditedContact(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      onBlur={() => handleSaveContact()}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      <Users className="inline h-4 w-4 mr-1" />
                      Proprietario
                    </label>
                    <Select 
                      value={editedContact.owner?._id || ""} 
                      onValueChange={handleOwnerChange}
                      disabled={isUpdatingOwner || isLoadingUsers}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona proprietario..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span>Caricamento...</span>
                            </div>
                          </SelectItem>
                        ) : (
                          availableUsers.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>{user.firstName} {user.lastName}</span>
                                <span className="text-xs text-gray-500">({user.role})</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {isUpdatingOwner && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                        Aggiornamento in corso...
                      </div>
                    )}
                  </div>

                  {/* Source */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Sorgente</label>
                    <Select
                      value={editedContact?.source || contact.source || 'manual'}
                      onValueChange={(v) => handleSourceChange(v as ContactSource)}
                      disabled={isUpdatingSource}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {([
                          ['smartlead_outbound', 'Smartlead Outbound', 'bg-blue-500'],
                          ['inbound_rank_checker', 'Rank Checker Organic', 'bg-teal-500'],
                          ['inbound_prova_gratuita', 'Meta — Prova Gratuita', 'bg-green-500'],
                          ['inbound_menu_landing', 'Google Ads — Menu', 'bg-blue-600'],
                          ['inbound_social_proof', 'Meta — Social Proof', 'bg-pink-500'],
                          ['inbound_qr_recensioni', 'Google Ads — QR Recensioni', 'bg-red-500'],
                          ['csv_import', 'CSV Import', 'bg-orange-500'],
                          ['manual', 'Manuale', 'bg-gray-500'],
                          ['referral', 'Referral', 'bg-pink-500'],
                        ] as const).map(([value, label, dot]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${dot}`} />
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isUpdatingSource && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                        Aggiornamento in corso...
                      </div>
                    )}
                  </div>

                  {/* Sezione Pagamento */}
                  {contact.stripeCustomerId || contact.stripeData?.subscriptionId ? (
                    <>
                      <StripeSection contact={contact} onContactUpdate={onContactUpdate} />
                      {contact.properties?.paymentMethod === 'bonifico_bancario' && (
                        <BonificoSection contact={contact} onContactUpdate={onContactUpdate} />
                      )}
                    </>
                  ) : (
                    <BonificoSection contact={contact} onContactUpdate={onContactUpdate} />
                  )}

                  {/* Sezione Richiamo */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarClock className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Richiamo</h4>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Data/ora:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {contact.properties?.callbackAt
                            ? new Date(contact.properties.callbackAt as string).toLocaleString('it-IT', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Non impostato'}
                        </span>
                      </div>
                      {contact.properties?.callbackNote && (
                        <div>
                          <span className="text-xs text-gray-600">Nota:</span>
                          <p className="text-sm text-gray-800 mt-0.5">{contact.properties.callbackNote as string}</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => setCallbackDialogOpen(true)}
                        >
                          <CalendarClock className="h-3 w-3 mr-1" />
                          {contact.properties?.callbackAt ? 'Modifica' : 'Imposta richiamo'}
                        </Button>
                        {contact.properties?.callbackAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                            onClick={handleDeleteCallback}
                            disabled={isDeletingCallback}
                            title="Cancella richiamo"
                          >
                            {isDeletingCallback
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </Button>
                        )}
                      </div>
                    </div>

                    <CallbackDialog
                      open={callbackDialogOpen}
                      onOpenChange={setCallbackDialogOpen}
                      contactId={contact._id}
                      contactName={contact.name}
                      currentCallbackAt={contact.properties?.callbackAt as string | null | undefined}
                      currentCallbackNote={contact.properties?.callbackNote as string | null | undefined}
                      onSaved={(updatedContact) => {
                        onContactUpdate(updatedContact);
                        setEditedContact(updatedContact);
                      }}
                    />
                  </div>

                  {/* Sezione Menu Landing (per lead da Google Ads / Social Proof) */}
                  {(contact.source === 'inbound_menu_landing' || contact.source === 'inbound_social_proof' || contact.source === 'inbound_qr_recensioni') && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🍽️</span>
                        <h4 className="font-medium text-gray-900">Menu & Conversazione</h4>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3">
                        {/* Link al menu */}
                        {contact.properties?.menuPreviewUrl && (
                          <a
                            href={contact.properties.menuPreviewUrl as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm shadow-lg"
                          >
                            🍽️ Vedi Menu Digitale Creato
                          </a>
                        )}

                        {/* Link WhatsApp diretto */}
                        {contact.phone && (
                          <a
                            href={`https://wa.me/${contact.phone.replace('+', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm"
                          >
                            💬 Apri Chat WhatsApp
                          </a>
                        )}

                        {/* Dati ristorante dal form */}
                        {contact.rankCheckerData?.restaurantData && (
                          <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
                            <div className="text-xs font-bold text-gray-700 mb-2">🏪 Dati Ristorante</div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-500">⭐</span>
                                <span className="font-bold text-lg">
                                  {contact.rankCheckerData.restaurantData.rating?.toFixed(1) || 'N/A'}
                                </span>
                                <span className="text-gray-500 text-sm">
                                  ({contact.rankCheckerData.restaurantData.reviewCount || 0} recensioni)
                                </span>
                              </div>
                            </div>
                            {contact.rankCheckerData.restaurantData.address && (
                              <div className="text-sm">
                                <div className="text-xs text-gray-500 mb-1">📍 Indirizzo</div>
                                <div className="text-gray-900">{contact.rankCheckerData.restaurantData.address}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Suggerimento approccio vendita */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="text-xs font-bold text-amber-800 mb-1">💡 Come approcciare</div>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            {contact.source === 'inbound_social_proof'
                              ? 'Ha visto il video con i risultati reali. Parla dei numeri (Impact Food +913, Il Porto +1565). Ha già il menu — proponi la prova gratuita delle recensioni.'
                              : contact.source === 'inbound_qr_recensioni'
                              ? 'Cercava un QR per recensioni. Ha ricevuto il menu digitale. Mostra come il QR del menu raccoglie recensioni automaticamente — è quello che cercava.'
                              : 'Ha ricevuto il menu digitale su WhatsApp. Chiedi com\'è andato, poi presenta il sistema recensioni come upgrade naturale: stesso QR, le recensioni arrivano da sole.'
                            }
                          </p>
                        </div>

                        {/* Google Maps */}
                        {contact.rankCheckerData?.placeId && (
                          <a
                            href={`https://www.google.com/maps/place/?q=place_id:${contact.rankCheckerData.placeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            🗺️ Vedi su Google Maps
                          </a>
                        )}
                        {/* Conversazione WhatsApp con l'agente */}
                        {isLoadingConversation ? (
                          <div className="text-xs text-gray-400 text-center py-2">Caricamento conversazione...</div>
                        ) : landingConversation.length > 0 ? (
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="text-xs font-bold text-gray-700 mb-2">💬 Conversazione WhatsApp</div>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                              {landingConversation.map((msg, i) => (
                                <div key={i} className={`text-xs p-2 rounded-lg ${
                                  msg.role === 'lead'
                                    ? 'bg-gray-100 border border-gray-200'
                                    : 'bg-emerald-50 border border-emerald-200'
                                }`}>
                                  <span className="font-medium text-gray-500">
                                    {msg.role === 'lead' ? 'Cliente' : 'Marco (AI)'}
                                  </span>
                                  {msg.timestamp && (
                                    <span className="text-gray-300 ml-1 text-[10px]">
                                      {new Date(msg.timestamp).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                  <p className="text-gray-700 mt-0.5">{msg.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : contact.properties?.agentSessionId ? (
                          <div className="text-xs text-gray-400 text-center py-2">Nessun messaggio nella conversazione</div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Dati Rank Checker (per lead organici e prova gratuita) */}
                  {(contact.source === 'inbound_rank_checker' || contact.source === 'inbound_prova_gratuita') && contact.rankCheckerData && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🎯</span>
                        <h4 className="font-medium text-gray-900">Dati Rank Checker</h4>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
                        {/* Dati Ristorante */}
                        {contact.rankCheckerData.restaurantData && (
                          <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
                            <div className="text-xs font-bold text-gray-700 mb-2">🏪 Dati Ristorante</div>
                            
                            {/* Rating e Recensioni */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-500">⭐</span>
                                <span className="font-bold text-lg">
                                  {contact.rankCheckerData.restaurantData.rating?.toFixed(1) || 'N/A'}
                                </span>
                                <span className="text-gray-500 text-sm">
                                  ({contact.rankCheckerData.restaurantData.reviewCount || 0} recensioni)
                                </span>
                              </div>
                            </div>

                            {/* Indirizzo */}
                            {contact.rankCheckerData.restaurantData.address && (
                              <div className="text-sm">
                                <div className="text-xs text-gray-500 mb-1">📍 Indirizzo</div>
                                <div className="text-gray-900">{contact.rankCheckerData.restaurantData.address}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Ranking */}
                        {contact.rankCheckerData.ranking && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-xs text-gray-500 mb-1">Posizione</div>
                              <div className="text-2xl font-black text-blue-600">
                                {typeof contact.rankCheckerData.ranking.mainRank === 'number' 
                                  ? `#${contact.rankCheckerData.ranking.mainRank}` 
                                  : contact.rankCheckerData.ranking.mainRank || 'N/A'}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="text-xs text-gray-500 mb-1">Competitor Avanti</div>
                              <div className="text-2xl font-black text-red-600">
                                {contact.rankCheckerData.ranking.competitorsAhead || 0}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Keyword */}
                        {contact.rankCheckerData.keyword && (
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="text-xs text-gray-500 mb-1">🔍 Keyword Cercata</div>
                            <div className="font-bold text-gray-900">{contact.rankCheckerData.keyword}</div>
                          </div>
                        )}

                        {/* Data test Rank Checker */}
                        {(contact.rankCheckerData.leadCapturedAt || contact.rankCheckerData.qualifiedAt) && (
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="text-xs text-gray-500 mb-1">📅 Data test effettuato</div>
                            <div className="font-bold text-gray-900">
                              {new Date(contact.rankCheckerData.leadCapturedAt || contact.rankCheckerData.qualifiedAt!).toLocaleString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}

                        {/* Qualificazione */}
                        {contact.rankCheckerData.dailyCovers !== undefined && (
                          <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
                            <div className="text-xs font-bold text-gray-700 mb-2">📊 Qualificazione</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500">Menu Digitale:</span>
                                <div className="font-bold">
                                  {contact.rankCheckerData.hasDigitalMenu === true ? '✅ Sì' : contact.rankCheckerData.hasDigitalMenu === false ? '❌ No' : '—'}
                                </div>
                              </div>
                              {contact.rankCheckerData.hasDigitalMenu === false && (
                                <div>
                                  <span className="text-gray-500">Disposto:</span>
                                  <div className="font-bold">
                                    {contact.rankCheckerData.willingToAdoptMenu === true ? '✅ Sì' : contact.rankCheckerData.willingToAdoptMenu === false ? '❌ No' : '⚪ Non risposto'}
                                  </div>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Coperti/giorno:</span>
                                <div className="font-bold text-blue-600">{contact.rankCheckerData.dailyCovers}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Potenziale:</span>
                                <div className="font-bold text-green-600">
                                  {contact.rankCheckerData.estimatedMonthlyReviews} rec/mese
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Link Google Maps */}
                        {contact.rankCheckerData.placeId && (
                          <a
                            href={`https://www.google.com/maps/place/?q=place_id:${contact.rankCheckerData.placeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            🗺️ Vedi su Google Maps
                          </a>
                        )}

                        {/* 🆕 Link al Report Rank Checker */}
                        {(contact.properties?.rankCheckerReport || contact.properties?.rankCheckerBaseReport) && (
                          <a
                            href={(contact.properties.rankCheckerReport || contact.properties.rankCheckerBaseReport) as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm shadow-lg"
                          >
                            📊 Apri Report Rank Checker
                          </a>
                        )}

                        {/* 🆕 Info Richiesta Chiamata */}
                        {contact.properties?.callRequested && (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📞</span>
                              <span className="text-xs font-bold text-green-800">CHIAMATA RICHIESTA</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Preferenza:</span>
                                <span className="text-sm font-bold text-green-700 capitalize">
                                  {contact.properties.callPreference as string || 'Non specificata'}
                                </span>
                              </div>
                              {contact.properties.callRequestedAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Richiesta il:</span>
                                  <span className="text-xs text-gray-700">
                                    {new Date(contact.properties.callRequestedAt as string).toLocaleString('it-IT', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              )}
                              {contact.properties.callNote && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                  <span className="text-xs text-gray-600 block mb-1">Note:</span>
                                  <span className="text-xs text-gray-800 italic">
                                    {contact.properties.callNote as string}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Proprietà dinamiche */}
                  {contact.properties && Object.keys(contact.properties).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Proprietà Aggiuntive</h4>
                      <div className="space-y-3">
                        {Object.entries(contact.properties).map(([key]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-gray-700 block mb-1 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <Input
                              value={String(editedContact.properties?.[key] || '')}
                              onChange={(e) => setEditedContact(prev => prev ? {
                                ...prev,
                                properties: { ...prev.properties, [key]: e.target.value }
                              } : null)}
                              onBlur={() => handleSaveContact()}
                              placeholder={`Inserisci ${key.replace(/_/g, ' ')}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liste */}
                  {contact.lists.length > 0 && (
                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-gray-700 block mb-2">Liste</label>
                      <div className="flex flex-wrap gap-1">
                        {contact.lists.map((list, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {list}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" onClick={handleResetChanges} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Colonna destra - Activities */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">

            {/* Sezione AI Agent */}
            {agentConversations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">AI Agent</h4>
                </div>
                {agentConversations.map((conv) => {
                  const statusColors: Record<string, string> = {
                    active: 'bg-green-100 text-green-700',
                    awaiting_human: 'bg-orange-100 text-orange-700',
                    paused: 'bg-gray-100 text-gray-600',
                    escalated: 'bg-blue-100 text-blue-700',
                    converted: 'bg-emerald-100 text-emerald-700',
                    dead: 'bg-red-100 text-red-600',
                  };
                  const stageLabels: Record<string, string> = {
                    initial_reply: 'Prima risposta',
                    objection_handling: 'Gestione obiezioni',
                    qualification: 'Qualificazione',
                    scheduling: 'Prenotazione call',
                    handoff: 'Passaggio al team',
                  };
                  return (
                    <div key={conv._id} className="border border-purple-200 rounded-lg p-3 mb-2 bg-purple-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[conv.status] || 'bg-gray-100'}`}>
                            {conv.status === 'awaiting_human' ? 'In attesa review' : conv.status}
                          </span>
                          <span className="text-xs text-gray-500">{stageLabels[conv.stage] || conv.stage}</span>
                        </div>
                        {conv.status === 'awaiting_human' && (
                          <a href={`/agent/review?id=${conv._id}`} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                            Review <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        Agent: {conv.agentIdentity?.name} | {conv.metrics.messagesCount} msg | {conv.metrics.humanInterventions} interventi umani
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {conv.messages.slice(-6).map((msg, i) => (
                          <div key={i} className={`text-xs p-1.5 rounded ${
                            msg.role === 'lead' ? 'bg-white border' :
                            msg.role === 'human' ? 'bg-blue-50 border border-blue-200' :
                            'bg-purple-100 border border-purple-200'
                          }`}>
                            <span className="font-medium text-gray-500">
                              {msg.role === 'lead' ? 'Lead' : msg.role === 'human' ? 'Marco' : 'AI'}
                            </span>
                            <span className="text-gray-400 ml-1">
                              {new Date(msg.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.channel === 'whatsapp' && <MessageCircle className="inline h-3 w-3 text-green-500 ml-1" />}
                            <p className="text-gray-700 mt-0.5 line-clamp-2">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                      {conv.context?.nextAction && (
                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 rounded p-1.5">
                          Prossima azione: {conv.context.nextAction}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Cronologia Activities</h4>
              <Button 
                size="sm" 
                onClick={() => setShowAddActivity(!showAddActivity)}
                variant={showAddActivity ? "outline" : "default"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Activity
              </Button>
            </div>

            {/* Form nuova activity */}
            {showAddActivity && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="space-y-3">
                  <Select 
                    value={newActivity.type} 
                    onValueChange={(value: ActivityType) => setNewActivity(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">📝 Nota</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="call">📞 Chiamata</SelectItem>
                      <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      <SelectItem value="instagram_dm">📱 DM Instagram</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Il titolo viene generato automaticamente dal server */}

                  {newActivity.type === 'call' && (
                    <Select 
                      value={newActivity.data?.callOutcome || ''} 
                      onValueChange={(value: CallOutcome) => 
                        setNewActivity(prev => ({ 
                          ...prev, 
                          data: { ...prev.data, callOutcome: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Esito chiamata..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="success">✅ Successo</SelectItem>
                        <SelectItem value="no_answer">❌ Nessuna risposta</SelectItem>
                        <SelectItem value="busy">📞 Occupato</SelectItem>
                        <SelectItem value="voicemail">📨 Segreteria</SelectItem>
                        <SelectItem value="callback_requested">🔄 Richiamata</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {(newActivity.type === 'whatsapp' || newActivity.type === 'instagram_dm') && (
                                      <Textarea
                    placeholder="Testo del messaggio..."
                    value={newActivity.data?.messageText || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewActivity(prev => ({ 
                      ...prev, 
                      data: { ...prev.data, messageText: e.target.value }
                    }))}
                  />
                  )}

                  <Textarea
                    placeholder="Note aggiuntive..."
                    value={newActivity.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                  />

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddActivity}>
                      Aggiungi Activity
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAddActivity(false)}>
                      Annulla
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista activities */}
            {isLoadingActivities ? (
              <div className="text-center py-8 text-gray-500">
                Caricamento activities...
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <div key={activity._id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {formatDateTime(activity.createdAt)}
                            </span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {activity.type}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditActivity(activity)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteActivity(activity._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <h5 className="text-sm text-gray-700 mb-1">{activity.title}</h5>
                          
                          {editingActivity === activity._id ? (
                            <div className="space-y-3 mt-2">
                              <div>
                                <label className="text-xs text-gray-500">Descrizione:</label>
                                <Textarea
                                  value={editingData.description || ''}
                                  onChange={(e) => setEditingData({...editingData, description: e.target.value})}
                                  className="text-sm"
                                  rows={2}
                                />
                              </div>
                              
                              {activity.type === 'call' && (
                                <div>
                                  <label className="text-xs text-gray-500">Esito chiamata:</label>
                                  <Select 
                                    value={editingData.callOutcome || ''} 
                                    onValueChange={(value) => setEditingData({...editingData, callOutcome: value as CallOutcome})}
                                  >
                                    <SelectTrigger className="text-sm">
                                      <SelectValue placeholder="Seleziona esito" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="interested">Interessato</SelectItem>
                                      <SelectItem value="not-interested">Non interessato</SelectItem>
                                      <SelectItem value="callback">Da richiamare</SelectItem>
                                      <SelectItem value="voicemail">Segreteria</SelectItem>
                                      <SelectItem value="wrong-number">Numero sbagliato</SelectItem>
                                      <SelectItem value="meeting-set">Appuntamento fissato</SelectItem>
                                      <SelectItem value="sale-made">Vendita conclusa</SelectItem>
                                      <SelectItem value="no-answer">Nessuna risposta</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveActivity(activity._id)}
                                  className="flex-1"
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  Salva
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  className="flex-1"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Annulla
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {activity.description && (
                                activity.type === 'ai_agent'
                                  ? <AiAgentActivity description={activity.description} />
                                  : <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              )}
                              
                              {activity.data?.messageText && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                  &ldquo;{activity.data.messageText}&rdquo;
                                </div>
                              )}
                              
                              {activity.data?.callOutcome && (
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    Esito: {activity.data.callOutcome}
                                  </Badge>
                                </div>
                              )}
                              
                              {activity.data?.recordingSid && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray-500 mb-2">Registrazione chiamata:</p>
                                  <audio 
                                    controls 
                                    className="w-full h-8" 
                                    preload="metadata"
                                    style={{ maxWidth: '100%' }}
                                  >
                                    <source src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://menuchat-crm-backend-production.up.railway.app'}/api/calls/recording/${activity.data.recordingSid}`} type="audio/wav" />
                                    Il tuo browser non supporta l&apos;elemento audio.
                                  </audio>
                                  {activity.data?.recordingDuration && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Durata: {Math.floor(activity.data.recordingDuration / 60)}:{(activity.data.recordingDuration % 60).toString().padStart(2, '0')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              di {activity.createdBy.firstName} {activity.createdBy.lastName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Nessuna activity presente</p>
                <p className="text-sm">Aggiungi la prima interazione con questo contatto</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 