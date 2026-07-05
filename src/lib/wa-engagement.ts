export type WaEngagementStatus =
  | "engaged"
  | "outbound_only"
  | "autoresponder_only"
  | "empty";

export type WaMessageLike = {
  role: string;
  metadata?: { isAutoresponder?: boolean };
};

export const WA_ENGAGEMENT_LABELS: Record<
  WaEngagementStatus,
  { label: string; className: string }
> = {
  engaged: {
    label: "Ingaggiato",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  outbound_only: {
    label: "Solo inviati",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  autoresponder_only: {
    label: "Auto-risposta",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  empty: {
    label: "Nessuna chat",
    className: "bg-white text-gray-500 border-gray-200",
  },
};

export function computeWaEngagementFromMessages(
  messages: WaMessageLike[] | undefined
): WaEngagementStatus {
  if (!messages?.length) return "empty";

  const leadMsgs = messages.filter((m) => m.role === "lead");
  const humanLeadMsgs = leadMsgs.filter((m) => !m.metadata?.isAutoresponder);
  const hasAutoresponder = leadMsgs.some((m) => m.metadata?.isAutoresponder);

  if (humanLeadMsgs.length > 0) return "engaged";
  if (hasAutoresponder && leadMsgs.length > 0) return "autoresponder_only";
  if (messages.some((m) => m.role === "agent")) return "outbound_only";
  return "empty";
}

export function resolveWaEngagementStatus(
  properties: Record<string, string | number | boolean> | undefined,
  messages?: WaMessageLike[]
): WaEngagementStatus {
  if (messages?.length) {
    return computeWaEngagementFromMessages(messages);
  }
  const stored = properties?.waEngagementStatus;
  if (
    stored === "engaged" ||
    stored === "outbound_only" ||
    stored === "autoresponder_only" ||
    stored === "empty"
  ) {
    return stored;
  }
  return "empty";
}

export function isRankCheckerInboundSource(source?: string): boolean {
  return source === "inbound_rank_checker" || source === "inbound_prova_gratuita";
}

/** Lead organico dal test rank-checker (non Meta prova gratuita) */
export function isRankCheckerOrganicSource(source?: string): boolean {
  return source === "inbound_rank_checker";
}
