"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import {
  OwnerPerformanceData,
  OwnerPerformanceRow,
  ForecastData,
  LeadCohortFunnelAnalyticsData,
  LeadCohortContact,
  LeadFunnelStepContact,
} from "@/types/analytics";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Loader2,
  BarChart3,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Pause,
  DollarSign,
  Target,
} from "lucide-react";

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

type SortKey = keyof Pick<
  OwnerPerformanceRow,
  | "ownerName"
  | "cohort"
  | "notTouched"
  | "pctNotTouched"
  | "avgFirstTouchDays"
  | "qrCodeSent"
  | "convToQR"
  | "freeTrialStarted"
  | "convQRtoFT"
  | "won"
  | "convFTtoWon"
  | "lostBFT"
  | "lostAFT"
  | "stalled"
  | "mrrWon"
  | "avgSalesCycleDays"
>;

type SemaphoreLevel = "green" | "yellow" | "red";

function semaphore(
  value: number,
  thresholds: { green: [number, number]; yellow: [number, number] }
): SemaphoreLevel {
  if (value >= thresholds.green[0] && value <= thresholds.green[1]) return "green";
  if (value >= thresholds.yellow[0] && value <= thresholds.yellow[1]) return "yellow";
  return "red";
}

const semColors: Record<SemaphoreLevel, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

