"use client";

import { ColdCallDiscoveryQuestion } from "@/types/dialer";
import { Textarea } from "@/components/ui/textarea";
import { DiscoveryNotes, formatDialerNotes } from "@/components/dialer/script-panel";

interface DialerNotesPanelProps {
  discovery?: ColdCallDiscoveryQuestion[];
  discoveryNotes: DiscoveryNotes;
  freeNotes: string;
  onFreeNotesChange: (value: string) => void;
  currentReviews?: number | null;
  disabled?: boolean;
}

export function DialerNotesPanel({
  discovery,
  discoveryNotes,
  freeNotes,
  onFreeNotesChange,
  currentReviews,
  disabled = false,
}: DialerNotesPanelProps) {
  const compiled = formatDialerNotes(
    discovery,
    discoveryNotes,
    "",
    currentReviews
  ).trim();

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Note extra
        </label>
        <Textarea
          value={freeNotes}
          onChange={(e) => onFreeNotesChange(e.target.value)}
          placeholder="DM, fascia oraria, WhatsApp, accordi…"
          className="min-h-[88px] resize-none bg-white text-sm"
          rows={4}
          disabled={disabled}
        />
      </div>
      {compiled ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Dallo script
          </p>
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-amber-950">
            {compiled}
          </pre>
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-gray-400">
          Le risposte dello script e queste note extra finiscono nella storia del contatto.
        </p>
      )}
    </div>
  );
}
