"use client";

import { useState } from "react";
import { ColdCallScript } from "@/types/dialer";
import { ChevronDown, Loader2 } from "lucide-react";

interface DialerScriptPanelProps {
  script: ColdCallScript | null;
  isLoading: boolean;
  error: string | null;
}

type SectionKey = "opening" | "hook" | "busy" | "gate" | "trial" | "objections";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "opening", label: "Apertura" },
  { key: "hook", label: "Hook" },
  { key: "busy", label: "Busy" },
  { key: "gate", label: "Gate" },
  { key: "trial", label: "Trial" },
  { key: "objections", label: "Obiezioni" },
];

export function DialerScriptPanel({ script, isLoading, error }: DialerScriptPanelProps) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    opening: true,
    hook: true,
    busy: false,
    gate: false,
    trial: true,
    objections: false,
  });

  const toggle = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    <div className="space-y-2">
      {SECTIONS.map(({ key, label }) => {
        const isOpen = openSections[key];
        return (
          <div key={key} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50"
            >
              <span className="text-sm font-semibold text-gray-900">{label}</span>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 px-3 py-3 text-sm leading-relaxed text-gray-700">
                {key === "objections" ? (
                  <ul className="space-y-3">
                    {(script.objections || []).map((obj, idx) => (
                      <li key={idx} className="rounded-md bg-gray-50 px-3 py-2">
                        <p className="text-xs font-semibold text-gray-500">{obj.trigger}</p>
                        <p className="mt-1 text-gray-800">{obj.line}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{script[key]}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
