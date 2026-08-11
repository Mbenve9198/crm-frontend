"use client";

import { DialerContact } from "@/types/dialer";
import { getStatusLabel } from "@/lib/status-utils";
import { Loader2, Phone } from "lucide-react";

interface DialerQueueListProps {
  contacts: DialerContact[];
  selectedId: string | null;
  isLoading: boolean;
  total: number;
  disabled?: boolean;
  onSelect: (contact: DialerContact) => void;
}

export function DialerQueueList({
  contacts,
  selectedId,
  isLoading,
  total,
  disabled = false,
  onSelect,
}: DialerQueueListProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        Nessun contatto in coda per i filtri selezionati.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 px-1 text-xs text-gray-500">
        {total} contatti in coda
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {contacts.map((contact) => {
          const active = contact._id === selectedId;
          return (
            <li key={contact._id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(contact)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "border-blue-300 bg-blue-50"
                    : "border-transparent bg-white hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${active ? "text-blue-900" : "text-gray-900"}`}>
                      {contact.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                      <Phone className="h-3 w-3 shrink-0" />
                      {contact.phone || "Nessun numero"}
                    </p>
                  </div>
                  {!contact.hasVisibilityCard && (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      incompleta
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {getStatusLabel(contact.status)}
                  {contact.cardSummary?.keyword ? ` · ${contact.cardSummary.keyword}` : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
