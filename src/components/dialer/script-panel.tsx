"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ColdCallObjection, ColdCallScript } from "@/types/dialer";
import {
  computeCoverProjections,
  fillScriptTemplate,
  parseCoversInput,
} from "@/lib/dialer-projections";
import { Loader2, Lock, X } from "lucide-react";

export type DiscoveryNotes = Record<string, string>;

interface DialerScriptPanelProps {
  script: ColdCallScript | null;
  isLoading: boolean;
  error: string | null;
  discoveryNotes: DiscoveryNotes;
  onDiscoveryNoteChange: (questionId: string, value: string) => void;
  agentName?: string | null;
}

export function DialerScriptPanel({
  script,
  isLoading,
  error,
  discoveryNotes,
  onDiscoveryNoteChange,
  agentName,
}: DialerScriptPanelProps) {
  const [earlyObjId, setEarlyObjId] = useState<string | null>(null);
  const [inlineObjectionId, setInlineObjectionId] = useState<string | null>(null);

  useEffect(() => {
    setEarlyObjId(null);
    setInlineObjectionId(null);
  }, [script?.contactId]);

  const coversRaw = discoveryNotes.q2_covers || "";
  const coversWeek = parseCoversInput(coversRaw);
  const projections = useMemo(
    () =>
      computeCoverProjections(
        coversWeek,
        script?.cardSummary?.reviews ?? script?.projectionHints?.reviews
      ),
    [coversWeek, script?.cardSummary?.reviews, script?.projectionHints?.reviews]
  );

  const resolvedAgent =
    agentName || script?.agentName || "…";

  const templateVars = useMemo(
    () => ({
      potentialMonthly: projections?.potentialMonthly,
      yearReviews: projections?.yearReviews,
      twoWeekPotential: projections?.twoWeekPotential,
      agentName: resolvedAgent,
    }),
    [projections, resolvedAgent]
  );

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

  const valueLines =
    script.valueBlock?.lines?.map((l) => fillScriptTemplate(l, templateVars)) ||
    (script.value ? [script.value] : []);
  const trialSteps = script.trialBlock?.steps || [];
  const earlyObjections =
    script.earlyObjections ||
    [
      script.busy
        ? { id: "busy", short: "Occupato", trigger: "Occupato", line: script.busy }
        : null,
      script.gate
        ? { id: "gate", short: "Non è lui", trigger: "Non è lui", line: script.gate }
        : null,
    ].filter(Boolean) as ColdCallObjection[];

  const activeEarly = earlyObjections.find((o) => o.id === earlyObjId) || null;
  const noDigitalObj =
    (script.objections || []).find((o) => o.id === "no_digital") || null;
  const showNoDigital =
    inlineObjectionId === "no_digital" ||
    discoveryNotes.q3_menu_follow === "no";

  const openingText = fillScriptTemplate(script.opening, templateVars);

  return (
    <ol className="space-y-4">
      <ScriptBlock step="1" title="Apertura" hint="Nome agente">
        {openingText}
      </ScriptBlock>

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            2 · Hook (se sì)
          </p>
          <p className="text-[11px] text-gray-400">Maps + keyword + Q1</p>
        </div>
        <p className="text-[15px] leading-relaxed text-gray-900">{script.hook}</p>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Se interrompe qui
          </p>
          <div className="flex flex-wrap gap-1.5">
            {earlyObjections.map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() =>
                  setEarlyObjId((prev) => (prev === obj.id ? null : obj.id || null))
                }
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  earlyObjId === obj.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {obj.short || obj.trigger}
              </button>
            ))}
          </div>
          {activeEarly ? (
            <p className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-900">
              {fillScriptTemplate(activeEarly.line, templateVars)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          3 · Qualificazione (una alla volta)
        </p>
        <p className="mt-1 text-[11px] text-amber-700/80">
          Inserisci i coperti/settimana: sblocca value, trial e calcoli al 10%.
        </p>
        <ul className="mt-3 space-y-3">
          {(script.discovery || []).map((q, i) => {
            const isCovers = q.drivesProjections || q.id === "q2_covers";
            const isMenu = q.id === "q3_menu";
            const hasChoices = Boolean(q.choiceOptions?.length);
            const selectedChoice = discoveryNotes[q.id] || "";
            const paperFollow =
              q.followUpIfPaper && projections
                ? fillScriptTemplate(q.followUpIfPaper, templateVars)
                : q.followUpIfPaper
                  ? q.followUpIfPaper.replace(
                      /\{\{potentialMonthly\}\}/g,
                      "… (inserisci coperti)"
                    )
                  : null;
            const decisionPartner =
              q.id === "q1b_decision" &&
              (selectedChoice === "with_partner" || selectedChoice === "other");

            return (
              <li
                key={q.id}
                className={`rounded-md border px-3 py-2.5 ${
                  isCovers
                    ? "border-amber-300 bg-white ring-1 ring-amber-200"
                    : "border-amber-100 bg-white/90"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold text-amber-700">
                    Q{i + 1} · {q.label}
                  </p>
                  {q.knownFact ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                      {q.knownFact}
                    </span>
                  ) : null}
                  {isCovers ? (
                    <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      sblocca script
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-900">{q.line}</p>

                {hasChoices ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.choiceOptions!.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onDiscoveryNoteChange(q.id, opt.id);
                          if (isMenu && opt.id !== "cartaceo") {
                            onDiscoveryNoteChange("q3_menu_follow", "");
                            setInlineObjectionId(null);
                          }
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                          selectedChoice === opt.id
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {decisionPartner ? (
                  <p className="mt-2 text-xs text-amber-800">
                    → Usa l’obiezione «Devo parlarne col socio» se prova a scaricare la decisione.
                  </p>
                ) : null}

                {isMenu && selectedChoice === "cartaceo" && paperFollow ? (
                  <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-2">
                    <p className="text-sm leading-relaxed text-amber-950">{paperFollow}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(q.followUpChoices || [
                        { id: "si", label: "Sì" },
                        { id: "no", label: "No", opensObjection: "no_digital" },
                      ]).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onDiscoveryNoteChange("q3_menu_follow", opt.id);
                            if (opt.opensObjection === "no_digital" || opt.id === "no") {
                              setInlineObjectionId("no_digital");
                            } else {
                              setInlineObjectionId(null);
                            }
                          }}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            discoveryNotes.q3_menu_follow === opt.id
                              ? "bg-gray-900 text-white"
                              : "bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isMenu && showNoDigital && noDigitalObj ? (
                  <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                      Obiezione · {noDigitalObj.short || noDigitalObj.trigger}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-rose-950">
                      {noDigitalObj.line}
                    </p>
                    {noDigitalObj.branches?.length ? (
                      <div className="mt-2 space-y-1.5">
                        {noDigitalObj.branches.map((b) => (
                          <p key={b.id} className="text-xs text-rose-900/90">
                            <span className="font-semibold">{b.label}:</span> {b.line}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!hasChoices ? (
                  <input
                    type={q.inputType === "number" ? "number" : "text"}
                    inputMode={q.inputType === "number" ? "numeric" : undefined}
                    min={q.inputType === "number" ? 1 : undefined}
                    value={discoveryNotes[q.id] || ""}
                    onChange={(e) => onDiscoveryNoteChange(q.id, e.target.value)}
                    placeholder={q.placeholder || "Risposta / nota…"}
                    className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        {projections ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ProjChip label="Coperti/mese" value={`~${projections.coversMonthly}`} />
            <ProjChip label="Potenziale rec/mese" value={`~${projections.potentialMonthly}`} />
            <ProjChip label="Tra 1 anno" value={`~${projections.yearReviews} rec`} />
            <ProjChip label="In 2 settimane" value={`~${projections.twoWeekPotential}`} />
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-800/80">
            <Lock className="h-3.5 w-3.5" />
            Value e trial compaiono dopo i coperti/settimana.
          </p>
        )}
      </div>

      {projections ? (
        <>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                4 · Value
              </p>
              <p className="text-[11px] text-gray-400">Dopo i coperti</p>
            </div>
            <div className="space-y-2">
              {valueLines.map((line, idx) => (
                <p key={idx} className="text-[15px] leading-relaxed text-gray-900">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                5 · Trial
              </p>
              <p className="text-[11px] text-gray-400">Step by step</p>
            </div>
            <ol className="space-y-3">
              {trialSteps.map((step, idx) => (
                <li key={step.id} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {idx + 1}. {step.title}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-gray-900">
                    {fillScriptTemplate(step.line, templateVars)}
                  </p>
                  {step.choiceOptions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {step.choiceOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onDiscoveryNoteChange(`trial_${step.id}`, opt.id)
                          }
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                            discoveryNotes[`trial_${step.id}`] === opt.id
                              ? "bg-gray-900 text-white"
                              : "bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {step.fields?.length ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {step.fields.map((field) => (
                        <label key={field.id} className="block space-y-1">
                          <span className="text-[11px] font-medium text-gray-600">
                            {field.label}
                          </span>
                          <input
                            type={field.inputType || "text"}
                            value={discoveryNotes[field.id] || ""}
                            onChange={(e) =>
                              onDiscoveryNoteChange(field.id, e.target.value)
                            }
                            placeholder={field.placeholder || ""}
                            className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          <Lock className="mx-auto mb-2 h-4 w-4 text-gray-400" />
          Inserisci i <span className="font-medium text-gray-700">coperti/settimana</span> in Q2
          per calcolare value e trial.
        </div>
      )}
    </ol>
  );
}

function ProjChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-white px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

type QuickSheetMode = "objection" | null;

interface DialerScriptQuickBarProps {
  script: ColdCallScript;
  discoveryNotes?: DiscoveryNotes;
  agentName?: string | null;
}

function objectionLabel(obj: ColdCallObjection): string {
  return obj.short || obj.trigger;
}

export function DialerScriptQuickBar({
  script,
  discoveryNotes = {},
  agentName,
}: DialerScriptQuickBarProps) {
  const [sheetMode, setSheetMode] = useState<QuickSheetMode>(null);
  const [objectionIdx, setObjectionIdx] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);

  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setObjectionIdx(null);
    setBranchId(null);
  }, []);

  useEffect(() => {
    closeSheet();
  }, [script.contactId, closeSheet]);

  const objections = script.objections || [];
  const coversWeek = parseCoversInput(discoveryNotes.q2_covers || "");
  const projections = computeCoverProjections(
    coversWeek,
    script.cardSummary?.reviews ?? script.projectionHints?.reviews
  );
  const templateVars = {
    potentialMonthly: projections?.potentialMonthly ?? "…",
    yearReviews: projections?.yearReviews ?? "…",
    twoWeekPotential: projections?.twoWeekPotential ?? "…",
    agentName: agentName || script.agentName || "…",
  };

  const openObjection = (idx: number) => {
    if (sheetMode === "objection" && objectionIdx === idx) {
      closeSheet();
      return;
    }
    setObjectionIdx(idx);
    setBranchId(null);
    setSheetMode("objection");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSheet();
        return;
      }
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
          setBranchId(null);
          setSheetMode("objection");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [objections.length, closeSheet]);

  const activeObjection =
    sheetMode === "objection" && objectionIdx != null ? objections[objectionIdx] : null;
  const activeBranch =
    activeObjection?.branches?.find((b) => b.id === branchId) || null;

  const sheetTitle = useMemo(() => {
    if (activeBranch) return activeBranch.label;
    if (activeObjection) return activeObjection.short || activeObjection.trigger;
    return "";
  }, [activeObjection, activeBranch]);

  const sheetBody = useMemo(() => {
    if (activeBranch) {
      return fillScriptTemplate(activeBranch.line, templateVars);
    }
    if (activeObjection) return fillScriptTemplate(activeObjection.line, templateVars);
    return "";
  }, [activeObjection, activeBranch, templateVars]);

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

            <div className="space-y-3 px-4 py-3">
              <p className="text-lg leading-relaxed text-gray-900">{sheetBody}</p>
              {activeObjection?.branches && activeObjection.branches.length > 0 && !activeBranch && (
                <div className="flex flex-wrap gap-2">
                  {activeObjection.branches.map((b) => {
                    const locked = Boolean(b.needsCovers && !projections);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          if (!locked) setBranchId(b.id);
                        }}
                        title={locked ? "Inserisci prima i coperti/settimana (Q2)" : undefined}
                        className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                          locked
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
                        }`}
                      >
                        {b.label}
                        {locked ? " (serve coperti)" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              {activeBranch && (
                <button
                  type="button"
                  onClick={() => setBranchId(null)}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  ← Torna all’obiezione
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="space-y-1.5 px-3 py-2">
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
      className={`inline-flex max-w-[14rem] items-center truncate rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
  freeNotes: string,
  currentReviews?: number | null
): string {
  const lines: string[] = [];
  const answered = (discovery || []).filter((q) => (discoveryNotes[q.id] || "").trim());
  if (answered.length) {
    lines.push("Qualificazione:");
    for (const q of answered) {
      lines.push(`- ${q.label}: ${discoveryNotes[q.id].trim()}`);
      if (q.id === "q3_menu" && discoveryNotes.q3_menu_follow) {
        lines.push(`  follow-up digitale: ${discoveryNotes.q3_menu_follow}`);
      }
    }
  }
  const covers = parseCoversInput(discoveryNotes.q2_covers || "");
  const proj = computeCoverProjections(covers, currentReviews ?? null);
  if (proj) {
    lines.push("");
    lines.push(
      `Proiezioni: ~${proj.potentialMonthly} rec/mese (10% di ~${proj.coversMonthly} coperti/mese); anno ~${proj.yearReviews}`
    );
  }

  const trialLabels: Record<string, string> = {
    trial_start_timing: "Partenza prova",
    trial_ship_address: "Indirizzo QR",
    trial_ragione_sociale: "Ragione sociale",
    trial_piva: "P.IVA",
    trial_sede_legale: "Sede legale",
    trial_codice_univoco: "Codice univoco",
    trial_menu_asset: "Menu asset",
    trial_whatsapp: "WhatsApp",
    trial_qr_live: "Messa live QR",
    trial_check_call: "Check post-arrivo",
    trial_ops_owner: "Referente sala",
  };
  const trialFilled = Object.keys(trialLabels).filter((k) =>
    (discoveryNotes[k] || "").trim()
  );
  if (trialFilled.length) {
    lines.push("");
    lines.push("Trial / setup:");
    for (const k of trialFilled) {
      lines.push(`- ${trialLabels[k]}: ${discoveryNotes[k].trim()}`);
    }
  }

  const free = freeNotes.trim();
  if (free) {
    if (lines.length) lines.push("");
    lines.push(free);
  }
  return lines.join("\n");
}
