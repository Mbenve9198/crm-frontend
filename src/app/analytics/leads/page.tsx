"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import {
  OwnerPerformanceData,
  OwnerPerformanceRow,
  ForecastData,
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
  if (delta === null || delta === 0) return <Minus className="h-3 w-3 text-gray-400 inline ml-1" />;
  if (delta > 0)
    return (
      <span className="inline-flex items-center ml-1 text-emerald-600 text-[10px] font-bold">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{delta}
      </span>
    );
  return (
    <span className="inline-flex items-center ml-1 text-red-600 text-[10px] font-bold">
      <TrendingDown className="h-3 w-3 mr-0.5" />{delta}
    </span>
  );
}

function AgingBadge({ days }: { days: number }) {
  if (days <= 2) return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700">&lt;48h</span>;
  if (days <= 7) return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700">2-7gg</span>;
  return <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700">&gt;7gg</span>;
}

export default function LeadAnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatDateInput(d);
  });
  const [to, setTo] = useState(() => formatDateInput(new Date()));
  const [source, setSource] = useState("all");
  const [data, setData] = useState<OwnerPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("cohort");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const canAccess = useMemo(() => user && user.role === "admin", [user]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getOwnerPerformance({ from, to, source });
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Errore nel caricamento");
      }
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
      ? "bg-gray-100 font-semibold border-t-2 border-gray-300"
      : "border-b hover:bg-gray-50 cursor-pointer transition-colors";

    const semNT = semaphore(r.pctNotTouched, { green: [0, 24], yellow: [25, 50] });
    const semConvQR = semaphore(r.convToQR, { green: [26, 100], yellow: [10, 25] });
    const semConvFTW = semaphore(r.convFTtoWon, { green: [61, 100], yellow: [30, 60] });
    const semFT = r.avgFirstTouchDays !== null
      ? semaphore(r.avgFirstTouchDays, { green: [0, 0.99], yellow: [1, 3] })
      : "green" as SemaphoreLevel;
    const semStall = semaphore(r.stalled, { green: [0, 1], yellow: [2, 5] });

    return (
      <>
        <tr
          key={r.ownerId}
          className={rowClass}
          onClick={() => !isTeam && setExpandedOwner(isExpanded ? null : r.ownerId)}
        >
          <td className="px-3 py-2.5 text-sm text-gray-900 whitespace-nowrap">
            <div className="flex items-center gap-1">
              {!isTeam && (isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />)}
              {r.ownerName}
            </div>
          </td>
          <td className="px-3 py-2.5 text-sm text-right">{r.cohort}</td>
          <td className="px-3 py-2.5 text-sm text-right">{r.notTouched}</td>
          <td className="px-3 py-2.5 text-right">
            <SemBadge value={r.pctNotTouched} level={semNT} />
            {!isTeam && <TrendArrow delta={r.trends.pctNotTouched} />}
          </td>
          <td className="px-3 py-2.5 text-right">
            {r.avgFirstTouchDays !== null ? (
              <SemBadge value={r.avgFirstTouchDays} level={semFT} suffix="gg" />
            ) : (
              <span className="text-gray-400 text-xs">—</span>
            )}
          </td>
          <td className="px-3 py-2.5 text-sm text-right">{r.qrCodeSent}</td>
          <td className="px-3 py-2.5 text-right">
            <SemBadge value={r.convToQR} level={semConvQR} />
            {!isTeam && <TrendArrow delta={r.trends.convToQR} />}
          </td>
          <td className="px-3 py-2.5 text-sm text-right">{r.freeTrialStarted}</td>
          <td className="px-3 py-2.5 text-right">
            <span className="text-xs font-medium text-gray-700">{r.convQRtoFT}%</span>
          </td>
          <td className="px-3 py-2.5 text-sm text-right font-medium">{r.won}</td>
          <td className="px-3 py-2.5 text-right">
            <SemBadge value={r.convFTtoWon} level={semConvFTW} />
            {!isTeam && <TrendArrow delta={r.trends.convFTtoWon} />}
          </td>
          <td className="px-3 py-2.5 text-sm text-right text-gray-500">{r.lostBFT}</td>
          <td className="px-3 py-2.5 text-sm text-right text-gray-500">{r.lostAFT}</td>
          <td className="px-3 py-2.5 text-right">
            <SemBadge value={r.stalled} level={semStall} suffix="" />
          </td>
          <td className="px-3 py-2.5 text-sm text-right font-medium text-emerald-700">
            {r.mrrWon > 0 ? formatEur(r.mrrWon) : "—"}
          </td>
          <td className="px-3 py-2.5 text-sm text-right text-gray-600">
            {r.avgSalesCycleDays !== null ? `${r.avgSalesCycleDays}gg` : "—"}
          </td>
        </tr>

        {isExpanded && (
          <tr>
            <td colSpan={16} className="px-4 py-4 bg-gray-50/80 border-b">
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
                                    <span className="font-medium text-gray-800">{c.name}</span>
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
                                  <span className="font-medium text-gray-800">{c.name}</span>
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
                              <span className="font-medium text-gray-700">{c.name}</span>
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
                              <span className="font-medium text-gray-700">{c.name}</span>
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
              Owner Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Confronto stage-by-stage: chi converte, chi perde, dove intervenire.
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
                      const d = new Date();
                      const today = formatDateInput(d);
                      d.setDate(1);
                      setFrom(formatDateInput(d));
                      setTo(today);
                      setExpandedOwner(null);
                      setTimeout(() => loadAnalytics(), 0);
                    }}
                  >
                    Mese corrente
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
                  <p className="text-xs font-medium text-gray-500 uppercase">Coorte totale</p>
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

          {/* Forecast fine mese */}
          {data?.forecast && data.forecast.totals.deals > 0 && (() => {
            const fc = data.forecast;
            return (
              <Card className="overflow-hidden border-t-4 border-t-violet-500">
                <div className="px-5 py-3.5 bg-violet-50 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-violet-800 flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    Forecast fine mese
                  </h3>
                  <span className="text-xs text-violet-600">
                    Scadenza trial entro il {new Date(fc.endOfMonth).toLocaleDateString("it-IT")} · Conv. {Math.round(fc.totals.conversionRate * 100)}%
                  </span>
                </div>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-500 uppercase">Free trial in scadenza</p>
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
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Deal</th>
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
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">MRR</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Inizio FT</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500">Fine trial</th>
                            <th className="px-2 py-1.5 text-right font-medium text-gray-500">Forecast</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fc.contacts.map((c) => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="px-2 py-1.5">
                                <span className="font-medium text-gray-800">{c.name}</span>
                                {c.email && <span className="ml-1 text-gray-400">{c.email}</span>}
                              </td>
                              <td className="px-2 py-1.5 text-right">{formatEur(c.mrr)}</td>
                              <td className="px-2 py-1.5 text-gray-500">{c.enteredAt ? new Date(c.enteredAt).toLocaleDateString("it-IT") : "—"}</td>
                              <td className="px-2 py-1.5 text-gray-500">{new Date(c.trialEndAt).toLocaleDateString("it-IT")}</td>
                              <td className="px-2 py-1.5 text-right font-medium text-violet-700">{formatEur(c.weightedMrr)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
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
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/80">
                        <SortHeader label="Owner" k="ownerName" className="text-left" />
                        <SortHeader label="Coorte" k="cohort" className="text-right" tip="Lead assegnati (creati + riattivati) nel periodo" />
                        <SortHeader label="NT" k="notTouched" className="text-right" tip="Not Touched — lead non ancora lavorati" />
                        <SortHeader label="% NT" k="pctNotTouched" className="text-right" tip="% Not Touched sulla coorte — indice di reattività" />
                        <SortHeader label="1° tocco" k="avgFirstTouchDays" className="text-right" tip="Media giorni tra assegnazione e prima chiamata" />
                        <SortHeader label="QR" k="qrCodeSent" className="text-right" tip="Lead passati a QR code inviato" />
                        <SortHeader label="→ QR" k="convToQR" className="text-right" tip="Conversion rate Coorte → QR inviato (%)" />
                        <SortHeader label="FT" k="freeTrialStarted" className="text-right" tip="Lead passati a Free Trial iniziato" />
                        <SortHeader label="QR→FT" k="convQRtoFT" className="text-right" tip="Conversion rate QR inviato → Free Trial (%)" />
                        <SortHeader label="Won" k="won" className="text-right" tip="Lead chiusi come Won" />
                        <SortHeader label="FT→W" k="convFTtoWon" className="text-right" tip="Conversion rate Free Trial → Won (%)" />
                        <SortHeader label="L.BFT" k="lostBFT" className="text-right" tip="Lost Before Free Trial — persi prima della prova" />
                        <SortHeader label="L.AFT" k="lostAFT" className="text-right" tip="Lost After Free Trial — persi dopo la prova" />
                        <SortHeader label="Stallo" k="stalled" className="text-right" tip="Lead in QR/Free Trial senza activity da 7+ giorni" />
                        <SortHeader label="MRR Won" k="mrrWon" className="text-right" tip="Somma MRR mensile dei lead Won" />
                        <SortHeader label="Ciclo" k="avgSalesCycleDays" className="text-right" tip="Media giorni da QR inviato a Won (sales cycle)" />
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
