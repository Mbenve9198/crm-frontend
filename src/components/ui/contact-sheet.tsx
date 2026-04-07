"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api";
import { Contact, ContactStatus } from "@/types/contact";
import { Activity } from "@/types/activity";
import { getStatusLabel, getStatusColor, getAllStatuses } from "@/lib/status-utils";
import {
  Phone,
  MessageCircle,
  CalendarClock,
  ExternalLink,
  Loader2,
  Mail,
  User,
  Calendar,
  DollarSign,
  Send,
  Clock,
  ArrowRight,
} from "lucide-react";

type ContactSheetProps = {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallbackRequest?: (contact: Contact) => void;
  backLabel?: string;
  onBack?: () => void;
};

const sourceLabel = (src?: string) => {
  if (src === "smartlead_outbound") return "Smartlead";
  if (src === "inbound_rank_checker") return "Rank Checker";
  if (src === "inbound_form") return "Form";
  if (src === "inbound_api") return "API";
  if (src === "csv_import") return "CSV Import";
  if (src === "manual") return "Manuale";
  return src || "—";
};

const sourceBadgeColor = (src?: string) => {
  if (src === "smartlead_outbound") return "bg-blue-100 text-blue-700";
  if (src === "inbound_rank_checker") return "bg-teal-100 text-teal-700";
  return "bg-gray-100 text-gray-600";
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g fa`;
  return formatDate(iso);
}

const activityTypeConfig: Record<string, { label: string; color: string }> = {
  call: { label: "Chiamata", color: "bg-blue-500" },
  whatsapp: { label: "WhatsApp", color: "bg-green-500" },
  email: { label: "Email", color: "bg-purple-500" },
  instagram_dm: { label: "Instagram", color: "bg-pink-500" },
  status_change: { label: "Status", color: "bg-gray-400" },
  note: { label: "Nota", color: "bg-yellow-500" },
  ai_agent: { label: "AI Agent", color: "bg-violet-500" },
};

export function ContactSheet({
  contactId,
  open,
  onOpenChange,
  onCallbackRequest,
  backLabel,
  onBack,
}: ContactSheetProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [calling, setCalling] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadContact = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [contactRes, activitiesRes] = await Promise.all([
        apiClient.getContact(id),
        apiClient.getContactActivities(id, { limit: 10 }),
      ]);
      if (contactRes.success && contactRes.data) setContact(contactRes.data);
      if (activitiesRes.success && activitiesRes.data)
        setActivities(activitiesRes.data.activities);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && contactId) {
      setContact(null);
      setActivities([]);
      setNote("");
      loadContact(contactId);
    }
  }, [open, contactId, loadContact]);

  const handleCall = async () => {
    if (!contact) return;
    setCalling(true);
    try {
      await apiClient.initiateCall({ contactId: contact._id, recordCall: true });
    } catch {
      // silent
    } finally {
      setCalling(false);
    }
  };

  const handleWhatsApp = () => {
    if (!contact?.phone) return;
    const cleaned = contact.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    window.open(`https://api.whatsapp.com/send/?phone=${encodeURIComponent(cleaned)}`, "_blank");
  };

  const handleSaveNote = async () => {
    if (!contact || !note.trim()) return;
    setSavingNote(true);
    try {
      await apiClient.createActivity(contact._id, {
        type: "note",
        description: note.trim(),
      });
      setNote("");
      loadContact(contact._id);
    } catch {
      // silent
    } finally {
      setSavingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: ContactStatus) => {
    if (!contact || newStatus === contact.status) return;
    setUpdatingStatus(true);
    try {
      await apiClient.updateContactStatus(contact._id, { status: newStatus });
      await loadContact(contact._id);
    } catch {
      // silent
    } finally {
      setUpdatingStatus(false);
    }
  };

  const ownerName = contact?.owner
    ? `${contact.owner.firstName || ""} ${contact.owner.lastName || ""}`.trim() || contact.owner.email
    : "Non assegnato";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto p-0"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : contact ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="border-b bg-gray-50/80 p-5 pr-12">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 mb-1 -mt-1"
                >
                  {backLabel || "← Indietro"}
                </button>
              )}
              <SheetTitle className="text-lg leading-tight">
                {contact.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 relative">
                  <span className={`h-2 w-2 rounded-full ${getStatusColor(contact.status)}`} />
                  <select
                    value={contact.status}
                    onChange={(e) => handleStatusChange(e.target.value as ContactStatus)}
                    disabled={updatingStatus}
                    className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer hover:text-blue-600 pr-4 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
                  >
                    {getAllStatuses().map((s) => (
                      <option key={s} value={s}>{getStatusLabel(s)}</option>
                    ))}
                  </select>
                  {updatingStatus && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sourceBadgeColor(contact.source)}`}>
                  {sourceLabel(contact.source)}
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Action buttons */}
            <div className="flex gap-2 px-5 py-3 border-b">
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700"
                disabled={!contact.phone || calling}
                onClick={handleCall}
              >
                {calling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                Chiama
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                disabled={!contact.phone}
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              {onCallbackRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    onCallbackRequest(contact);
                    onOpenChange(false);
                  }}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Callback
                </Button>
              )}
            </div>

            {/* Contact info */}
            <div className="px-5 py-4 border-b space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Informazioni
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {contact.email && (
                  <div className="flex items-start gap-2 col-span-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700 break-all">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-start gap-2 col-span-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{contact.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-700 text-xs">{ownerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-700 text-xs">
                    {typeof contact.mrr === "number"
                      ? `€${contact.mrr}/mese`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 text-xs">
                    Creato {formatDate(contact.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 text-xs">
                    Agg. {formatDate(contact.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick note */}
            <div className="px-5 py-4 border-b space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nota rapida
              </h4>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Scrivi una nota..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveNote();
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!note.trim() || savingNote}
                  onClick={handleSaveNote}
                  className="self-end shrink-0"
                >
                  {savingNote ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-gray-400">Invio per salvare · Shift+Invio per andare a capo</p>
            </div>

            {/* Activity timeline */}
            <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Attività recenti
              </h4>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Nessuna attività registrata
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => {
                    const cfg = activityTypeConfig[a.type] || {
                      label: a.type,
                      color: "bg-gray-400",
                    };
                    return (
                      <div key={a._id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-2 w-2 rounded-full mt-1.5 ${cfg.color}`} />
                          <div className="w-px flex-1 bg-gray-200" />
                        </div>
                        <div className="pb-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-800">
                              {a.title || cfg.label}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {timeAgo(a.createdAt)}
                            </span>
                          </div>
                          {a.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {a.description}
                            </p>
                          )}
                          {a.data?.statusChange && (
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              {a.data.statusChange.oldStatus}
                              <ArrowRight className="h-2.5 w-2.5" />
                              {a.data.statusChange.newStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-gray-600"
                onClick={() => {
                  window.open(`/?search=${encodeURIComponent(contact.name)}`, "_self");
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Apri scheda completa
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Contatto non trovato
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
