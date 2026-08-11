"use client";

import { DialerCardSummary } from "@/types/dialer";
import { AlertTriangle, MapPin, Star } from "lucide-react";

interface VisibilityCardSummaryProps {
  summary?: DialerCardSummary | null;
  hasVisibilityCard?: boolean;
}

function formatDist(distM?: number | null): string | null {
  if (distM == null || Number.isNaN(Number(distM))) return null;
  const n = Number(distM);
  if (n >= 1000) return `${(n / 1000).toFixed(1)} km`;
  return `${Math.round(n)} m`;
}

export function VisibilityCardSummary({
  summary,
  hasVisibilityCard,
}: VisibilityCardSummaryProps) {
  const complete = !!hasVisibilityCard;
  const competitor = summary?.competitorAhead;
  const nearby = summary?.nearbyClient;
  const distLabel = formatDist(nearby?.distM);

  return (
    <div className="space-y-3">
      {!complete && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Scheda incompleta — script base da cliente vicino</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Keyword</p>
          <p className="mt-0.5 font-medium text-gray-900">{summary?.keyword || "—"}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Rank</p>
          <p className="mt-0.5 font-medium text-gray-900">
            {summary?.rank != null ? `#${summary.rank}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Rating / Recensioni</p>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-gray-900">
            {summary?.rating != null ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {summary.rating}
              </>
            ) : (
              "—"
            )}
            <span className="text-gray-400">
              {summary?.reviews != null ? `· ${summary.reviews} rec` : ""}
            </span>
          </p>
        </div>
        {summary?.velocityPerMonth != null && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-400">Velocity</p>
            <p className="mt-0.5 font-medium text-gray-900">
              {summary.velocityPerMonth} rec/mese
            </p>
          </div>
        )}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Competitor avanti</p>
          <p className="mt-0.5 font-medium text-gray-900">
            {competitor?.name
              ? `${competitor.name}${competitor.rank != null ? ` (#${competitor.rank})` : ""}`
              : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">Cliente vicino</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-900">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          {nearby?.name || "—"}
          {distLabel ? <span className="font-normal text-gray-500">· {distLabel}</span> : null}
        </p>
      </div>

      {summary?.nearbyClientStats?.reviewsGained != null && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          <p className="text-[11px] uppercase tracking-wide text-emerald-700">
            Risultati ancora (Menu Chat)
          </p>
          <p className="mt-0.5 font-medium">
            +{summary.nearbyClientStats.reviewsGained} rec
            {summary.nearbyClientStats.monthsActive != null
              ? ` in ${summary.nearbyClientStats.monthsActive} mesi`
              : ""}
          </p>
          <p className="mt-0.5 text-xs text-emerald-800/80">
            {summary.nearbyClientStats.initialReviewCount != null &&
            summary.nearbyClientStats.currentReviewCount != null
              ? `${summary.nearbyClientStats.initialReviewCount} → ${summary.nearbyClientStats.currentReviewCount}`
              : null}
            {summary.nearbyClientStats.startedAt
              ? ` · dal ${String(summary.nearbyClientStats.startedAt).slice(0, 10)}`
              : null}
          </p>
          {summary.nearbyProof ? (
            <p className="mt-1.5 text-xs leading-relaxed text-emerald-900/90">{summary.nearbyProof}</p>
          ) : null}
        </div>
      )}

      {summary?.hook && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-950">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-blue-600">Hook</p>
          <p className="leading-relaxed">{summary.hook}</p>
        </div>
      )}
    </div>
  );
}
