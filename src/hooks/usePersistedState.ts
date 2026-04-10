"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Drop-in replacement for useState that persists value to localStorage,
 * scoped by the logged-in user ID and a page/filter key.
 *
 * On first render it reads localStorage; if a stored value exists it is
 * used as initial state, otherwise `defaultValue` is used.
 *
 * Key format: `crm:${userId}:${storageKey}`
 */
export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { user } = useAuth();
  const userId = user?._id ?? "__anonymous__";
  const fullKey = `crm:${userId}:${storageKey}`;

  const [state, setStateRaw] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // corrupted value — fall back
    }
    return defaultValue;
  });

  const fullKeyRef = useRef(fullKey);
  fullKeyRef.current = fullKey;

  // Re-hydrate when user changes (e.g. login/logout).
  // useLayoutEffect so state updates are flushed synchronously
  // before any useEffect (e.g. data-loading) runs.
  const prevKeyRef = useRef(fullKey);
  useIsomorphicLayoutEffect(() => {
    if (prevKeyRef.current === fullKey) return;
    prevKeyRef.current = fullKey;
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored !== null) {
        setStateRaw(JSON.parse(stored) as T);
      } else {
        setStateRaw(defaultValue);
      }
    } catch {
      setStateRaw(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  // Persist whenever state changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(fullKeyRef.current, JSON.stringify(state));
    } catch {
      // quota exceeded — silently ignore
    }
  }, [state]);

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateRaw(value);
    },
    []
  );

  return [state, setState];
}
