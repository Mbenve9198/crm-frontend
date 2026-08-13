"use client";

import { DialerContact } from "@/types/dialer";
import { getStatusLabel } from "@/lib/status-utils";
import { formatCallbackAt, isCallbackDue } from "@/lib/callback-schedule";
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
        Nessun contatto assegnato a te in coda.
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
          const callbackLabel = formatCallbackAt(contact.callbackAt);
          const due = isCallbackDue(contact.callbackAt);
          return (
            <li key={contact._id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(contact)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "border-blue-300 bg-blue-50"
                    : due
                      ? "border-amber-200 bg-amber-50/70 hover:border-amber-300"
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
                  {due ? (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      richiamo
                    </span>
                  ) : !contact.hasVisibilityCard ? (
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      incompleta
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[11px] text-gray-400">
                  {[
                    contact.city || contact.cardSummary?.city,
                    getStatusLabel(contact.status),
                    contact.cardSummary?.keyword,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {callbackLabel ? (
                  <p className={`mt-0.5 truncate text-[11px] ${due ? "font-medium text-amber-800" : "text-blue-700"}`}>
                    Richiamo {callbackLabel}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
