"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { apiClient } from "@/lib/api";

export type CallbackContact = {
  _id: string;
  name: string;
  phone?: string;
  properties: {
    callbackAt?: string;
    callbackNote?: string;
  };
};

type CallbackContextType = {
  visibleCallbacks: CallbackContact[];
  snooze: (contactId: string) => void;
  dismiss: (contactId: string) => void;
  dismissAll: () => void;
};

const CallbackContext = createContext<CallbackContextType>({
  visibleCallbacks: [],
  snooze: () => {},
  dismiss: () => {},
  dismissAll: () => {},
});

export const useCallbacks = () => useContext(CallbackContext);

export function CallbackProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [dueCallbacks, setDueCallbacks] = useState<CallbackContact[]>([]);
  // dismissedKeys: Set of "${contactId}_${callbackAt}" — cleared when callbackAt changes
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  // snoozedUntil: Map of contactId → timestamp when snooze expires
  const [snoozedUntil, setSnoozedUntil] = useState<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDismissKey = (c: CallbackContact) =>
    `${c._id}_${c.properties.callbackAt ?? ""}`;

  const fetchDue = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.getCallbacksDue();
      if (res.success && Array.isArray(res.data)) {
        setDueCallbacks(res.data);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchDue();
    intervalRef.current = setInterval(fetchDue, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDue, user]);

  const snooze = useCallback((contactId: string) => {
    setSnoozedUntil((prev) => {
      const next = new Map(prev);
      next.set(contactId, Date.now() + 15 * 60 * 1000);
      return next;
    });
  }, []);

  const dismiss = useCallback((contactId: string) => {
    const contact = dueCallbacks.find((c) => c._id === contactId);
    if (!contact) return;
    setDismissedKeys((prev) => new Set([...prev, getDismissKey(contact)]));
  }, [dueCallbacks]);

  const dismissAll = useCallback(() => {
    const keys = dueCallbacks.map(getDismissKey);
    setDismissedKeys((prev) => new Set([...prev, ...keys]));
  }, [dueCallbacks]);

  const now = Date.now();
  const visibleCallbacks = dueCallbacks.filter((c) => {
    if (dismissedKeys.has(getDismissKey(c))) return false;
    const until = snoozedUntil.get(c._id);
    if (until && until > now) return false;
    return true;
  });

  return (
    <CallbackContext.Provider value={{ visibleCallbacks, snooze, dismiss, dismissAll }}>
      {children}
    </CallbackContext.Provider>
  );
}
