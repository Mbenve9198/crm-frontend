"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ContactSheet } from "@/components/ui/contact-sheet";
import {
  ArrowLeft,
  Mail,
  Globe,
  DollarSign,
  ChevronRight,
} from "lucide-react";

export type DrilldownCategory =
  | "notTouched"
  | "qrCodeSent"
  | "freeTrialStarted"
  | "won"
  | "lostBFT"
  | "lostAFT"
  | "stalled";

type DrilldownContact = {
  id: string;
  name: string;
  email?: string;
  source?: string;
  status?: string;
  createdAt?: string;
  lastActivityAt?: string;
  mrr?: number;
};

type OwnerDrilldownSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  category: DrilldownCategory;
  contacts: DrilldownContact[];
};

const categoryLabels: Record<DrilldownCategory, string> = {
  notTouched: "Non lavorati",
  qrCodeSent: "QR inviato",
  freeTrialStarted: "Free Trial",
  won: "Won",
  lostBFT: "Lost pre Free Trial",
  lostAFT: "Lost post Free Trial",
  stalled: "In stallo",
};

const categoryColors: Record<DrilldownCategory, string> = {
  notTouched: "bg-amber-500",
  qrCodeSent: "bg-purple-500",
  freeTrialStarted: "bg-blue-500",
  won: "bg-emerald-500",
  lostBFT: "bg-red-400",
  lostAFT: "bg-red-600",
  stalled: "bg-orange-500",
};

const sourceLabel = (src?: string) => {
  if (src === "smartlead_outbound") return "Smartlead";
  if (src === "inbound_rank_checker") return "Rank Checker";
  if (src === "inbound_form") return "Form";
  return src || "—";
};

export function OwnerDrilldownSheet({
  open,
  onOpenChange,
  ownerName,
  category,
  contacts,
}: OwnerDrilldownSheetProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedContactId(null);
      setDetailOpen(false);
    }
    onOpenChange(v);
  };

  const handleContactClick = (id: string) => {
    setSelectedContactId(id);
    setDetailOpen(true);
  };

  const handleBackToList = () => {
    setSelectedContactId(null);
    setDetailOpen(false);
  };

  const label = categoryLabels[category];
  const color = categoryColors[category];

  return (
    <>
      <Sheet open={open && !detailOpen} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
              {ownerName} · {label}
            </SheetTitle>
            <SheetDescription>
              {contacts.length} {contacts.length === 1 ? "lead" : "lead"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-1">
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Nessun lead in questa categoria.</p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleContactClick(c.id)}
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
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 ml-2" />
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ContactSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={(v) => {
          if (!v) handleBackToList();
        }}
        backLabel={`← ${label} (${contacts.length})`}
        onBack={handleBackToList}
      />
    </>
  );
}
