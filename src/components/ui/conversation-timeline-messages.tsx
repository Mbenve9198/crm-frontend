"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BUBBLE_PREVIEW = 220;

export type TimelineMessage = {
  role: string;
  content: string;
  channel?: string;
  createdAt?: string;
  metadata?: { isAutoresponder?: boolean; source?: string; wasAutoSent?: boolean };
};

export function ConversationTimelineMessages({
  messages,
}: {
  messages: TimelineMessage[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  if (!messages.length) {
    return <p className="text-sm text-gray-500 mt-1">Nessun messaggio nella conversazione</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {messages.map((msg, i) => {
        const isLead = msg.role === "lead";
        const isLong = msg.content.length > BUBBLE_PREVIEW;
        const isExpanded = expanded.has(i);
        const displayText =
          isLong && !isExpanded ? msg.content.slice(0, BUBBLE_PREVIEW) + "…" : msg.content;

        return (
          <div
            key={i}
            className={`flex flex-col gap-0.5 ${isLead ? "items-start" : "items-end"}`}
          >
            <span className="text-[10px] text-gray-400 px-1 flex items-center gap-1 flex-wrap">
              {isLead ? "Cliente" : "Noi"}
              {msg.metadata?.isAutoresponder && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4 border-amber-300 text-amber-700 bg-amber-50"
                >
                  Auto-risposta
                </Badge>
              )}
              {msg.createdAt &&
                ` · ${new Date(msg.createdAt).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
              {msg.channel === "whatsapp" && (
                <MessageCircle className="inline h-3 w-3 text-green-500" />
              )}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                isLead
                  ? "bg-gray-100 text-gray-800 rounded-tl-sm"
                  : "bg-violet-600 text-white rounded-tr-sm"
              }`}
            >
              {displayText}
              {isLong && (
                <button
                  onClick={() => toggle(i)}
                  className={`block mt-1 text-[11px] underline opacity-70 hover:opacity-100 ${
                    isLead ? "text-gray-500" : "text-violet-200"
                  }`}
                >
                  {isExpanded ? "Mostra meno" : "Leggi tutto"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