function SemBadge({ value, level, suffix = "%" }: { value: number | string; level: SemaphoreLevel; suffix?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${semColors[level]}`}>
      {value}{suffix}
    </span>
  );
}

function TrendArrow({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0)
    return (
      <span className="inline-flex items-center justify-end w-[42px] text-gray-400">
        <Minus className="h-3 w-3" />
      </span>
    );
  if (delta > 0)
    return (
      <span className="inline-flex items-center justify-end w-[42px] text-emerald-600 text-[10px] font-bold">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{delta}
      </span>
    );
  return (
    <span className="inline-flex items-center justify-end w-[42px] text-red-600 text-[10px] font-bold">
      <TrendingDown className="h-3 w-3 mr-0.5" />{delta}
    </span>
  );
}

function AgingBadge({ days }: { days: number }) {
  if (days <= 2) return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700">&lt;48h</span>;
  if (days <= 7) return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700">2-7gg</span>;
  return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700">&gt;7gg</span>;
}

function CohortContactTable({ contacts, dateLabel, dateKey }: { contacts: LeadCohortContact[]; dateLabel: string; dateKey: "cohortStartAt" }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Nome</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Email</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Sorgente</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">MRR</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">{dateLabel}</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id} className="border-b last:border-0 hover:bg-white/60">
            <td className="py-1 px-2"><Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link></td>
            <td className="py-1 px-2 text-gray-600">{c.email}</td>
            <td className="py-1 px-2 text-gray-600">{c.source}</td>
            <td className="py-1 px-2 text-gray-900">{c.mrr != null ? `€${c.mrr}` : "—"}</td>
            <td className="py-1 px-2 text-gray-600">{c[dateKey] ? new Date(c[dateKey]!).toLocaleDateString("it-IT") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FunnelContactTable({ contacts }: { contacts: LeadFunnelStepContact[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Nome</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Email</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Sorgente</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">MRR</th>
          <th className="text-left py-1 px-2 font-semibold text-gray-600">Data</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((c) => (
          <tr key={c.id} className="border-b last:border-0 hover:bg-white/60">
            <td className="py-1 px-2"><Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link></td>
            <td className="py-1 px-2 text-gray-600">{c.email}</td>
            <td className="py-1 px-2 text-gray-600">{c.source}</td>
            <td className="py-1 px-2 text-gray-900">{c.mrr != null ? `€${c.mrr}` : "—"}</td>
            <td className="py-1 px-2 text-gray-600">{c.enteredAt ? new Date(c.enteredAt).toLocaleDateString("it-IT") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LeadAnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatDateInput(d);
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return formatDateInput(lastDay);
  });
  const [source, setSource] = useState("all");
  const [data, setData] = useState<OwnerPerformanceData | null>(null);
  const [cohortData, setCohortData] = useState<LeadCohortFunnelAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("cohort");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  type CohortExpandedPanel =
    | { source: string; key: "created" | "reactivated" | "notTouched" | "qr" | "ft" | "won" }
    | null;
  const [cohortExpanded, setCohortExpanded] = useState<CohortExpandedPanel>(null);

  const canAccess = useMemo(() => user && user.role === "admin", [user]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [ownerRes, cohortRes] = await Promise.all([
        apiClient.getOwnerPerformance({ from, to, source }),
        apiClient.getLeadCohortAnalytics({ from, to }),
      ]);
      if (ownerRes.success && ownerRes.data) setData(ownerRes.data);
      else setError(ownerRes.message || "Errore nel caricamento");
      if (cohortRes.success && cohortRes.data) setCohortData(cohortRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && canAccess) loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canAccess]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = [...data.owners];
    rows.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const team = useMemo((): OwnerPerformanceRow | null => {
    if (!data || data.owners.length === 0) return null;
    const o = data.owners;
    const cohort = o.reduce((s, r) => s + r.cohort, 0);
    const notTouched = o.reduce((s, r) => s + r.notTouched, 0);
    const qrCodeSent = o.reduce((s, r) => s + r.qrCodeSent, 0);
    const freeTrialStarted = o.reduce((s, r) => s + r.freeTrialStarted, 0);
    const won = o.reduce((s, r) => s + r.won, 0);
    const lostBFT = o.reduce((s, r) => s + r.lostBFT, 0);
    const lostAFT = o.reduce((s, r) => s + r.lostAFT, 0);
    const stalled = o.reduce((s, r) => s + r.stalled, 0);
    const mrrWon = o.reduce((s, r) => s + r.mrrWon, 0);

    const fts = o.filter((r) => r.avgFirstTouchDays !== null);
    const avgFirstTouchDays = fts.length > 0 ? +(fts.reduce((s, r) => s + r.avgFirstTouchDays!, 0) / fts.length).toFixed(1) : null;
    const scs = o.filter((r) => r.avgSalesCycleDays !== null);
    const avgSalesCycleDays = scs.length > 0 ? +(scs.reduce((s, r) => s + r.avgSalesCycleDays!, 0) / scs.length).toFixed(1) : null;

    return {
      ownerId: "team",
      ownerName: "Team",
      cohort,
      notTouched,
      pctNotTouched: cohort > 0 ? Math.round((notTouched / cohort) * 100) : 0,
      avgFirstTouchDays,
      qrCodeSent,
      convToQR: cohort > 0 ? Math.round((qrCodeSent / cohort) * 100) : 0,
      freeTrialStarted,
      convQRtoFT: qrCodeSent > 0 ? Math.round((freeTrialStarted / qrCodeSent) * 100) : 0,
      won,
      convFTtoWon: freeTrialStarted > 0 ? Math.round((won / freeTrialStarted) * 100) : 0,
      lostBFT,
      lostAFT,
      stalled,
      mrrWon,
      avgSalesCycleDays,
      trends: { pctNotTouched: null, convToQR: null, convFTtoWon: null },
      bySource: {},
      notTouchedContacts: [],
      stalledContacts: [],
      lostBFTContacts: [],
      lostAFTContacts: [],
    };
  }, [data]);

  const visibleCols = useMemo(() => {
    if (!data || data.owners.length === 0) return { won: true, convFTtoWon: true, lostBFT: true, lostAFT: true, stalled: true, mrrWon: true, avgSalesCycleDays: true };
    const o = data.owners;
    return {
      won: true,
      convFTtoWon: true,
      lostBFT: o.some((r) => r.lostBFT > 0),
      lostAFT: o.some((r) => r.lostAFT > 0),
      stalled: o.some((r) => r.stalled > 0),
      mrrWon: o.some((r) => r.mrrWon > 0),
      avgSalesCycleDays: o.some((r) => r.avgSalesCycleDays !== null),
    };
  }, [data]);

  const closureColCount = useMemo(() => {
    const v = visibleCols;
    return (v.won ? 1 : 0) + (v.convFTtoWon ? 1 : 0) + (v.lostBFT ? 1 : 0) + (v.lostAFT ? 1 : 0) + (v.stalled ? 1 : 0);
  }, [visibleCols]);

  const revenueColCount = useMemo(() => {
    const v = visibleCols;
    return (v.mrrWon ? 1 : 0) + (v.avgSalesCycleDays ? 1 : 0);
  }, [visibleCols]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white"><AlertTitle>Autenticazione richiesta</AlertTitle><AlertDescription>Effettua il login.</AlertDescription></Alert>
      </div>
    );
  }
  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md bg-white"><AlertTitle>Accesso non autorizzato</AlertTitle><AlertDescription>Solo admin possono visualizzare questa pagina.</AlertDescription></Alert>
      </div>
    );
  }

  const SortHeader = ({ label, k, className = "", tip }: { label: string; k: SortKey; className?: string; tip?: string }) => (
    <th
      className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none ${className}`}
      onClick={() => handleSort(k)}
    >
      {tip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 border-b border-dotted border-gray-400">
              {label}
              {sortKey === k && <span className="text-blue-600">{sortDir === "asc" ? "↑" : "↓"}</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] whitespace-normal text-xs">
            {tip}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="inline-flex items-center gap-0.5">
          {label}
          {sortKey === k && <span className="text-blue-600">{sortDir === "asc" ? "↑" : "↓"}</span>}
        </span>
      )}
    </th>
  );

  const renderOwnerRow = (r: OwnerPerformanceRow, isTeam = false) => {
    const isExpanded = expandedOwner === r.ownerId && !isTeam;
    const now = new Date();
    const rowClass = isTeam
      ? "bg-blue-50/70 font-semibold border-t-2 border-blue-300"
      : "border-b hover:bg-gray-50 cursor-pointer transition-colors";

    const semNT = semaphore(r.pctNotTouched, { green: [0, 24], yellow: [25, 50] });
    const semConvQR = semaphore(r.convToQR, { green: [26, 100], yellow: [10, 25] });
    const semConvFTW = semaphore(r.convFTtoWon, { green: [61, 100], yellow: [30, 60] });
    const semFT = r.avgFirstTouchDays !== null
      ? semaphore(r.avgFirstTouchDays, { green: [0, 0.99], yellow: [1, 3] })
      : "green" as SemaphoreLevel;
    const semStall = semaphore(r.stalled, { green: [0, 1], yellow: [2, 5] });

    const totalColSpan = 1 + 4 + 4 + closureColCount + revenueColCount;

    return (
      <>
        <tr
          key={r.ownerId}
          className={rowClass}
          onClick={() => !isTeam && setExpandedOwner(isExpanded ? null : r.ownerId)}
        >
          <td className={`px-3 py-2.5 text-sm whitespace-nowrap ${isTeam ? "text-blue-900" : "text-gray-900"}`}>
            <div className="flex items-center gap-1">
              {!isTeam && (isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />)}
              {isTeam ? <span className="uppercase text-xs tracking-wide">Totale Team</span> : r.ownerName}
            </div>
          </td>
          {/* Reattività */}
          <td className="px-3 py-2.5 text-sm text-right">{r.cohort}</td>
          <td className="px-3 py-2.5 text-sm text-right">{r.notTouched}</td>
          <td className="px-3 py-2.5">
            <div className="flex items-center justify-end gap-1">
              <SemBadge value={r.pctNotTouched} level={semNT} />
              {!isTeam ? <TrendArrow delta={r.trends.pctNotTouched} /> : <span className="w-[42px]" />}
            </div>
          </td>
          <td className="px-3 py-2.5 text-right">
            {r.avgFirstTouchDays !== null ? (
              <SemBadge value={r.avgFirstTouchDays} level={semFT} suffix="gg" />
            ) : (
              <span className="text-gray-400 text-xs">—</span>
            )}
          </td>
          {/* Funnel */}
          <td className="px-3 py-2.5 text-sm text-right">{r.qrCodeSent}</td>
          <td className="px-3 py-2.5">
            <div className="flex items-center justify-end gap-1">
              <SemBadge value={r.convToQR} level={semConvQR} />
              {!isTeam ? <TrendArrow delta={r.trends.convToQR} /> : <span className="w-[42px]" />}
            </div>
          </td>
          <td className="px-3 py-2.5 text-sm text-right">{r.freeTrialStarted}</td>
          <td className="px-3 py-2.5 text-right">
            <span className="text-xs font-medium text-gray-700">{r.convQRtoFT}%</span>
          </td>
          {/* Chiusura */}
          {visibleCols.won && <td className="px-3 py-2.5 text-sm text-right font-medium">{r.won}</td>}
          {visibleCols.convFTtoWon && (
            <td className="px-3 py-2.5">
              <div className="flex items-center justify-end gap-1">
                <SemBadge value={r.convFTtoWon} level={semConvFTW} />
                {!isTeam ? <TrendArrow delta={r.trends.convFTtoWon} /> : <span className="w-[42px]" />}
              </div>
            </td>
          )}
          {visibleCols.lostBFT && <td className="px-3 py-2.5 text-sm text-right text-gray-500">{r.lostBFT}</td>}
          {visibleCols.lostAFT && <td className="px-3 py-2.5 text-sm text-right text-gray-500">{r.lostAFT}</td>}
          {visibleCols.stalled && (
            <td className="px-3 py-2.5 text-right">
              <SemBadge value={r.stalled} level={semStall} suffix="" />
            </td>
          )}
          {/* Revenue */}
          {visibleCols.mrrWon && (
            <td className="px-3 py-2.5 text-sm text-right font-medium text-emerald-700">
              {r.mrrWon > 0 ? formatEur(r.mrrWon) : "—"}
            </td>
          )}
          {visibleCols.avgSalesCycleDays && (
            <td className="px-3 py-2.5 text-sm text-right text-gray-600">
              {r.avgSalesCycleDays !== null ? `${r.avgSalesCycleDays}gg` : "—"}
            </td>
          )}
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={totalColSpan} className="px-4 py-4 bg-gray-50/80 border-b">
              <div className="space-y-5">
                {/* Source breakdown */}
                {Object.keys(r.bySource).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Breakdown per sorgente</h4>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Sorgente</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Coorte</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Not touched</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">QR</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Free trial</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Won</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Lost BFT</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Lost AFT</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">MRR Won</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(r.bySource).map(([src, s]) => (
                            <tr key={src} className="border-b last:border-0">
                              <td className="px-2 py-1.5 font-medium text-gray-700">{src}</td>
                              <td className="px-2 py-1.5 text-right">
                                {s.cohort}
                                {s.reactivated > 0 && (
                                  <span className="text-gray-400 ml-1">({s.reactivated} riatt.)</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right">{s.notTouched}</td>
                              <td className="px-2 py-1.5 text-right">{s.qrCodeSent}</td>
                              <td className="px-2 py-1.5 text-right">{s.freeTrialStarted}</td>
                              <td className="px-2 py-1.5 text-right">{s.won}</td>
                              <td className="px-2 py-1.5 text-right">{s.lostBFT}</td>
                              <td className="px-2 py-1.5 text-right">{s.lostAFT}</td>
                              <td className="px-2 py-1.5 text-right text-emerald-700">{s.mrrWon > 0 ? formatEur(s.mrrWon) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Not touched with aging */}
                {r.notTouchedContacts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Lead not touched ({r.notTouchedContacts.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="bg-amber-50">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Lead</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Sorgente</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Creato</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Aging</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.notTouchedContacts
                            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((c) => {
                              const days = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / 86400000);
                              return (
                                <tr key={c.id} className="border-b last:border-0">
                                  <td className="px-2 py-1.5">
                                    <Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link>
                                    {c.email && <span className="ml-1 text-gray-400">{c.email}</span>}
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-500">{c.source}</td>
                                  <td className="px-2 py-1.5 text-gray-500">{new Date(c.createdAt).toLocaleDateString("it-IT")}</td>
                                  <td className="px-2 py-1.5">
                                    <AgingBadge days={days} />
                                    <span className="ml-1 text-gray-500">{days}gg</span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Stalled */}
                {r.stalledContacts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2 flex items-center gap-1">
                      <Pause className="h-3.5 w-3.5 text-orange-500" />
                      In stallo ({r.stalledContacts.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="bg-orange-50">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Lead</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Status</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Ultima activity</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Inattivo da</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.stalledContacts.map((c) => {
                            const days = Math.floor((now.getTime() - new Date(c.lastActivityAt).getTime()) / 86400000);
                            return (
                              <tr key={c.id} className="border-b last:border-0">
                                <td className="px-2 py-1.5">
                                  <Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link>
                                  {c.email && <span className="ml-1 text-gray-400">{c.email}</span>}
                                </td>
                                <td className="px-2 py-1.5 text-gray-500">{c.status}</td>
                                <td className="px-2 py-1.5 text-gray-500">{new Date(c.lastActivityAt).toLocaleDateString("it-IT")}</td>
                                <td className="px-2 py-1.5 text-red-600 font-medium">{days}gg</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Lost */}
                {(r.lostBFTContacts.length > 0 || r.lostAFTContacts.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {r.lostBFTContacts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Lost before free trial ({r.lostBFTContacts.length})</h4>
                        <ul className="text-xs space-y-0.5">
                          {r.lostBFTContacts.map((c) => (
                            <li key={c.id} className="flex justify-between border-b border-gray-100 pb-0.5">
                              <Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link>
                              <span className="text-gray-400">{c.source}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.lostAFTContacts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Lost after free trial ({r.lostAFTContacts.length})</h4>
                        <ul className="text-xs space-y-0.5">
                          {r.lostAFTContacts.map((c) => (
                            <li key={c.id} className="flex justify-between border-b border-gray-100 pb-0.5">
                              <Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link>
                              <span className="text-gray-400">{c.source}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="pl-16">
        <div className="container mx-auto py-6 px-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Analytics Lead
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Funnel per sorgente e performance owner — confronto stage-by-stage.
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-blue-600" />
                Filtri
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setExpandedOwner(null);
                  loadAnalytics();
                }}
                className="flex flex-col sm:flex-row gap-4 sm:items-end"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="from">Dal</label>
                  <input id="from" type="date" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="to">Al</label>
                  <input id="to" type="date" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="source">Sorgente</label>
                  <select id="source" className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="all">Tutte</option>
                    <option value="smartlead_outbound">Smartlead Outbound</option>
                    <option value="inbound_rank_checker">Rank Checker Inbound</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Applica
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => {
                      const today = formatDateInput(new Date());
                      setFrom(today);
                      setTo(today);
                      setExpandedOwner(null);
                      setTimeout(() => loadAnalytics(), 0);
                    }}
                  >
                    Oggi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary KPIs */}
          {team && (
            <div className="grid gap-4 grid-cols-2 xl:grid-cols-5">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">New lead</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{team.cohort}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Not touched</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{team.notTouched} <span className="text-sm font-normal text-gray-500">({team.pctNotTouched}%)</span></p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Avg 1° tocco</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{team.avgFirstTouchDays !== null ? `${team.avgFirstTouchDays}gg` : "—"}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" /> MRR Won</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{team.mrrWon > 0 ? formatEur(team.mrrWon) : "—"}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1"><Pause className="h-3 w-3" /> In stallo</p>
                  <p className="text-2xl font-bold text-orange-700 mt-1">{team.stalled}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== Funnel per Sorgente ===== */}
          {cohortData && (
            <Card className="shadow-sm border border-gray-200/80">
              <div className="px-5 py-3.5 bg-indigo-50 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Funnel per Sorgente
                </h3>
                <span className="text-xs text-indigo-600">
                  {cohortData.period.from ? new Date(cohortData.period.from).toLocaleDateString("it-IT") : ""} → {cohortData.period.to ? new Date(cohortData.period.to).toLocaleDateString("it-IT") : ""}
                </span>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/80">
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Sorgente</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Creati</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Riattivati</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Coorte</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Not&nbsp;Touched</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">QR&nbsp;Inviato</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Free&nbsp;Trial</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(cohortData.sources).map(([srcKey, src]) => {
                        const sourceLabel = srcKey === "smartlead_outbound" ? "Smartlead Outbound" : srcKey === "inbound_rank_checker" ? "Rank Checker Inbound" : srcKey;
                        const toggleKey = (source: string, key: CohortExpandedPanel extends null ? never : Exclude<CohortExpandedPanel, null>["key"]) => {
                          setCohortExpanded((prev) =>
                            prev && prev.source === source && prev.key === key ? null : { source, key }
                          );
                        };
                        const isExp = (key: Exclude<CohortExpandedPanel, null>["key"]) => cohortExpanded?.source === srcKey && cohortExpanded?.key === key;
                        return (
                          <React.Fragment key={srcKey}>
                            <tr className="border-b hover:bg-gray-50/60">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{sourceLabel}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-indigo-600 hover:text-indigo-800" onClick={() => toggleKey(srcKey, "created")}>{src.cohort.created.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-indigo-600 hover:text-indigo-800" onClick={() => toggleKey(srcKey, "reactivated")}>{src.cohort.reactivated.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold">{src.cohort.total.count}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-amber-600 hover:text-amber-800" onClick={() => toggleKey(srcKey, "notTouched")}>{src.steps.notTouched.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-purple-600 hover:text-purple-800" onClick={() => toggleKey(srcKey, "qr")}>{src.steps.qrCodeSent.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-blue-600 hover:text-blue-800" onClick={() => toggleKey(srcKey, "ft")}>{src.steps.freeTrialStarted.count}</button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button className="underline text-emerald-600 hover:text-emerald-800" onClick={() => toggleKey(srcKey, "won")}>{src.steps.won.count}</button>
                              </td>
                            </tr>
                            {isExp("created") && (
                              <tr>
                                <td colSpan={8} className="bg-indigo-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-indigo-700 mb-2">Lead creati — {sourceLabel}</p>
                                  {src.cohort.created.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <CohortContactTable contacts={src.cohort.created.contacts} dateLabel="Creato il" dateKey="cohortStartAt" />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("reactivated") && (
                              <tr>
                                <td colSpan={8} className="bg-indigo-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-indigo-700 mb-2">Lead riattivati — {sourceLabel}</p>
                                  {src.cohort.reactivated.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <CohortContactTable contacts={src.cohort.reactivated.contacts} dateLabel="Riattivato il" dateKey="cohortStartAt" />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("notTouched") && (
                              <tr>
                                <td colSpan={8} className="bg-amber-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-amber-700 mb-2">Not touched — {sourceLabel}</p>
                                  {src.steps.notTouched.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.notTouched.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("qr") && (
                              <tr>
                                <td colSpan={8} className="bg-purple-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-purple-700 mb-2">QR code inviato — {sourceLabel}</p>
                                  {src.steps.qrCodeSent.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.qrCodeSent.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("ft") && (
                              <tr>
                                <td colSpan={8} className="bg-blue-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-blue-700 mb-2">Free trial iniziato — {sourceLabel}</p>
                                  {src.steps.freeTrialStarted.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.freeTrialStarted.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                            {isExp("won") && (
                              <tr>
                                <td colSpan={8} className="bg-emerald-50/40 px-6 py-3">
                                  <p className="text-xs font-semibold text-emerald-700 mb-2">Won — {sourceLabel}</p>
                                  {src.steps.won.contacts.length === 0 ? (
                                    <p className="text-xs text-gray-500">Nessun lead</p>
                                  ) : (
                                    <FunnelContactTable contacts={src.steps.won.contacts} />
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {/* Riga totale */}
                      {(() => {
                        const srcs = Object.values(cohortData.sources);
                        const totCreated = srcs.reduce((s, v) => s + v.cohort.created.count, 0);
                        const totReact = srcs.reduce((s, v) => s + v.cohort.reactivated.count, 0);
                        const totCohort = srcs.reduce((s, v) => s + v.cohort.total.count, 0);
                        const totNT = srcs.reduce((s, v) => s + v.steps.notTouched.count, 0);
                        const totQR = srcs.reduce((s, v) => s + v.steps.qrCodeSent.count, 0);
                        const totFT = srcs.reduce((s, v) => s + v.steps.freeTrialStarted.count, 0);
                        const totWon = srcs.reduce((s, v) => s + v.steps.won.count, 0);
                        return (
                          <tr className="border-t-2 bg-indigo-50/60 font-semibold">
                            <td className="px-4 py-2.5 text-gray-900">Totale</td>
                            <td className="px-4 py-2.5 text-right">{totCreated}</td>
                            <td className="px-4 py-2.5 text-right">{totReact}</td>
                            <td className="px-4 py-2.5 text-right">{totCohort}</td>
                            <td className="px-4 py-2.5 text-right">{totNT}</td>
                            <td className="px-4 py-2.5 text-right">{totQR}</td>
                            <td className="px-4 py-2.5 text-right">{totFT}</td>
                            <td className="px-4 py-2.5 text-right">{totWon}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== Owner Performance ===== */}

          {/* Prove attive */}
          {data?.forecast && (() => {
            const fc = data.forecast;
            const statusLabel = (s: string) => s === "qr code inviato" ? "QR inviato" : s === "free trial iniziato" ? "Free Trial" : s;
            return (
              <Card className="overflow-hidden border-t-4 border-t-violet-500">
                <div className="px-5 py-3.5 bg-violet-50 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-violet-800 flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    Prove attive
                  </h3>
                  <span className="text-xs text-violet-600">
                    Close date nel periodo · Conv. stimata {Math.round(fc.totals.conversionRate * 100)}%
                  </span>
                </div>
                <CardContent className="pt-4 space-y-4">
                  {fc.totals.deals === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nessuna prova attiva con close date nel periodo selezionato.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase">Prove attive</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{fc.totals.deals}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase">MRR potenziale (100%)</p>
                          <p className="text-2xl font-bold text-gray-500 mt-1">{formatEur(fc.totals.mrrPotential)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-500 uppercase">MRR forecast (50%)</p>
                          <p className="text-2xl font-bold text-violet-700 mt-1">{formatEur(fc.totals.mrrForecast)}</p>
                        </div>
                      </div>

                      {fc.owners.length > 1 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50/60">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Owner</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Prove</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">MRR pot.</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">MRR forecast</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fc.owners.map((o) => (
                                <tr key={o.ownerId} className="border-b last:border-0">
                                  <td className="px-3 py-2 font-medium text-gray-900">{o.ownerName}</td>
                                  <td className="px-3 py-2 text-right">{o.deals}</td>
                                  <td className="px-3 py-2 text-right text-gray-500">{formatEur(o.mrrPotential)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-violet-700">{formatEur(o.mrrForecast)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <details className="group">
                        <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                          Dettaglio lead ({fc.contacts.length})
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="bg-violet-50/50">
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Lead</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Status</th>
                                <th className="px-2 py-1.5 text-right font-medium text-gray-500">MRR</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">QR inviato</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Inizio FT</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Close date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fc.contacts.map((c) => (
                                <tr key={c.id} className="border-b last:border-0">
                                  <td className="px-2 py-1.5">
                                    <Link href={`/?search=${encodeURIComponent(c.name)}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{c.name}</Link>
                                    {c.email && <span className="ml-1 text-gray-400">{c.email}</span>}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${c.status === "free trial iniziato" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                                      {statusLabel(c.status)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-right">{formatEur(c.mrr)}</td>
                                  <td className="px-2 py-1.5 text-gray-500">{c.qrEnteredAt ? new Date(c.qrEnteredAt).toLocaleDateString("it-IT") : "—"}</td>
                                  <td className="px-2 py-1.5 text-gray-500">{c.ftEnteredAt ? new Date(c.ftEnteredAt).toLocaleDateString("it-IT") : "—"}</td>
                                  <td className="px-2 py-1.5 text-gray-500">
                                    {(() => { const d = new Date(c.closeDateAt || (c as any).deadlineAt); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("it-IT"); })()}
                                    {c.isManualCloseDate && <span className="ml-1 text-violet-500 text-[9px]" title="Impostata manualmente">✎</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Main owner table */}
          {data && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 bg-blue-50 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-800">Comparativa Owner</h3>
                <span className="text-xs text-blue-600">
                  {data.period.from ? new Date(data.period.from).toLocaleDateString("it-IT") : ""} → {data.period.to ? new Date(data.period.to).toLocaleDateString("it-IT") : ""}
                </span>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      {/* Group header row */}
                      <tr>
                        <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50 border-b-2 border-gray-200" />
                        <th colSpan={4} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border-b border-amber-200">
                          Reattività
                        </th>
                        <th colSpan={4} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-purple-800 bg-purple-50 border-b border-purple-200">
                          Funnel
                        </th>
                        {closureColCount > 0 && (
                          <th colSpan={closureColCount} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-red-800 bg-red-50 border-b border-red-200">
                            Chiusura &amp; Perdita
                          </th>
                        )}
                        {revenueColCount > 0 && (
                          <th colSpan={revenueColCount} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border-b border-emerald-200">
                            Revenue
                          </th>
                        )}
                      </tr>
                      {/* Column header row */}
                      <tr className="border-b-2 border-gray-200 bg-gray-50/80">
                        {/* Reattività */}
                        <SortHeader label="Coorte" k="cohort" className="text-right bg-amber-50/40" tip="Lead assegnati (creati + riattivati) nel periodo" />
                        <SortHeader label="Non lavorati" k="notTouched" className="text-right bg-amber-50/40" tip="Lead non ancora lavorati (Smartlead ≤1 activity, Rank Checker 0)" />
                        <SortHeader label="% Non lav." k="pctNotTouched" className="text-right bg-amber-50/40" tip="% lead non lavorati sulla coorte — indice di reattività" />
                        <SortHeader label="1ª chiamata" k="avgFirstTouchDays" className="text-right bg-amber-50/40" tip="Media giorni tra assegnazione e prima chiamata" />
                        {/* Funnel */}
                        <SortHeader label="QR inv." k="qrCodeSent" className="text-right bg-purple-50/40" tip="Lead passati a QR code inviato" />
                        <SortHeader label="Conv. → QR" k="convToQR" className="text-right bg-purple-50/40" tip="% coorte convertita in QR inviato" />
                        <SortHeader label="Free Trial" k="freeTrialStarted" className="text-right bg-purple-50/40" tip="Lead passati a Free Trial iniziato" />
                        <SortHeader label="Conv. QR→FT" k="convQRtoFT" className="text-right bg-purple-50/40" tip="% QR convertiti in Free Trial" />
                        {/* Chiusura */}
                        {visibleCols.won && <SortHeader label="Won" k="won" className="text-right bg-red-50/30" tip="Lead chiusi come Won" />}
                        {visibleCols.convFTtoWon && <SortHeader label="Conv. FT→W" k="convFTtoWon" className="text-right bg-red-50/30" tip="% Free Trial convertiti in Won" />}
                        {visibleCols.lostBFT && <SortHeader label="Lost pre-FT" k="lostBFT" className="text-right bg-red-50/30" tip="Persi prima del Free Trial" />}
                        {visibleCols.lostAFT && <SortHeader label="Lost post-FT" k="lostAFT" className="text-right bg-red-50/30" tip="Persi dopo il Free Trial" />}
                        {visibleCols.stalled && <SortHeader label="In stallo" k="stalled" className="text-right bg-red-50/30" tip="Lead in QR/FT senza activity da 7+ giorni" />}
                        {/* Revenue */}
                        {visibleCols.mrrWon && <SortHeader label="MRR Won" k="mrrWon" className="text-right bg-emerald-50/40" tip="Somma MRR mensile dei lead Won" />}
                        {visibleCols.avgSalesCycleDays && <SortHeader label="Ciclo vendita" k="avgSalesCycleDays" className="text-right bg-emerald-50/40" tip="Media giorni da QR inviato a Won" />}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((r) => renderOwnerRow(r))}
                      {team && renderOwnerRow(team, true)}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {!data && !isLoading && !error && (
            <div className="py-16 text-center text-gray-500">
              Clicca <span className="font-semibold">Applica</span> per caricare i dati.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
