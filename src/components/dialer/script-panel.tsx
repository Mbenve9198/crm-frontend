"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ColdCallObjection, ColdCallScript } from "@/types/dialer";
import { Loader2, X } from "lucide-react";

export type DiscoveryNotes = Record<string, string>;

interface DialerScriptPanelProps {
  script: ColdCallScript | null;
  isLoading: boolean;
  error: string | null;
  discoveryNotes: DiscoveryNotes;
  onDiscoveryNoteChange: (questionId: string, value: string) => void;
}

export function DialerScriptPanel({
  script,
  isLoading,
  error,
  discoveryNotes,
  onDiscoveryNoteChange,
}: DialerScriptPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="ml-2 text-sm">Caricamento script…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!script) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        Seleziona un contatto per vedere lo script.
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      <ScriptBlock step="1" title="Apertura" hint="Stop. Ascolta.">
        {script.opening}
      </ScriptBlock>

      <ScriptBlock step="2" title="Hook (se sì)" hint="Vicino + numeri + Q1">
        {script.hook}
      </ScriptBlock>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          3 · Qualificazione (una alla volta)
        </p>
        <p className="mt-1 text-[11px] text-amber-700/80">
          Se c’è un dato Maps noto, confirmalo — non chiedere a vuoto. Note sotto ogni Q.
        </p>
        <ul className="mt-3 space-y-3">
          {(script.discovery || []).map((q, i) => (
            <li key={q.id} className="rounded-md border border-amber-100 bg-white/90 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold text-amber-700">
                  Q{i + 1} · {q.label}
                  {q.mode === "confirm" ? " · conferma" : ""}
                </p>
                {q.knownFact ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                    {q.knownFact}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-900">{q.line}</p>
              <input
                type="text"
                value={discoveryNotes[q.id] || ""}
                onChange={(e) => onDiscoveryNoteChange(q.id, e.target.value)}
                placeholder="Risposta / nota…"
                className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </li>
          ))}
        </ul>
      </div>

      <ScriptBlock step="4" title="Value" hint="Solo dopo discovery">
        {script.value}
      </ScriptBlock>

      <ScriptBlock step="5" title="Trial" hint="Solo se DM / influente">
        {script.trial}
      </ScriptBlock>
    </ol>
  );
}

type QuickSheetMode = "busy" | "gate" | "objection" | null;

interface DialerScriptQuickBarProps {
  script: ColdCallScript;
}

function objectionLabel(obj: ColdCallObjection): string {
  return obj.short || obj.trigger;
}

export function DialerScriptQuickBar({ script }: DialerScriptQuickBarProps) {
  const [sheetMode, setSheetMode] = useState<QuickSheetMode>(null);
  const [objectionIdx, setObjectionIdx] = useState<number | null>(null);

  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setObjectionIdx(null);
  }, []);

  // Reset pannello quando cambia contatto/script
  useEffect(() => {
    closeSheet();
  }, [script.contactId, closeSheet]);

  const objections = script.objections || [];

  const openBusy = () => {
    setObjectionIdx(null);
    setSheetMode((m) => (m === "busy" ? null : "busy"));
  };

  const openGate = () => {
    setObjectionIdx(null);
    setSheetMode((m) => (m === "gate" ? null : "gate"));
  };

  const openObjection = (idx: number) => {
    if (sheetMode === "objection" && objectionIdx === idx) {
      closeSheet();
      return;
    }
    setObjectionIdx(idx);
    setSheetMode("objection");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSheet();
        return;
      }
      // Tasti 1–9: obiezione diretta (solo se non stai interagendo con form/UI)
      if (e.key >= "1" && e.key <= "9" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (
          target?.closest(
            'input, textarea, select, button, a, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="option"], [role="menu"], [role="menuitem"], [role="dialog"]'
          )
        ) {
          return;
        }
        const idx = Number(e.key) - 1;
        if (idx < objections.length) {
          e.preventDefault();
          setObjectionIdx(idx);
          setSheetMode("objection");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [objections.length, closeSheet]);

  const activeObjection =
    sheetMode === "objection" && objectionIdx != null ? objections[objectionIdx] : null;

  const sheetTitle = useMemo(() => {
    if (sheetMode === "busy") return "Busy / in servizio";
    if (sheetMode === "gate") return "Gatekeeper";
    if (activeObjection) return activeObjection.trigger;
    return "";
  }, [sheetMode, activeObjection]);

  return (
    <div className="relative shrink-0 border-t border-gray-200 bg-white">
      {sheetMode && (
        <>
          <button
            type="button"
            aria-label="Chiudi pannello script"
            className="absolute inset-x-0 bottom-full h-20 bg-black/20"
            onClick={closeSheet}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheetTitle}
            className="absolute inset-x-0 bottom-full max-h-[min(42vh,360px)] overflow-y-auto rounded-t-xl border border-b-0 border-gray-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-sm">
              <p className="truncate text-sm font-semibold text-gray-900">{sheetTitle}</p>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-3">
              {sheetMode === "busy" && (
                <p className="text-[15px] leading-relaxed text-gray-900">{script.busy}</p>
              )}
              {sheetMode === "gate" && (
                <p className="text-[15px] leading-relaxed text-gray-900">{script.gate}</p>
              )}
              {sheetMode === "objection" && activeObjection && (
                <p className="text-lg leading-relaxed text-gray-900">{activeObjection.line}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="space-y-1.5 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Bypass
          </span>
          <QuickChip label="Busy" active={sheetMode === "busy"} onClick={openBusy} />
          <QuickChip label="Gate" active={sheetMode === "gate"} onClick={openGate} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Obiezioni
          </span>
          {objections.length === 0 ? (
            <span className="text-xs text-gray-400">—</span>
          ) : (
            objections.map((obj, idx) => (
              <QuickChip
                key={obj.id || idx}
                label={`${idx + 1} ${objectionLabel(obj)}`}
                active={sheetMode === "objection" && objectionIdx === idx}
                onClick={() => openObjection(idx)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuickChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex max-w-[11rem] items-center truncate rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      title={label}
    >
      {label}
    </button>
  );
}

function ScriptBlock({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {step} · {title}
        </p>
        {hint ? <p className="text-[11px] text-gray-400">{hint}</p> : null}
      </div>
      <p className="text-[15px] leading-relaxed text-gray-900">{children}</p>
    </div>
  );
}

/** Formatta le note discovery + note libere per call.notes */
export function formatDialerNotes(
  discovery: ColdCallScript["discovery"] | undefined,
  discoveryNotes: DiscoveryNotes,
  freeNotes: string
): string {
  const lines: string[] = [];
  const answered = (discovery || []).filter((q) => (discoveryNotes[q.id] || "").trim());
  if (answered.length) {
    lines.push("Qualificazione:");
    for (const q of answered) {
      lines.push(`- ${q.label}: ${discoveryNotes[q.id].trim()}`);
    }
  }
  const free = freeNotes.trim();
  if (free) {
    if (lines.length) lines.push("");
    lines.push(free);
  }
  return lines.join("\n");
}
