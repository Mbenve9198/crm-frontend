"use client";

import { MessageCircle } from "lucide-react";
import { Contact } from "@/types/contact";
import { ConversationTimelineMessages } from "@/components/ui/conversation-timeline-messages";
import { WaEngagementBadge } from "@/components/ui/wa-engagement-badge";
import {
  isRankCheckerInboundSource,
  isRankCheckerOrganicSource,
  resolveWaEngagementStatus,
} from "@/lib/wa-engagement";

type WaMessage = {
  role: string;
  content: string;
  channel: string;
  createdAt: string;
  metadata?: { isAutoresponder?: boolean; source?: string; wasAutoSent?: boolean };
};

type WaConversationPanelProps = {
  contact: Contact;
  messages: WaMessage[];
  isLoading: boolean;
  showEngagementBadge?: boolean;
};

function emptyStateCopy(
  contact: Contact,
  status: ReturnType<typeof resolveWaEngagementStatus>
): string {
  const organic = isRankCheckerOrganicSource(contact.source);

  if (status === "outbound_only") {
    return organic
      ? "Template rank-checker inviato — il lead non ha ancora risposto all'agente."
      : "Template inviato — in attesa di risposta dal lead.";
  }
  if (organic) {
    return "Nessuna conversazione con l'agente rank-checker sincronizzata.";
  }
  if (contact.properties?.onboardingLastEvent === "engaged") {
    return "Il lead ha risposto su WhatsApp — la conversazione comparirà qui dopo il prossimo sync.";
  }
  if (contact.properties?.onboardingLastEvent === "autoresponder_detected") {
    return "Auto-risposta rilevata — verifica la timeline quando la sync è completata.";
  }
  if (contact.properties?.onboardingLastEvent === "preview_sent") {
    return "Anteprima inviata — nessuna risposta ancora.";
  }
  return "Nessun messaggio WhatsApp sincronizzato.";
}

export function WaConversationPanel({
  contact,
  messages,
  isLoading,
  showEngagementBadge = true,
}: WaConversationPanelProps) {
  const engagement = resolveWaEngagementStatus(contact.properties, messages);
  const isRankChecker = isRankCheckerInboundSource(contact.source);
  const isOrganic = isRankCheckerOrganicSource(contact.source);

  if (!contact.phone && !isRankChecker) return null;

  const title = isOrganic
    ? "Conversazione agente Rank Checker"
    : "Conversazione WhatsApp";

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
          {title}
        </div>
        {showEngagementBadge && isRankChecker && (
          <WaEngagementBadge status={engagement} properties={contact.properties} messages={messages} />
        )}
      </div>

      {contact.phone && (
        <a
          href={`https://wa.me/${contact.phone.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-xs"
        >
          Apri Chat WhatsApp
        </a>
      )}

      {isLoading ? (
        <div className="text-xs text-gray-400 text-center py-2">Caricamento conversazione...</div>
      ) : messages.length > 0 ? (
        <ConversationTimelineMessages messages={messages} />
      ) : (
        <div
          className={`text-xs text-center py-2 rounded-lg px-2 ${
            engagement === "autoresponder_only" ||
            contact.properties?.onboardingLastEvent === "autoresponder_detected"
              ? "text-amber-700 bg-amber-50 border border-amber-200"
              : "text-gray-500 bg-gray-50"
          }`}
        >
          {emptyStateCopy(contact, engagement)}
        </div>
      )}

      {messages.length > 0 && engagement === "outbound_only" && (
        <p className="text-[10px] text-gray-400 text-center">
          {isOrganic
            ? "Solo template/messaggi inviati — il lead non ha ingaggiato l'agente."
            : "Solo messaggi inviati — il lead non ha ancora risposto."}
        </p>
      )}
    </div>
  );
}

export function pickWhatsappMessages(
  agentConversations: Array<{ channel: string; messages: WaMessage[] }>
): WaMessage[] {
  const wa =
    agentConversations.find((c) => c.channel === "whatsapp")?.messages ||
    agentConversations[0]?.messages;
  return wa || [];
}
