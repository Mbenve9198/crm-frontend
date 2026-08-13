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
    <div className="space-y-2">
      <Textarea
        value={freeNotes}
        onChange={(e) => onFreeNotesChange(e.target.value)}
        placeholder="Note per dopo: DM, fascia, WhatsApp…"
        className="min-h-[96px] resize-none bg-white text-sm"
        rows={4}
        disabled={disabled}
      />
      {compiled ? (
        <pre className="whitespace-pre-wrap rounded-md bg-gray-50 px-2.5 py-2 font-sans text-xs leading-relaxed text-gray-600">
          {compiled}
        </pre>
      ) : null}
    </div>
  );
}
