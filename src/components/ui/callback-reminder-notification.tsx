"use client";

import { useState } from "react";
import { useCallbacks } from "@/context/CallbackContext";
import { Phone, X, Clock, AlarmClock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, isPast } from "date-fns";
import { it } from "date-fns/locale";

export function CallbackReminderNotification() {
  const { visibleCallbacks, snooze, dismiss, dismissAll, complete, setPendingContactId } = useCallbacks();
  const [done, setDone] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleComplete = (contactId: string) => {
    if (done.has(contactId)) return;
    setDone(prev => new Set(prev).add(contactId));
    setTimeout(() => complete(contactId), 600);
  };

  const openContact = (contactId: string) => {
    dismiss(contactId);
    setPendingContactId(contactId);
    router.push("/");
  };

  if (visibleCallbacks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-orange-200 overflow-hidden">
      {/* Header */}
      <div className="bg-orange-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Phone className="h-4 w-4" />
          <span className="font-semibold text-sm">
            {visibleCallbacks.length === 1
              ? "1 richiamata in scadenza"
              : `${visibleCallbacks.length} richiamate in scadenza`}
          </span>
        </div>
        <button
          onClick={dismissAll}
          className="text-orange-200 hover:text-white transition-colors"
          title="Chiudi tutte"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
        {visibleCallbacks.map((contact) => {
          const callbackDate = contact.properties.callbackAt
            ? new Date(contact.properties.callbackAt)
            : null;
          const isOverdue = callbackDate ? isPast(callbackDate) : false;

          const isDone = done.has(contact._id);
          return (
            <div key={contact._id} className={`p-3 hover:bg-gray-50 transition-colors ${isDone ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {contact.name}
                  </p>
                  {contact.phone && (
                    <p className="text-xs text-gray-500">{contact.phone}</p>
                  )}
                  {callbackDate && (
                    <p
                      className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${
                        isOverdue ? "text-red-600" : "text-orange-600"
                      }`}
                    >
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {isOverdue
                        ? `Scaduta ${formatDistanceToNow(callbackDate, { locale: it, addSuffix: true })}`
                        : `Tra ${formatDistanceToNow(callbackDate, { locale: it })}`}
                    </p>
                  )}
                  {contact.properties.callbackNote && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate italic">
                      {contact.properties.callbackNote}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleComplete(contact._id)}
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isDone ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-green-400'
                    }`}
                    title="Completato"
                  >
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => dismiss(contact._id)}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                    title="Ignora"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openContact(contact._id)}
                  className="flex-1 text-center text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  Vai al contatto
                </button>
                <button
                  onClick={() => snooze(contact._id)}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                  title="Rimanda di 15 minuti"
                >
                  <AlarmClock className="h-3 w-3" />
                  +15 min
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
