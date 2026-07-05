import { Badge } from "@/components/ui/badge";
import {
  resolveWaEngagementStatus,
  WA_ENGAGEMENT_LABELS,
  WaEngagementStatus,
  WaMessageLike,
} from "@/lib/wa-engagement";

type WaEngagementBadgeProps = {
  status?: WaEngagementStatus | null;
  properties?: Record<string, string | number | boolean>;
  messages?: WaMessageLike[];
  className?: string;
};

export function WaEngagementBadge({
  status,
  properties,
  messages,
  className = "",
}: WaEngagementBadgeProps) {
  const resolved =
    status ?? resolveWaEngagementStatus(properties, messages);
  const cfg = WA_ENGAGEMENT_LABELS[resolved];

  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-2 py-0 h-5 font-medium border ${cfg.className} ${className}`}
    >
      {cfg.label}
    </Badge>
  );
}
