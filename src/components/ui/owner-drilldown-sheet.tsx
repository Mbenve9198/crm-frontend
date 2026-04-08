"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ContactDetailSidebar } from "@/components/ui/contact-detail-sidebar";
import { Contact } from "@/types/contact";
import { apiClient } from "@/lib/api";
import {
  Mail,
  Globe,
  DollarSign,
  ChevronRight,
  Loader2,
} from "lucide-react";

export type DrilldownCategory =
  | "cohort"
  | "notTouched"
  | "qrCodeSent"
  | "freeTrialStarted"
  | "won"
  | "lostBFT"
  | "lostAFT"
  | "stalled"
  | "created"
  | "reactivated"
  | "activeTrial";

export type DrilldownContact = {
  id: string;
  name: string;
  email?: string;
  source?: string;
  status?: string;
  createdAt?: string;
  lastActivityAt?: string;
  mrr?: number;
};

type LeadDrilldownSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  dotColor?: string;
  contacts: DrilldownContact[];
};

const categoryLabels: Record<DrilldownCategory, string> = {
  cohort: "Coorte",
  notTouched: "Non lavorati",
  qrCodeSent: "QR inviato",
  freeTrialStarted: "Free Trial",
  won: "Won",
  lostBFT: "Lost pre Free Trial",
  lostAFT: "Lost post Free Trial",
  stalled: "In stallo",
  created: "Creati",
  reactivated: "Riattivati",
  activeTrial: "Prova attiva",
};

const categoryColors: Record<DrilldownCategory, string> = {
  cohort: "bg-gray-600",
  notTouched: "bg-amber-500",
  qrCodeSent: "bg-purple-500",
  freeTrialStarted: "bg-blue-500",
  won: "bg-emerald-500",
  lostBFT: "bg-red-400",
  lostAFT: "bg-red-600",
  stalled: "bg-orange-500",
  created: "bg-indigo-500",
  reactivated: "bg-teal-500",
  activeTrial: "bg-violet-500",
};

export function getCategoryLabel(cat: DrilldownCategory) {
  return categoryLabels[cat];
}

export function getCategoryColor(cat: DrilldownCategory) {
  return categoryColors[cat];
}

const sourceLabel = (src?: string) => {
  if (src === "smartlead_outbound") return "Smartlead";
  if (src === "inbound_rank_checker") return "Rank Checker";
  if (src === "inbound_form") return "Form";
  if (src === "referral") return "Referral";
  return src || "—";
};

export function LeadDrilldownSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  dotColor = "bg-blue-500",
  contacts,
}: LeadDrilldownSheetProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedContact(null);
      setDetailOpen(false);
    }
    onOpenChange(v);
  };

  const handleContactClick = async (id: string) => {
    try {
      setLoadingContactId(id);
      const res = await apiClient.getContact(id);
      if (res.success && res.data) {
        setSelectedContact(res.data);
        setDetailOpen(true);
      }
    } catch (error) {
      console.error("Errore caricamento contatto:", error);
    } finally {
      setLoadingContactId(null);
    }
  };

  const handleBackToList = () => {
    setSelectedContact(null);
    setDetailOpen(false);
  };

  return (
    <>
      <Sheet open={open && !detailOpen} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} />
              {title}
            </SheetTitle>
            {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
          </SheetHeader>

          <div className="mt-4 space-y-1">
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Nessun lead in questa categoria.</p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleContactClick(c.id)}
                  disabled={loadingContactId === c.id}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name || "—"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.email && (
                        <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {c.email}
                        </span>
                      )}
                      {c.source && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Globe className="h-3 w-3 shrink-0" /> {sourceLabel(c.source)}
                        </span>
                      )}
                      {typeof c.mrr === "number" && c.mrr > 0 && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                          <DollarSign className="h-3 w-3 shrink-0" /> €{c.mrr}
                        </span>
                      )}
                      {c.status && (
                        <span className="text-xs text-gray-400">{c.status}</span>
                      )}
                    </div>
                  </div>
                  {loadingContactId === c.id ? (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0 ml-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ContactDetailSidebar
        contact={selectedContact}
        isOpen={detailOpen}
        onClose={handleBackToList}
        onContactUpdate={(updated) => setSelectedContact(updated)}
      />
    </>
  );
}

export function OwnerDrilldownSheet({
  open,
  onOpenChange,
  ownerName,
  category,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  category: DrilldownCategory;
  contacts: DrilldownContact[];
}) {
  return (
    <LeadDrilldownSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${ownerName} · ${categoryLabels[category]}`}
      subtitle={`${contacts.length} lead`}
      dotColor={categoryColors[category]}
      contacts={contacts}
    />
  );
}
