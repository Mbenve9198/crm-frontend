"use client";

import React, { useState } from "react";
import { ColdCallScript } from "@/types/dialer";
import { Loader2 } from "lucide-react";

export type DiscoveryNotes = Record<string, string>;

interface DialerScriptPanelProps {
  script: ColdCallScript | null;
  isLoading: boolean;
  error: string | null;
  discoveryNotes: DiscoveryNotes;
  onDiscoveryNoteChange: (questionId: string, value: string) => void;
}

type Branch = "main" | "busy" | "gate" | "objections";

export function DialerScriptPanel({
  script,
  isLoading,
  error,
  discoveryNotes,
  onDiscoveryNoteChange,
}: DialerScriptPanelProps) {
  const [branch, setBranch] = useState<Branch>("main");

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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["main", "Talk track"],
            ["busy", "Busy"],
            ["gate", "Gatekeeper"],
            ["objections", "Obiezioni"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBranch(key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              branch === key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {branch === "main" && (
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
              Annota sotto ogni domanda — si salva tutto con l’esito a fine call.
            </p>
            <ul className="mt-3 space-y-3">
              {(script.discovery || []).map((q, i) => (
                <li key={q.id} className="rounded-md border border-amber-100 bg-white/90 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-amber-700">
                    Q{i + 1} · {q.label}
                  </p>
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
      )}

      {branch === "busy" && (
        <ScriptBlock step="↔" title="Busy / in servizio" hint="Zero pitch">
          {script.busy}
        </ScriptBlock>
      )}

      {branch === "gate" && (
        <ScriptBlock step="↔" title="Gatekeeper — pack 4/4" hint="Nome · fascia · messaggio · canale">
          {script.gate}
        </ScriptBlock>
      )}

      {branch === "objections" && (
        <ul className="space-y-2">
          {(script.objections || []).map((obj, idx) => (
            <li key={idx} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              <p className="text-xs font-semibold text-gray-500">{obj.trigger}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-900">{obj.line}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
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
